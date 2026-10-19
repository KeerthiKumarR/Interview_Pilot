import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ─── High-Performance Server-Side LRU Audio Cache ─────────────────────────
interface CachedAudioEntry {
  buffer: Buffer;
  contentType: string;
}

const ttsMemoryCache = new Map<string, CachedAudioEntry>();
const MAX_SERVER_AUDIO_CACHE = 120;

let cachedOpenRouterKey: string | null = process.env.OPENROUTER_API_KEY || null;
let lastKeyFetchTime = 0;
let cachedTtsModelSetting: string | null = null;
let lastModelSettingFetchTime = 0;
const SETTING_CACHE_TTL = 60000; // 60s

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let { text, voice } = await req.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    // Server-side text sanitization
    text = text
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/__(.*?)__/g, "$1")
      .replace(/_(.*?)_/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/^\s*#+\s+/gm, "")
      .replace(/^\s*[-*+]\s+/gm, "")
      .replace(/[*`_#]/g, "")
      .replace(/—/g, "... ")
      .replace(/\s+/g, " ")
      .trim();

    if (!text) {
      return NextResponse.json({ error: "Empty text after sanitization" }, { status: 400 });
    }

    const now = Date.now();
    let openRouterApiKey = process.env.OPENROUTER_API_KEY || cachedOpenRouterKey;
    if (!openRouterApiKey || now - lastKeyFetchTime > SETTING_CACHE_TTL) {
      try {
        const dbKey = await prisma.systemSetting.findUnique({
          where: { key: "OPENROUTER_API_KEY" },
        });
        if (dbKey?.value) {
          cachedOpenRouterKey = dbKey.value;
          openRouterApiKey = dbKey.value;
        }
        lastKeyFetchTime = now;
      } catch {}
    }

    if (!openRouterApiKey) {
      return NextResponse.json(
        { error: "OpenRouter API Key not configured" },
        { status: 500 }
      );
    }

    let targetModel = process.env.OPENROUTER_TTS_MODEL || "hexgrad/kokoro-82m";
    let targetVoice = voice || "af_heart";
    let fallbackVoice = "af_heart";

    // Smart Auto-Routing based on Voice ID Prefix
    if (voice) {
      if (voice.startsWith("minimax_")) {
        targetModel = "minimax/speech-01";
        if (voice === "minimax_male_presenter") targetVoice = "presenter_male";
        else if (voice === "minimax_female_shaonv") targetVoice = "female-shaonv";
        else if (voice === "minimax_female_yujie") targetVoice = "female-yujie";
        else targetVoice = "female-shaonv";
        fallbackVoice = voice.includes("female") ? "af_heart" : "am_adam";
      } else if (voice.startsWith("gemini_")) {
        // OpenRouter uses openai/tts-1 for standard audio voices (alloy, echo, onyx, nova, shimmer)
        targetModel = "openai/tts-1";
        targetVoice = voice.replace("gemini_", ""); // alloy, echo, onyx, nova, shimmer
        fallbackVoice = ["nova", "shimmer"].includes(targetVoice) ? "af_heart" : "am_adam";
      } else if (voice.startsWith("af_") || voice.startsWith("am_") || voice.startsWith("if_")) {
        targetModel = "hexgrad/kokoro-82m";
        targetVoice = voice;
        fallbackVoice = voice;
      }
    }

    // Check if Admin has configured an explicit TTS_MODEL override in DB (cached 60s)
    if (now - lastModelSettingFetchTime > SETTING_CACHE_TTL) {
      try {
        const dbTtsModelSetting = await prisma.systemSetting.findUnique({
          where: { key: "TTS_MODEL" },
        });
        cachedTtsModelSetting = dbTtsModelSetting?.value || null;
        lastModelSettingFetchTime = now;
      } catch {}
    }
    if (cachedTtsModelSetting && cachedTtsModelSetting !== "auto") {
      targetModel = cachedTtsModelSetting;
    }

    // ─── 🚀 In-Memory LRU Audio Cache Check (Sub-Millisecond Return) ───────
    const cacheKey = `${targetModel}:${targetVoice}:${text}`;
    const cachedEntry = ttsMemoryCache.get(cacheKey);
    if (cachedEntry) {
      return new NextResponse(new Uint8Array(cachedEntry.buffer), {
        status: 200,
        headers: {
          "Content-Type": cachedEntry.contentType,
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800, immutable",
          "X-Audio-Cache": "HIT",
        },
      });
    }

    // Format text input for SSML / prosody pacing if sending to premium models (MiniMax, OpenAI/Gemini)
    const isPremiumSsmlModel = targetModel.includes("minimax") || targetModel.includes("openai") || targetModel.includes("gemini");
    const formattedSsmlInput = isPremiumSsmlModel
      ? text.replace(/\.\.\./g, ' <break time="350ms"/> ').replace(/,\s*/g, ' <break time="150ms"/> ')
      : text;

    // Primary Attempt with Target Model
    let response = await fetch("https://openrouter.ai/api/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openRouterApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: targetModel,
        input: formattedSsmlInput,
        voice: targetVoice,
        response_format: "mp3",
      }),
    });

    // Fallback Attempt 1: If MiniMax/Gemini failed, try openai/tts-1 with alloy/nova
    if (!response.ok && targetModel !== "openai/tts-1" && targetModel !== "hexgrad/kokoro-82m") {
      console.warn(`Primary TTS model (${targetModel}) failed. Trying openai/tts-1 fallback...`);
      response = await fetch("https://openrouter.ai/api/v1/audio/speech", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openRouterApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/tts-1",
          input: text,
          voice: ["nova", "shimmer"].includes(targetVoice) ? "nova" : "alloy",
          response_format: "mp3",
        }),
      });
    }

    // Fallback Attempt 2: If primary & secondary failed, fallback to solid Kokoro-82m
    if (!response.ok) {
      console.warn(`Primary & Secondary TTS failed. Falling back to Kokoro-82m (${fallbackVoice})...`);
      response = await fetch("https://openrouter.ai/api/v1/audio/speech", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openRouterApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "hexgrad/kokoro-82m",
          input: text,
          voice: fallbackVoice,
          response_format: "mp3",
        }),
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("All OpenRouter TTS attempts failed:", response.status, errorText);
      return NextResponse.json(
        { error: "Text-to-speech failed" },
        { status: response.status }
      );
    }

    // Read full audio buffer into memory for caching & client response
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get("content-type") || "audio/mpeg";

    // Store in LRU cache with eviction if limit exceeded
    if (ttsMemoryCache.size >= MAX_SERVER_AUDIO_CACHE) {
      const oldestKey = ttsMemoryCache.keys().next().value;
      if (oldestKey) ttsMemoryCache.delete(oldestKey);
    }
    ttsMemoryCache.set(cacheKey, { buffer, contentType });

    // Stream the audio buffer back with HTTP caching headers
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800, immutable",
        "X-Audio-Cache": "MISS",
      },
    });
  } catch (error) {
    console.error("Error in TTS route:", error);
    return NextResponse.json(
      { error: "Failed to process text" },
      { status: 500 }
    );
  }
}
