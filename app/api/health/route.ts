import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Lightweight Health & Anti-Sleep Ping Endpoint for Render / Uptime Monitors
 * Returns instant 200 OK without hitting database or incurring API costs.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: "healthy",
      service: "interview-pilot",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}

