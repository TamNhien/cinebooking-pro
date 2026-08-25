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

test("V58 admin sees centralized near-realtime payment booking equipment staff support inventory and incident control",async({page})=>{
  await loginAdmin(page);
  await page.goto("/admin/operations-control");

  await expect(page.getByTestId("operations-control-center-v58")).toContainText("Operations Control Center · V58");
  await expect(page.getByTestId("operations-control-summary-v58")).toBeVisible();
  await expect(page.getByTestId("operations-control-domains-v58")).toBeVisible();
  await expect(page.getByTestId("operations-control-alerts-v58")).toBeVisible();
  await expect(page.getByTestId("operations-control-detail-v58")).toBeVisible();
  await expect(page.getByTestId("operations-control-live-v58")).toContainText("Live snapshot");

  const domainText=await page.getByTestId("operations-control-domains-v58").innerText();
  for(const domain of ["PAYMENT","BOOKING","EQUIPMENT","STAFF","SUPPORT","INVENTORY","INCIDENT"]){
    expect(domainText).toContain(domain);
  }

  const auto=page.getByTestId("operations-control-auto-refresh-v58");
  await expect(auto).toBeChecked();
  await auto.uncheck();
  await expect(auto).not.toBeChecked();
  await auto.check();

  const cinema=page.getByTestId("operations-control-cinema-filter-v58");
  await expect.poll(async()=>cinema.locator("option").count(),{timeout:15000}).toBeGreaterThan(1);
  await cinema.selectOption({index:1});
  await expect(page.getByTestId("operations-control-summary-v58")).toBeVisible();
  await expect(page.getByTestId("operations-control-domains-v58")).toBeVisible();
});
