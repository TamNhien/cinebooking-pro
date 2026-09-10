import { expect, test, type Page } from "@playwright/test";

async function loginAdmin(page:Page){
  const email=process.env.E2E_ADMIN_EMAIL||"admin@cine.local";
  const password=process.env.E2E_ADMIN_PASSWORD||"Admin@123";
  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Mật khẩu").fill(password);
  await page.getByRole("button",{name:"Đăng nhập"}).click();
  await page.waitForURL(/\/admin$/,{timeout:15000});
}

test("V75 Analytics & BI exposes real-data funnel, cohort, LTV and efficiency",async({page})=>{
  await loginAdmin(page);

  const tile=page.getByTestId("admin-analytics-bi-v75");
  await expect(tile).toBeVisible();
  await expect(tile).toContainText("Analytics & BI V75");
  await expect(tile).toHaveAttribute("href","/admin/analytics-bi");

  const versionLabels=await page.locator('[data-testid="admin-action-grid-v59"] a').allTextContents();
  const versions=versionLabels.map(label=>label.match(/\bV(\d+)\b/)).filter((m):m is RegExpMatchArray=>Boolean(m)).map(m=>Number(m[1]));
  expect(versions).toEqual([...versions].sort((a,b)=>a-b));
  expect(versions).toContain(74);
  expect(versions).toContain(75);
  expect(versions.at(-1)).toBeGreaterThanOrEqual(75);

  await tile.click();
  await expect(page).toHaveURL(/\/admin\/analytics-bi$/);
  await expect(page.getByTestId("analytics-bi-v75")).toContainText("V75 · ANALYTICS & BI 5.0");
  await expect(page.getByTestId("analytics-bi-summary-v75")).toContainText("V75-ANALYTICS-BI-5");
  await expect(page.getByTestId("analytics-bi-policy-v75")).toContainText("REAL_OPERATIONAL_DATA_ONLY");
  await expect(page.getByTestId("analytics-bi-policy-v75")).toContainText("NO_SYNTHETIC_FUNNEL_EVENTS");
  await expect(page.getByTestId("booking-funnel-v75")).toContainText("BOOKING_ATTEMPT");
  await expect(page.getByTestId("booking-funnel-v75")).toContainText("PAID");
  await expect(page.getByTestId("cohort-retention-v75")).toContainText("30-day repeat");
  await expect(page.getByTestId("ltv-v75")).toContainText("Realized customer LTV");
  await expect(page.getByTestId("payment-conversion-v75")).toContainText("Payment conversion");
  await expect(page.getByTestId("movie-efficiency-v75")).toContainText("Hiệu suất phim");
  await expect(page.getByTestId("cinema-efficiency-v75")).toContainText("Hiệu suất rạp");
  await expect(page.getByTestId("analytics-bi-error-v75")).toHaveCount(0);
});
