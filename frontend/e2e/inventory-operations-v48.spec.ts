import { expect, test } from "@playwright/test";

test("V48 admin manages branch stock price waste and transfer",async({page})=>{
  const adminEmail=process.env.E2E_ADMIN_EMAIL||"admin-v29@cine.local";
  const adminPassword=process.env.E2E_ADMIN_PASSWORD||"V29SmokeOnly-ChangeMe";
  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(adminEmail);
  await page.getByPlaceholder("Mật khẩu").fill(adminPassword);
  await Promise.all([page.waitForURL(/\/admin$/,{timeout:15000}),page.getByRole("button",{name:"Đăng nhập"}).click()]);

  await page.goto("/admin/inventory");
  await expect(page.getByRole("heading",{name:"Kho bắp nước theo rạp"})).toBeVisible();
  const cinema=page.getByTestId("inventory-cinema-select");
  const product=page.getByTestId("inventory-product-select");
  await expect.poll(async()=>cinema.locator("option").count()).toBeGreaterThan(1);
  await expect.poll(async()=>product.locator("option").count()).toBeGreaterThan(0);

  await page.getByRole("spinbutton",{name:"Số lượng nhập thêm"}).fill("5");
  await page.getByPlaceholder("Ghi chú nghiệp vụ...").fill("Bổ sung tồn kho ca tối V48");
  await page.getByRole("button",{name:"Ghi sổ kho"}).click();
  await expect(page.getByRole("status")).toContainText("Đã nhập kho cho chi nhánh");

  await page.getByRole("button",{name:"Hao hụt"}).click();
  await page.getByRole("spinbutton",{name:"Số lượng hao hụt"}).fill("1");
  await page.getByPlaceholder("Ghi chú nghiệp vụ...").fill("Hao hụt kiểm kê cuối ca V48");
  await page.getByRole("button",{name:"Ghi sổ kho"}).click();
  await expect(page.getByRole("status")).toContainText("Đã ghi nhận hao hụt");
  await expect(page.getByText("WASTE",{exact:true}).first()).toBeVisible();

  const priceInput=page.getByTestId("branch-price-input");
  const current=Number(await priceInput.inputValue());
  await priceInput.fill(String(current+1000));
  await page.getByTestId("branch-price-save").click();
  await expect(page.getByRole("status")).toContainText("Đã cập nhật giá bán tại rạp");

  await page.getByRole("button",{name:"+ Nhập"}).click();
  await page.getByRole("spinbutton",{name:"Số lượng nhập thêm"}).fill("3");
  await page.getByRole("button",{name:"Ghi sổ kho"}).click();
  await expect(page.getByRole("status")).toContainText("Đã nhập kho cho chi nhánh");
  const transferCard=page.getByRole("heading",{name:"Điều chuyển giữa rạp"}).locator("..");
  await transferCard.locator('input[type="number"]').fill("1");
  await page.getByTestId("inventory-transfer-button").click();
  await expect(page.getByRole("status")).toContainText("Đã điều chuyển 1");
  await expect(page.getByText("TRANSFER_OUT",{exact:true}).first()).toBeVisible();
});
