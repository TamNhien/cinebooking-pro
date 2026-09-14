import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { ensureSurface, gotoHydrated, gotoSurface, loginExistingAdmin, waitForHydratedRuntime } from "./runtime-guards";

const CUSTOMER_PASSWORD = "V29E2e!Customer123";

test("register -> login -> seat -> mock payment -> QR -> staff gate check-in", async ({ page, context }) => {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const customerEmail = `gia.huy+${stamp}@example.com`;
  let selectedMovie = "";
  let bookingId = "";

  await test.step("register customer through the browser", async () => {
    await gotoSurface(page, "/register", "register-name");
    await page.getByTestId("register-name").fill("Nguyễn Gia Huy");
    await page.getByTestId("register-email").fill(customerEmail);
    await page.getByTestId("register-password").fill(CUSTOMER_PASSWORD);
    await page.getByTestId("register-confirm").fill(CUSTOMER_PASSWORD);
    await page.getByTestId("register-submit").click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText("Chọn suất chiếu phù hợp")).toBeVisible();
  });

  await test.step("end registration session and login again", async () => {
    await page.evaluate(async () => {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => undefined);
      localStorage.clear();
    });
    await context.clearCookies();
    await gotoSurface(page, "/login", "login-email");
    await page.getByTestId("login-email").fill(customerEmail);
    await page.getByTestId("login-password").fill(CUSTOMER_PASSWORD);
    await page.getByRole("button", { name: "Đăng nhập" }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  await test.step("choose a seeded showtime with Quick Booking", async () => {
    const movie = page.getByLabel("1. Phim");
    await expect.poll(async () => movie.locator("option").count()).toBeGreaterThan(1);
    const preferred = movie.locator("option").filter({ hasText: "Hành Trình Sao Hỏa" });
    if (await preferred.count()) await movie.selectOption({ label: "Hành Trình Sao Hỏa" });
    else await movie.selectOption({ index: 1 });
    selectedMovie = ((await movie.locator("option:checked").textContent()) || "").trim();
    expect(selectedMovie).not.toBe("");

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
  });

  await test.step("select and hold an available seat", async () => {
    const availableSeat = page.locator('button[aria-label^="Ghế "][data-seat-status="AVAILABLE"]').first();
    await expect(availableSeat).toBeVisible();
    await availableSeat.click();
    await page.getByRole("button", { name: "Giữ ghế 5 phút" }).click();
    await expect(page.getByText(/Ghế được giữ trong/)).toBeVisible();
  });

  await test.step("complete mock payment", async () => {
    await page.getByRole("button", { name: /Thanh toán/ }).click();
    await expect(page).toHaveURL(/\/payment\/mock\?/);
    await ensureSurface(page, "mock-payment-success");
    await page.getByTestId("mock-payment-success").click();
    await expect(page).toHaveURL(/\/bookings$/);
    await waitForHydratedRuntime(page, "/bookings");
    const confirmedCard = page.locator('[data-testid="booking-card"][data-booking-status="CONFIRMED"]').first();
    await expect(confirmedCard).toBeVisible();
    bookingId = (await confirmedCard.getAttribute("data-booking-id")) || "";
    expect(bookingId).toMatch(/^[0-9a-f-]+$/i);
  });

  await test.step("V37 payment history shows the successful payer-owned transaction", async () => {
    await gotoSurface(page, "/payments", "payments-v47");
    await expect(page.getByRole("heading", { name: "Lịch sử thanh toán" })).toBeVisible();
    const paymentCard = page.locator(`[data-testid="payment-history-item"][data-booking-id="${bookingId}"][data-payment-status="SUCCESS"]`).first();
    await expect(paymentCard).toBeVisible({ timeout: 30_000 });
    await expect(paymentCard.getByText("MOCK", { exact: true })).toBeVisible();
    await expect(paymentCard.getByText("Lần #1", { exact: true })).toBeVisible();
    await paymentCard.getByTestId("payment-timeline-toggle").click();
    await expect(paymentCard.locator('[data-testid="payment-timeline-event"][data-event-type="PAYMENT_SUCCEEDED"]')).toBeVisible();
    await gotoHydrated(page, "/bookings");
  });

  let qrUrl = "";
  await test.step("use V31 ticket wallet and download the authenticated calendar event", async () => {
    await expect(page.getByRole("heading", { name: "Ví vé của tôi" })).toBeVisible();
    await page.getByLabel("Tìm phim / mã đặt vé / ghế").fill(bookingId);
    await expect(page.getByText(/Hiển thị/)).toContainText("1");

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /Thêm vào lịch/ }).first().click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^cinebooking-[0-9a-f-]+\.ics$/i);
    const path = await download.path();
    expect(path).toBeTruthy();
    const ics = await readFile(path!, "utf8");
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain(`SUMMARY:CineBooking - ${selectedMovie}`);
    expect(ics).toContain("STATUS:CONFIRMED");
    expect(ics).toContain("END:VCALENDAR");
  });

  await test.step("open ticket QR and capture signed check-in URL", async () => {
    const ticketLink = page.getByRole("link", { name: "Mở QR vé" }).first();
    await expect(ticketLink).toBeVisible();
    const href = await ticketLink.getAttribute("href");
    expect(href).toMatch(/^\/ticket\/[0-9a-f-]+$/i);
    bookingId = href!.split("/").pop()!;
    await ticketLink.click();
    await expect(page).toHaveURL(new RegExp(`/ticket/${bookingId}$`));
    await expect(page.getByTestId("ticket-qr-v33")).toHaveAttribute("data-booking-id", bookingId);
    await expect(page.getByTestId("ticket-add-calendar")).toBeVisible();
    await expect(page.getByTestId("ticket-copy-booking-code")).toHaveAttribute("data-booking-id", bookingId);
    await expect(page.getByTestId("ticket-print")).toBeVisible();

    qrUrl = await page.evaluate(async (id) => {
      const raw = localStorage.getItem("cinebooking_auth_v3");
      if (!raw) throw new Error("customer auth missing while reading ticket metadata");
      const auth = JSON.parse(raw) as { accessToken?: string };
      const res = await fetch(`/api/tickets/${id}`, {
        credentials: "include",
        headers: { Authorization: `Bearer ${auth.accessToken || ""}` },
      });
      if (!res.ok) throw new Error(`ticket metadata failed: ${res.status}`);
      const body = await res.json() as { qrUrl?: string };
      if (!body.qrUrl) throw new Error("ticket metadata did not contain qrUrl");
      return body.qrUrl;
    }, bookingId);
    expect(qrUrl).toContain("/staff/check-in?ticket=");
  });

  await test.step("login as admin and check in through the staff gate UI", async () => {
    await page.evaluate(async () => {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => undefined);
      localStorage.clear();
    });
    await context.clearCookies();

    await loginExistingAdmin(page);

    await gotoHydrated(page, "/staff/check-in");
    await expect(page.getByText("ADMIN có quyền check-in khẩn cấp")).toBeVisible();
    await page.locator('textarea[placeholder*="/staff/check-in?ticket="]').fill(qrUrl);
    await page.getByTestId("staff-check-in-submit").click();
    await expect(page.getByText(/Soát vé.*thành công/)).toBeVisible();
    await expect(page.getByText(selectedMovie).last()).toBeVisible();

    await gotoSurface(page, "/admin/payments", "payment-production-readiness-v60");
    const readiness = page.getByTestId("payment-production-readiness-v60");
    await expect(readiness).toContainText("Mức sẵn sàng thanh toán vận hành · V60");
    await expect(page.getByTestId("payment-readiness-mock-v60")).toContainText("MOCK");
  });
});
