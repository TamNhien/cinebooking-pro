import { expect, test } from "@playwright/test";
import { gotoSurface, loginExistingAdmin } from "./runtime-guards";

test("V70 Data Governance & Privacy exposes guarded retention mode and keeps version tiles ascending",async({page})=>{
  await loginExistingAdmin(page);
  const tile=page.getByTestId("admin-privacy-governance-v70");
  await expect(tile).toBeVisible();
  await expect(tile).toContainText("Quản trị quyền riêng tư V70");

  const versionLabels=await page.locator('[data-testid="admin-action-grid-v59"] a').allTextContents();
  const versions=versionLabels.map(label=>label.match(/\bV(\d+)\b/)).filter((m):m is RegExpMatchArray=>Boolean(m)).map(m=>Number(m[1]));
  expect(versions).toEqual([...versions].sort((a,b)=>a-b));
  expect(versions.at(-1)).toBeGreaterThanOrEqual(70);

  await tile.click();
  await expect(page).toHaveURL(/\/admin\/privacy-governance$/);
  await gotoSurface(page, "/admin/privacy-governance", "privacy-governance-v70");
  await expect(page.getByTestId("privacy-governance-v70")).toContainText("V70 · QUẢN TRỊ DỮ LIỆU & QUYỀN RIÊNG TƯ 5.0");
  await expect(page.getByTestId("privacy-governance-summary-v70")).toContainText("V70-DATA-GOVERNANCE-PRIVACY-5");
  await expect.poll(async()=>page.getByTestId("privacy-governance-summary-v70").getAttribute("data-retention-mode"),{timeout:30_000}).not.toBe("LOADING");
  await expect(page.getByTestId("privacy-governance-summary-v70")).toHaveAttribute("data-retention-mode",/DRY_RUN|EXECUTION_ENABLED/);
  await expect(page.getByTestId("privacy-retention-policies-v70")).toBeVisible();
  await expect(page.getByTestId("privacy-governance-error-v70")).toHaveCount(0);
});
