import {expect,test} from "@playwright/test";

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

test("V62 admin simulates explainable bounded dynamic pricing without writing fake bookings",async({page})=>{
  await loginAdmin(page);
  await page.goto("/admin/pricing");
  await expect(page.getByTestId("dynamic-pricing-v62")).toContainText("Dynamic Pricing 4.0");

  const strategy=page.getByTestId("dynamic-pricing-strategy-v62");
  await expect(strategy).toContainText("V62_RULESET_1");
  await expect(strategy).toContainText("Occupancy");
  await expect(strategy).toContainText("Demand");
  await expect(strategy).toContainText("Time");
  await expect(strategy).toContainText("-10%");
  await expect(strategy).toContainText("+25%");

  const simulator=page.getByTestId("dynamic-pricing-simulator-v62");
  await expect(simulator).toContainText("không ghi database");
  await simulator.getByRole("button",{name:"Mô phỏng"}).click();
  const result=page.getByTestId("dynamic-pricing-simulation-result-v62");
  await expect(result).toBeVisible();
  await expect(result).toContainText("+12%");
  await expect(result).toContainText("Mức lấp đầy");
  await expect(result).toContainText("Tốc độ nhu cầu");
  await expect(result).toContainText("Thời gian tới suất chiếu");
});
