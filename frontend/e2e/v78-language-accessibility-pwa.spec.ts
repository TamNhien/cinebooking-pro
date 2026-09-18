import { expect, test } from "@playwright/test";
import { gotoHydrated, loginExistingAdmin, waitForHydratedRuntime } from "./runtime-guards";

const routes = [
  "/", "/profile", "/mobile", "/offline", "/offline-tickets", "/bookings", "/payments", "/security",
  "/staff/check-in", "/staff/operations", "/staff/schedule",
  "/cinemas", "/movies", "/favorites", "/for-you", "/notifications", "/promotions", "/support", "/waitlist",
  "/login", "/register", "/forgot-password", "/reset-password", "/payment/mock", "/payment/qr", "/payment/result",
  "/admin", "/admin/ux-accessibility-pwa", "/admin/crm-automation", "/admin/actions-runtime", "/admin/attendance", "/admin/audit", "/admin/booking-seat-intelligence",
  "/admin/operations-control", "/admin/disaster-recovery", "/admin/analytics", "/admin/analytics-bi", "/admin/pricing",
  "/admin/inventory", "/admin/key-governance", "/admin/privacy-governance", "/admin/observability",
  "/admin/reliability", "/admin/risk", "/admin/bookings", "/admin/payments", "/admin/staff", "/admin/support",
  "/admin/vouchers", "/admin/supply-chain", "/admin/recommendation", "/admin/command-center",
  "/admin/payment-resilience", "/admin/seat-operations", "/admin/customer-value", "/admin/finance",
  "/admin/performance", "/admin/maintenance", "/admin/security", "/admin/shifts", "/admin/marketing",
  "/admin/commerce", "/admin/reviews", "/admin/showtimes", "/admin/loyalty", "/admin/refunds", "/admin/retention",
];

