import { expect, type Page } from "@playwright/test";

const RUNTIME_READY_ATTR = "data-cinebooking-runtime-ready";

/**
 * V77.0.28 runtime gate. Docker may report a container as started before the
 * freshly replaced Next process has served every hydration chunk. The server
 * rendered HTML can therefore look healthy while React effects/API loads never
 * started. Wait for a marker emitted only by hydrated client JavaScript. If a
 * cold-start navigation missed a chunk, retry one read/navigation only.
 * Business writes are never retried here.
 */
export async function waitForHydratedRuntime(page: Page, retryUrl?: string) {
  const html = page.locator("html");
  if (await html.getAttribute(RUNTIME_READY_ATTR) === "true") return;

  const ready = await expect
    .poll(() => page.evaluate(() => document.documentElement.dataset.cinebookingRuntimeReady ?? ""), { timeout: 10_000 })
    .toBe("true")
    .then(() => true)
    .catch(() => false);
  if (ready) return;

  if (retryUrl) await page.goto(retryUrl, { waitUntil: "domcontentloaded" });
  else await page.reload({ waitUntil: "domcontentloaded" });
  await expect(html).toHaveAttribute(RUNTIME_READY_ATTR, "true", { timeout: 30_000 });
}

export async function gotoHydrated(page: Page, url: string) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await waitForHydratedRuntime(page, url);
}

/**
 * Full-suite guard for hard-navigation surfaces. A newly installed Service Worker
 * or a transient local reverse-proxy reconnect can leave a navigation on the
 * offline shell even though the requested URL is already in the address bar.
 * Retry one real navigation, then fail normally if the current surface still
 * does not exist. This never retries business writes.
 */
export async function ensureSurface(page: Page, testId: string, url?: string) {
  await waitForHydratedRuntime(page, url);
  const surface = page.getByTestId(testId);
  if (await surface.isVisible({ timeout: 4_000 }).catch(() => false)) return surface;
  if (url) await page.goto(url, { waitUntil: "domcontentloaded" });
  else await page.reload({ waitUntil: "domcontentloaded" });
  await waitForHydratedRuntime(page);
  await expect(surface).toBeVisible({ timeout: 15_000 });
  return surface;
}

export async function gotoSurface(page: Page, url: string, testId: string) {
  await gotoHydrated(page, url);
  return ensureSurface(page, testId, url);
}


export function existingAdminCredentials() {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;
  if (!email || !password) throw new Error("Existing root .env admin credentials are required");
  return { email, password };
}

export async function waitForAuthRole(page: Page, expectedRole: "USER" | "ADMIN") {
  await expect.poll(async () => page.evaluate(() => {
    const raw = localStorage.getItem("cinebooking_auth_v3");
    if (!raw) return null;
    try {
      const auth = JSON.parse(raw) as { accessToken?: string; role?: string };
      return auth.accessToken ? auth.role || null : null;
    } catch {
      return null;
    }
  }), { timeout: 30_000 }).toBe(expectedRole);
}

export async function loginWithRole(
  page: Page,
  email: string,
  password: string,
  expectedRole: "USER" | "ADMIN",
) {
  await gotoSurface(page, "/login", "login-email");
  await page.getByTestId("login-email").fill(email);
  await page.getByTestId("login-password").fill(password);
  await page.getByTestId("login-submit").click();
  await expect(page).toHaveURL(expectedRole === "ADMIN" ? /\/admin$/ : /\/$/, { timeout: 30_000 });
  await waitForHydratedRuntime(page);
  await waitForAuthRole(page, expectedRole);
}

export async function loginExistingAdmin(page: Page) {
  const admin = existingAdminCredentials();
  await loginWithRole(page, admin.email, admin.password, "ADMIN");
  return admin;
}

export async function waitForStepUpGrant(page: Page) {
  await expect.poll(async () => page.evaluate(() => {
    const raw = sessionStorage.getItem("cinebooking_admin_step_up_v68");
    if (!raw) return false;
    try {
      const parsed = JSON.parse(raw) as { token?: string; expiresAt?: string };
      return Boolean(parsed.token && (!parsed.expiresAt || Date.parse(parsed.expiresAt) > Date.now()));
    } catch {
      return false;
    }
  }), { timeout: 30_000 }).toBe(true);
}
