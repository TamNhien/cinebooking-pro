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

test("V54 admin benchmarks cinema performance with equal-window real-data metrics",async({page})=>{
  await loginAdmin(page);
  await page.goto("/admin/performance");

  await expect(page.getByTestId("performance-benchmarking-v54")).toContainText("Performance Benchmarking · V54");
  await expect(page.getByTestId("performance-summary-v54")).toBeVisible();
  await expect(page.getByTestId("performance-branches-v54")).toBeVisible();
  await expect(page.getByTestId("performance-top-movies-v54")).toBeVisible();
  await expect(page.getByTestId("performance-daily-v54")).toBeVisible();

  const period=page.getByTestId("performance-period-v54");
  await period.selectOption("30");
  await expect(page.getByTestId("performance-summary-v54")).toContainText("30 ngày");

  const cinema=page.getByTestId("performance-cinema-filter-v54");
  await expect.poll(async()=>cinema.locator("option").count(),{timeout:15000}).toBeGreaterThan(1);
  await cinema.selectOption({index:1});
  await expect(page.getByTestId("performance-branches-v54")).toBeVisible();
});
