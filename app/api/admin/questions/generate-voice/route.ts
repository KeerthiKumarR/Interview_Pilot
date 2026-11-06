import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdmin } from "@/lib/admin-auth";
import fs from "fs/promises";
import path from "path";

/**
 * POST /api/admin/questions/generate-voice
 * Generates an audio file for a question's prompt text using Gnani.ai Timbre TTS,
 * saves it into public/audio/questions/[questionId].wav,
 * and attaches the audioUrl to the question in the database.
 */
export async function POST(req: Request) {
  if (!(await authorizeAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { questionId, text, voice = "gnani_nalini" } = body;

    if (!questionId || !text) {
      return NextResponse.json(
        { error: "questionId and text are required" },
        { status: 400 }
      );
    }

    // Sanitize text for speech
    const cleanText = text
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/[*`_#]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    // ─── 🇮🇳 Primary: Gnani.ai Timbre Voice Engine ───────────────────────
    const gnaniApiKey = process.env.GNANI_API_KEY;
    if (gnaniApiKey) {
      try {
        let gnaniVoice = "Nalini";
        if (voice === "gnani_arun" || voice === "arun" || voice?.includes("male") || voice?.includes("ramesh")) gnaniVoice = "Deepak";
        else if (voice === "gnani_pooja" || voice === "pooja") gnaniVoice = "Pooja";
        else gnaniVoice = "Nalini";

        const gnaniModel = process.env.GNANI_TIMBRE_MODEL || "timbre-v2.5";
        const gnaniRes = await fetch("https://api.vachana.ai/api/v1/tts/inference", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key-ID": gnaniApiKey,
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)",
          },
          body: JSON.stringify({
            text: cleanText,
            voice: gnaniVoice,
            model: gnaniModel,
            language: "en-IN",
            speed: 1,
            audio_config: {
              container: "wav",
            },
          }),
        });

        if (gnaniRes.ok) {
          const audioArrayBuffer = await gnaniRes.arrayBuffer();
          const audioBuffer = Buffer.from(audioArrayBuffer);

          const audioDir = path.join(process.cwd(), "public", "audio", "questions");
          await fs.mkdir(audioDir, { recursive: true });

          const fileName = `${questionId}.wav`;
          const filePath = path.join(audioDir, fileName);
          await fs.writeFile(filePath, audioBuffer);

          const audioUrl = `/audio/questions/${fileName}?t=${Date.now()}`;

          await prisma.interviewQuestion.update({
            where: { id: questionId },
            data: {
              audioUrl,
              audioSource: "generated",
            },
          });

          return NextResponse.json({
            success: true,
            audioUrl,
            provider: "gnani-timbre",
          });
        }
      } catch (err) {
        console.warn("Gnani Timbre question audio generation failed, trying fallback:", err);
      }
    }

    // ─── Fallback Voice Synthesis ──────────────────────────────────────────
    let openRouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterApiKey) {
      try {
        const dbKey = await prisma.systemSetting.findUnique({
          where: { key: "OPENROUTER_API_KEY" },
        });
        if (dbKey?.value) openRouterApiKey = dbKey.value;
      } catch {}
    }

    if (!openRouterApiKey && !gnaniApiKey) {
      return NextResponse.json(
        { error: "No voice synthesis service configured. Please provide GNANI_API_KEY in environment." },
        { status: 500 }
      );
    }

    if (openRouterApiKey) {
      const targetModel = process.env.OPENROUTER_TTS_MODEL || "hexgrad/kokoro-82m";
      const targetVoice = "af_heart";

      const ttsResponse = await fetch("https://openrouter.ai/api/v1/audio/speech", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openRouterApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: targetModel,
          input: cleanText,
          voice: targetVoice,
          response_format: "mp3",
        }),
      });

      if (ttsResponse.ok) {
        const audioArrayBuffer = await ttsResponse.arrayBuffer();
        const audioBuffer = Buffer.from(audioArrayBuffer);

        const audioDir = path.join(process.cwd(), "public", "audio", "questions");
        await fs.mkdir(audioDir, { recursive: true });

        const fileName = `${questionId}.mp3`;
        const filePath = path.join(audioDir, fileName);
        await fs.writeFile(filePath, audioBuffer);

        const audioUrl = `/audio/questions/${fileName}?t=${Date.now()}`;

        await prisma.interviewQuestion.update({
          where: { id: questionId },
          data: {
            audioUrl,
            audioSource: "generated",
          },
        });

        return NextResponse.json({
          success: true,
          audioUrl,
        });
      }
    }

    return NextResponse.json(
      { error: "Voice synthesis failed. Please verify voice engine credentials." },
      { status: 500 }
    );
  } catch (error: unknown) {
    console.error("Error generating question audio:", error);
    const message = error instanceof Error ? error.message : "Failed to generate audio";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
