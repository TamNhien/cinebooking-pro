import { expect, test } from "@playwright/test";
import { ensureSurface, loginExistingAdmin } from "./runtime-guards";

test("V69 Backup & DR exposes readiness and keeps version tiles ascending",async({page})=>{
  await loginExistingAdmin(page);
  const tile=page.getByTestId("admin-disaster-recovery-v69");
  await expect(tile).toBeVisible();
  await expect(tile).toContainText("Sao lưu & phục hồi V69");

  const versionLabels=await page.locator('[data-testid="admin-action-grid-v59"] a').allTextContents();
  const versions=versionLabels.map(label=>label.match(/\bV(\d+)\b/)).filter((m):m is RegExpMatchArray=>Boolean(m)).map(m=>Number(m[1]));
  expect(versions).toEqual([...versions].sort((a,b)=>a-b));
  expect(versions.at(-1)).toBeGreaterThanOrEqual(69);

  await tile.click();
  await expect(page).toHaveURL(/\/admin\/disaster-recovery$/);
  const root=await ensureSurface(page,"disaster-recovery-v69","/admin/disaster-recovery");
  await expect(root).toHaveAttribute("data-dr-ready","true",{timeout:30_000});
  await expect(root).toContainText("V69 · SAO LƯU & PHỤC HỒI SAU THẢM HỌA 5.0");
  await expect(page.getByTestId("disaster-recovery-summary-v69")).toContainText("V69-BACKUP-DR-5");
  await expect(page.getByTestId("dr-runbook-v69")).toContainText("backup-dr-v69.ps1");
  await expect(page.getByTestId("dr-evidence-policy-v69")).toHaveAttribute("data-evidence-mode","APPEND_ONLY");
  await expect(page.getByTestId("disaster-recovery-error-v69")).toHaveCount(0);
});
