import { expect, test, type Page } from "@playwright/test";

const PASSWORD = "V39SeatRace!Customer123";

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

test("V39 smart seat suggestion and atomic contention guard", async ({ page, browser }) => {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const firstEmail = `v39-seat-a-${stamp}@example.test`;
  const secondEmail = `v39-seat-b-${stamp}@example.test`;

  await register(page, firstEmail, "V39 Seat User A");
  await chooseSeededShowtime(page);
  const bookingUrl = page.url();
  const showtimeId = bookingUrl.split("/").pop()!;

  await test.step("smart suggestion selects a contiguous pair", async () => {
    await expect(page.getByLabel("Gợi ý ghế thông minh")).toBeVisible();
    await page.getByLabel("Số người cần xếp ghế").selectOption("2");
    await page.getByRole("button", { name: "Gợi ý ghế" }).click();
    await expect(page.getByText(/2 ghế liền nhau/).first()).toBeVisible();
    const selected = page.locator('button[aria-label^="Ghế "].bg-rose-500');
    await expect.poll(async () => selected.count()).toBe(2);
  });

  const suggestion = await authedJson<{ suggestions: { seatIds: string[]; seatCodes: string[] }[] }>(
    page,
    `/api/showtimes/${showtimeId}/seat-suggestions?count=2`,
  );
  expect(suggestion.status).toBe(200);
  const body = suggestion.body!;
  expect(body.suggestions.length).toBeGreaterThan(0);
  const candidate = body.suggestions[0];
  expect(candidate.seatIds).toHaveLength(2);

  const secondContext = await browser.newContext({ locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh" });
  const secondPage = await secondContext.newPage();
  try {
    await register(secondPage, secondEmail, "V39 Seat User B");
    await secondPage.goto(bookingUrl);
    await expect(secondPage.getByLabel("Gợi ý ghế thông minh")).toBeVisible();

    await test.step("two users racing the same pair produce exactly one winner", async () => {
      const [a,b] = await Promise.all([
        authedJson(page, `/api/showtimes/${showtimeId}/holds`, { method: "POST", body: { seatIds: candidate.seatIds } }),
        authedJson(secondPage, `/api/showtimes/${showtimeId}/holds`, { method: "POST", body: { seatIds: candidate.seatIds } }),
      ]);
      expect([a.status,b.status].sort((x,y)=>x-y)).toEqual([200,409]);

      const winnerPage = a.status===200 ? page : secondPage;
      const loserPage = a.status===200 ? secondPage : page;
      await loserPage.goto(bookingUrl);
      for (const code of candidate.seatCodes) {
        await expect(loserPage.getByRole("button", { name: `Ghế ${code}` })).toHaveAttribute("title", /HELD/);
      }

      const release = await authedJson(winnerPage, `/api/showtimes/${showtimeId}/holds`, { method: "DELETE", body: { seatIds: candidate.seatIds } });
      expect([200,204]).toContain(release.status);
    });
  } finally {
    await secondContext.close();
  }
});
