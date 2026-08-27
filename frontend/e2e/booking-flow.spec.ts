import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const CUSTOMER_PASSWORD = "V29E2e!Customer123";

test("register -> login -> seat -> mock payment -> QR -> staff gate check-in", async ({ page, context }) => {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const customerEmail = `gia.huy+${stamp}@example.com`;
  const adminEmail = process.env.E2E_ADMIN_EMAIL || "admin-v29@cine.local";
  const adminPassword = process.env.E2E_ADMIN_PASSWORD || "V29SmokeOnly-ChangeMe";

  await test.step("register customer through the browser", async () => {
    await page.goto("/register");
    await page.getByPlaceholder("Họ và tên").fill("Nguyễn Gia Huy");
    await page.getByPlaceholder("Email").fill(customerEmail);
    await page.getByPlaceholder("Nhập mật khẩu").fill(CUSTOMER_PASSWORD);
    await page.getByPlaceholder("Nhập lại mật khẩu").fill(CUSTOMER_PASSWORD);
    await page.getByRole("button", { name: "Đăng ký" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText("Chọn suất chiếu phù hợp")).toBeVisible();
  });

  await test.step("end registration session and login again", async () => {
    await page.evaluate(async () => {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => undefined);
      localStorage.clear();
    });
    await context.clearCookies();
    await page.goto("/login");
    await page.getByPlaceholder("Email").fill(customerEmail);
    await page.getByPlaceholder("Mật khẩu").fill(CUSTOMER_PASSWORD);
    await page.getByRole("button", { name: "Đăng nhập" }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  await test.step("choose a seeded showtime with Quick Booking", async () => {
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
  });

  await test.step("select and hold an available seat", async () => {
    const availableSeat = page.locator('button[aria-label^="Ghế "][title*="AVAILABLE"]').first();
    await expect(availableSeat).toBeVisible();
    await availableSeat.click();
    await page.getByRole("button", { name: "Giữ ghế 5 phút" }).click();
    await expect(page.getByText(/Ghế được giữ trong/)).toBeVisible();
  });

  await test.step("complete mock payment", async () => {
    await page.getByRole("button", { name: /Thanh toán/ }).click();
    await expect(page).toHaveURL(/\/payment\/mock\?/);
    await expect(page.getByRole("heading", { name: "Mock Gateway" })).toBeVisible();
    await page.getByRole("button", { name: "Giả lập thành công" }).click();
    await expect(page).toHaveURL(/\/bookings$/);
    await expect(page.getByLabel("Trạng thái booking: CONFIRMED", { exact: true }).first()).toBeVisible();
  });

  await test.step("V37 payment history shows the successful payer-owned transaction", async () => {
    await page.goto("/payments");
    await expect(page.getByRole("heading", { name: "Lịch sử thanh toán" })).toBeVisible();
    const paymentCard = page.locator("article").filter({ hasText: "Hành Trình Sao Hỏa" }).first();
    await expect(paymentCard).toBeVisible();
    await expect(paymentCard.getByText("SUCCESS", { exact: true })).toBeVisible();
    await expect(paymentCard.getByText("MOCK", { exact: true })).toBeVisible();
    await expect(paymentCard.getByText("Lần #1", { exact: true })).toBeVisible();
    await paymentCard.getByRole("button", { name: "Xem timeline" }).click();
    await expect(paymentCard.getByText("PAYMENT_SUCCEEDED", { exact: true })).toBeVisible();
    await page.goto("/bookings");
  });

  let bookingId = "";
  let qrUrl = "";
  await test.step("use V31 ticket wallet and download the authenticated calendar event", async () => {
    await expect(page.getByRole("heading", { name: "Ví vé của tôi" })).toBeVisible();
    await page.getByLabel("Tìm phim / mã booking / ghế").fill("Hành Trình Sao Hỏa");
    await expect(page.getByText(/Hiển thị/)).toContainText("1");

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /Thêm vào lịch/ }).first().click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^cinebooking-[0-9a-f-]+\.ics$/i);
    const path = await download.path();
    expect(path).toBeTruthy();
    const ics = await readFile(path!, "utf8");
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("SUMMARY:CineBooking - Hành Trình Sao Hỏa");
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
    await expect(page.getByRole("img", { name: "QR URL vé CineBooking" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Thêm vào lịch/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Mã booking/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /In vé/ })).toBeVisible();

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

    await page.goto("/login");
    await page.getByPlaceholder("Email").fill(adminEmail);
    await page.getByPlaceholder("Mật khẩu").fill(adminPassword);
    await page.getByRole("button", { name: "Đăng nhập" }).click();
    await expect(page).toHaveURL(/\/admin$/);

    await page.goto("/staff/check-in");
    await expect(page.getByText("ADMIN có quyền check-in khẩn cấp")).toBeVisible();
    await page.locator('textarea[placeholder*="/staff/check-in?ticket="]').fill(qrUrl);
    await page.getByRole("button", { name: "Kiểm tra & xác nhận check-in" }).click();
    await expect(page.getByText("Check-in vé thành công.")).toBeVisible();
    await expect(page.getByText("Hành Trình Sao Hỏa").last()).toBeVisible();

    await page.goto("/admin/payments");
    await expect(page.getByRole("heading", { name: "Thanh toán production & đối soát" })).toBeVisible();
    await expect(page.getByText("Payment Operations · V47")).toBeVisible();
    await expect(page.getByText("MOCK").first()).toBeVisible();
  });
});
