import { expect, test, type Page } from "@playwright/test";
import { gotoHydrated, waitForHydratedRuntime } from "./runtime-guards";

function adminCredentials(){
  const email=process.env.E2E_ADMIN_EMAIL;
  const password=process.env.E2E_ADMIN_PASSWORD;
  if(!email||!password)throw new Error("E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD must come from the existing project .env");
  return {email,password};
}
async function loginAdmin(page:Page){
  const {email,password}=adminCredentials();
  await gotoHydrated(page, "/login");
  await page.getByTestId("login-email").fill(email);
  await page.getByTestId("login-password").fill(password);
  await Promise.all([page.waitForURL(/\/admin$/,{timeout:15000}),page.getByTestId("login-submit").click()]);
  await waitForHydratedRuntime(page);
}
async function unlockStepUp(page:Page){
  const {password}=adminCredentials();
  await gotoHydrated(page, "/admin/security");
  await expect(page.getByTestId("admin-step-up-v68")).toBeVisible();
  const locked=page.getByTestId("step-up-password-v68");
  if(await locked.isVisible().catch(()=>false)){
    await locked.fill(password);
    await page.getByTestId("step-up-unlock-v68").click();
  }
  await expect(page.getByTestId("step-up-status-v68")).toContainText(/ĐÃ MỞ KHÓA|UNLOCKED/);
}

test("V64 previews visibly and publishes with V68 step-up using the existing admin account",async({page})=>{
  await loginAdmin(page);
  const tile=page.getByTestId("admin-marketing-v64");
  await expect(tile).toBeVisible();
  await tile.click();

  await expect(page).toHaveURL(/\/admin\/marketing$/);
  await waitForHydratedRuntime(page);
  await expect(page.getByTestId("marketing-v64")).toContainText("V64 · CRM & TỰ ĐỘNG HÓA TIẾP THỊ 4.0");
  await expect(page.getByText("V64-CRM-AUTOMATION-4")).toBeVisible();
  await expect(page.getByTestId("campaign-preview-v64")).toBeEnabled({timeout:30000});
  await expect(page.getByTestId("segments-loading-v64")).toHaveCount(0);
  await expect(page.getByTestId("segments-v64")).toContainText("VIP giá trị cao");

  const code=`E2E${Date.now().toString(36).slice(-8)}`.toUpperCase();
  await page.getByPlaceholder("VD: WINBACK_AUG").fill(code);
  const segmentSelect=page.getByTestId("segment-select-v64");
  await expect(segmentSelect.locator("option")).toHaveCount(7);
  await segmentSelect.selectOption("ALL_ELIGIBLE");
  await page.getByTestId("campaign-preview-v64").click();

  const feedback=page.getByTestId("campaign-feedback-v64");
  await expect(feedback).toBeVisible();
  await expect(feedback).toContainText(/Xem trước sẵn sàng|Preview ready/);
  const preview=page.getByTestId("campaign-preview-result-v64");
  await expect(preview).toBeVisible();
  await expect(preview).toContainText(code);
  await expect(page.getByTestId("campaign-launch-v64")).toBeEnabled();

  // Launch is intentionally guarded by V68. The UI must explain this instead of
  // appearing to do nothing after confirmation.
  await page.getByTestId("campaign-launch-v64").click();
  await expect(feedback).toContainText(/V68/);
  await expect(page.getByTestId("campaign-step-up-link-v64")).toBeVisible();

  await unlockStepUp(page);
  await gotoHydrated(page, "/admin/marketing");
  await expect(page).toHaveURL(/\/admin\/marketing$/);
  await expect(page.getByTestId("campaign-preview-v64")).toBeEnabled({timeout:30000});
  await expect(page.getByTestId("segments-loading-v64")).toHaveCount(0);
  await page.getByPlaceholder("VD: WINBACK_AUG").fill(code);
  const segmentSelectAfterStepUp=page.getByTestId("segment-select-v64");
  await expect(segmentSelectAfterStepUp.locator("option")).toHaveCount(7);
  await segmentSelectAfterStepUp.selectOption("ALL_ELIGIBLE");
  await page.getByTestId("campaign-preview-v64").click();
  await expect(page.getByTestId("campaign-preview-result-v64")).toBeVisible();
  page.once("dialog",dialog=>dialog.accept());
  await page.getByTestId("campaign-launch-v64").click();
  await expect(page.getByTestId("campaign-launch-result-v64")).toBeVisible();
  await expect(page.getByTestId("campaign-feedback-v64")).toContainText(/Đã phát hành|Published/);
});
