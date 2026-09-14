import { expect, test } from "@playwright/test";
import { ensureSurface, gotoSurface, waitForHydratedRuntime } from "./runtime-guards";

const PASSWORD = "V47E2e!Payment123";

test("V47 failed payment -> retry -> cancel attempt -> retry -> success with lineage", async ({ page }) => {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const email = `duc.huy+${stamp}@example.com`;

  await gotoSurface(page, "/register", "register-name");
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

  const seat = page.locator('button[aria-label^="Ghế "][data-seat-status="AVAILABLE"]').first();
  await expect(seat).toBeVisible();
  await seat.click();
  await page.getByRole("button", { name: "Giữ ghế 5 phút" }).click();
  await expect(page.getByText(/Ghế được giữ trong/)).toBeVisible();

  // Attempt #1 -> FAILED.
  await page.getByRole("button", { name: /Thanh toán/ }).click();
  await expect(page).toHaveURL(/\/payment\/mock\?/);
  await ensureSurface(page,"mock-payment-fail");
  await page.getByTestId("mock-payment-fail").click();
  await expect(page).toHaveURL(/\/bookings$/);

  await gotoSurface(page, "/payments", "payments-v47");
  await expect(page.getByText("Trung tâm thanh toán · V47")).toBeVisible();
  const failed = page.locator('[data-testid="payment-history-item"][data-attempt-no="1"][data-payment-status="FAILED"]').first();
  await expect(failed).toBeVisible({timeout:30_000});
  await failed.getByRole("button", { name: "Thử lại thanh toán" }).click();
  await expect(page).toHaveURL(/\/payment\/mock\?/);

  // Attempt #2 stays PENDING, then the user cancels only this attempt.
  await gotoSurface(page, "/payments", "payments-v47");
  const pending = page.locator('[data-testid="payment-history-item"][data-attempt-no="2"][data-payment-status="PENDING"]').first();
  await expect(pending).toBeVisible({timeout:30_000});
  await pending.getByRole("button", { name: "Hủy lần thanh toán" }).click();
  await expect(page.locator('[data-testid="payment-history-item"][data-attempt-no="2"][data-payment-status="CANCELLED"]').first()).toBeVisible({timeout:30_000});

  const cancelled = page.locator('[data-testid="payment-history-item"][data-attempt-no="2"][data-payment-status="CANCELLED"]').first();
  await cancelled.getByTestId("payment-timeline-toggle").click();
  await expect(cancelled.locator('[data-testid="payment-timeline-event"][data-event-type="PAYMENT_CANCELLED"]')).toBeVisible();
  await cancelled.getByRole("button", { name: "Thử lại thanh toán" }).click();
  await expect(page).toHaveURL(/\/payment\/mock\?/);

  // Attempt #3 succeeds and the booking is confirmed.
  await ensureSurface(page,"mock-payment-success");
  await page.getByTestId("mock-payment-success").click();
  await expect(page).toHaveURL(/\/bookings$/);
  await waitForHydratedRuntime(page, "/bookings");
  await expect(page.locator('[data-testid="booking-status"][data-booking-status="CONFIRMED"]').first()).toBeVisible();

  await gotoSurface(page, "/payments", "payments-v47");
  const success = page.locator('[data-testid="payment-history-item"][data-attempt-no="3"][data-payment-status="SUCCESS"]').first();
  await expect(success).toBeVisible({timeout:30_000});
  await success.getByTestId("payment-timeline-toggle").click();
  await expect(success.locator('[data-testid="payment-timeline-event"][data-event-type="PAYMENT_RETRY_CREATED"]')).toBeVisible();
  await expect(success.locator('[data-testid="payment-timeline-event"][data-event-type="PAYMENT_SUCCEEDED"]')).toBeVisible();
});
