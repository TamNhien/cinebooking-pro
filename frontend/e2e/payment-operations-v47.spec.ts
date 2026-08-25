import { expect, test } from "@playwright/test";

const PASSWORD = "V47E2e!Payment123";

test("V47 failed payment -> retry -> cancel attempt -> retry -> success with lineage", async ({ page }) => {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const email = `duc.huy+${stamp}@example.com`;

  await page.goto("/register");
  await page.getByPlaceholder("Họ và tên").fill("Võ Đức Huy");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Nhập mật khẩu").fill(PASSWORD);
  await page.getByPlaceholder("Nhập lại mật khẩu").fill(PASSWORD);
  await page.getByRole("button", { name: "Đăng ký" }).click();
  await expect(page).toHaveURL(/\/$/);

  const movie = page.getByLabel("1. Phim");
  await expect.poll(async () => movie.locator("option").count()).toBeGreaterThan(1);
  await movie.selectOption({ label: "Hành Trình Sao Hỏa" });
  const cinema = page.getByLabel("2. Rạp");
  await expect.poll(async () => cinema.locator("option").count()).toBeGreaterThan(1);
  await cinema.selectOption({ index: 1 });
  const date = page.getByLabel("3. Ngày");
  await expect.poll(async () => date.locator("option").count()).toBeGreaterThan(1);
  await date.selectOption({ index: 1 });
  const showtime = page.getByLabel("4. Suất");
  await expect.poll(async () => showtime.locator("option").count()).toBeGreaterThan(1);
  await showtime.selectOption({ index: 1 });
  await page.getByRole("button", { name: "Chọn ghế" }).click();
  await expect(page).toHaveURL(/\/booking\/[0-9a-f-]+$/i);

  const seat = page.locator('button[aria-label^="Ghế "][title*="AVAILABLE"]').first();
  await expect(seat).toBeVisible();
  await seat.click();
  await page.getByRole("button", { name: "Giữ ghế 5 phút" }).click();
  await expect(page.getByText(/Ghế được giữ trong/)).toBeVisible();

  // Attempt #1 -> FAILED.
  await page.getByRole("button", { name: /Thanh toán/ }).click();
  await expect(page).toHaveURL(/\/payment\/mock\?/);
  await page.getByRole("button", { name: "Giả lập thất bại" }).click();
  await expect(page).toHaveURL(/\/bookings$/);

  await page.goto("/payments");
  await expect(page.getByText("Payment Center · V47")).toBeVisible();
  const failed = page.locator("article").filter({ hasText: "Lần #1" }).first();
  await expect(failed.getByText("FAILED", { exact: true })).toBeVisible();
  await failed.getByRole("button", { name: "Thử lại thanh toán" }).click();
  await expect(page).toHaveURL(/\/payment\/mock\?/);

  // Attempt #2 stays PENDING, then the user cancels only this attempt.
  await page.goto("/payments");
  const pending = page.locator("article").filter({ hasText: "Lần #2" }).first();
  await expect(pending.getByText("PENDING", { exact: true })).toBeVisible();
  await pending.getByRole("button", { name: "Hủy lần thanh toán" }).click();
  await expect(page.locator("article").filter({ hasText: "Lần #2" }).first().getByText("CANCELLED", { exact: true })).toBeVisible();

  const cancelled = page.locator("article").filter({ hasText: "Lần #2" }).first();
  await cancelled.getByRole("button", { name: "Xem timeline" }).click();
  await expect(cancelled.getByText("PAYMENT_CANCELLED", { exact: true })).toBeVisible();
  await cancelled.getByRole("button", { name: "Thử lại thanh toán" }).click();
  await expect(page).toHaveURL(/\/payment\/mock\?/);

  // Attempt #3 succeeds and the booking is confirmed.
  await page.getByRole("button", { name: "Giả lập thành công" }).click();
  await expect(page).toHaveURL(/\/bookings$/);
  await expect(page.getByLabel("Trạng thái booking: CONFIRMED", { exact: true }).first()).toBeVisible();

  await page.goto("/payments");
  const success = page.locator("article").filter({ hasText: "Lần #3" }).first();
  await expect(success.getByText("SUCCESS", { exact: true })).toBeVisible();
  await success.getByRole("button", { name: "Xem timeline" }).click();
  await expect(success.getByText("PAYMENT_RETRY_CREATED", { exact: true })).toBeVisible();
  await expect(success.getByText("PAYMENT_SUCCEEDED", { exact: true })).toBeVisible();
});
