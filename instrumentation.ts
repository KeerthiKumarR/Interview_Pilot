/**
 * Next.js Server Lifecycle Instrumentation
 * Automatically detects Render deployment and initiates an anti-sleep keep-alive loop.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const renderUrl = process.env.RENDER_EXTERNAL_URL || process.env.NEXT_PUBLIC_APP_URL;

    if (renderUrl) {
      console.log(`[KeepAlive] Initializing Render anti-sleep pinger for ${renderUrl}`);

      // Ping every 12 minutes (Render free tier sleeps after 15 minutes of inactivity)
      const INTERVAL_MS = 12 * 60 * 1000;

      setInterval(async () => {
        try {
          const target = `${renderUrl.replace(/\/$/, "")}/api/health`;
          const res = await fetch(target, { cache: "no-store" });
          console.log(`[KeepAlive] Pinged ${target} — Status: ${res.status}`);
        } catch (err) {
          console.warn("[KeepAlive] Self-ping encountered an error:", err);
        }
      }, INTERVAL_MS);
    }
  }
}

