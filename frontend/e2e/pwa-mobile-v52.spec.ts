import { expect, test } from "@playwright/test";

const PASSWORD="V52Pwa!Mobile123";

test("V52 PWA registers a real browser device and keeps push honest without VAPID",async({page})=>{
  const stamp=`${Date.now()}-${Math.floor(Math.random()*100000)}`;
  const email=`minh.thu+${stamp}@example.com`;

  await page.goto("/register");
  await page.getByPlaceholder("Họ và tên").fill("Lê Minh Thư");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Nhập mật khẩu").fill(PASSWORD);
  await page.getByPlaceholder("Nhập lại mật khẩu").fill(PASSWORD);
  await page.getByRole("button",{name:"Đăng ký"}).click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto("/mobile");
  await expect(page.getByText("Mobile Experience 3.0")).toBeVisible();
  await expect(page.getByTestId("pwa-push-v52")).toContainText("FOREGROUND_FALLBACK");
  await expect(page.getByTestId("pwa-push-v52")).toContainText("Push OFF");

  const devices=page.getByTestId("pwa-devices-v52");
  await expect.poll(async()=>devices.getByRole("button",{name:"Gỡ"}).count(),{timeout:15000}).toBeGreaterThan(0);
  await expect(devices).toContainText("Thiết bị này");
  await expect(devices).toContainText("Push OFF");

  await page.goto("/offline-tickets");
  await expect(page.getByText("Vé offline đã kiểm soát")).toBeVisible();
  await expect(page.getByText(/QR được lưu cục bộ/)).toBeVisible();
  await expect(page.getByRole("button",{name:/Đồng bộ tất cả vé/})).toBeVisible();
});
