import { expect, test } from "@playwright/test";

const PASSWORD="V46Security!Customer123";

test("V46 user trusts a device and admin sees security alerts",async({page})=>{
  const stamp=`${Date.now()}-${Math.floor(Math.random()*100000)}`;
  const email=`v46-security-${stamp}@example.test`;
  await page.goto("/register");
  await page.getByPlaceholder("Họ và tên").fill("V46 Security Customer");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Nhập mật khẩu").fill(PASSWORD);
  await page.getByPlaceholder("Nhập lại mật khẩu").fill(PASSWORD);
  await page.getByRole("button",{name:"Đăng ký"}).click();
  await expect(page).toHaveURL(/\/$/);

  await page.getByRole("button",{name:"Đăng xuất"}).click();
  await expect(page).toHaveURL(/\/login/);
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Mật khẩu").fill(PASSWORD);
  await page.getByRole("button",{name:"Đăng nhập"}).click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto("/security");
  await expect(page.getByRole("heading",{name:"Trung tâm bảo mật tài khoản"})).toBeVisible();
  const alert=page.getByTestId("security-alert").filter({hasText:"Đăng nhập từ thiết bị chưa tin cậy"}).first();
  await expect(alert).toBeVisible();
  await page.getByLabel("Nhãn thiết bị tin cậy").fill("Laptop E2E V46");
  await page.getByRole("button",{name:"Tin cậy thiết bị hiện tại"}).click();
  await expect(page.getByTestId("trusted-device").filter({hasText:"Laptop E2E V46"})).toBeVisible();
  await alert.getByRole("button",{name:"Tôi đã kiểm tra"}).click();
  await expect(alert).toContainText("Đã xác nhận");

  await page.getByRole("button",{name:"Đăng xuất"}).click();
  const adminEmail=process.env.E2E_ADMIN_EMAIL||"admin-v29@cine.local";
  const adminPassword=process.env.E2E_ADMIN_PASSWORD||"V29SmokeOnly-ChangeMe";
  await page.getByPlaceholder("Email").fill(adminEmail);
  await page.getByPlaceholder("Mật khẩu").fill(adminPassword);
  await page.getByRole("button",{name:"Đăng nhập"}).click();
  await page.goto("/admin/security");
  await expect(page.getByRole("heading",{name:"Security Operations"})).toBeVisible();
  await expect(page.getByTestId("admin-security-alert").filter({hasText:"NEW_DEVICE"}).first()).toBeVisible();
});
