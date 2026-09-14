import { expect, test, type Page } from "@playwright/test";
import { gotoHydrated, waitForHydratedRuntime } from "./runtime-guards";

async function loginAdmin(page: Page) {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;
  if (!email || !password) throw new Error("E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD must come from the existing project .env");

  await gotoHydrated(page, "/login");

  // V77.0.0 contract: VI is the initial state; a persisted VI/EN preference
  // is restored by LanguageProvider after mount.
  await page.evaluate(() => window.localStorage.removeItem("cinebooking_language"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForHydratedRuntime(page);
  await expect(page.locator("html")).toHaveAttribute("lang", "vi");
  await expect(page.locator('button[title="Tiếng Việt"]')).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('button[title="English"]')).toHaveAttribute("aria-pressed", "false");

  // Persisted EN is restored exactly like V77.0.0.
  await page.evaluate(() => window.localStorage.setItem("cinebooking_language", "en"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForHydratedRuntime(page);
  await expect(page.locator("html")).toHaveAttribute("lang", "en", { timeout: 15000 });
  await expect(page.locator('button[title="English"]')).toHaveAttribute("aria-pressed", "true");

  await page.getByTestId("login-email").fill(email);
  await page.getByTestId("login-password").fill(password);
  await Promise.all([
    page.waitForURL(/\/admin$/, { timeout: 15000 }),
    page.getByTestId("login-submit").click(),
  ]);
  await waitForHydratedRuntime(page);
}

test("V77.0.14 uses the exact V77.0.0 VN/EN language flow", async ({ page }) => {
  await loginAdmin(page);

  // EN survives navigation because V77.0.0 persists cinebooking_language.
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem("cinebooking_language"))).toBe("en");
  await expect(page.getByRole("heading", { name: "Admin Dashboard" })).toBeVisible();

  // EN -> VN is a normal React click in the V77.0.0 provider/switcher flow.
  await page.locator('button[title="Tiếng Việt"]').click();
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem("cinebooking_language"))).toBe("vi");
  await expect(page.locator("html")).toHaveAttribute("lang", "vi");
  await expect(page.getByRole("heading", { name: "Bảng điều khiển quản trị" })).toBeVisible();

  // VN -> EN uses the same persisted state path.
  await page.locator('button[title="English"]').click();
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem("cinebooking_language"))).toBe("en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { name: "Admin Dashboard" })).toBeVisible();

  await gotoHydrated(page, "/admin/customer-value");
  await expect(page.locator("html")).toHaveAttribute("lang", "en", { timeout: 15000 });
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem("cinebooking_language"))).toBe("en");
  // V77.0.27: prove the provider itself has reconciled before asserting page copy.
  await expect(page.locator('button[title="English"]')).toHaveAttribute("aria-pressed", "true", { timeout: 15000 });
  const root = page.getByTestId("customer-value-intelligence-v56");
  await expect(root).toContainText("Customer Value & RFM Intelligence", { timeout: 15000 });
  await expect(page.getByTestId("customer-value-error-v56")).toHaveCount(0);
  await expect(page.getByTestId("customer-value-summary-v56")).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId("customer-value-rfm-v56")).toBeVisible();
  await expect(page.getByTestId("customer-value-bands-v56")).toBeVisible();
  await expect(page.getByTestId("customer-value-top-v56")).toBeVisible();

  const period = page.getByTestId("customer-value-period-v56");
  await period.selectOption("365");
  await expect(page.getByTestId("customer-value-summary-v56")).toContainText("365 days");

  const cinema = page.getByTestId("customer-value-cinema-filter-v56");
  await expect.poll(async () => cinema.locator("option").count(), { timeout: 15000 }).toBeGreaterThan(1);
  await cinema.selectOption({ index: 1 });
  await expect(page.getByTestId("customer-value-rfm-v56")).toBeVisible();

  // The same old switcher changes a V77.0.14 page because that page derives
  // presentation copy from the V77.0.0 language state, not from a DOM translator.
  await page.locator('button[title="Tiếng Việt"]').click();
  await expect(page.locator("html")).toHaveAttribute("lang", "vi");
  await expect(root).toContainText("Giá trị khách hàng & phân tích RFM");

  await page.locator('button[title="English"]').click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");

  // Full-page navigation restores the saved EN preference exactly as V77.0.0.
  await gotoHydrated(page, "/admin/maintenance");
  await expect(page.locator("html")).toHaveAttribute("lang", "en", { timeout: 15000 });
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem("cinebooking_language"))).toBe("en");
  // V77.0.23: the provider state itself must converge after hard navigation.
  // The EN switcher state is a direct user-visible proof that descendants are
  // reading the persisted EN preference before asserting Maintenance copy.
  await expect(page.locator('button[title="English"]')).toHaveAttribute("aria-pressed", "true", { timeout: 15000 });
  await expect(page.getByTestId("maintenance-register-equipment-title")).toHaveText("Register equipment", { timeout: 15000 });

  await gotoHydrated(page, "/admin/showtimes");
  await expect(page.locator("html")).toHaveAttribute("lang", "en", { timeout: 15000 });
  await expect(page.getByRole("button", { name: "Preview schedule" })).toBeVisible({ timeout: 15000 });
});