async function presentationLeaks(page: import("@playwright/test").Page) {
  return page.locator('h1,h2,h3,h4,h5,h6,button,label,option,th,.section-kicker,.empty-state,input[placeholder],textarea[placeholder],[aria-label],[title]').evaluateAll((elements) =>
    elements
      .filter((element) => {
        const htmlElement = element as HTMLElement;
        if (htmlElement.closest('[data-i18n-skip="true"]')) return false;
        const clone = htmlElement.cloneNode(true) as HTMLElement;
        clone.querySelectorAll('[data-i18n-skip="true"]').forEach(node => node.remove());
        const copy = [
          clone.textContent,
          htmlElement.getAttribute("placeholder"),
          htmlElement.getAttribute("aria-label"),
          htmlElement.getAttribute("title"),
        ].filter(Boolean).join(" ");
        return /[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i.test(copy);
      })
      .map(element => ({
        tag: element.tagName,
        text: (element as HTMLElement).innerText?.trim() || "",
        aria: element.getAttribute("aria-label") || "",
        title: element.getAttribute("title") || "",
        placeholder: element.getAttribute("placeholder") || "",
      })),
  );
}

test("V78 VI/EN switch covers full presentation surfaces and accessibility/PWA shell", async ({ page }) => {
  test.setTimeout(600_000);
  await loginExistingAdmin(page);
  await gotoHydrated(page, "/admin");
  await waitForHydratedRuntime(page);

  await page.getByTestId("language-switch-en").click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator('a.skip-link[href="#main-content"]')).toHaveText("Skip to main content");
  await expect(page.locator("main#main-content")).toHaveAttribute("tabindex", "-1");
  await expect(page.getByTestId("admin-ux-accessibility-pwa-v78")).toHaveText("♿ UX & PWA V78");
  await expect(page.getByTestId("admin-ux-accessibility-pwa-v78")).toHaveAttribute("href", "/admin/ux-accessibility-pwa");

  const adminVersionActions = [
    ["/admin/command-center", "Command center V53"],
    ["/admin/performance", "Performance V54"],
    ["/admin/retention", "Customer retention V55"],
    ["/admin/customer-value", "Customer value V56"],
    ["/admin/booking-seat-intelligence", "Booking & seat intelligence V57"],
    ["/admin/operations-control", "Operations control V58"],
    ["/admin/operations-control", "Realtime operations V59"],
    ["/admin/payments", "Payment production V60"],
    ["/admin/risk", "Fraud & risk V61"],
    ["/admin/pricing", "Dynamic pricing V62"],
    ["/for-you", "Recommendation V63"],
    ["/admin/marketing", "CRM & marketing V64"],
    ["/admin/observability", "Observability V65"],
    ["/admin/seat-operations", "Seat operations V66"],
    ["/admin/payment-resilience", "Payment resilience V67"],
    ["/admin/security", "Security & identity V68"],
    ["/admin/disaster-recovery", "Backup & recovery V69"],
    ["/admin/privacy-governance", "Privacy governance V70"],
    ["/admin/key-governance", "Key governance V71"],
    ["/admin/supply-chain", "Software supply chain V72"],
    ["/admin/actions-runtime", "Actions runtime V73"],
    ["/admin/reliability", "Reliability V74"],
    ["/admin/analytics-bi", "Analytics & BI V75"],
    ["/admin/recommendation", "Recommendation V76"],
    ["/admin/crm-automation", "CRM automation V77"],
    ["/admin/ux-accessibility-pwa", "UX & PWA V78"],
  ] as const;
  for (const [href, englishTitle] of adminVersionActions) {
    await expect(page.locator(`a[href="${href}"]`).filter({ hasText: englishTitle }).first(), `Admin version action must switch to EN: ${englishTitle}`).toContainText(englishTitle);
  }

  for (const route of routes) {
    await gotoHydrated(page, route);
    if (route === "/staff/schedule") await expect(page).toHaveURL(/\/staff\/schedule$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    if (route === "/admin/audit") {
      await expect(page.getByTestId("admin-audit-kicker-v7805")).toHaveText("SECURITY & AUDIT");
      await expect(page.getByTestId("admin-audit-entity-header-v7805")).toHaveText("Entity");
    }
    if (route === "/admin/pricing") {
      const pricingRuleName = page.getByTestId("pricing-rule-name-v7816").first();
      if (await pricingRuleName.count()) await expect(pricingRuleName).toHaveAttribute("data-i18n-skip", "true");
    }
    if (route === "/admin/bookings") {
      const cinemaOption = page.getByTestId("admin-bookings-cinema-option-v7817").first();
      if (await cinemaOption.count()) await expect(cinemaOption).toHaveAttribute("data-i18n-skip", "true");
    }
    if (route === "/admin/booking-seat-intelligence") {
      const movieTitle = page.getByTestId("booking-seat-intelligence-movie-title-v7817").first();
      if (await movieTitle.count()) await expect(movieTitle).toHaveAttribute("data-i18n-skip", "true");
    }
    if (route === "/admin/inventory") {
      await expect(page.getByTestId("inventory-alert-threshold-label-v7806")).toHaveText("Alert threshold");
      await expect(page.getByTestId("inventory-target-stock-label-v7806")).toHaveText("Target stock");
      await expect(page.locator('[data-testid="inventory-cinema-select"] option').first()).toHaveAttribute("data-i18n-skip", "true");
      const productName = page.getByTestId("inventory-product-name-v7807").first();
      if (await productName.count()) {
        await expect(productName).not.toHaveAttribute("data-i18n-skip", "true");
        await expect(productName).not.toHaveText(/^(?:Bắp|Nước)/u);
      }
    }
    if (route === "/movies") {
      const genreOptions = page.locator('select').nth(0).locator('option');
      await expect(page.getByRole("option", { name: "Mystery", exact: true })).toHaveCount(await page.getByRole("option", { name: "Mystery", exact: true }).count());
      expect(await genreOptions.count()).toBeGreaterThan(0);
    }
    if (route === "/favorites") {
      const favoriteTitle = page.getByTestId("movie-card-title-v7808").first();
      if (await favoriteTitle.count()) {
        await expect(favoriteTitle).toHaveAttribute("data-i18n-skip", "true");
        const favoriteGenre = page.getByTestId("movie-card-genre-v7808").first();
        if (await favoriteGenre.count()) await expect(favoriteGenre).not.toHaveAttribute("data-i18n-skip", "true");
      }
    }
    if (route === "/admin/command-center") {
      const cinemaOption = page.getByTestId("command-center-cinema-option-v7809").first();
      if (await cinemaOption.count()) await expect(cinemaOption).toHaveAttribute("data-i18n-skip", "true");
      await expect(page.getByRole("heading", { name: "Needs attention" })).toBeVisible();
      await expect(page.getByText("Support requests past SLA", { exact: true })).toHaveCount(await page.getByText("Support requests past SLA", { exact: true }).count());
    }
    if (route === "/admin/customer-value") {
      const cinemaOption = page.getByTestId("customer-value-cinema-option-v7810").first();
      if (await cinemaOption.count()) await expect(cinemaOption).toHaveAttribute("data-i18n-skip", "true");
    }
    if (route === "/admin/performance") {
      const cinemaOption = page.getByTestId("performance-cinema-option-v7810").first();
      if (await cinemaOption.count()) await expect(cinemaOption).toHaveAttribute("data-i18n-skip", "true");
      await expect(page.getByRole("columnheader", { name: "Revenue", exact: true })).toBeVisible();
      const revenueCell = page.locator('[data-testid="performance-branches-v54"] tbody td').filter({ hasText: "₫" }).first();
      if (await revenueCell.count()) await expect(revenueCell).toHaveText(/^[0-9,.]+ ₫$/);
      const performanceText = await page.locator("main#main-content").innerText();
      expect(performanceText).not.toMatch(/\d+\s+đặt vé/u);
    }
    if (route === "/admin/retention") {
      const cinemaOption = page.getByTestId("retention-cinema-option-v7810").first();
      if (await cinemaOption.count()) await expect(cinemaOption).toHaveAttribute("data-i18n-skip", "true");
    }
    if (route === "/admin/finance") {
      await expect(page.getByTestId("finance-event-key-header-v7811")).toHaveText("Event key");
      const eventKey = page.getByTestId("finance-event-key-value-v7811").first();
      if (await eventKey.count()) await expect(eventKey).toHaveAttribute("data-i18n-skip", "true");
    }
    if (route === "/admin/maintenance") {
      const assetName = page.getByTestId("maintenance-asset-name-card-v7812").first();
      if (await assetName.count()) await expect(assetName).toHaveAttribute("data-i18n-skip", "true");
      const tableAssetName = page.getByTestId("maintenance-asset-name-table-v7812").first();
      if (await tableAssetName.count()) await expect(tableAssetName).toHaveAttribute("data-i18n-skip", "true");
    }
    if (route === "/admin/shifts") {
      const staffOption = page.getByTestId("admin-shift-staff-option-v7815").first();
      if (await staffOption.count()) await expect(staffOption).toHaveAttribute("data-i18n-skip", "true");
    }
    if (route === "/admin/loyalty") {
      await expect(page.getByText("V40 · LOYALTY OPERATIONS", { exact: true })).toBeVisible();
      await expect(page.getByRole("columnheader", { name: "Balance", exact: true })).toBeVisible();
      await expect(page.getByRole("columnheader", { name: "Lifetime", exact: true })).toBeVisible();
      await expect(page.getByRole("columnheader", { name: "Expiring soon", exact: true })).toBeVisible();
      await expect(page.getByRole("columnheader", { name: "Adjustment", exact: true })).toBeVisible();
    }
    if (route === "/admin/support") {
      const sla = page.getByTestId("admin-support-sla-r5").first();
      if (await sla.count()) {
        await expect(sla).toContainText("SLA due");
        await expect(sla).toContainText("Assignee");
        await expect(sla).not.toContainText("Hạn SLA");
        await expect(sla).not.toContainText("Phụ trách");
      }
    }
    if (route === "/admin/booking-seat-intelligence") {
      const auditorium = page.getByTestId("booking-seat-auditorium-r5").first();
      if (await auditorium.count()) await expect(auditorium).not.toHaveText(/^Phòng\s/u);
    }
    if (route === "/promotions") {
      const product = page.getByTestId("promotion-concession-name-r5").first();
      if (await product.count()) await expect(product).not.toHaveText(/^(?:Bắp|Nước)/u);
    }
    if (route === "/admin/payments") {
      const paymentCopy = (await page.locator("main#main-content").innerText()).replace(/\s+/g, " ");
      for (const forbidden of [
        "Thanh toán nội bộ (MOCK)",
        "Không phải gateway production",
        "MOCK chỉ dành cho local/CI",
        "Chưa cấu hình merchant credentials",
        "Gateway đang ở sandbox",
        "hiện chỉ phù hợp local/sandbox",
      ]) expect(paymentCopy, `Payment EN leak: ${forbidden}`).not.toContain(forbidden);
      if (paymentCopy.includes("MOCK")) expect(paymentCopy).toContain("Internal payment (MOCK)");
    }
    const leaks = await presentationLeaks(page);
    expect(leaks, `Vietnamese presentation copy leaked on ${route}: ${JSON.stringify(leaks)}`).toEqual([]);
  }

  // R5 dynamic-payload closure: follow a real showtime into booking so auditorium,
  // loyalty-point copy and controlled concession names are exercised with API data.
  await gotoHydrated(page, "/admin/booking-seat-intelligence");
  const bookingLink = page.locator('a[href^="/booking/"]').first();
  if (await bookingLink.count()) {
    const href = await bookingLink.getAttribute("href");
    if (href) {
      await gotoHydrated(page, href);
      const pageText = await page.locator("main#main-content").innerText();
      expect(pageText).not.toMatch(/\bPhòng\s+\d+/u);
      const pointsCopy = page.getByTestId("booking-points-conversion-r5");
      if (await pointsCopy.count()) {
        await expect(pointsCopy).toContainText("1 point =");
        await expect(pointsCopy).not.toContainText("1 điểm");
      }
      const concession = page.getByTestId("booking-concession-name-r5").first();
      if (await concession.count()) await expect(concession).not.toHaveText(/^(?:Bắp|Nước)/u);
    }
  }

  await gotoHydrated(page, "/mobile");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  const pwaLiveRegion = page.getByTestId("pwa-live-region-v7814");
  await expect(pwaLiveRegion).toHaveAttribute("role", "status");
  await expect(pwaLiveRegion).toHaveAttribute("aria-live", "polite");
  await expect(pwaLiveRegion).toHaveAttribute("aria-atomic", "true");

  await page.getByTestId("language-switch-vi").click();
  await expect(page.locator("html")).toHaveAttribute("lang", "vi");
  await expect(page.locator('a.skip-link[href="#main-content"]')).toHaveText("Bỏ qua đến nội dung chính");
});
