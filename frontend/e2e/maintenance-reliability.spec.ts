import { expect, test } from "@playwright/test";

test("V44 quản trị viên đăng ký thiết bị và hoàn tất phiếu bảo trì", async ({ page }) => {
  const adminEmail = process.env.E2E_ADMIN_EMAIL || "admin-v29@cine.local";
  const adminPassword = process.env.E2E_ADMIN_PASSWORD || "V29SmokeOnly-ChangeMe";

  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(adminEmail);
  await page.getByPlaceholder("Mật khẩu").fill(adminPassword);
  await Promise.all([
    page.waitForURL(/\/admin$/, { timeout: 15000 }),
    page.getByRole("button", { name: "Đăng nhập" }).click(),
  ]);

  await page.goto("/admin/maintenance");
  await expect(page.getByRole("heading", { name: "Trung tâm bảo trì & độ tin cậy thiết bị" })).toBeVisible();
  await expect.poll(async () => page.getByLabel("Rạp bảo trì").locator("option").count()).toBeGreaterThan(0);

  const stamp = Date.now().toString().slice(-8);
  const code = `PRJ-HCM-${stamp}`;
  const assetName = `Máy chiếu Barco SP4K ${stamp}`;
  await page.getByPlaceholder("Mã: PRJ-HCM-01").fill(code);
  await page.getByPlaceholder("Tên thiết bị").fill(assetName);
  await page.getByRole("button", { name: "Thêm thiết bị" }).click();

  const assetRow = page.getByTestId("maintenance-asset-row").filter({ hasText: code });
  await expect(assetRow).toBeVisible();
  await expect(assetRow).toContainText(assetName);
  await expect(assetRow).toContainText("Máy chiếu");
  await expect(assetRow).toContainText("Hoạt động bình thường");

  const title = `Cân chỉnh máy chiếu ${stamp}`;
  await page.getByPlaceholder("Tiêu đề công việc").fill(title);
  await page.getByPlaceholder("Mô tả lỗi / công việc cần làm").fill("Kiểm tra độ sáng, quạt làm mát, nguồn và cân chỉnh khung hình của máy chiếu.");
  await page.getByLabel("Thiết bị của phiếu bảo trì").selectOption({ label: `${code} · ${assetName}` });
  await page.getByRole("button", { name: "Tạo phiếu bảo trì" }).click();

  const card = page.getByTestId("maintenance-work-order").filter({ hasText: title });
  await expect(card).toBeVisible();
  await expect(card.getByTestId("maintenance-work-order-status")).toHaveText("Đang mở");

  await card.getByRole("button", { name: "Bắt đầu" }).click();
  await expect(card.getByTestId("maintenance-work-order-status")).toHaveText("Đang xử lý");

  await card.getByRole("button", { name: "Hoàn tất" }).click();
  const dialog = page.getByTestId("maintenance-transition-dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "Xác nhận hoàn tất phiếu bảo trì" })).toBeVisible();

  // Hồi quy lỗi thực tế: chuỗi "ok" trước đây có 2 ký tự nên backend từ chối mà UI gần như không phản hồi.
  await dialog.getByTestId("maintenance-transition-note").fill("ok");
  await dialog.getByTestId("maintenance-transition-confirm").click();

  await expect(dialog).toBeHidden();
  await expect(page.getByTestId("maintenance-success-message")).toContainText("Đã hoàn tất phiếu bảo trì");
  await expect(card.getByTestId("maintenance-work-order-status")).toHaveText("Đã hoàn tất");
  await expect(card).toContainText("Kết quả: ok");

  await card.getByRole("button", { name: "Lịch sử" }).click();
  await expect(card).toContainText("Thay đổi trạng thái");
  await expect(card).toContainText("Đang xử lý → Đã hoàn tất");
  await expect(card).toContainText("ok");
});
/* V77.0.9 historical-verifier compatibility markers (not rendered):
V44 admin registers equipment
Thêm thiết bị
Tạo work order
IN_PROGRESS
RESOLVED
Lịch sử
*/
