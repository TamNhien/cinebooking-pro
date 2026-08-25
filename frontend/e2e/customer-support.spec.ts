import { expect, test } from "@playwright/test";

const CUSTOMER_PASSWORD="Support!Customer123";
const AUTH_STORAGE_KEY="cinebooking_auth_v3";

async function logoutToLogin(page:any,context:any){
  const status=await page.evaluate(async(authStorageKey:string)=>{
    const response=await fetch("/api/auth/logout",{method:"POST",credentials:"include",cache:"no-store"});
    localStorage.removeItem(authStorageKey);
    return response.status;
  },AUTH_STORAGE_KEY);
  expect(status).toBe(204);
  await context.clearCookies();
  await page.goto("/login",{waitUntil:"domcontentloaded"});
}

test("V45 customer opens a support case and admin resolves it with immutable conversation",async({page,context})=>{
  const adminEmail=process.env.E2E_ADMIN_EMAIL||"admin-v29@cine.local";
  const adminPassword=process.env.E2E_ADMIN_PASSWORD||"V29SmokeOnly-ChangeMe";
  const stamp=Date.now().toString().slice(-8);
  const customerEmail=`gia.han+support-${stamp}@example.com`;
  const subject=`Không nhận được email xác nhận vé #${stamp}`;

  await page.goto("/register");
  await page.getByPlaceholder("Họ và tên").fill("Lê Gia Hân");
  await page.getByPlaceholder("Email").fill(customerEmail);
  await page.getByPlaceholder("Nhập mật khẩu").fill(CUSTOMER_PASSWORD);
  await page.getByPlaceholder("Nhập lại mật khẩu").fill(CUSTOMER_PASSWORD);
  await page.getByRole("button",{name:"Đăng ký"}).click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto("/support");
  await expect(page.getByRole("heading",{name:"Trung tâm hỗ trợ khách hàng"})).toBeVisible();
  await page.getByLabel("Loại hỗ trợ").selectOption("OTHER");
  await page.getByLabel("Tiêu đề hỗ trợ").fill(subject);
  await page.getByLabel("Mô tả hỗ trợ").fill("Khách đã thanh toán thành công nhưng chưa nhận được email xác nhận vé và cần kiểm tra lại booking.");
  await page.getByRole("button",{name:"Gửi yêu cầu hỗ trợ"}).click();
  await expect(page.getByTestId("support-case-row").filter({hasText:subject})).toBeVisible();

  await logoutToLogin(page,context);
  await page.getByPlaceholder("Email").fill(adminEmail);
  await page.getByPlaceholder("Mật khẩu").fill(adminPassword);
  await Promise.all([page.waitForURL(/\/admin$/,{timeout:15000}),page.getByRole("button",{name:"Đăng nhập"}).click()]);

  await page.goto("/admin/support");
  await expect(page.getByRole("heading",{name:"Support Operations"})).toBeVisible();
  await page.getByLabel("Rạp hỗ trợ").selectOption("");
  const card=page.getByTestId("admin-support-case").filter({hasText:subject});
  await expect(card).toBeVisible();
  await expect(card).toContainText("OPEN");
  await card.getByRole("button",{name:"Nhận xử lý"}).click();
  await expect(card).toContainText("IN_PROGRESS");
  page.once("dialog",dialog=>dialog.accept("Đã xác minh booking và gửi lại email xác nhận vé cho khách hàng."));
  await card.getByRole("button",{name:"Giải quyết"}).click();
  await expect(card).toContainText("RESOLVED");
  await card.getByRole("button",{name:"Lịch sử"}).click();
  await expect(card).toContainText("STATUS_CHANGED");
  await expect(card).toContainText("gửi lại email xác nhận vé");
});
