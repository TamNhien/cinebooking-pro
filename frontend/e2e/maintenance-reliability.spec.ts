import { expect, test } from "@playwright/test";

test("V44 admin registers equipment and resolves a maintenance work order",async({page})=>{
  const adminEmail=process.env.E2E_ADMIN_EMAIL||"admin-v29@cine.local";
  const adminPassword=process.env.E2E_ADMIN_PASSWORD||"V29SmokeOnly-ChangeMe";
  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(adminEmail);
  await page.getByPlaceholder("Mật khẩu").fill(adminPassword);
  await Promise.all([page.waitForURL(/\/admin$/,{timeout:15000}),page.getByRole("button",{name:"Đăng nhập"}).click()]);

  await page.goto("/admin/maintenance");
  await expect(page.getByRole("heading",{name:"Trung tâm bảo trì & độ tin cậy thiết bị"})).toBeVisible();
  await expect.poll(async()=>page.getByLabel("Rạp bảo trì").locator("option").count()).toBeGreaterThan(0);

  const stamp=Date.now().toString().slice(-8);
  const code=`E2E-${stamp}`;
  const assetName=`Máy chiếu E2E ${stamp}`;
  await page.getByPlaceholder("Mã: PRJ-HCM-01").fill(code);
  await page.getByPlaceholder("Tên thiết bị").fill(assetName);
  await page.getByRole("button",{name:"Thêm thiết bị"}).click();
  const assetRow=page.getByTestId("maintenance-asset-row").filter({hasText:code});
  await expect(assetRow).toBeVisible();
  await expect(assetRow).toContainText(assetName);

  const title=`V44 E2E ${stamp}`;
  await page.getByPlaceholder("Tiêu đề công việc").fill(title);
  await page.getByPlaceholder("Mô tả lỗi / công việc cần làm").fill("Kiểm tra độ sáng, quạt và nguồn máy chiếu trong bài test V44.");
  await page.getByLabel("Thiết bị work order").selectOption({label:`${code} · ${assetName}`});
  await page.getByRole("button",{name:"Tạo work order"}).click();

  const card=page.getByTestId("maintenance-work-order").filter({hasText:title});
  await expect(card).toBeVisible();
  await expect(card).toContainText("OPEN");
  await card.getByRole("button",{name:"Bắt đầu"}).click();
  await expect(card).toContainText("IN_PROGRESS");
  page.once("dialog",async dialog=>{await dialog.accept("Đã kiểm tra và hiệu chuẩn máy chiếu bằng Playwright V44");});
  await card.getByRole("button",{name:"Hoàn tất"}).click();
  await expect(card).toContainText("RESOLVED");
  await card.getByRole("button",{name:"Lịch sử"}).click();
  await expect(card).toContainText("STATUS_CHANGED");
  await expect(card).toContainText("Đã kiểm tra và hiệu chuẩn máy chiếu bằng Playwright V44");
});
