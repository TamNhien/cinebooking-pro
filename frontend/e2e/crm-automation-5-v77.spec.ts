import { expect, test } from "@playwright/test";
import { ensureSurface, loginExistingAdmin } from "./runtime-guards";

test("V77 CRM Automation 5.0 exposes lifecycle safety and preview",async({page})=>{
  await loginExistingAdmin(page);

  const tile=page.getByTestId("admin-crm-automation-v77");
  await expect(tile).toBeVisible();
  await expect(tile).toContainText("Tự động hóa CRM V77");
  await expect(tile).toHaveAttribute("href","/admin/crm-automation");

  const versionLabels=await page.locator('[data-testid="admin-action-grid-v59"] a').allTextContents();
  const versions=versionLabels.map(label=>label.match(/\bV(\d+)\b/)).filter((m):m is RegExpMatchArray=>Boolean(m)).map(m=>Number(m[1]));
  expect(versions).toEqual([...versions].sort((a,b)=>a-b));
  expect(versions).toContain(76);
  expect(versions.at(-1)).toBe(77);

  await tile.click();
  await expect(page).toHaveURL(/\/admin\/crm-automation$/);
  const crm=await ensureSurface(page,"crm-automation-v77","/admin/crm-automation");
  await expect(crm).toContainText("V77 · TỰ ĐỘNG HÓA CRM 5.0");
  await expect(crm).toHaveAttribute("data-crm-ready","true",{timeout:30_000});
  await expect(page.getByTestId("crm-summary-v77")).toContainText("V77-CRM-AUTOMATION-5");
  const policy=page.getByTestId("crm-policy-v77");
  await expect(policy).toHaveAttribute("data-policy-real-operational","true");
  await expect(policy).toHaveAttribute("data-policy-promotion-opt-out","true");
  await expect(policy).toHaveAttribute("data-policy-frequency-cap","true");
  await expect(policy).toHaveAttribute("data-policy-cooldown","true");
  await expect(policy).toHaveAttribute("data-policy-blast-radius","true");
  await expect(policy).toHaveAttribute("data-policy-correlation-only","true");
  await expect(page.getByTestId("crm-outcomes-v77")).toContainText("CHỈ LÀ TƯƠNG QUAN");
  await expect(page.getByTestId("crm-suppressions-v77")).toContainText("PROMOTION_OPT_OUT");
  await expect(page.getByTestId("crm-playbooks-v77")).toContainText("Kịch bản vòng đời");

  await page.getByPlaceholder("VD: WINBACK_SEP").fill("E2ECRM77");
  await page.getByTestId("crm-max-recipients-v77").fill("100");
  await page.getByTestId("crm-preview-v77").click();
  await expect(page.getByTestId("crm-preview-result-v77")).toBeVisible();
  await expect(page.getByTestId("crm-preview-result-v77")).toContainText("E2ECRM77");
  await expect(page.getByTestId("crm-error-v77")).toHaveCount(0);
});
