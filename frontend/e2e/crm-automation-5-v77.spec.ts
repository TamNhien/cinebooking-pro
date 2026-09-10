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

test("V77 CRM Automation 5.0 exposes lifecycle safety and preview",async({page})=>{
  await loginAdmin(page);

  const tile=page.getByTestId("admin-crm-automation-v77");
  await expect(tile).toBeVisible();
  await expect(tile).toContainText("CRM Automation V77");
  await expect(tile).toHaveAttribute("href","/admin/crm-automation");

  const versionLabels=await page.locator('[data-testid="admin-action-grid-v59"] a').allTextContents();
  const versions=versionLabels.map(label=>label.match(/\bV(\d+)\b/)).filter((m):m is RegExpMatchArray=>Boolean(m)).map(m=>Number(m[1]));
  expect(versions).toEqual([...versions].sort((a,b)=>a-b));
  expect(versions).toContain(76);
  expect(versions.at(-1)).toBe(77);

  await tile.click();
  await expect(page).toHaveURL(/\/admin\/crm-automation$/);
  await expect(page.getByTestId("crm-automation-v77")).toContainText("V77 · CRM AUTOMATION 5.0");
  await expect(page.getByTestId("crm-summary-v77")).toContainText("V77-CRM-AUTOMATION-5");
  await expect(page.getByTestId("crm-policy-v77")).toContainText("REAL_OPERATIONAL_DATA_ONLY");
  await expect(page.getByTestId("crm-policy-v77")).toContainText("PROMOTION_OPT_OUT_RESPECTED");
  await expect(page.getByTestId("crm-policy-v77")).toContainText("FREQUENCY_CAP_2_PER_7D");
  await expect(page.getByTestId("crm-policy-v77")).toContainText("PROMOTION_COOLDOWN_72H");
  await expect(page.getByTestId("crm-policy-v77")).toContainText("MAX_RECIPIENTS_BLAST_RADIUS_GUARD");
  await expect(page.getByTestId("crm-policy-v77")).toContainText("CRM_ASSISTED_BOOKING_IS_CORRELATION_NOT_CAUSATION");
  await expect(page.getByTestId("crm-outcomes-v77")).toContainText("CORRELATION ONLY");
  await expect(page.getByTestId("crm-suppressions-v77")).toContainText("PROMOTION_OPT_OUT");
  await expect(page.getByTestId("crm-playbooks-v77")).toContainText("AT_RISK_WINBACK");

  await page.getByPlaceholder("VD: WINBACK_SEP").fill("E2ECRM77");
  await page.getByTestId("crm-max-recipients-v77").fill("100");
  await page.getByTestId("crm-preview-v77").click();
  await expect(page.getByTestId("crm-preview-result-v77")).toBeVisible();
  await expect(page.getByTestId("crm-preview-result-v77")).toContainText("E2ECRM77");
  await expect(page.getByTestId("crm-error-v77")).toHaveCount(0);
});
