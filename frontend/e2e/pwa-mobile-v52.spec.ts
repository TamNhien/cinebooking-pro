import { expect, test } from "@playwright/test";
import { gotoHydrated, gotoSurface } from "./runtime-guards";

const PASSWORD="V52Pwa!Mobile123";

test("V52 PWA registers a real browser device and keeps push delivery mode honest",async({page})=>{
  const stamp=`${Date.now()}-${Math.floor(Math.random()*100000)}`;
  const email=`minh.thu+${stamp}@example.com`;

  await gotoSurface(page, "/register", "register-name");
  await page.getByPlaceholder("Họ và tên").fill("Lê Minh Thư");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Nhập mật khẩu").fill(PASSWORD);
  await page.getByPlaceholder("Nhập lại mật khẩu").fill(PASSWORD);
  await page.getByRole("button",{name:"Đăng ký"}).click();
  await expect(page).toHaveURL(/\/$/);

  await gotoHydrated(page, "/mobile");
  await expect(page.getByText("Trải nghiệm di động 3.0")).toBeVisible();
  await expect.poll(async()=>page.getByTestId("pwa-push-v52").getAttribute("data-delivery-mode"),{timeout:30_000}).not.toBe("LOADING");
  await expect(page.getByTestId("pwa-push-v52")).toHaveAttribute("data-delivery-mode",/FOREGROUND_FALLBACK|VAPID_BACKGROUND/);
  await expect(page.getByTestId("pwa-push-v52")).toContainText(/Push OFF|Đẩy TẮT/);

  const devices=page.getByTestId("pwa-devices-v52");
  await expect.poll(async()=>devices.getByRole("button",{name:"Gỡ"}).count(),{timeout:15000}).toBeGreaterThan(0);
  await expect(devices).toContainText("Thiết bị này");
  await expect(devices).toContainText(/Push OFF|Đẩy TẮT/);

  await gotoSurface(page, "/offline-tickets", "offline-tickets-v52");
  await expect(page.getByText("Vé ngoại tuyến đã kiểm soát")).toBeVisible();
  await expect(page.getByText(/QR được lưu cục bộ/)).toBeVisible();
  await expect(page.getByRole("button",{name:/Đồng bộ tất cả vé/})).toBeVisible();
});
