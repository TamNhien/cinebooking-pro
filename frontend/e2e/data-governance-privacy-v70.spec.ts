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

test("V70 Data Governance & Privacy exposes dry-run governance and keeps version tiles ascending",async({page})=>{
  await loginAdmin(page);
  const tile=page.getByTestId("admin-privacy-governance-v70");
  await expect(tile).toBeVisible();
  await expect(tile).toContainText("Privacy Governance V70");

  const versionLabels=await page.locator('[data-testid="admin-action-grid-v59"] a').allTextContents();
  const versions=versionLabels.map(label=>label.match(/\bV(\d+)\b/)).filter((m):m is RegExpMatchArray=>Boolean(m)).map(m=>Number(m[1]));
  expect(versions).toEqual([...versions].sort((a,b)=>a-b));
  expect(versions.at(-1)).toBe(70);

  await tile.click();
  await expect(page).toHaveURL(/\/admin\/privacy-governance$/);
  await expect(page.getByTestId("privacy-governance-v70")).toContainText("V70 · DATA GOVERNANCE & PRIVACY 5.0");
  await expect(page.getByTestId("privacy-governance-summary-v70")).toContainText("V70-DATA-GOVERNANCE-PRIVACY-5");
  await expect(page.getByTestId("privacy-governance-summary-v70")).toContainText("DRY-RUN ONLY");
  await expect(page.getByTestId("privacy-retention-policies-v70")).toContainText("OFF");
  await expect(page.getByTestId("privacy-governance-error-v70")).toHaveCount(0);
});
