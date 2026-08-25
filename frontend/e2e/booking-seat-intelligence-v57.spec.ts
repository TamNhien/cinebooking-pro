import { expect, test, type Page } from "@playwright/test";

const PASSWORD = "V57SeatIntel!Customer123";

async function register(page: Page, email: string, fullName: string) {
  await page.goto("/register");
  await page.getByPlaceholder("Họ và tên").fill(fullName);
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Nhập mật khẩu").fill(PASSWORD);
  await page.getByPlaceholder("Nhập lại mật khẩu").fill(PASSWORD);
  await page.getByRole("button", { name: "Đăng ký" }).click();
  await expect(page).toHaveURL(/\/$/);
}

async function chooseSeededShowtime(page: Page) {
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
}

async function authedJson<T>(page: Page, url: string, init?: { method?: string; body?: unknown }) {
  return page.evaluate(async ({ url, init }) => {
    const raw = localStorage.getItem("cinebooking_auth_v3");
    if (!raw) throw new Error("auth missing");
    const auth = JSON.parse(raw) as { accessToken?: string };
    const res = await fetch(url, {
      method: init?.method || "GET",
      credentials: "include",
      headers: {
        Authorization: `Bearer ${auth.accessToken || ""}`,
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
      },
      body: init?.body ? JSON.stringify(init.body) : undefined,
    });
    let body: unknown = null;
    try { body = await res.json(); } catch { body = null; }
    return { status: res.status, body };
  }, { url, init }) as Promise<{ status:number; body:T|null }>;
}

test("V57 Booking & Seat Intelligence ranks best adjacent seats, syncs hold countdown and blocks multi-client contention", async ({ page, browser }) => {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  await register(page, `v57-seat-a-${stamp}@example.test`, "V57 Seat User A");
  await chooseSeededShowtime(page);

  const bookingUrl = page.url();
  const showtimeId = bookingUrl.split("/").pop()!;
  await expect(page.getByTestId("booking-seat-intelligence-v57")).toContainText("BOOKING & SEAT INTELLIGENCE · V57");
  await expect(page.getByTestId("booking-seat-intelligence-v57")).toContainText("Giá động thật");

  await page.getByLabel("Số người cần xếp ghế").selectOption("2");
  await page.getByRole("button", { name: "Gợi ý ghế" }).click();
  await expect(page.getByTestId("seat-intelligence-suggestions-v57")).toBeVisible();
  await expect(page.getByTestId("seat-intelligence-suggestions-v57")).toContainText("Không ghế lẻ");

  const suggestion = await authedJson<{
    suggestions: {
      seatIds: string[];
      seatCodes: string[];
      dynamicAdjustment: number;
      score: number;
      centerScore: number;
      rowScore: number;
      orphanSafetyScore: number;
      qualityLabel: string;
    }[];
  }>(page, `/api/showtimes/${showtimeId}/seat-suggestions?count=2`);

  expect(suggestion.status).toBe(200);
  expect(suggestion.body?.suggestions.length).toBeGreaterThan(0);
  const best = suggestion.body!.suggestions[0];
  expect(best.seatIds).toHaveLength(2);
  expect(best.seatCodes).toHaveLength(2);
  expect(best.score).toBeGreaterThan(0);
  expect(best.centerScore).toBeGreaterThanOrEqual(0);
  expect(best.rowScore).toBeGreaterThanOrEqual(0);
  expect(best.orphanSafetyScore).toBe(100);
  expect(["BEST", "GREAT", "GOOD"]).toContain(best.qualityLabel);
  expect(typeof best.dynamicAdjustment).toBe("number");

  const firstHold = await authedJson<{ serverEpochMs:number; holdExpiresAtEpochMs:number }>(
    page,
    `/api/showtimes/${showtimeId}/holds`,
    { method: "POST", body: { seatIds: best.seatIds } },
  );
  expect(firstHold.status).toBe(200);
  expect(firstHold.body!.holdExpiresAtEpochMs).toBeGreaterThan(firstHold.body!.serverEpochMs);

  await page.goto(bookingUrl);
  await expect(page.getByTestId("seat-hold-countdown-v57")).toBeVisible();
  await expect(page.getByTestId("seat-hold-countdown-v57")).toContainText(/\d+:\d{2}/);

  const secondContext = await browser.newContext({ locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh" });
  const secondPage = await secondContext.newPage();
  try {
    await register(secondPage, `v57-seat-b-${stamp}@example.test`, "V57 Seat User B");
    const secondHold = await authedJson(secondPage, `/api/showtimes/${showtimeId}/holds`, {
      method: "POST",
      body: { seatIds: best.seatIds },
    });
    expect(secondHold.status).toBe(409);

    await secondPage.goto(bookingUrl);
    for (const code of best.seatCodes) {
      await expect(secondPage.getByRole("button", { name: `Ghế ${code}` })).toHaveAttribute("title", /HELD/);
    }
  } finally {
    await secondContext.close();
    await authedJson(page, `/api/showtimes/${showtimeId}/holds`, { method: "DELETE", body: { seatIds: best.seatIds } });
  }
});
