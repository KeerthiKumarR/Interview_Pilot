import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/ollama/ping
 * Checks if local Ollama daemon is running on localhost:11434 and lists available models.
 */
export async function GET() {
  const ollamaUrl = process.env.OLLAMA_API_URL || "http://localhost:11434";
  const cleanBase = ollamaUrl.replace(/\/v1\/?$/, "");

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(`${cleanBase}/api/tags`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = (await res.json()) as {
        models?: Array<{ name?: string; model?: string }>;
      };
      const models = Array.isArray(data.models)
        ? data.models
            .map((m) => m.name || m.model || "")
            .filter((name) => name.length > 0)
        : [];

      return NextResponse.json({
        available: true,
        online: true,
        url: cleanBase,
        models,
        message:
          models.length > 0
            ? `Connected to Ollama (${models.length} model${models.length > 1 ? "s" : ""}: ${models.slice(0, 3).join(", ")})`
            : "Connected to Ollama on http://localhost:11434",
      });
    }

    return NextResponse.json({
      available: false,
      online: false,
      url: cleanBase,
      error: `Ollama returned status ${res.status}`,
      message: `Ollama returned status ${res.status}`,
    });
  } catch {
    return NextResponse.json({
      available: false,
      online: false,
      url: cleanBase,
      error: "Ollama is not running locally. Start it with 'ollama serve' or select Hosted Cloud AI.",
      message: "Ollama is not running locally. Start it with 'ollama serve' or select Hosted Cloud AI.",
    });
  }
}
