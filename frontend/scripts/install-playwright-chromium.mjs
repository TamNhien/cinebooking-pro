import { spawnSync } from "node:child_process";

const timeout = process.env.PLAYWRIGHT_DOWNLOAD_CONNECTION_TIMEOUT || "120000";
const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const env = {
  ...process.env,
  PLAYWRIGHT_DOWNLOAD_CONNECTION_TIMEOUT: timeout,
};

console.log(`[cinebooking] Installing Playwright Chromium with ${timeout} ms connection timeout...`);
const result = spawnSync(npx, ["playwright", "install", "chromium"], {
  stdio: "inherit",
  env,
});

if (result.status !== 0) {
  console.error("[cinebooking] Playwright CDN download failed.");
  if (process.platform === "win32") {
    console.error('[cinebooking] Local fallback: set $env:PLAYWRIGHT_BROWSER_CHANNEL="msedge" and run the E2E test again.');
  }
  process.exit(result.status ?? 1);
}
