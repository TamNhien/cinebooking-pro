import { expect, test } from "@playwright/test";
import { ensureSurface, gotoHydrated, gotoSurface, waitForHydratedRuntime } from "./runtime-guards";

const PASSWORD = "V38E2e!Refund123";

test("V38 mock refund auto-processes policy, reopens seat, and updates payment history", async ({ page, context }) => {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const email = `quang.huy+${stamp}@example.com`;
  let bookingUrl = "";
  let seatLabel = "";
  let bookingId = "";

  await test.step("register customer", async () => {
    await gotoSurface(page, "/register", "register-name");
    await page.getByPlaceholder("Họ và tên").fill("Phạm Quang Huy");
    await page.getByPlaceholder("Email").fill(email);
    await page.getByPlaceholder("Nhập mật khẩu").fill(PASSWORD);
    await page.getByPlaceholder("Nhập lại mật khẩu").fill(PASSWORD);
    await page.getByRole("button", { name: "Đăng ký" }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  await test.step("choose a far seeded showtime and hold one seat", async () => {
    const movie = page.getByLabel("1. Phim");
    await expect.poll(async () => movie.locator("option").count()).toBeGreaterThan(1);
    await movie.selectOption({ label: "Hành Trình Sao Hỏa" });

    const cinema = page.getByLabel("2. Rạp");
    await expect.poll(async () => cinema.locator("option").count()).toBeGreaterThan(1);
    await cinema.selectOption({ index: 1 });

    const date = page.getByLabel("3. Ngày");
    await expect.poll(async () => date.locator("option").count()).toBeGreaterThan(1);
    const dateCount = await date.locator("option").count();
    await date.selectOption({ index: dateCount - 1 });

    const showtime = page.getByLabel("4. Suất");
    await expect.poll(async () => showtime.locator("option").count()).toBeGreaterThan(1);
    await showtime.selectOption({ index: 1 });
    await page.getByRole("button", { name: "Chọn ghế" }).click();
    await expect(page).toHaveURL(/\/booking\/[0-9a-f-]+$/i);
    bookingUrl = page.url();

    const seat = page.locator('button[aria-label^="Ghế "][data-seat-status="AVAILABLE"]').first();
    await expect(seat).toBeVisible();
    seatLabel = (await seat.getAttribute("aria-label")) || "";
    expect(seatLabel).toMatch(/^Ghế /);
    await seat.click();
    await page.getByRole("button", { name: "Giữ ghế 5 phút" }).click();
    await expect(page.getByText(/Ghế được giữ trong/)).toBeVisible();
  });

  await test.step("pay with mock gateway", async () => {
    await page.getByRole("button", { name: /Thanh toán/ }).click();
    await expect(page).toHaveURL(/\/payment\/mock\?/);
    await ensureSurface(page,"mock-payment-success");
    await page.getByTestId("mock-payment-success").click();
    await expect(page).toHaveURL(/\/bookings$/);
    await waitForHydratedRuntime(page, "/bookings");
    const confirmedCard=page.locator('[data-testid="booking-card"][data-booking-status="CONFIRMED"]').first();
    await expect(confirmedCard).toBeVisible();
    bookingId=(await confirmedCard.getAttribute("data-booking-id"))||"";
    expect(bookingId).toMatch(/^[0-9a-f-]+$/i);
  });

  await test.step("quote shows automatic full refund and request completes immediately", async () => {
    await page.getByRole("button", { name: /Kiểm tra hoàn vé/ }).first().click();
    const policy = page.locator('[aria-label^="Chính sách hoàn vé "]').first();
    await expect(policy).toBeVisible();
    await expect(policy.getByText("AUTO_FULL", { exact: false })).toBeVisible();
    await expect(policy.getByText(/^100%\s*·/)).toBeVisible();
    await expect(policy.getByText("Tự động", { exact: true })).toBeVisible();
    await policy.getByRole("button", { name: /Xác nhận hủy & hoàn/ }).click();
    await expect(page.getByText(/Đã hoàn vé tự động/)).toBeVisible();
    await expect(page.locator('[data-testid="booking-status"][data-booking-status="REFUNDED"]').first()).toBeVisible();
  });

  await test.step("payment history records refunded state", async () => {
    await gotoSurface(page, "/payments", "payments-v47");
    const paymentCard = page.locator(`[data-testid="payment-history-item"][data-booking-id="${bookingId}"][data-payment-status="REFUNDED"]`).first();
    await expect(paymentCard).toBeVisible({timeout:30_000});
    await expect(paymentCard.getByText("MOCK", { exact: true })).toBeVisible();
  });

  await test.step("released seat becomes available again", async () => {
    await gotoHydrated(page, bookingUrl);
    await expect(page.locator(`button[aria-label="${seatLabel}"][data-seat-status="AVAILABLE"]`)).toBeVisible();
  });

  await context.clearCookies();
});
