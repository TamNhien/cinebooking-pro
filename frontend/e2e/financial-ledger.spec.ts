import { expect, test, type Page } from "@playwright/test";
import { ensureSurface, gotoHydrated, gotoSurface, loginExistingAdmin } from "./runtime-guards";

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

test("V42 payment capture writes immutable double-entry ledger and daily reconciliation stays clean",async({page,context})=>{
  const stamp=`${Date.now()}-${Math.floor(Math.random()*100000)}`;const email=`minh.chau+${stamp}@example.com`;

  await gotoSurface(page,"/register","register-name");await page.getByTestId("register-name").fill("Hồ Minh Châu");await page.getByPlaceholder("Email").fill(email);await page.getByTestId("register-password").fill(PASSWORD);await page.getByTestId("register-confirm").fill(PASSWORD);await page.getByTestId("register-submit").click();await expect(page).toHaveURL(/\/$/);

  const movie=page.getByLabel("1. Phim");await expect.poll(async()=>movie.locator("option").count()).toBeGreaterThan(1);await movie.selectOption({label:"Hành Trình Sao Hỏa"});
  const cinema=page.getByLabel("2. Rạp");await expect.poll(async()=>cinema.locator("option").count()).toBeGreaterThan(1);await cinema.selectOption({index:1});
  const date=page.getByLabel("3. Ngày");await expect.poll(async()=>date.locator("option").count()).toBeGreaterThan(1);const dateCount=await date.locator("option").count();await date.selectOption({index:dateCount-1});
  const showtime=page.getByLabel("4. Suất");await expect.poll(async()=>showtime.locator("option").count()).toBeGreaterThan(1);await showtime.selectOption({index:1});await page.getByRole("button",{name:"Chọn ghế"}).click();
  const seat=page.locator('button[aria-label^="Ghế "][data-seat-status="AVAILABLE"]').first();await expect(seat).toBeVisible();await seat.click();await page.getByRole("button",{name:"Giữ ghế 5 phút"}).click();await expect(page.getByText(/Ghế được giữ trong/)).toBeVisible();
  await page.getByRole("button",{name:/Thanh toán/}).click();await expect(page).toHaveURL(/\/payment\/mock\?/);await ensureSurface(page,"mock-payment-success");await page.getByTestId("mock-payment-success").click();await expect(page).toHaveURL(/\/bookings$/);

  const history=await authedJson<{paymentId:string;status:string;provider:string}[]>(page,"/api/payments/history");expect(history.status).toBe(200);const payment=history.body?.find(p=>p.status==="SUCCESS"&&p.provider==="MOCK");expect(payment).toBeTruthy();

  await logout(page);await context.clearCookies();await loginExistingAdmin(page);
  await gotoHydrated(page,"/admin/finance");await expect(page.getByTestId("finance-ledger-section")).toBeVisible({timeout:30_000});
  const row=page.locator(`[data-testid="finance-ledger-entry"][data-event-type="PAYMENT_CAPTURED"][data-event-key="PAYMENT_CAPTURE:${payment!.paymentId}"]`);await expect(row).toBeVisible({timeout:30_000});await expect(row).toContainText("PAYMENT_CLEARING:MOCK");await expect(row).toContainText("CUSTOMER_FUNDS_CAPTURED");
  await page.getByTestId("finance-reconcile").click();await expect(page.getByTestId("finance-run-status")).toHaveAttribute("data-run-status","CLEAN",{timeout:15000});await expect(page.getByTestId("finance-clean-state")).toBeVisible();
});
