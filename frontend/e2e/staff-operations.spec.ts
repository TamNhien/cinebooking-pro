import { expect, test } from "@playwright/test";

test("V43 admin sees realtime staff operations and can close an incident",async({page})=>{
  const adminEmail=process.env.E2E_ADMIN_EMAIL||"admin-v29@cine.local";
  const adminPassword=process.env.E2E_ADMIN_PASSWORD||"V29SmokeOnly-ChangeMe";
  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(adminEmail);
  await page.getByPlaceholder("Mật khẩu").fill(adminPassword);
  await Promise.all([page.waitForURL(/\/admin$/,{timeout:15000}),page.getByRole("button",{name:"Đăng nhập"}).click()]);

  await page.goto("/staff/operations");
  await expect(page.getByRole("heading",{name:"Trung tâm vận hành rạp realtime"})).toBeVisible();
  await expect(page.getByText("Lượt check-in realtime",{exact:false})).toBeVisible();

  const stamp=Date.now().toString();
  const incidentTitle=`Khách cần hỗ trợ tại cổng soát vé ${stamp}`;
  await page.getByPlaceholder("Tiêu đề sự cố").fill(incidentTitle);
  await page.getByPlaceholder("Mô tả chi tiết tình huống và hành động ban đầu").fill("Khách gặp khó khăn khi quét mã QR tại cổng soát vé và cần nhân viên hỗ trợ trực tiếp.");
  await page.getByRole("button",{name:"Ghi nhận sự cố"}).click();
  const card=page.getByTestId("staff-incident").filter({hasText:incidentTitle});
  await expect(card).toBeVisible();
  await expect(card).toContainText("OPEN");
  await card.getByPlaceholder("Ghi chú xử lý").fill("Đã kiểm tra mã vé, hướng dẫn khách quét lại và xác nhận vào rạp thành công");
  await card.getByRole("button",{name:"Đóng sự cố"}).click();
  await expect(card).toContainText("RESOLVED");
  await expect(card).toContainText("Đã kiểm tra mã vé, hướng dẫn khách quét lại và xác nhận vào rạp thành công");
});
