import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface CachedSettings {
  ttsModel: string;
  ttsSpeed: number;
  expiresAt: number;
}

let settingsCache: CachedSettings | null = null;

/**
 * GET /api/tts/settings
 * Public endpoint that returns the active TTS_MODEL system setting.
 * Uses 60s memory caching to prevent repeated remote DB roundtrips.
 */
export async function GET() {
  const now = Date.now();
  if (settingsCache && settingsCache.expiresAt > now) {
    return NextResponse.json(
      { ttsModel: settingsCache.ttsModel, ttsSpeed: settingsCache.ttsSpeed },
      {
        headers: {
          "Cache-Control": "public, max-age=60, stale-while-revalidate=120",
        },
      }
    );
  }

  try {
    const settings = await prisma.systemSetting.findMany({
      where: { key: { in: ["TTS_MODEL", "TTS_SPEED"] } },
    });
    const map = settings.reduce((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {} as Record<string, string>);

    const ttsModel = map["TTS_MODEL"] || "auto";
    const ttsSpeed = parseFloat(map["TTS_SPEED"] || "1.0");

    settingsCache = {
      ttsModel,
      ttsSpeed,
      expiresAt: now + 60_000, // 60s cache
    };

    return NextResponse.json(
      { ttsModel, ttsSpeed },
      {
        headers: {
          "Cache-Control": "public, max-age=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (error) {
    console.error("Failed to fetch TTS settings:", error);
    return NextResponse.json({ ttsModel: "auto", ttsSpeed: 1.0 });
  }
}
