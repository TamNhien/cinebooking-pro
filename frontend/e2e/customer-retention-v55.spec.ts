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

test("V55 admin reviews honest customer retention cohorts by cinema and period",async({page})=>{
  await loginAdmin(page);
  await page.goto("/admin/retention");

  await expect(page.getByTestId("retention-intelligence-v55")).toContainText("Customer Retention & Cohort Intelligence · V55");
  await expect(page.getByTestId("retention-summary-v55")).toBeVisible();
  await expect(page.getByTestId("retention-lifecycle-v55")).toBeVisible();
  await expect(page.getByTestId("retention-cohorts-v55")).toBeVisible();
  await expect(page.getByTestId("retention-daily-v55")).toBeVisible();

  const period=page.getByTestId("retention-period-v55");
  await period.selectOption("90");
  await expect(page.getByTestId("retention-summary-v55")).toContainText("90 ngày");

  const cinema=page.getByTestId("retention-cinema-filter-v55");
  await expect.poll(async()=>cinema.locator("option").count(),{timeout:15000}).toBeGreaterThan(1);
  await cinema.selectOption({index:1});
  await expect(page.getByTestId("retention-summary-v55")).toBeVisible();
});
