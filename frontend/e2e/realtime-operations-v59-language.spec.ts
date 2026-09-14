import { expect, test } from "@playwright/test";
import { gotoHydrated, waitForHydratedRuntime } from "./runtime-guards";

test("V59 renders one localized domain title per card and keeps alerts/history language-clean",async({page})=>{
  test.setTimeout(180_000);
  const email=process.env.E2E_ADMIN_EMAIL;const password=process.env.E2E_ADMIN_PASSWORD;
  if(!email||!password)throw new Error("existing admin credentials are required");
  await gotoHydrated(page, "/login");
  await page.getByTestId("login-email").fill(email);await page.getByTestId("login-password").fill(password);
  await Promise.all([page.waitForURL(/\/admin$/,{timeout:15000}),page.getByTestId("login-submit").click()]);
  await waitForHydratedRuntime(page);
  await gotoHydrated(page, "/admin/operations-control");
  const root=page.getByTestId("operations-control-center-v59");
  await expect(root).toContainText("Trung tâm vận hành thời gian thực");
  await expect(page.getByTestId("operations-control-summary-v58")).toBeVisible({ timeout: 30_000 });
  const domains=[
    {code:"payment",vi:"Thanh toán",en:"Payments"},{code:"booking",vi:"Đặt vé",en:"Bookings"},
    {code:"equipment",vi:"Thiết bị",en:"Equipment"},{code:"staff",vi:"Nhân sự",en:"Staff"},
    {code:"support",vi:"Hỗ trợ",en:"Support"},{code:"inventory",vi:"Kho",en:"Inventory"},
    {code:"incident",vi:"Sự cố",en:"Incidents"},
  ];
  for(const domain of domains){
    const card=page.getByTestId(`operations-domain-${domain.code}-v59`);
    await expect(card.getByTestId(`operations-domain-name-${domain.code}-v59`)).toHaveText(domain.vi);
    await expect(card.getByText(domain.vi,{exact:true})).toHaveCount(1);
  }
  const alerts=page.getByTestId("operations-control-alerts-v58");
  await expect(alerts).not.toContainText(/\b(HIGH|MEDIUM|LOW|CRITICAL)\b/);
  const historyDetails=page.getByTestId("operations-history-detail-v59");
  if(await historyDetails.count()){
    for(let i=0;i<await historyDetails.count();i++){
      await expect(historyDetails.nth(i)).not.toContainText(/\b(PAYMENT|BOOKING|EQUIPMENT|STAFF|SUPPORT|INVENTORY|INCIDENT)\b/);
      await expect(historyDetails.nth(i)).not.toContainText(/\bcount=/);
    }
  }
  await page.getByTestId("language-switch-en").click();
  await expect(page.locator("html")).toHaveAttribute("lang","en");
  await expect(root).toContainText("Realtime Operations Center");
  for(const domain of domains){
    const card=page.getByTestId(`operations-domain-${domain.code}-v59`);
    await expect(card.getByTestId(`operations-domain-name-${domain.code}-v59`)).toHaveText(domain.en);
    await expect(card.getByText(domain.en,{exact:true})).toHaveCount(1);
  }
  await expect(page.getByTestId("operations-control-cinema-filter-v58")).toContainText("All cinemas");


  // V77.0.41: verify the global language contract beyond V59. These pages were
  // previously VI-only in several buttons/links even after the EN switch.
  const assertNoVietnameseInteractiveCopy = async () => {
    const leaks = await page.locator('button, label, option, .btn, .nav-link, .nav-menu-panel a, .menu-drawer-submenu a, input[placeholder], textarea[placeholder], h1, h2, h3, h4, h5, h6, .section-kicker, .empty-state, th').evaluateAll((elements) =>
      elements
        .filter((element) => {
          const htmlElement = element as HTMLElement;
          if (htmlElement.closest('[data-i18n-skip="true"]')) return false;
          const clone = htmlElement.cloneNode(true) as HTMLElement;
          clone.querySelectorAll('[data-i18n-skip="true"]').forEach((node) => node.remove());
          const copy = [
            clone.textContent,
            htmlElement.getAttribute('placeholder'),
            htmlElement.getAttribute('aria-label'),
            htmlElement.getAttribute('title'),
          ].filter(Boolean).join(' ');
          return /[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i.test(copy);
        })
        .map((element) => ({
          tag: element.tagName,
          text: (element as HTMLElement).innerText?.trim() || '',
          placeholder: element.getAttribute('placeholder') || '',
          aria: element.getAttribute('aria-label') || '',
          title: element.getAttribute('title') || '',
        })),
    );
    expect(leaks, `Vietnamese interactive copy leaked in EN mode: ${JSON.stringify(leaks)}`).toEqual([]);
  };

  // V77.0.41: presentation copy is checked separately from business data.
  // Cinema names, customer/movie names and identifiers may legitimately contain
  // Vietnamese diacritics even while the UI language is English.
  await expect(page.getByTestId("operations-control-center-v58")).toHaveText("Operations Control Center · V58");
  await expect(page.getByRole("heading", { name: "Realtime Operations Center" })).toBeVisible();
  await expect(page.getByText("Operational pulse", { exact: true })).toBeVisible();
  await expect(page.getByText("Centralized realtime alerts", { exact: true })).toBeVisible();
  await expect(page.getByText("Control details", { exact: true })).toBeVisible();
  await expect(page.getByText("Alert action history", { exact: true })).toBeVisible();
  await assertNoVietnameseInteractiveCopy();

  // V77.0.41 release gate: keep one EN session while sweeping public, customer,
  // and admin presentation surfaces. Business data stays source-owned via
  // data-i18n-skip boundaries and therefore is not mistaken for UI copy.
  const languageSweepRoutes = [
    "/",
    "/movies",
    "/cinemas",
    "/payments",
    "/support",
    "/admin",
    "/admin/payments",
    "/admin/staff",
    "/admin/support",
    "/admin/crm-automation",
    "/admin/vouchers",
    "/admin/analytics-bi",
    "/admin/actions-runtime",
  ];
  for (const route of languageSweepRoutes) {
    await gotoHydrated(page, route);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    if (route === "/movies") {
      await expect(page.getByTestId("movies-search-label")).toHaveText("Search movies");
      await expect(page.getByTestId("movies-genre-label")).toHaveText("Genre");
      await expect(page.getByTestId("movies-language-label")).toHaveText("Language");
      await expect(page.getByTestId("movies-rating-label")).toHaveText("Rating");
    }
    if (route === "/support") {
      await expect(page.getByRole("option", { name: "Cinema experience" })).toBeAttached();
    }
    if (route === "/admin/payments") {
      await expect(page.getByRole("columnheader", { name: "Attempt", exact: true })).toBeVisible();
      await expect(page.getByRole("columnheader", { name: "Merchant / Payment gateway", exact: true })).toBeVisible();
    }
    if (route === "/admin/crm-automation") {
      await expect(page.getByText("Activate first booking", { exact: true })).toBeVisible();
      await expect(page.getByText("VIP appreciation", { exact: true })).toBeVisible();
      await expect(page.getByText("Suggestion: Small, short-lived offer to activate the first booking.", { exact: true })).toBeVisible();
      await expect(page.getByText("Default discount: 10%", { exact: true }).first()).toBeVisible();
    }
    if (route === "/admin/vouchers") {
      await expect(page.getByRole("button", { name: "Create voucher" })).toBeVisible({ timeout: 30_000 });
    }
    if (route === "/admin/analytics-bi") {
      await expect(page.getByRole("button", { name: "↻ Refresh" })).toBeVisible({ timeout: 30_000 });
    }
    if (route === "/admin/actions-runtime") {
      await expect(page.getByRole("link", { name: /Dashboard/ }).first()).toBeVisible({ timeout: 30_000 });
    }
    await assertNoVietnameseInteractiveCopy();
  }

  await page.getByTestId("language-switch-vi").click();
  await expect(page.locator("html")).toHaveAttribute("lang", "vi");
  await gotoHydrated(page, "/admin/analytics-bi");
  await expect(page.getByRole("button", { name: "↻ Làm mới" })).toBeVisible({ timeout: 30_000 });
});
