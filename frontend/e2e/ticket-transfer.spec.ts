import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const PASSWORD = "V36Transfer!Customer123";

async function logout(page: Page, context: BrowserContext) {
  await page.evaluate(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => undefined);
    localStorage.clear();
  });
  await context.clearCookies();
}

async function register(page: Page, email: string, fullName: string) {
  await page.goto("/register");
  await page.getByPlaceholder("Họ và tên").fill(fullName);
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Nhập mật khẩu").fill(PASSWORD);
  await page.getByPlaceholder("Nhập lại mật khẩu").fill(PASSWORD);
  await page.getByRole("button", { name: "Đăng ký" }).click();
  await expect(page).toHaveURL(/\/$/);
}

async function login(page: Page, email: string, password = PASSWORD) {
  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Mật khẩu").fill(password);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
}

async function authFetchTicketUrl(page: Page, bookingId: string) {
  return page.evaluate(async (id: string) => {
    const raw = localStorage.getItem("cinebooking_auth_v3");
    if (!raw) throw new Error("auth missing");
    const auth = JSON.parse(raw) as { accessToken?: string };
    const res = await fetch(`/api/tickets/${id}`, {
      credentials: "include",
      headers: { Authorization: `Bearer ${auth.accessToken || ""}` },
    });
    if (!res.ok) throw new Error(`ticket metadata failed: ${res.status}`);
    const body = await res.json() as { qrUrl?: string };
    if (!body.qrUrl) throw new Error("ticket qrUrl missing");
    return body.qrUrl;
  }, bookingId);
}

test("confirmed ticket can be transferred once and old QR becomes invalid", async ({ page, context }) => {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const senderEmail = `minh.khang+${stamp}@example.com`;
  const recipientEmail = `gia.han+${stamp}@example.com`;
  const adminEmail = process.env.E2E_ADMIN_EMAIL || "admin-v29@cine.local";
  const adminPassword = process.env.E2E_ADMIN_PASSWORD || "V29SmokeOnly-ChangeMe";

  await test.step("create recipient account", async () => {
    await register(page, recipientEmail, "Lê Gia Hân");
    await logout(page, context);
  });

  await test.step("sender books and pays for a ticket", async () => {
    await register(page, senderEmail, "Nguyễn Minh Khang");

    const movie = page.getByLabel("1. Phim");
    await expect.poll(async () => movie.locator("option").count()).toBeGreaterThan(1);
    await movie.selectOption({ label: "Hành Trình Sao Hỏa" });
    const cinema = page.getByLabel("2. Rạp");
    await expect.poll(async () => cinema.locator("option").count()).toBeGreaterThan(1);
    await cinema.selectOption({ index: 1 });
    const date = page.getByLabel("3. Ngày");
    await expect.poll(async () => date.locator("option").count()).toBeGreaterThan(1);
    // V39 RC3 determinism: choose tomorrow in Vietnam. That keeps the showtime
    // beyond V36's 60-minute transfer cutoff while still inside the staff gate's
    // default 48-hour early check-in window used later in this same journey.
    const nextDate = await page.evaluate(() => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit",
      }).formatToParts(tomorrow);
      const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
      return `${values.year}-${values.month}-${values.day}`;
    });
    await expect(date.locator(`option[value="${nextDate}"]`)).toHaveCount(1);
    await date.selectOption(nextDate);
    const showtime = page.getByLabel("4. Suất");
    await expect.poll(async () => showtime.locator("option").count()).toBeGreaterThan(1);
    await showtime.selectOption({ index: 1 });
    await page.getByRole("button", { name: "Chọn ghế" }).click();

    const availableSeat = page.locator('button[aria-label^="Ghế "][title*="AVAILABLE"]').first();
    await expect(availableSeat).toBeVisible();
    await availableSeat.click();
    await page.getByRole("button", { name: "Giữ ghế 5 phút" }).click();
    await expect(page.getByText(/Ghế được giữ trong/)).toBeVisible();
    await page.getByRole("button", { name: /Thanh toán/ }).click();
    await expect(page).toHaveURL(/\/payment\/mock\?/);
    await page.getByRole("button", { name: "Giả lập thành công" }).click();
    await expect(page).toHaveURL(/\/bookings$/);
  });

  let bookingId = "";
  let oldQrUrl = "";
  await test.step("sender opens ticket and transfers ownership", async () => {
    const ticketLink = page.getByRole("link", { name: "Mở QR vé" }).first();
    const href = await ticketLink.getAttribute("href");
    expect(href).toMatch(/^\/ticket\/[0-9a-f-]+$/i);
    bookingId = href!.split("/").pop()!;
    await ticketLink.click();
    await expect(page.getByRole("button", { name: "🎁 Chuyển/tặng vé" })).toBeVisible();

    oldQrUrl = await authFetchTicketUrl(page, bookingId);
    expect(oldQrUrl).toContain("CINEBOOKING%7CV2%7C");

    await page.getByRole("button", { name: "🎁 Chuyển/tặng vé" }).click();
    await page.getByLabel("Email người nhận vé").fill(recipientEmail);
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Xác nhận chuyển vé" }).click();
    await expect(page.getByRole("heading", { name: "Đã chuyển vé" })).toBeVisible();
    await expect(page.getByText(recipientEmail)).toBeVisible();
    await expect(page.getByText(/QR cũ.*hết hiệu lực/)).toBeVisible();
  });

  let newQrUrl = "";
  await test.step("recipient receives the booking and a rotated QR", async () => {
    await logout(page, context);
    await login(page, recipientEmail);
    await expect(page).toHaveURL(/\/$/);
    await page.goto("/bookings");
    await expect(page.getByRole("heading", { name: "Ví vé của tôi" })).toBeVisible();
    const ticketLink = page.getByRole("link", { name: "Mở QR vé" }).first();
    await expect(ticketLink).toBeVisible();
    await ticketLink.click();
    await expect(page).toHaveURL(new RegExp(`/ticket/${bookingId}$`));
    newQrUrl = await authFetchTicketUrl(page, bookingId);
    expect(newQrUrl).not.toEqual(oldQrUrl);
    expect(newQrUrl).toContain("CINEBOOKING%7CV2%7C");
  });

  await test.step("staff gate rejects old QR but accepts transferred QR", async () => {
    await logout(page, context);
    await login(page, adminEmail, adminPassword);
    await expect(page).toHaveURL(/\/admin$/);
    await page.goto("/staff/check-in");
    await expect(page.getByText("ADMIN có quyền check-in khẩn cấp")).toBeVisible();

    const input = page.locator('textarea[placeholder*="/staff/check-in?ticket="]');
    await input.fill(oldQrUrl);
    await page.getByRole("button", { name: "Kiểm tra & xác nhận check-in" }).click();
    await expect(page.getByText(/QR vé đã hết hiệu lực/)).toBeVisible();

    await input.fill(newQrUrl);
    await page.getByRole("button", { name: "Kiểm tra & xác nhận check-in" }).click();
    await expect(page.getByText("Check-in vé thành công.")).toBeVisible();
  });
});
