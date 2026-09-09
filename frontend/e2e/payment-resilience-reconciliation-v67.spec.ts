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

test("V67 payment resilience dashboard exposes safe recovery controls",async({page})=>{
  await loginAdmin(page);
  const tile=page.getByTestId("admin-payment-resilience-v67");
  await expect(tile).toBeVisible();
  await expect(tile).toContainText("Payment Resilience V67");
  await tile.click();
  await expect(page).toHaveURL(/\/admin\/payment-resilience$/);
  await expect(page.getByTestId("payment-resilience-v67")).toContainText("V67 · PAYMENT RESILIENCE & RECONCILIATION 5.0");
  await expect(page.getByTestId("payment-resilience-error-v67")).toHaveCount(0);
  await expect(page.getByTestId("payment-resilience-strategy-v67")).toContainText("V67-PAYMENT-RESILIENCE-5");
  await expect(page.getByTestId("payment-reconcile-policy-v67")).toContainText("Gateway reconciliation");
  await expect(page.getByTestId("refund-settlement-v67")).toContainText("Evidence required");
  await expect(page.getByTestId("webhook-recovery-queue-v67")).toContainText("Webhook recovery queue");
  await expect(page.getByTestId("payment-resilience-v67")).toContainText("không được replay như nguồn sự thật");
});
