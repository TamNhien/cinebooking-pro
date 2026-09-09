import { defineConfig, devices } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

type EnvMap = Record<string,string>;

function parseEnvFile(filePath:string):EnvMap {
  if(!fs.existsSync(filePath)) return {};
  const values:EnvMap={};
  for(const rawLine of fs.readFileSync(filePath,"utf8").split(/\r?\n/)){
    const line=rawLine.trim();
    if(!line || line.startsWith("#")) continue;
    const eq=line.indexOf("=");
    if(eq<=0) continue;
    const key=line.slice(0,eq).trim();
    let value=line.slice(eq+1).trim();
    if((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))){
      value=value.slice(1,-1);
    }
    values[key]=value;
  }
  return values;
}

function loadProjectAdminCredentials(){
  // Local Playwright is normally started from ./frontend. CI may invoke it from
  // either the repository root or ./frontend, so inspect both locations.
  const candidates=[
    path.resolve(process.cwd(),"../.env"),
    path.resolve(process.cwd(),".env"),
  ];
  let localEnv:EnvMap={};
  for(const candidate of candidates){
    const parsed=parseEnvFile(candidate);
    if(Object.keys(parsed).length){ localEnv=parsed; break; }
  }

  // Explicit E2E_* always wins. Otherwise mirror the same ADMIN_* values that
  // Docker Compose/Spring uses. The local .env is read only; secrets are never
  // printed or copied into test artifacts by this loader.
  process.env.E2E_ADMIN_EMAIL ||= process.env.ADMIN_EMAIL || localEnv.ADMIN_EMAIL || "admin@cine.local";
  process.env.E2E_ADMIN_PASSWORD ||= process.env.ADMIN_PASSWORD || localEnv.ADMIN_PASSWORD || "Admin@123";
}

loadProjectAdminCredentials();

const baseURL=process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:18080";

function isLoopbackHttps(url:string){
  try{
    const parsed=new URL(url);
    return parsed.protocol==="https:" && ["localhost","127.0.0.1","::1"].includes(parsed.hostname);
  }catch{
    return false;
  }
}

// Chromium trusts the mkcert root through the Windows certificate store, but
// Playwright APIRequestContext runs in Node.js, whose CA trust can differ.
// Ignore certificate verification only for the explicit loopback HTTPS E2E
// target so local APIRequestContext calls use the same trusted-local stack
// without weakening TLS verification for CI or remote environments.
const ignoreLoopbackHttpsErrors=isLoopbackHttps(baseURL);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [
    ["line"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],
  use: {
    baseURL,
    ignoreHTTPSErrors: ignoreLoopbackHttpsErrors,
    locale: "vi-VN",
    timezoneId: "Asia/Ho_Chi_Minh",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
