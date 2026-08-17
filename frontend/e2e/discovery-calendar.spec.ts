import { expect, test } from "@playwright/test";

const MARS_ID = "11111111-1111-1111-1111-111111111111";

test("movie discovery filters and September showtime calendar", async ({ page }) => {
  await test.step("filter the eight-movie demo catalog", async () => {
    await page.goto("/movies");
    await expect(page.getByRole("heading", { name: "Khám phá phim" })).toBeVisible();

    await page.getByRole("button", { name: "Tất cả" }).click();
    await page.getByLabel("Thể loại").selectOption({ label: "Khoa học viễn tưởng" });

    await expect(page.getByText("Hành Trình Sao Hỏa").first()).toBeVisible();
    await expect(page.getByText("Đêm Sài Gòn 2088").first()).toBeVisible();
    await expect(page.getByText(/2 phim phù hợp/)).toBeVisible();

    await page.getByLabel("Phân loại").selectOption("T13");
    await expect(page.getByText(/1 phim phù hợp/)).toBeVisible();
    await expect(page.getByText("Hành Trình Sao Hỏa").first()).toBeVisible();

    await page.getByRole("button", { name: "Đặt lại" }).click();
    await expect(page.getByText(/8 phim phù hợp/)).toBeVisible();
  });

  await test.step("browse the complete cinema schedule through September 30", async () => {
    await page.goto("/cinemas");
    await expect(page.getByRole("heading", { name: "Rạp & lịch chiếu" })).toBeVisible();

    const september = page.getByRole("button", { name: /tháng 9.*2026/i });
    await expect(september).toBeVisible();
    await september.click();

    const datePicker = page.getByLabel("Chọn ngày");
    await expect(datePicker).toHaveAttribute("max", "2026-09-30");
    await datePicker.fill("2026-09-30");

    await expect(page.getByText(/Ngày đã chọn có 16 suất của 8 phim\./)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Hành Trình Sao Hỏa" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Hồ Sơ Bóng Tối" })).toBeVisible();
  });

  await test.step("show only the selected day on a movie-detail schedule", async () => {
    await page.goto(`/movies/${MARS_ID}`);
    await expect(page.getByRole("heading", { name: "Hành Trình Sao Hỏa" })).toBeVisible();

    const datePicker = page.getByLabel("Chọn ngày");
    await expect(datePicker).toHaveAttribute("max", "2026-09-30");
    await datePicker.fill("2026-09-30");

    await expect(page.getByText(/Đang xem .*30\/09\/2026.*2 suất/)).toBeVisible();
    await expect(page.locator('a[href^="/booking/"]')).toHaveCount(2);
  });
});
