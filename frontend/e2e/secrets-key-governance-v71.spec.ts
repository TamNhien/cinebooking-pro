import { expect, test, type Page } from "@playwright/test";

async function loginAdmin(page:Page){
  const email=process.env.E2E_ADMIN_EMAIL||"admin@cine.local";
  const password=process.env.E2E_ADMIN_PASSWORD||"Admin@123";
  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Mật khẩu").fill(password);
  await page.getByRole("button",{name:"Đăng nhập"}).click();
  await page.waitForURL(/\/admin$/,{timeout:15000});
}

test("V71 Secrets & Key Governance exposes metadata-only posture and keeps version tiles ascending",async({page})=>{
  await loginAdmin(page);
  const tile=page.getByTestId("admin-key-governance-v71");
  await expect(tile).toBeVisible();
  await expect(tile).toContainText("Key Governance V71");

  const versionLabels=await page.locator('[data-testid="admin-action-grid-v59"] a').allTextContents();
  const versions=versionLabels.map(label=>label.match(/\bV(\d+)\b/)).filter((m):m is RegExpMatchArray=>Boolean(m)).map(m=>Number(m[1]));
  expect(versions).toEqual([...versions].sort((a,b)=>a-b));
  expect(versions.at(-1)).toBe(71);

  await tile.click();
  await expect(page).toHaveURL(/\/admin\/key-governance$/);
  await expect(page.getByTestId("key-governance-v71")).toContainText("V71 · SECRETS & KEY GOVERNANCE 5.0");
  await expect(page.getByTestId("key-governance-summary-v71")).toContainText("V71-SECRETS-KEY-GOVERNANCE-5");
  await expect(page.getByTestId("key-governance-policies-v71")).toContainText("NO_SECRET_VALUES_IN_DATABASE");
  await expect(page.getByTestId("key-governance-policy-v71")).toContainText("Auto-rotation execution mặc định OFF");
  await expect(page.getByTestId("key-governance-error-v71")).toHaveCount(0);
});
