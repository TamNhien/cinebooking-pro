import { BrowserContext, expect, Page, test } from "@playwright/test";

const AUTH_STORAGE_KEY="cinebooking_auth_v3";

type StoredAuth={accessToken:string;role:string};

async function adminAuth(context:BrowserContext,page:Page):Promise<StoredAuth>{
  const origin=new URL(page.url()).origin;
  let resolved:StoredAuth|null=null;
  await expect.poll(async()=>{
    const state=await context.storageState();
    const raw=state.origins.find(item=>item.origin===origin)?.localStorage.find(item=>item.name===AUTH_STORAGE_KEY)?.value;
    if(!raw)return false;
    try{
      const auth=JSON.parse(raw) as StoredAuth;
      if(auth.role!=="ADMIN"||!auth.accessToken)return false;
      resolved=auth;
      return true;
    }catch{return false;}
  },{timeout:15000}).toBe(true);
  if(!resolved)throw new Error("ADMIN auth storage missing for V48 inventory E2E");
  return resolved;
}

test("V48 admin manages branch stock price waste and transfer",async({page,context})=>{
  const adminEmail=process.env.E2E_ADMIN_EMAIL||"admin-v29@cine.local";
  const adminPassword=process.env.E2E_ADMIN_PASSWORD||"V29SmokeOnly-ChangeMe";
  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(adminEmail);
  await page.getByPlaceholder("Mật khẩu").fill(adminPassword);
  await Promise.all([page.waitForURL(/\/admin$/,{timeout:15000}),page.getByRole("button",{name:"Đăng nhập"}).click()]);

  // The disposable E2E migration baseline intentionally contains one cinema only.
  // Create a second branch through the real admin API so V48 can exercise an actual transfer.
  // createCinema must provision inventory + price rows for every existing concession product.
  const auth=await adminAuth(context,page);
  const createCinema=await context.request.post(new URL("/api/admin/cinemas",page.url()).toString(),{
    headers:{Authorization:`Bearer ${auth.accessToken}`},
    data:{
      name:"CGV Vincom Center Landmark 81",
      address:"Tầng B1, TTTM Vincom Center Landmark 81, 772 Điện Biên Phủ, P.22, Q. Bình Thạnh, TP.HCM"
    }
  });
  expect(createCinema.status()).toBe(201);

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
