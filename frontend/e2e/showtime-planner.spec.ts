import { expect, test } from "@playwright/test";
import { gotoSurface, loginExistingAdmin } from "./runtime-guards";

test("admin previews showtime conflicts before scheduling", async ({ page }) => {
  await loginExistingAdmin(page);

  await gotoSurface(page, "/admin/showtimes", "showtime-planning-page");
  await expect(page.getByRole("heading", { name: /Lập lịch chiếu & chống trùng phòng|Showtime planning/ })).toBeVisible();

  const planningMovie = page.getByLabel("Phim lập lịch");
  await expect.poll(async () => planningMovie.locator("option").count(), { timeout: 30_000 }).toBeGreaterThan(1);
  await planningMovie.selectOption({ index: 1 });
  await page.getByLabel("Phòng lập lịch").selectOption({ label: "CineHub Quận 1 · Phòng 02" });
  await page.getByLabel("Từ ngày lập lịch").fill("2026-09-30");
  await page.getByLabel("Đến ngày lập lịch").fill("2026-09-30");
  await page.getByLabel("Khung giờ mỗi ngày").fill("10:00, 22:30");
  await page.getByRole("button", { name: "Xem trước lịch" }).click();

  await expect(page.getByLabel("Yêu cầu: 2")).toBeVisible();
  await expect(page.getByLabel("Có thể tạo: 1")).toBeVisible();
  await expect(page.getByLabel("Trùng lịch: 1")).toBeVisible();
  await expect(page.getByText(/Xung đột:/).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Tạo 1 suất hợp lệ" })).toBeVisible();
});
