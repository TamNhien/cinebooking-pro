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

test("V56 admin reviews privacy-safe realized customer value and RFM by cinema",async({page})=>{
  await loginAdmin(page);
  await page.goto("/admin/customer-value");

  await expect(page.getByTestId("customer-value-intelligence-v56")).toContainText("Customer Value & RFM Intelligence · V56");
  await expect(page.getByTestId("customer-value-summary-v56")).toBeVisible();
  await expect(page.getByTestId("customer-value-rfm-v56")).toBeVisible();
  await expect(page.getByTestId("customer-value-bands-v56")).toBeVisible();
  await expect(page.getByTestId("customer-value-top-v56")).toBeVisible();

  const period=page.getByTestId("customer-value-period-v56");
  await period.selectOption("365");
  await expect(page.getByTestId("customer-value-summary-v56")).toContainText("365 ngày");

  const cinema=page.getByTestId("customer-value-cinema-filter-v56");
  await expect.poll(async()=>cinema.locator("option").count(),{timeout:15000}).toBeGreaterThan(1);
  await cinema.selectOption({index:1});
  await expect(page.getByTestId("customer-value-rfm-v56")).toBeVisible();
});
