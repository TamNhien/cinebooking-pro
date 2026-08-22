import { expect, test } from "@playwright/test";

test("V45 customer opens a support case and admin resolves it with immutable conversation",async({page})=>{
  const adminEmail=process.env.E2E_ADMIN_EMAIL||"admin-v29@cine.local";
  const adminPassword=process.env.E2E_ADMIN_PASSWORD||"V29SmokeOnly-ChangeMe";
  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(adminEmail);
  await page.getByPlaceholder("Mật khẩu").fill(adminPassword);
  await Promise.all([page.waitForURL(/\/admin$/,{timeout:15000}),page.getByRole("button",{name:"Đăng nhập"}).click()]);

  const stamp=Date.now().toString().slice(-8);
  const subject=`V45 E2E support ${stamp}`;
  await page.goto("/support");
  await expect(page.getByRole("heading",{name:"Trung tâm hỗ trợ khách hàng"})).toBeVisible();
  await page.getByLabel("Loại hỗ trợ").selectOption("OTHER");
  await page.getByLabel("Tiêu đề hỗ trợ").fill(subject);
  await page.getByLabel("Mô tả hỗ trợ").fill("Kiểm tra luồng tiếp nhận, phản hồi, SLA và đóng yêu cầu V45.");
  await page.getByRole("button",{name:"Gửi yêu cầu hỗ trợ"}).click();
  await expect(page.getByTestId("support-case-row").filter({hasText:subject})).toBeVisible();

  await page.goto("/admin/support");
  await expect(page.getByRole("heading",{name:"Support Operations"})).toBeVisible();
  await page.getByLabel("Rạp hỗ trợ").selectOption("");
  const card=page.getByTestId("admin-support-case").filter({hasText:subject});
  await expect(card).toBeVisible();
  await expect(card).toContainText("OPEN");
  await card.getByRole("button",{name:"Nhận xử lý"}).click();
  await expect(card).toContainText("IN_PROGRESS");
  page.once("dialog",dialog=>dialog.accept("Đã xác minh yêu cầu và hoàn tất service recovery V45"));
  await card.getByRole("button",{name:"Giải quyết"}).click();
  await expect(card).toContainText("RESOLVED");
  await card.getByRole("button",{name:"Lịch sử"}).click();
  await expect(card).toContainText("STATUS_CHANGED");
  await expect(card).toContainText("service recovery V45");
});
