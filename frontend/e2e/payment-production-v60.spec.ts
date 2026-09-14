import { expect, test } from "@playwright/test";
import { gotoSurface, loginExistingAdmin } from "./runtime-guards";


test("V60 admin sees production gateway readiness without exposing secrets",async({page})=>{
  await loginExistingAdmin(page);
  await gotoSurface(page, "/admin/payments", "payment-production-readiness-v60");

  const panel=page.getByTestId("payment-production-readiness-v60");
  await expect(panel).toContainText("Mức sẵn sàng thanh toán vận hành · V60");
  await expect(panel).toContainText("Cơ chế bảo vệ sản xuất đang bật");
  await expect(page.getByTestId("payment-readiness-vnpay-v60")).toContainText("VNPay");
  await expect(page.getByTestId("payment-readiness-momo-v60")).toContainText("MoMo");
  await expect(page.getByTestId("payment-readiness-mock-v60")).toContainText("MOCK");

  // CI intentionally has no real merchant credentials. The UI must remain honest rather than
  // pretending a production gateway is ready.
  await expect(page.getByTestId("payment-production-overall-v60")).toContainText("CHƯA SẴN SÀNG SẢN XUẤT");
  await expect(page.getByTestId("payment-readiness-vnpay-v60")).toContainText("CHƯA CẤU HÌNH");
  await expect(page.getByTestId("payment-readiness-momo-v60")).toContainText("CHƯA CẤU HÌNH");

  const body=await page.locator("body").innerText();
  expect(body).not.toContain("VNPAY_HASH_SECRET");
  expect(body).not.toContain("MOMO_SECRET_KEY");
  expect(body).not.toContain("MOMO_ACCESS_KEY");
  expect(body).toContain("danh tính thương gia");
  expect(body).toContain("phát lại");
});
