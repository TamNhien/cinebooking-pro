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

test("V76 Recommendation 5.0 exposes real-data quality and evidence",async({page})=>{
  await loginAdmin(page);

  const tile=page.getByTestId("admin-recommendation-v76");
  await expect(tile).toBeVisible();
  await expect(tile).toContainText("Recommendation V76");
  await expect(tile).toHaveAttribute("href","/admin/recommendation");

  const versionLabels=await page.locator('[data-testid="admin-action-grid-v59"] a').allTextContents();
  const versions=versionLabels.map(label=>label.match(/\bV(\d+)\b/)).filter((m):m is RegExpMatchArray=>Boolean(m)).map(m=>Number(m[1]));
  expect(versions).toEqual([...versions].sort((a,b)=>a-b));
  expect(versions).toContain(75);
  expect(versions.at(-1)).toBe(76);

  await tile.click();
  await expect(page).toHaveURL(/\/admin\/recommendation$/);
  await expect(page.getByTestId("recommendation-admin-v76")).toContainText("V76 · RECOMMENDATION 5.0");
  await expect(page.getByTestId("recommendation-summary-v76")).toContainText("V76-RECOMMENDATION-5");
  await expect(page.getByTestId("recommendation-policy-v76")).toContainText("REAL_OPERATIONAL_DATA_ONLY");
  await expect(page.getByTestId("recommendation-policy-v76")).toContainText("NO_SYNTHETIC_MOVIE_DATA");
  await expect(page.getByTestId("recommendation-policy-v76")).toContainText("ASSISTED_BOOKING_IS_CORRELATION_NOT_CAUSATION");
  await expect(page.getByTestId("recommendation-coverage-v76")).toContainText("Actionable movies");
  await expect(page.getByTestId("recommendation-feedback-v76")).toContainText("MORE");
  await expect(page.getByTestId("recommendation-assisted-v76")).toContainText("correlation");
  await expect(page.getByTestId("recommendation-top-movies-v76")).toContainText("Top movie interaction");
  await expect(page.getByTestId("recommendation-sources-v76")).toContainText("Recommendation event sources");
  await expect(page.getByTestId("recommendation-admin-error-v76")).toHaveCount(0);

  await page.goto("/for-you");
  await expect(page.getByTestId("for-you-v76")).toBeVisible();
  await expect(page.getByText("V76 · RECOMMENDATION 5.0")).toBeVisible();
  await expect(page.getByTestId("recommendation-evidence-v76")).toContainText("REAL_OPERATIONAL_DATA_ONLY");
  await expect(page.getByTestId("recommendation-evidence-v76")).toContainText("NO_SYNTHETIC_MOVIE_DATA");
});
