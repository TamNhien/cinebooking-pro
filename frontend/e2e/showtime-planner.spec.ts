import { expect, test } from "@playwright/test";

test("admin previews showtime conflicts before scheduling", async ({ page }) => {
  const adminEmail = process.env.E2E_ADMIN_EMAIL || "admin-v29@cine.local";
  const adminPassword = process.env.E2E_ADMIN_PASSWORD || "V29SmokeOnly-ChangeMe";

  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(adminEmail);
  await page.getByPlaceholder("Mật khẩu").fill(adminPassword);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/admin$/);

  await page.goto("/admin/showtimes");
  await expect(page.getByRole("heading", { name: "Lập lịch chiếu & chống trùng phòng" })).toBeVisible();

  await page.getByLabel("Phim lập lịch").selectOption({ label: "Hành Trình Sao Hỏa · 128 phút" });
  await page.getByLabel("Phòng lập lịch").selectOption({ label: "CineHub Quận 1 · Phòng 02" });
  await page.getByLabel("Từ ngày lập lịch").fill("2026-09-30");
  await page.getByLabel("Đến ngày lập lịch").fill("2026-09-30");
  await page.getByLabel("Khung giờ mỗi ngày").fill("10:00, 22:30");
  await page.getByRole("button", { name: "Preview lịch" }).click();

  await expect(page.getByLabel("Yêu cầu: 2")).toBeVisible();
  await expect(page.getByLabel("Có thể tạo: 1")).toBeVisible();
  await expect(page.getByLabel("Trùng lịch: 1")).toBeVisible();
  await expect(page.getByText(/Xung đột: Hành Trình Sao Hỏa/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Tạo 1 suất hợp lệ" })).toBeVisible();
});
