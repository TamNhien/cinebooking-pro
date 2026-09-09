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

test("V69 Backup & DR exposes readiness and keeps version tiles ascending",async({page})=>{
  await loginAdmin(page);
  const tile=page.getByTestId("admin-disaster-recovery-v69");
  await expect(tile).toBeVisible();
  await expect(tile).toContainText("Backup & DR V69");

  const versionLabels=await page.locator('[data-testid="admin-action-grid-v59"] a').allTextContents();
  const versions=versionLabels.map(label=>label.match(/\bV(\d+)\b/)).filter((m):m is RegExpMatchArray=>Boolean(m)).map(m=>Number(m[1]));
  expect(versions).toEqual([...versions].sort((a,b)=>a-b));
  expect(versions.at(-1)).toBe(69);

  await tile.click();
  await expect(page).toHaveURL(/\/admin\/disaster-recovery$/);
  await expect(page.getByTestId("disaster-recovery-v69")).toContainText("V69 · BACKUP & DISASTER RECOVERY 5.0");
  await expect(page.getByTestId("disaster-recovery-summary-v69")).toContainText("V69-BACKUP-DR-5");
  await expect(page.getByTestId("dr-runbook-v69")).toContainText("backup-dr-v69.ps1");
  await expect(page.getByTestId("dr-evidence-policy-v69")).toContainText("APPEND-ONLY");
  await expect(page.getByTestId("disaster-recovery-error-v69")).toHaveCount(0);
});
