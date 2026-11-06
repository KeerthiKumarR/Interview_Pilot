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

/**
 * High-quality Google Regional Neural TTS ($0 cost, 100% reliable fallback).
 * Provides native female voices for Hindi, Kannada, Tamil, Telugu, and Indian English.
 */
async function fetchGoogleRegionalTTS(text: string, language: string): Promise<Buffer | null> {
  try {
    let tl = "en-IN";
    if (language?.startsWith("hi") || /[\u0900-\u097F]/.test(text)) tl = "hi";
    else if (language?.startsWith("kn") || /[\u0C80-\u0CFF]/.test(text)) tl = "kn";
    else if (language?.startsWith("ta") || /[\u0B80-\u0BFF]/.test(text)) tl = "ta";
    else if (language?.startsWith("te") || /[\u0C00-\u0C7F]/.test(text)) tl = "te";
    else if (language?.startsWith("bn") || /[\u0980-\u09FF]/.test(text)) tl = "bn";
    else if (language?.startsWith("gu") || /[\u0A80-\u0AFF]/.test(text)) tl = "gu";
    else if (language?.startsWith("ml") || /[\u0D00-\u0D7F]/.test(text)) tl = "ml";
    else if (language?.startsWith("mr")) tl = "mr";
    else if (language === "en-US") tl = "en";
    else if (language === "en-GB") tl = "en-GB";

    // Split text into chunks <= 180 chars on punctuation boundaries to comply with Google TTS limits
    const sentences = text.match(/[^.!?।\n]+[.!?।\n]*/g) || [text];
    const chunks: string[] = [];
    let current = "";
    for (const s of sentences) {
      if ((current + " " + s).trim().length <= 180) {
        current = (current + " " + s).trim();
      } else {
        if (current) chunks.push(current);
        if (s.length > 180) {
          const words = s.split(/\s+/);
          let sub = "";
          for (const w of words) {
            if ((sub + " " + w).trim().length <= 180) {
              sub = (sub + " " + w).trim();
            } else {
              if (sub) chunks.push(sub);
              sub = w;
            }
          }
          if (sub) chunks.push(sub);
          current = "";
        } else {
          current = s;
        }
      }
    }
    if (current) chunks.push(current);

    const buffers: Buffer[] = [];
    for (const chunk of chunks) {
      if (!chunk.trim()) continue;
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk.trim())}&tl=${tl}&client=tw-ob`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });
      if (!res.ok) return null;
      const ab = await res.arrayBuffer();
      buffers.push(Buffer.from(ab));
    }

    return buffers.length > 0 ? Buffer.concat(buffers) : null;
  } catch (err) {
    console.warn("fetchGoogleRegionalTTS error:", err);
    return null;
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let { text, voice, language } = await req.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    // Auto-detect Indic script from text if not provided or left as generic English
    if (!language || language === "en-IN" || language === "en-US") {
      if (/[\u0900-\u097F]/.test(text)) {
        language = "hi-IN";
      } else if (/[\u0C80-\u0CFF]/.test(text)) {
        language = "kn-IN";
      } else if (/[\u0B80-\u0BFF]/.test(text)) {
        language = "ta-IN";
      } else if (/[\u0C00-\u0C7F]/.test(text)) {
        language = "te-IN";
      } else if (/[\u0980-\u09FF]/.test(text)) {
        language = "bn-IN";
      } else if (/[\u0A80-\u0AFF]/.test(text)) {
        language = "gu-IN";
      } else if (/[\u0D00-\u0D7F]/.test(text)) {
        language = "ml-IN";
      } else {
        language = language || "en-IN";
      }
    }

    // Server-side text sanitization
    text = text
      .replace(/(?:\*Thinking\.\.\.\*[\s\S]*?---\s*\n?)/gi, "")
      .replace(/<think>[\s\S]*?<\/think>/gi, "")
      .replace(/<thought>[\s\S]*?<\/thought>/gi, "")
      .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, "")
      .replace(/^Thinking\.\.\.[\s\S]*?---\s*\n?/gi, "")
      .replace(/(?:tokens?\s*(?:used|count)?|cost|latency):\s*\d+/gi, "")
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

    // ─── 🇮🇳 Primary Voice Engine: Gnani.ai Timbre TTS ──────────────────────────
    const gnaniApiKey = process.env.GNANI_API_KEY;
    const textLower = text.toLowerCase();
    const mentionsMale =
      textLower.includes("i'm arun") ||
      textLower.includes("i am arun") ||
      textLower.includes("i'm ramesh") ||
      textLower.includes("i am ramesh") ||
      textLower.includes("arun speaking") ||
      textLower.includes("ramesh speaking");
    const mentionsFemale =
      textLower.includes("i'm nalini") ||
      textLower.includes("i am nalini") ||
      textLower.includes("i'm pooja") ||
      textLower.includes("i am pooja") ||
      textLower.includes("nalini speaking") ||
      textLower.includes("pooja speaking");

    let isMaleVoice =
      voice === "gnani_arun" ||
      voice === "arun" ||
      voice === "local_male" ||
      voice?.includes("male") ||
      voice?.includes("arun") ||
      voice?.includes("ramesh") ||
      voice?.startsWith("am_");

    if (mentionsMale) {
      isMaleVoice = true;
    } else if (mentionsFemale) {
      isMaleVoice = false;
    }

    if (gnaniApiKey) {
      try {
        let gnaniVoice = isMaleVoice
          ? "Deepak" // Gnani Timbre v2.5 verified native Indian male voice (Deepak/Gaurav)
          : (voice === "gnani_pooja" || voice?.includes("pooja") ? "Pooja" : "Nalini");
        // Only use Indic language code if the text actually contains Indic script!
        // If the text is in English (Latin alphabet), ALWAYS use "en-IN" so Nalini speaks in her natural Indian English voice.
        const hasIndicScript = /[\u0900-\u0D7F]/.test(text);
        let targetLang = "en-IN";
        if (hasIndicScript) {
          if (/[\u0900-\u097F]/.test(text)) targetLang = "hi-IN";
          else if (/[\u0C80-\u0CFF]/.test(text)) targetLang = "kn-IN";
          else if (/[\u0B80-\u0BFF]/.test(text)) targetLang = "ta-IN";
          else if (/[\u0C00-\u0C7F]/.test(text)) targetLang = "te-IN";
          else if (/[\u0980-\u09FF]/.test(text)) targetLang = "bn-IN";
          else if (/[\u0A80-\u0AFF]/.test(text)) targetLang = "gu-IN";
          else if (/[\u0D00-\u0D7F]/.test(text)) targetLang = "ml-IN";
        }

        const gnaniModel = process.env.GNANI_TIMBRE_MODEL || "timbre-v2.5";
        const gnaniCacheKey = `gnani:${gnaniModel}:${gnaniVoice}:${targetLang}:${text}`;
        const gnaniCached = ttsMemoryCache.get(gnaniCacheKey);

        if (gnaniCached) {
          return new NextResponse(new Uint8Array(gnaniCached.buffer), {
            status: 200,
            headers: {
              "Content-Type": gnaniCached.contentType,
              "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800, immutable",
              "X-Audio-Cache": "HIT",
              "X-TTS-Provider": "gnani-timbre",
            },
          });
        }

        const gnaniRes = await fetch("https://api.vachana.ai/api/v1/tts/inference", {
          method: "POST",
          signal: AbortSignal.timeout(8000),
          headers: {
            "Content-Type": "application/json",
            "X-API-Key-ID": gnaniApiKey,
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)",
          },
          body: JSON.stringify({
            text,
            voice: gnaniVoice,
            model: gnaniModel,
            language: targetLang,
            speed: 1,
            audio_config: {
              container: "wav",
            },
          }),
        });

        if (gnaniRes.ok) {
          const arrayBuffer = await gnaniRes.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const contentType = gnaniRes.headers.get("content-type") || "audio/wav";

          if (ttsMemoryCache.size >= MAX_SERVER_AUDIO_CACHE) {
            const oldestKey = ttsMemoryCache.keys().next().value;
            if (oldestKey) ttsMemoryCache.delete(oldestKey);
          }
          ttsMemoryCache.set(gnaniCacheKey, { buffer, contentType });

          return new NextResponse(new Uint8Array(buffer), {
            status: 200,
            headers: {
              "Content-Type": contentType,
              "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800, immutable",
              "X-Audio-Cache": "MISS",
              "X-TTS-Provider": "gnani-timbre",
            },
          });
        } else {
          const errText = await gnaniRes.text();
          console.warn("Gnani Timbre TTS failed, using voice fallback:", gnaniRes.status, errText);
        }
      } catch (err) {
        console.warn("Gnani Timbre TTS call error, using voice fallback:", err);
      }
    }

    // ─── 🇮🇳 Indic Regional Languages (Hindi, Kannada, Tamil, Telugu, etc.) ────
    // OpenRouter Kokoro does NOT support Indic scripts and will fail or produce noise.
    // Use Google Regional Neural Voice for natural, fluent native speech.
    const hasIndicText = /[\u0900-\u097F\u0C80-\u0CFF\u0B80-\u0BFF\u0C00-\u0C7F\u0980-\u09FF\u0A80-\u0AFF\u0D00-\u0D7F]/.test(text);

    if (hasIndicText && !isMaleVoice) {
      let regionalLang = language || "hi-IN";
      if (/[\u0900-\u097F]/.test(text)) regionalLang = "hi-IN";
      else if (/[\u0C80-\u0CFF]/.test(text)) regionalLang = "kn-IN";
      else if (/[\u0B80-\u0BFF]/.test(text)) regionalLang = "ta-IN";
      else if (/[\u0C00-\u0C7F]/.test(text)) regionalLang = "te-IN";
      else if (/[\u0980-\u09FF]/.test(text)) regionalLang = "bn-IN";
      else if (/[\u0A80-\u0AFF]/.test(text)) regionalLang = "gu-IN";
      else if (/[\u0D00-\u0D7F]/.test(text)) regionalLang = "ml-IN";

      const regionalCacheKey = `regional:${regionalLang}:${text}`;
      const regionalCached = ttsMemoryCache.get(regionalCacheKey);
      if (regionalCached) {
        return new NextResponse(new Uint8Array(regionalCached.buffer), {
          status: 200,
          headers: {
            "Content-Type": regionalCached.contentType,
            "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800, immutable",
            "X-Audio-Cache": "HIT",
            "X-TTS-Provider": "google-regional",
          },
        });
      }

      const googleBuffer = await fetchGoogleRegionalTTS(text, language);
      if (googleBuffer) {
        if (ttsMemoryCache.size >= MAX_SERVER_AUDIO_CACHE) {
          const oldestKey = ttsMemoryCache.keys().next().value;
          if (oldestKey) ttsMemoryCache.delete(oldestKey);
        }
        ttsMemoryCache.set(regionalCacheKey, { buffer: googleBuffer, contentType: "audio/mpeg" });

        return new NextResponse(new Uint8Array(googleBuffer), {
          status: 200,
          headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800, immutable",
            "X-Audio-Cache": "MISS",
            "X-TTS-Provider": "google-regional",
          },
        });
      }
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
      // For male voices, Google Translate TTS only provides a female voice. Return 503 so client uses native male WebSpeech
      if (isMaleVoice) {
        return NextResponse.json(
          { error: "Male cloud TTS unavailable, deferring to browser male speech synthesis" },
          { status: 503 }
        );
      }
      const googleBuffer = await fetchGoogleRegionalTTS(text, language);
      if (googleBuffer) {
        return new NextResponse(new Uint8Array(googleBuffer), {
          status: 200,
          headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800, immutable",
            "X-Audio-Cache": "FALLBACK",
            "X-TTS-Provider": "google-regional",
          },
        });
      }
      return NextResponse.json(
        { error: gnaniApiKey ? "Gnani Timbre TTS failed and voice fallback unavailable" : "Voice synthesis service not configured" },
        { status: 500 }
      );
    }

    let targetModel = process.env.OPENROUTER_TTS_MODEL || "hexgrad/kokoro-82m";
    let targetVoice = isMaleVoice ? "am_adam" : (voice || "af_heart");
    let fallbackVoice = isMaleVoice ? "am_adam" : "af_heart";

    // Smart Auto-Routing based on Voice ID Prefix
    if (voice) {
      if (voice.startsWith("minimax_")) {
        targetModel = "minimax/speech-01";
        if (voice === "minimax_male_presenter") targetVoice = "presenter_male";
        else if (voice === "minimax_female_shaonv") targetVoice = "female-shaonv";
        else if (voice === "minimax_female_yujie") targetVoice = "female-yujie";
        else targetVoice = isMaleVoice ? "presenter_male" : "female-shaonv";
        fallbackVoice = isMaleVoice ? "am_adam" : "af_heart";
      } else if (voice.startsWith("gemini_")) {
        // OpenRouter uses openai/tts-1 for standard audio voices (alloy, echo, onyx, nova, shimmer)
        targetModel = "openai/tts-1";
        targetVoice = voice.replace("gemini_", ""); // alloy, echo, onyx, nova, shimmer
        fallbackVoice = ["nova", "shimmer"].includes(targetVoice) ? "af_heart" : "am_adam";
      } else if (voice.startsWith("af_") || voice.startsWith("am_") || voice.startsWith("if_")) {
        targetModel = "hexgrad/kokoro-82m";
        targetVoice = voice;
        fallbackVoice = isMaleVoice ? "am_adam" : "af_heart";
      } else if (isMaleVoice) {
        targetModel = "hexgrad/kokoro-82m";
        targetVoice = "am_adam";
        fallbackVoice = "am_adam";
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
      console.warn("All OpenRouter TTS attempts failed, using Google Regional fallback:", response.status, errorText);

      const googleBuffer = await fetchGoogleRegionalTTS(text, language);
      if (googleBuffer) {
        if (ttsMemoryCache.size >= MAX_SERVER_AUDIO_CACHE) {
          const oldestKey = ttsMemoryCache.keys().next().value;
          if (oldestKey) ttsMemoryCache.delete(oldestKey);
        }
        ttsMemoryCache.set(cacheKey, { buffer: googleBuffer, contentType: "audio/mpeg" });

        return new NextResponse(new Uint8Array(googleBuffer), {
          status: 200,
          headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800, immutable",
            "X-Audio-Cache": "FALLBACK",
            "X-TTS-Provider": "google-regional",
          },
        });
      }

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
