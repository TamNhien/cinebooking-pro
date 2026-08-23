import { expect, Page, test } from "@playwright/test";

const PASSWORD="V46Security!Customer123";

async function logoutToLogin(page:Page){
  const logoutResponse=page.waitForResponse(response=>response.url().includes("/api/auth/logout")&&response.request().method()==="POST");
  await page.getByRole("button",{name:"Đăng xuất"}).click();
  const response=await logoutResponse;
  expect(response.status()).toBe(204);
  await page.goto("/login");
  await expect(page.getByRole("button",{name:"Đăng nhập"})).toBeVisible();
}

test("V46 user trusts a Brave device and admin sees security alerts",async({page})=>{
  await page.addInitScript(()=>{Object.defineProperty(navigator,"brave",{configurable:true,value:{isBrave:async()=>true}});});
  const stamp=`${Date.now()}-${Math.floor(Math.random()*100000)}`;
  const email=`v46-security-${stamp}@example.test`;
  await page.goto("/register");
  await page.getByPlaceholder("Họ và tên").fill("V46 Security Customer");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Nhập mật khẩu").fill(PASSWORD);
  await page.getByPlaceholder("Nhập lại mật khẩu").fill(PASSWORD);
  await page.getByRole("button",{name:"Đăng ký"}).click();
  await expect(page).toHaveURL(/\/$/);

  await logoutToLogin(page);
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Mật khẩu").fill(PASSWORD);
  await page.getByRole("button",{name:"Đăng nhập"}).click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto("/security");
  await expect(page.getByRole("heading",{name:"Trung tâm bảo mật tài khoản"})).toBeVisible();
  const alert=page.getByTestId("security-alert").filter({hasText:"Đăng nhập từ thiết bị chưa tin cậy"}).first();
  await expect(alert).toBeVisible();
  await expect(alert).toContainText("Brave");
  await page.getByLabel("Nhãn thiết bị tin cậy").fill("Laptop E2E V46");
  await page.getByRole("button",{name:"Tin cậy thiết bị hiện tại"}).click();
  const trusted=page.getByTestId("trusted-device").filter({hasText:"Laptop E2E V46"});
  await expect(trusted).toBeVisible();
  await expect(trusted).toContainText("Brave");
  await alert.getByRole("button",{name:"Tôi đã kiểm tra"}).click();
  await expect(alert).toContainText("Đã xác nhận");

  await logoutToLogin(page);
  const adminEmail=process.env.E2E_ADMIN_EMAIL||"admin-v29@cine.local";
  const adminPassword=process.env.E2E_ADMIN_PASSWORD||"V29SmokeOnly-ChangeMe";
  await page.getByPlaceholder("Email").fill(adminEmail);
  await page.getByPlaceholder("Mật khẩu").fill(adminPassword);
  await page.getByRole("button",{name:"Đăng nhập"}).click();
  await page.goto("/admin/security");
  await expect(page.getByRole("heading",{name:"Security Operations"})).toBeVisible();
  await expect(page.getByTestId("admin-security-alert").filter({hasText:"NEW_DEVICE"}).first()).toBeVisible();
});
