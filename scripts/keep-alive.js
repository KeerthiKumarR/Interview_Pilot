#!/usr/bin/env node
/**
 * Standalone Keep-Alive Pinger for Render Free Tier
 * Usage: node scripts/keep-alive.js <your-render-url>
 * Example: node scripts/keep-alive.js https://interview-pilot.onrender.com
 */

const targetUrl = process.argv[2] || process.env.RENDER_EXTERNAL_URL;

if (!targetUrl) {
  console.error("Usage: node scripts/keep-alive.js https://your-service.onrender.com");
  process.exit(1);
}

const pingUrl = `${targetUrl.replace(/\/$/, "")}/api/health`;
const PING_INTERVAL_MS = 12 * 60 * 1000; // 12 minutes

console.log(`🚀 Starting Render Anti-Sleep Keep-Alive for: ${pingUrl}`);
console.log(`⏱️ Interval: Every 12 minutes (Render idle sleep timeout is 15 mins)\n`);

async function ping() {
  const time = new Date().toLocaleTimeString();
  try {
    const res = await fetch(pingUrl, { cache: "no-store" });
    console.log(`[${time}] ✅ Ping successful! Status: ${res.status}`);
  } catch (err) {
    console.error(`[${time}] ⚠️ Ping error:`, err.message);
  }
}

// Initial ping
ping();

// Recurring ping
setInterval(ping, PING_INTERVAL_MS);

