import { expect, test } from "@playwright/test";
import { ensureSurface, gotoSurface, loginExistingAdmin } from "./runtime-guards";

test("V76 Recommendation 5.0 exposes real-data quality and evidence",async({page})=>{
  await loginExistingAdmin(page);

  const tile=page.getByTestId("admin-recommendation-v76");
  await expect(tile).toBeVisible();
  await expect(tile).toContainText("Gợi ý phim V76");
  await expect(tile).toHaveAttribute("href","/admin/recommendation");

  const versionLabels=await page.locator('[data-testid="admin-action-grid-v59"] a').allTextContents();
  const versions=versionLabels.map(label=>label.match(/\bV(\d+)\b/)).filter((m):m is RegExpMatchArray=>Boolean(m)).map(m=>Number(m[1]));
  expect(versions).toEqual([...versions].sort((a,b)=>a-b));
  expect(versions).toContain(75);
  expect(versions.at(-1)).toBeGreaterThanOrEqual(76);

  await tile.click();
  await expect(page).toHaveURL(/\/admin\/recommendation$/);
  const adminRoot=await ensureSurface(page,"recommendation-admin-v76","/admin/recommendation");
  await expect(adminRoot).toHaveAttribute("data-recommendation-admin-ready","true",{timeout:30_000});
  await expect(adminRoot).toContainText("V76 · GỢI Ý PHIM 5.0");
  await expect(page.getByTestId("recommendation-summary-v76")).toContainText("V76-RECOMMENDATION-5");
  const policy=page.getByTestId("recommendation-policy-v76");
  await expect(policy).toHaveAttribute("data-policy-real-operational","true");
  await expect(policy).toHaveAttribute("data-policy-no-synthetic-movie","true");
  await expect(policy).toHaveAttribute("data-policy-assisted-correlation","true");
  await expect(page.getByTestId("recommendation-coverage-v76")).toContainText("Phim có thể gợi ý");
  await expect(page.getByTestId("recommendation-feedback-v76")).toContainText("Thêm");
  await expect(page.getByTestId("recommendation-assisted-v76")).toContainText("tương quan");
  await expect(page.getByTestId("recommendation-top-movies-v76")).toContainText("Tương tác phim hàng đầu");
  await expect(page.getByTestId("recommendation-sources-v76")).toContainText("Nguồn sự kiện gợi ý phim");
  await expect(page.getByTestId("recommendation-admin-error-v76")).toHaveCount(0);

  const forYou=await gotoSurface(page,"/for-you","for-you-v63");
  await expect(forYou).toHaveAttribute("data-recommendation-ready","true",{timeout:30_000});
  await expect(page.getByTestId("for-you-v76")).toBeVisible();
  await expect(page.getByText("V76 · GỢI Ý PHIM 5.0")).toBeVisible();
  const evidence=page.getByTestId("recommendation-evidence-v76");
  await expect(evidence).toHaveAttribute("data-policy-real-operational","true");
  await expect(evidence).toHaveAttribute("data-policy-no-synthetic-movie","true");
});
