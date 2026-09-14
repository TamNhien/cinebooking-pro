import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { gotoHydrated, gotoSurface, loginExistingAdmin } from "./runtime-guards";

const CUSTOMER_PASSWORD="Support!Customer123";
const AUTH_STORAGE_KEY="cinebooking_auth_v3";

async function logoutToLogin(page:Page,context:BrowserContext){
  const status=await page.evaluate(async(authStorageKey:string)=>{
    const response=await fetch("/api/auth/logout",{method:"POST",credentials:"include",cache:"no-store"});
    localStorage.removeItem(authStorageKey);
    return response.status;
  },AUTH_STORAGE_KEY);
  expect(status).toBe(204);
  await context.clearCookies();
  await gotoSurface(page,"/login","login-email");
}

test("V45 customer opens a support case and admin resolves it with immutable conversation",async({page,context})=>{
  const stamp=Date.now().toString().slice(-8);
  const customerEmail=`gia.han+support-${stamp}@example.com`;
  const subject=`Không nhận được email xác nhận vé #${stamp}`;

  await gotoSurface(page,"/register","register-name");
  await page.getByTestId("register-name").fill("Lê Gia Hân");
  await page.getByTestId("register-email").fill(customerEmail);
  await page.getByTestId("register-password").fill(CUSTOMER_PASSWORD);
  await page.getByTestId("register-confirm").fill(CUSTOMER_PASSWORD);
  await page.getByTestId("register-submit").click();
  await expect(page).toHaveURL(/\/$/);

  await gotoHydrated(page,"/support");
  await expect(page.getByRole("heading",{name:"Trung tâm hỗ trợ khách hàng"})).toBeVisible();
  await page.getByLabel("Loại hỗ trợ").selectOption("OTHER");
  await page.getByLabel("Tiêu đề hỗ trợ").fill(subject);
  await page.getByLabel("Mô tả hỗ trợ").fill("Khách đã thanh toán thành công nhưng chưa nhận được email xác nhận vé và cần kiểm tra lại booking.");
  await page.getByRole("button",{name:"Gửi yêu cầu hỗ trợ"}).click();
  await expect(page.getByTestId("support-case-row").filter({hasText:subject})).toBeVisible();

  await logoutToLogin(page,context);
  await loginExistingAdmin(page);

  await gotoSurface(page,"/admin/support","admin-support-v45");
  await expect(page.getByRole("heading",{name:"Vận hành hỗ trợ"})).toBeVisible();
  await page.getByLabel("Rạp hỗ trợ").selectOption("");
  const card=page.getByTestId("admin-support-case").filter({hasText:subject});
  await expect(card).toBeVisible();
  await expect(card).toContainText(/Đang mở|OPEN/);
  await card.getByRole("button",{name:"Nhận xử lý"}).click();
  await expect(card).toContainText(/Đang xử lý|IN_PROGRESS/);
  page.once("dialog",dialog=>dialog.accept("Đã xác minh booking và gửi lại email xác nhận vé cho khách hàng."));
  await card.getByRole("button",{name:"Giải quyết"}).click();
  await expect(card).toContainText(/Đã (hoàn tất|giải quyết|xử lý)|RESOLVED/);
  await card.getByRole("button",{name:"Lịch sử"}).click();
  await expect(card).toContainText(/Thay đổi trạng thái|STATUS_CHANGED/);
  await expect(card).toContainText("gửi lại email xác nhận vé");
});
