import { expect, test } from "@playwright/test";
import { gotoSurface, loginExistingAdmin } from "./runtime-guards";

test("admin maintenance blackout blocks showtime planning", async ({ page }) => {
  const reason = "Bảo trì định kỳ máy chiếu";

  await loginExistingAdmin(page);

  await gotoSurface(page, "/admin/maintenance", "maintenance-page");
  await expect(page.getByTestId("maintenance-auditorium-blocking")).toContainText("Bảo trì & khóa phòng chiếu");
  // V48 creates an additional cinema earlier in the serial E2E suite. Pin the
  // migration-backed cinema explicitly instead of depending on alphabetical order.
  const maintenanceCinema = page.getByLabel("Rạp bảo trì");
  await expect.poll(async () => maintenanceCinema.locator("option").count()).toBeGreaterThan(0);
  await maintenanceCinema.selectOption({ label: "CineHub Quận 1" });
  const maintenanceRoom = page.getByLabel("Phòng bảo trì", { exact: true });
  await expect.poll(async () => maintenanceRoom.locator("option").count()).toBeGreaterThan(1);
  await maintenanceRoom.selectOption({ label: "CineHub Quận 1 · Phòng 02" });
  const auditoriumId = await maintenanceRoom.inputValue();
  const expectedStart = Date.parse("2026-10-01T10:00:00+07:00");
  const expectedEnd = Date.parse("2026-10-01T13:00:00+07:00");

  // A prior interrupted V34 run can leave its own deterministic blackout behind.
  // Remove only that exact test-owned window through the real UI before creating
  // a fresh one; backend overlap conflicts remain strict and must still return 409
  // for unrelated/real maintenance windows.
  for (;;) {
    const candidates = page.locator(`[data-testid="maintenance-blackout-card"][data-auditorium-id="${auditoriumId}"]`).filter({ hasText: reason });
    let staleIndex = -1;
    for (let i = 0; i < await candidates.count(); i += 1) {
      const candidate = candidates.nth(i);
      const start = await candidate.getAttribute("data-blackout-start");
      const end = await candidate.getAttribute("data-blackout-end");
      if (start && end && Date.parse(start) === expectedStart && Date.parse(end) === expectedEnd) {
        staleIndex = i;
        break;
      }
    }
    if (staleIndex < 0) break;

    const staleCard = candidates.nth(staleIndex);
    const staleId = await staleCard.getAttribute("data-blackout-id");
    expect(staleId).toBeTruthy();
    const staleIdentityCard = page.locator(`[data-testid="maintenance-blackout-card"][data-blackout-id="${staleId}"]`);
    page.once("dialog", dialog => dialog.accept());
    const [deleteResponse] = await Promise.all([
      page.waitForResponse(response => new URL(response.url()).pathname === `/api/admin/auditorium-blackouts/${staleId}` && response.request().method() === "DELETE"),
      staleIdentityCard.getByRole("button", { name: "Mở lại phòng" }).click(),
    ]);
    expect(deleteResponse.status()).toBe(204);
    await expect(staleIdentityCard).toHaveCount(0);
  }

  await page.getByLabel("Bắt đầu bảo trì").fill("2026-10-01T10:00");
  await page.getByLabel("Kết thúc bảo trì").fill("2026-10-01T13:00");
  await page.getByLabel("Lý do bảo trì").fill(reason);
  const [createBlackoutResponse] = await Promise.all([
    page.waitForResponse(response => new URL(response.url()).pathname === "/api/admin/auditorium-blackouts" && response.request().method() === "POST"),
    page.getByRole("button", { name: "Khóa phòng" }).click(),
  ]);
  expect(createBlackoutResponse.status()).toBe(201);
  const createdBlackout = await createBlackoutResponse.json() as { id:string; reason:string };
  expect(createdBlackout.reason).toBe(reason);
  const createdBlackoutCard = page.locator(`[data-testid="maintenance-blackout-card"][data-blackout-id="${createdBlackout.id}"]`);
  await expect(createdBlackoutCard).toBeVisible();

  await gotoSurface(page, "/admin/showtimes", "showtime-planning-page");
  const planningMovie = page.getByLabel("Phim lập lịch");
  await expect.poll(async () => planningMovie.locator("option").count()).toBeGreaterThan(1);
  await planningMovie.selectOption({ index: 1 });
  await page.getByLabel("Phòng lập lịch").selectOption({ label: "CineHub Quận 1 · Phòng 02" });
  await page.getByLabel("Từ ngày lập lịch").fill("2026-10-01");
  await page.getByLabel("Đến ngày lập lịch").fill("2026-10-01");
  await page.getByLabel("Khung giờ mỗi ngày").fill("10:30");
  await page.getByRole("button", { name: "Xem trước lịch" }).click();

  await expect(page.getByLabel("Yêu cầu: 1")).toBeVisible();
  await expect(page.getByLabel("Có thể tạo: 0")).toBeVisible();
  await expect(page.getByLabel("Trùng lịch: 1")).toBeVisible();
  await expect(page.getByText(new RegExp(`Xung đột: Bảo trì · ${reason}`))).toBeVisible();

  await gotoSurface(page, "/admin/maintenance", "maintenance-page");
  // Navigation reconstructs the page and defaults to the first cinema again.
  // Re-pin the migration-backed cinema before looking for the blackout created above.
  const cleanupCinema = page.getByLabel("Rạp bảo trì");
  await expect.poll(async () => cleanupCinema.locator("option").count()).toBeGreaterThan(0);
  await cleanupCinema.selectOption({ label: "CineHub Quận 1" });
  const blackoutCard = page.locator(`[data-testid="maintenance-blackout-card"][data-blackout-id="${createdBlackout.id}"]`);
  await expect(blackoutCard).toBeVisible();
  await expect(blackoutCard).toContainText(reason);
  page.once("dialog", dialog => dialog.accept());
  await blackoutCard.getByRole("button", { name: "Mở lại phòng" }).click();
  await expect(blackoutCard).toHaveCount(0);
});
