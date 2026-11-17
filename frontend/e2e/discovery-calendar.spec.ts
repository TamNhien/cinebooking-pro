import { expect, test } from "@playwright/test";
import { gotoHydrated, gotoSurface } from "./runtime-guards";

type PublicShowtime = {
  movieId: string;
  movieTitle: string;
  cinemaId: string;
  cinemaName: string;
  startTime: string;
};

function vietnamDay(iso: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric",
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find(part => part.type === type)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

test("movie discovery filters and available showtime calendar", async ({ page, request }) => {
  let marsHref = "";
  await test.step("filter the eight-movie demo catalog", async () => {
    await gotoHydrated(page, "/movies");
    await expect(page.getByRole("heading", { name: "Khám phá phim" })).toBeVisible();

    await page.getByRole("button", { name: "Tất cả" }).click();
    await page.getByLabel("Thể loại").selectOption({ label: "Khoa học viễn tưởng" });

    await expect(page.getByText("Hành Trình Sao Hỏa").first()).toBeVisible();
    await expect(page.getByText("Đêm Sài Gòn 2088").first()).toBeVisible();
    await expect(page.getByText(/2 phim phù hợp/)).toBeVisible();

    await page.getByLabel("Phân loại").selectOption("T13");
    await expect(page.getByText(/1 phim phù hợp/)).toBeVisible();
    await expect(page.getByText("Hành Trình Sao Hỏa").first()).toBeVisible();
    marsHref = await page.getByRole("link", { name: "Xem chi tiết Hành Trình Sao Hỏa" }).getAttribute("href") || "";
    expect(marsHref).toMatch(/^\/movies\/[0-9a-f-]+$/i);

    await page.getByRole("button", { name: "Đặt lại" }).click();
    await expect(page.getByText(/8 phim phù hợp/)).toBeVisible();
  });

  // Historical V29 migration still owns 2026-09-30; the public /api/showtimes
  // endpoint deliberately excludes that day once it is in the past.
  // Prove the currently available date against the real API, not a stale fixture.
  const response = await request.get("/api/showtimes");
  expect(response.ok()).toBeTruthy();
  const publicShows = await response.json() as PublicShowtime[];
  const marsId = marsHref.split("/").pop() || "";
  const marsShows = publicShows.filter(show => show.movieId === marsId);
  expect(marsShows.length, "The V29 demo requires upcoming shows; provision a current demo schedule before E2E").toBeGreaterThan(0);
  const sample = marsShows[0];
  const selectedDay = vietnamDay(sample.startTime);
  const selectedMonth = selectedDay.slice(0, 7);
  const cinemaShows = publicShows.filter(show => show.cinemaId === sample.cinemaId && vietnamDay(show.startTime) === selectedDay);
  const uniqueMovies = new Set(cinemaShows.map(show => show.movieId));
  const selectedMovieShows = marsShows.filter(show => vietnamDay(show.startTime) === selectedDay);

  await test.step("browse the currently available real cinema schedule", async () => {
    await gotoHydrated(page, "/cinemas");
    await expect(page.getByRole("heading", { name: "Rạp & lịch chiếu" })).toBeVisible();
    await page.getByRole("button", { name: new RegExp(sample.cinemaName) }).click();

    const monthLabel = new Intl.DateTimeFormat("vi-VN", { month: "long", year: "numeric" })
      .format(new Date(`${selectedMonth}-01T00:00:00`));
    const monthButton = page.getByRole("button", { name: new RegExp(monthLabel, "i") });
    await expect(monthButton).toBeVisible();
    await monthButton.click();

    const datePicker = page.getByLabel("Chọn ngày");
    await expect.poll(async () => {
      const max = await datePicker.getAttribute("max");
      return Boolean(max && max >= selectedDay);
    }).toBe(true);
    await datePicker.fill(selectedDay);

    await expect(page.getByText(new RegExp(`Ngày đã chọn có\\s*${cinemaShows.length}\\s*suất của\\s*${uniqueMovies.size}\\s*phim`))).toBeVisible();
    await expect(page.getByRole("heading", { name: "Hành Trình Sao Hỏa" })).toBeVisible();
  });

  await test.step("show only the selected real day on a movie-detail schedule", async () => {
    const detail = await gotoSurface(page, marsHref, "movie-detail-v31");
    await expect(detail).toBeVisible({ timeout: 30_000 });
    await expect(detail).toHaveAttribute("data-movie-title", "Hành Trình Sao Hỏa");

    const datePicker = page.getByLabel("Chọn ngày");
    await expect.poll(async () => {
      const max = await datePicker.getAttribute("max");
      return Boolean(max && max >= selectedDay);
    }).toBe(true);
    await datePicker.fill(selectedDay);
    await expect(page.getByText(new RegExp(`Đang xem .*${selectedMovieShows.length} suất`))).toBeVisible();
    await expect(page.locator('a[href^="/booking/"]')).toHaveCount(selectedMovieShows.length);
  });
});
