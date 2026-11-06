import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const formData = await req.formData();
    const file = formData.get("file") as Blob | null;

    if (!file) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    const requestedLanguage = (formData.get("language") as string) || "en-IN";

    // 1. Primary: Gnani.ai Prisma ASR (Native Multilingual Indian Accents & Code-Mixing)
    const gnaniApiKey = process.env.GNANI_API_KEY;
    if (gnaniApiKey) {
      try {
        const gnaniFormData = new FormData();
        gnaniFormData.append("audio_file", file, "audio.wav");
        gnaniFormData.append("language_code", requestedLanguage);

        const gnaniRes = await fetch("https://api.vachana.ai/stt/v3", {
          method: "POST",
          headers: {
            "X-API-Key-ID": gnaniApiKey,
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)",
          },
          body: gnaniFormData,
        });

        if (gnaniRes.ok) {
          const data = await gnaniRes.json();
          const transcript = data.transcript || data.output?.literal || "";
          if (transcript.trim()) {
            return NextResponse.json({ text: transcript.trim(), provider: "gnani-prisma" });
          }
        } else {
          const errText = await gnaniRes.text();
          console.warn("Gnani Prisma STT returned non-OK:", gnaniRes.status, errText);
        }
      } catch (err) {
        console.warn("Gnani Prisma STT call error, falling back:", err);
      }
    }

    // 2. High-speed Fallback: Groq Whisper if available
    const groqApiKey = process.env.GROQ_API_KEY;
    if (groqApiKey) {
      try {
        const groqFormData = new FormData();
        groqFormData.append("file", file, "audio.webm");
        groqFormData.append("model", "whisper-large-v3-turbo");
        groqFormData.append("temperature", "0");
        groqFormData.append("language", "en");
        groqFormData.append(
          "prompt",
          "Technical software engineering placement viva discussing React, Next.js, Node.js, Python, TypeScript, SQL, PostgreSQL, MongoDB, Redis, Docker, REST API endpoints, microservices, system architecture, and trade-offs."
        );

        const groqRes = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${groqApiKey}`,
          },
          body: groqFormData,
        });

        if (groqRes.ok) {
          const data = await groqRes.json();
          if (data.text) {
            return NextResponse.json({ text: data.text });
          }
        } else {
          const errText = await groqRes.text();
          console.warn("Groq STT returned non-OK:", groqRes.status, errText);
        }
      } catch (err) {
        console.warn("Groq STT call error, falling back:", err);
      }
    }

    // 2. Fallback to OpenRouter Speech-to-Text (requires base64 JSON payload)
    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_STT_MODEL || "openai/whisper-large-v3";

    if (!openRouterApiKey && !groqApiKey && !gnaniApiKey) {
      return NextResponse.json(
        { error: "Speech-to-text service unavailable. Please check microphone or audio service settings." },
        { status: 500 }
      );
    }

    if (openRouterApiKey) {
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const base64Audio = buffer.toString("base64");

        const response = await fetch(
          "https://openrouter.ai/api/v1/audio/transcriptions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${openRouterApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model,
              input_audio: {
                data: base64Audio,
                format: "webm",
              },
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          return NextResponse.json({
            text: data.text || "",
          });
        }

        const errorText = await response.text();
        console.error("OpenRouter STT error:", response.status, errorText);
      } catch (err) {
        console.error("OpenRouter STT fetch error:", err);
      }
    }

    return NextResponse.json(
      { error: "Speech-to-text service unavailable", fallbackToWebSpeech: true },
      { status: 502 }
    );
  } catch (error) {
    console.error("Error in STT route:", error);
    return NextResponse.json(
      { error: "Failed to process audio", fallbackToWebSpeech: true },
      { status: 500 }
    );
  }
}
