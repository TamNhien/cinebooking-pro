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

test("V53 admin sees a cinema-scoped operations command center built from real operational signals",async({page})=>{
  await loginAdmin(page);
  await page.goto("/admin/command-center");
  await expect(page.getByTestId("operations-command-center-v53")).toContainText("Operations Command Center · V53");
  await expect(page.getByTestId("command-center-summary-v53")).toBeVisible();
  await expect(page.getByTestId("command-center-attention-v53")).toBeVisible();

  const filter=page.getByTestId("command-center-cinema-filter");
  await expect.poll(async()=>filter.locator("option").count(),{timeout:15000}).toBeGreaterThan(1);
  await filter.selectOption({index:1});
  await expect(page.getByTestId("command-center-summary-v53")).toBeVisible();
});
