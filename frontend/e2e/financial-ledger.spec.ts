import { expect, test, type Page } from "@playwright/test";

const PASSWORD="V42Finance!Customer123";

async function authedJson<T>(page:Page,url:string){
  return page.evaluate(async url=>{
    const raw=localStorage.getItem("cinebooking_auth_v3");if(!raw)throw new Error("auth missing");
    const auth=JSON.parse(raw) as {accessToken?:string};
    const res=await fetch(url,{credentials:"include",headers:{Authorization:`Bearer ${auth.accessToken||""}`}});
    return {status:res.status,body:await res.json().catch(()=>null)};
  },url) as Promise<{status:number;body:T|null}>;
}
async function logout(page:Page){await page.evaluate(async()=>{await fetch("/api/auth/logout",{method:"POST",credentials:"include"}).catch(()=>undefined);localStorage.clear();});}
async function loginAdmin(page:Page,email:string,password:string){
  await page.goto("/login");await page.getByPlaceholder("Email").fill(email);await page.getByPlaceholder("Mật khẩu").fill(password);
  await Promise.all([page.waitForURL(/\/admin$/,{timeout:15000}),page.getByRole("button",{name:"Đăng nhập"}).click()]);
  await expect.poll(async()=>page.evaluate(()=>{const raw=localStorage.getItem("cinebooking_auth_v3");if(!raw)return null;try{return JSON.parse(raw).role||null}catch{return null}})).toBe("ADMIN");
}

test("V42 payment capture writes immutable double-entry ledger and daily reconciliation stays clean",async({page,context})=>{
  const stamp=`${Date.now()}-${Math.floor(Math.random()*100000)}`;const email=`v42-finance-${stamp}@example.test`;
  const adminEmail=process.env.E2E_ADMIN_EMAIL||"admin-v29@cine.local";const adminPassword=process.env.E2E_ADMIN_PASSWORD||"V29SmokeOnly-ChangeMe";

  await page.goto("/register");await page.getByPlaceholder("Họ và tên").fill("V42 Finance Customer");await page.getByPlaceholder("Email").fill(email);await page.getByPlaceholder("Nhập mật khẩu").fill(PASSWORD);await page.getByPlaceholder("Nhập lại mật khẩu").fill(PASSWORD);await page.getByRole("button",{name:"Đăng ký"}).click();await expect(page).toHaveURL(/\/$/);

  const movie=page.getByLabel("1. Phim");await expect.poll(async()=>movie.locator("option").count()).toBeGreaterThan(1);await movie.selectOption({label:"Hành Trình Sao Hỏa"});
  const cinema=page.getByLabel("2. Rạp");await expect.poll(async()=>cinema.locator("option").count()).toBeGreaterThan(1);await cinema.selectOption({index:1});
  const date=page.getByLabel("3. Ngày");await expect.poll(async()=>date.locator("option").count()).toBeGreaterThan(1);const dateCount=await date.locator("option").count();await date.selectOption({index:dateCount-1});
  const showtime=page.getByLabel("4. Suất");await expect.poll(async()=>showtime.locator("option").count()).toBeGreaterThan(1);await showtime.selectOption({index:1});await page.getByRole("button",{name:"Chọn ghế"}).click();
  const seat=page.locator('button[aria-label^="Ghế "][title*="AVAILABLE"]').first();await expect(seat).toBeVisible();await seat.click();await page.getByRole("button",{name:"Giữ ghế 5 phút"}).click();await expect(page.getByText(/Ghế được giữ trong/)).toBeVisible();
  await page.getByRole("button",{name:/Thanh toán/}).click();await expect(page).toHaveURL(/\/payment\/mock\?/);await page.getByRole("button",{name:"Giả lập thành công"}).click();await expect(page).toHaveURL(/\/bookings$/);

  const history=await authedJson<{paymentId:string;status:string;provider:string}[]>(page,"/api/payments/history");expect(history.status).toBe(200);const payment=history.body?.find(p=>p.status==="SUCCESS"&&p.provider==="MOCK");expect(payment).toBeTruthy();

  await logout(page);await context.clearCookies();await loginAdmin(page,adminEmail,adminPassword);
  await page.goto("/admin/finance");await expect(page.getByRole("heading",{name:"Financial Ledger & Reconciliation"})).toBeVisible();
  const row=page.locator('[data-testid="finance-ledger-entry"]').filter({hasText:`PAYMENT_CAPTURE:${payment!.paymentId}`});await expect(row).toBeVisible();await expect(row).toContainText("PAYMENT_CAPTURED");await expect(row).toContainText("DEBIT PAYMENT_CLEARING:MOCK");await expect(row).toContainText("CREDIT CUSTOMER_FUNDS_CAPTURED");
  await page.getByTestId("finance-reconcile").click();await expect(page.getByTestId("finance-run-status")).toHaveText("CLEAN",{timeout:15000});await expect(page.getByTestId("finance-clean-state")).toBeVisible();
});
