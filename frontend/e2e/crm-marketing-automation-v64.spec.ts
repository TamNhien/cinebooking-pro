import { expect, test } from "@playwright/test";

async function loginAdmin(page:any){
  const email=process.env.E2E_ADMIN_EMAIL||"admin-v29@cine.local";
  const password=process.env.E2E_ADMIN_PASSWORD||"V29SmokeOnly-ChangeMe";
  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Mật khẩu").fill(password);
  await Promise.all([
    page.waitForURL(/\/admin$/,{timeout:15000}),
    page.getByRole("button",{name:"Đăng nhập"}).click(),
  ]);
}

test("V64 CRM segments real customers and previews an idempotent voucher campaign",async({page})=>{
  await loginAdmin(page);

  const tile=page.getByTestId("admin-marketing-v64");
  await expect(tile).toBeVisible();
  await expect(tile).toContainText("CRM & Marketing V64");
  await tile.click();

  await expect(page).toHaveURL(/\/admin\/marketing$/);
  await expect(page.getByTestId("marketing-v64")).toContainText("V64 · CRM & MARKETING AUTOMATION 4.0");
  await expect(page.getByText("V64-CRM-AUTOMATION-4")).toBeVisible();
  await expect(page.getByTestId("segments-v64")).toContainText("VIP giá trị cao");
  await expect(page.getByTestId("segments-v64")).toContainText("Có nguy cơ rời bỏ");
  await expect(page.getByTestId("segments-v64")).toContainText("Đã đăng ký, chưa mua");

  const code=`E2E${Date.now().toString(36).slice(-8)}`.toUpperCase();
  await page.getByPlaceholder("VD: WINBACK_AUG").fill(code);
  await page.getByTestId("segment-select-v64").selectOption("ALL_ELIGIBLE");
  await page.getByTestId("campaign-preview-v64").click();

  const preview=page.getByTestId("campaign-preview-result-v64");
  await expect(preview).toBeVisible();
  await expect(preview).toContainText(code);
  await expect(preview).toContainText("Voucher cá nhân owner_user_id");
  await expect(preview).toContainText("opt-out promotion");
  await expect(page.getByTestId("campaign-launch-v64")).toBeEnabled();
});
