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

test("V60 admin sees production gateway readiness without exposing secrets",async({page})=>{
  await loginAdmin(page);
  await page.goto("/admin/payments");

  const panel=page.getByTestId("payment-production-readiness-v60");
  await expect(panel).toContainText("Payment Production Readiness · V60");
  await expect(panel).toContainText("Production guard đang bật");
  await expect(page.getByTestId("payment-readiness-vnpay-v60")).toContainText("VNPay");
  await expect(page.getByTestId("payment-readiness-momo-v60")).toContainText("MoMo");
  await expect(page.getByTestId("payment-readiness-mock-v60")).toContainText("MOCK");

  // CI intentionally has no real merchant credentials. The UI must remain honest rather than
  // pretending a production gateway is ready.
  await expect(page.getByTestId("payment-production-overall-v60")).toContainText("CHƯA SẴN SÀNG PRODUCTION");
  await expect(page.getByTestId("payment-readiness-vnpay-v60")).toContainText("NOT CONFIGURED");
  await expect(page.getByTestId("payment-readiness-momo-v60")).toContainText("NOT CONFIGURED");

  const body=await page.locator("body").innerText();
  expect(body).not.toContain("VNPAY_HASH_SECRET");
  expect(body).not.toContain("MOMO_SECRET_KEY");
  expect(body).not.toContain("MOMO_ACCESS_KEY");
  expect(body).toContain("merchant identity");
  expect(body).toContain("replay");
});
