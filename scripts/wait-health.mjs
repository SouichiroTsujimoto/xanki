#!/usr/bin/env node
/**
 * Wait until URL returns HTTP 2xx (default: cloud health check).
 * Usage: node scripts/wait-health.mjs [url] [timeoutSec]
 */
const url = process.argv[2] ?? "http://localhost:8787/api/health";
const timeoutSec = Number(process.argv[3] ?? "60");
const deadline = Date.now() + timeoutSec * 1000;

async function ping() {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

while (Date.now() < deadline) {
  try {
    await ping();
    console.log(`OK ${url}`);
    process.exit(0);
  } catch {
    await new Promise((r) => setTimeout(r, 500));
  }
}

console.error(`Timeout waiting for ${url}`);
process.exit(1);
