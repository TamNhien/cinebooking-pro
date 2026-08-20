import { expect, test, type Page } from "@playwright/test";

const PASSWORD = "V40Loyalty!Customer123";

async function login(page: Page, email: string, password: string, expectedRole: "USER" | "ADMIN") {
  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Mật khẩu").fill(password);

  // Login writes the access token to localStorage and then performs a hard navigation.
  // Do not let the next test action race that asynchronous hand-off.
  await Promise.all([
    page.waitForURL(expectedRole === "ADMIN" ? /\/admin$/ : /\/$/, { timeout: 15000 }),
    page.getByRole("button", { name: "Đăng nhập" }).click(),
  ]);

  await expect.poll(async () => page.evaluate(() => {
    const raw = localStorage.getItem("cinebooking_auth_v3");
    if (!raw) return null;
    try {
      const auth = JSON.parse(raw) as { accessToken?: string; role?: string };
      return auth.accessToken ? auth.role || null : null;
    } catch {
      return null;
    }
  })).toBe(expectedRole);
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

async function logout(page: Page) {
  await page.evaluate(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => undefined);
    localStorage.clear();
  });
}

test("V40 admin credit -> private voucher + concession reward -> staff claim", async ({ page, context }) => {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const email = `v40-loyalty-${stamp}@example.test`;
  const adminEmail = process.env.E2E_ADMIN_EMAIL || "admin-v29@cine.local";
  const adminPassword = process.env.E2E_ADMIN_PASSWORD || "V29SmokeOnly-ChangeMe";

  await test.step("register loyalty customer", async () => {
    await page.goto("/register");
    await page.getByPlaceholder("Họ và tên").fill("V40 Loyalty Customer");
    await page.getByPlaceholder("Email").fill(email);
    await page.getByPlaceholder("Nhập mật khẩu").fill(PASSWORD);
    await page.getByPlaceholder("Nhập lại mật khẩu").fill(PASSWORD);
    await page.getByRole("button", { name: "Đăng ký" }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  await test.step("admin credits 500 non-qualifying adjustment points", async () => {
    await logout(page); await context.clearCookies();
    await login(page, adminEmail, adminPassword, "ADMIN");
    await expect(page).toHaveURL(/\/admin$/);
    const members = await authedJson<{ userId:string; email:string }[]>(page, "/api/admin/loyalty/members");
    expect(members.status).toBe(200);
    const member = members.body!.find(x => x.email === email);
    expect(member).toBeTruthy();
    const adjusted = await authedJson<{ balancePoints:number; lifetimePoints:number; membershipTier:string }>(
      page,
      `/api/admin/loyalty/users/${member!.userId}/adjustments`,
      { method:"POST", body:{ deltaPoints:500, reason:"V40 Playwright reward journey" } },
    );
    expect(adjusted.status).toBe(200);
    expect(adjusted.body?.balancePoints).toBe(500);
    expect(adjusted.body?.lifetimePoints).toBe(0);
    expect(adjusted.body?.membershipTier).toBe("BRONZE");
  });

  let giftCode = "";
  await test.step("customer spends points without lowering lifetime tier", async () => {
    await logout(page); await context.clearCookies();
    await login(page, email, PASSWORD, "USER");
    await expect(page).toHaveURL(/\/$/);

    // Prove the admin adjustment survived the auth/session hand-off before asserting UI.
    // This separates a backend persistence/auth problem from a rendering/locator problem.
    const beforeSpend = await authedJson<{ balancePoints:number; lifetimePoints:number; membershipTier:string }>(page, "/api/loyalty/summary");
    expect(beforeSpend.status).toBe(200);
    expect(beforeSpend.body?.balancePoints).toBe(500);
    expect(beforeSpend.body?.lifetimePoints).toBe(0);
    expect(beforeSpend.body?.membershipTier).toBe("BRONZE");

    await page.goto("/profile");
    await expect(page.getByRole("heading", { name: "🎁 Đổi điểm lấy phần thưởng" })).toBeVisible();
    await expect(page.getByTestId("loyalty-balance-points")).toHaveText("500");
    await expect(page.getByTestId("loyalty-lifetime-points")).toHaveText("0");
    await expect(page.getByTestId("loyalty-membership-tier")).toHaveText("BRONZE");

    page.once("dialog", d => d.accept());
    const voucherCard = page.locator("article").filter({ hasText:"Voucher giảm 20.000đ" }).first();
    await voucherCard.getByRole("button", { name:"Đổi" }).click();
    await expect(page.getByText(/Voucher: RWD-RWD20K-/)).toBeVisible();
    await expect(page.getByText(/^RWD-RWD20K-/).first()).toBeVisible();
    await expect(page.getByTestId("loyalty-balance-points")).toHaveText("300");
    await expect(page.getByTestId("loyalty-membership-tier")).toHaveText("BRONZE");

    page.once("dialog", d => d.accept());
    const cornCard = page.locator("article").filter({ hasText:"Bắp Caramel miễn phí" }).first();
    await cornCard.getByRole("button", { name:"Đổi" }).click();
    const gift = page.getByText(/^GIFT-RWDCORN-/).first();
    await expect(gift).toBeVisible();
    giftCode = (await gift.textContent())!.trim();
    expect(giftCode).toMatch(/^GIFT-RWDCORN-/);
    await expect(page.getByTestId("loyalty-balance-points")).toHaveText("0");
    await expect(page.getByTestId("loyalty-membership-tier")).toHaveText("BRONZE");

    const summary = await authedJson<{ balancePoints:number; lifetimePoints:number; membershipTier:string }>(page, "/api/loyalty/summary");
    expect(summary.status).toBe(200);
    expect(summary.body?.balancePoints).toBe(0);
    expect(summary.body?.lifetimePoints).toBe(0);
    expect(summary.body?.membershipTier).toBe("BRONZE");
  });

  await test.step("admin uses staff reward counter and duplicate claim is blocked", async () => {
    await logout(page); await context.clearCookies();
    await login(page, adminEmail, adminPassword, "ADMIN");

    // Prove the freshly established Admin session is accepted by the backend before
    // navigating to the client-guarded staff page. This catches token/session races
    // separately from staff-page rendering failures.
    const adminMe = await authedJson<{ role:string }>(page, "/api/me");
    expect(adminMe.status).toBe(200);
    expect(adminMe.body?.role).toBe("ADMIN");

    await page.goto("/staff/check-in");
    await expect(page).toHaveURL(/\/staff\/check-in$/);
    const rewardInput = page.getByPlaceholder("GIFT-RWDCORN-XXXXXXXX");
    await expect(rewardInput).toBeVisible();
    await rewardInput.fill(giftCode);
    await page.getByRole("button", { name:"Xác nhận giao quà" }).click();
    const claimResult = page.getByTestId("loyalty-reward-claim-result");
    await expect(claimResult).toBeVisible();
    await expect(page.getByTestId("loyalty-reward-claim-product")).toContainText("Bắp Caramel × 1");
    await expect(page.getByTestId("loyalty-reward-claim-customer-email")).toHaveText(email);
    await expect(page.getByTestId("loyalty-reward-claim-code")).toHaveText(giftCode);

    const duplicate = await authedJson<{ message?:string }>(page, "/api/staff/loyalty-rewards/claim", { method:"POST", body:{ code:giftCode } });
    expect(duplicate.status).toBe(409);
  });
});
