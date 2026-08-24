import { expect, test } from "@playwright/test";

async function loginAdmin(page:any){
  const email=process.env.E2E_ADMIN_EMAIL||"admin-v29@cine.local";
  const password=process.env.E2E_ADMIN_PASSWORD||"V29SmokeOnly-ChangeMe";
  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Mật khẩu").fill(password);
  await Promise.all([
    page.waitForURL(/\/admin$/,{timeout:15000}),
    page.getByRole("button",{name:"Đăng nhập"}).click(),
  ]);
}

test("V51 admin analytics forecasts revenue and preserves unknown concession cost",async({page})=>{
  await loginAdmin(page);
  await page.goto("/admin/analytics");

  await expect(page.getByTestId("analytics-v51")).toBeVisible();
  await expect(page.getByTestId("period-comparison-v51")).toBeVisible();
  await expect(page.getByTestId("forecast-v51")).toContainText("V51-WEEKDAY-WEIGHTED-MA-1");
  await expect(page.getByTestId("margin-v51")).toContainText("NULL / Chưa biết");
  await expect(page.getByTestId("auditorium-performance-v51")).toBeVisible();
  await expect(page.getByTestId("analytics-snapshots-v51")).toContainText("FOR UPDATE ... SKIP LOCKED");

  const cinemaFilter=page.getByTestId("analytics-cinema-filter");
  const optionCount=await cinemaFilter.locator("option").count();
  expect(optionCount).toBeGreaterThan(1);
  await cinemaFilter.selectOption({index:1});
  await expect(page.getByTestId("cost-basis-v51")).toBeVisible();

  const firstInput=page.getByTestId("cost-basis-v51").locator('input[placeholder="Chưa biết"]').first();
  const saveButton=page.getByTestId("cost-basis-v51").getByRole("button",{name:"Lưu cost"}).first();
  await firstInput.fill("");
  await saveButton.click();
  await expect(page.getByTestId("cost-basis-v51")).toContainText("Chưa biết");

  await page.reload();
  await expect(page.getByTestId("analytics-v51")).toBeVisible();
  await expect(page.getByTestId("forecast-v51")).toContainText("V51-WEEKDAY-WEIGHTED-MA-1");
});
