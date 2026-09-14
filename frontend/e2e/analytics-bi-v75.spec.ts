import { expect, test } from "@playwright/test";
import { ensureSurface, loginExistingAdmin } from "./runtime-guards";

test("V75 Analytics & BI exposes real-data funnel, cohort, LTV and efficiency",async({page})=>{
  await loginExistingAdmin(page);

  const tile=page.getByTestId("admin-analytics-bi-v75");
  await expect(tile).toBeVisible();
  await expect(tile).toContainText("Phân tích dữ liệu & BI V75");
  await expect(tile).toHaveAttribute("href","/admin/analytics-bi");

  const versionLabels=await page.locator('[data-testid="admin-action-grid-v59"] a').allTextContents();
  const versions=versionLabels.map(label=>label.match(/\bV(\d+)\b/)).filter((m):m is RegExpMatchArray=>Boolean(m)).map(m=>Number(m[1]));
  expect(versions).toEqual([...versions].sort((a,b)=>a-b));
  expect(versions).toContain(74);
  expect(versions).toContain(75);
  expect(versions.at(-1)).toBeGreaterThanOrEqual(75);

  await tile.click();
  await expect(page).toHaveURL(/\/admin\/analytics-bi$/);
  const root=await ensureSurface(page,"analytics-bi-v75","/admin/analytics-bi");
  await expect(root).toHaveAttribute("data-analytics-bi-ready","true",{timeout:30_000});
  await expect(root).toContainText("V75 · PHÂN TÍCH DỮ LIỆU & BI 5.0");
  await expect(page.getByTestId("analytics-bi-summary-v75")).toContainText("V75-ANALYTICS-BI-5");
  const policy=page.getByTestId("analytics-bi-policy-v75");
  await expect(policy).toHaveAttribute("data-policy-real-operational","true");
  await expect(policy).toHaveAttribute("data-policy-no-synthetic-funnel","true");
  await expect(page.getByTestId("booking-funnel-v75")).toContainText("BOOKING_ATTEMPT");
  await expect(page.getByTestId("booking-funnel-v75")).toContainText("PAID");
  await expect(page.getByTestId("cohort-retention-v75")).toContainText("Quay lại 30 ngày");
  await expect(page.getByTestId("ltv-v75")).toContainText("Giá trị vòng đời khách hàng thực nhận");
  await expect(page.getByTestId("payment-conversion-v75")).toContainText("Tỷ lệ chuyển đổi thanh toán");
  await expect(page.getByTestId("movie-efficiency-v75")).toContainText("Hiệu suất phim");
  await expect(page.getByTestId("cinema-efficiency-v75")).toContainText("Hiệu suất rạp");
  await expect(page.getByTestId("analytics-bi-error-v75")).toHaveCount(0);
});
