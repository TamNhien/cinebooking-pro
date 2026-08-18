import { expect, test } from "@playwright/test";

test("admin maintenance blackout blocks showtime planning", async ({ page }) => {
  const adminEmail = process.env.E2E_ADMIN_EMAIL || "admin-v29@cine.local";
  const adminPassword = process.env.E2E_ADMIN_PASSWORD || "V29SmokeOnly-ChangeMe";
  const reason = "V34 RC projector maintenance";

  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(adminEmail);
  await page.getByPlaceholder("Mật khẩu").fill(adminPassword);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/admin$/);

  await page.goto("/admin/maintenance");
  await expect(page.getByRole("heading", { name: "Bảo trì & khóa phòng chiếu" })).toBeVisible();
  await page.getByLabel("Phòng bảo trì").selectOption({ label: "CineHub Quận 1 · Phòng 02" });
  await page.getByLabel("Bắt đầu bảo trì").fill("2026-10-01T10:00");
  await page.getByLabel("Kết thúc bảo trì").fill("2026-10-01T13:00");
  await page.getByLabel("Lý do bảo trì").fill(reason);
  await page.getByRole("button", { name: "Khóa phòng" }).click();
  await expect(page.getByLabel(`Khoảng bảo trì: ${reason}`)).toBeVisible();

  await page.goto("/admin/showtimes");
  await page.getByLabel("Phim lập lịch").selectOption({ label: "Hành Trình Sao Hỏa · 128 phút" });
  await page.getByLabel("Phòng lập lịch").selectOption({ label: "CineHub Quận 1 · Phòng 02" });
  await page.getByLabel("Từ ngày lập lịch").fill("2026-10-01");
  await page.getByLabel("Đến ngày lập lịch").fill("2026-10-01");
  await page.getByLabel("Khung giờ mỗi ngày").fill("10:30");
  await page.getByRole("button", { name: "Preview lịch" }).click();

  await expect(page.getByLabel("Yêu cầu: 1")).toBeVisible();
  await expect(page.getByLabel("Có thể tạo: 0")).toBeVisible();
  await expect(page.getByLabel("Trùng lịch: 1")).toBeVisible();
  await expect(page.getByText(new RegExp(`Xung đột: Bảo trì · ${reason}`))).toBeVisible();

  await page.goto("/admin/maintenance");
  page.once("dialog", dialog => dialog.accept());
  await page.getByLabel(`Khoảng bảo trì: ${reason}`).getByRole("button", { name: "Mở lại phòng" }).click();
  await expect(page.getByLabel(`Khoảng bảo trì: ${reason}`)).toHaveCount(0);
});
