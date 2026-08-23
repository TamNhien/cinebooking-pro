import { BrowserContext, expect, test, type Page } from "@playwright/test";

const PASSWORD = "V41Notify!Customer123";
const AUTH_STORAGE_KEY = "cinebooking_auth_v3";

type AuthStorage = { accessToken:string };

function apiUrl(page:Page,path:string){
  return new URL(path,new URL(page.url()).origin).toString();
}

async function authFromStorage(context:BrowserContext,page:Page):Promise<AuthStorage>{
  const origin=new URL(page.url()).origin;
  let resolved:AuthStorage|null=null;
  await expect.poll(async()=>{
    const state=await context.storageState();
    const originState=state.origins.find(item=>item.origin===origin);
    const raw=originState?.localStorage.find(item=>item.name===AUTH_STORAGE_KEY)?.value;
    if(!raw)return false;
    try{
      const auth=JSON.parse(raw) as AuthStorage;
      if(!auth.accessToken)return false;
      resolved=auth;
      return true;
    }catch{
      return false;
    }
  },{timeout:15000}).toBe(true);
  if(!resolved)throw new Error("authenticated storage state missing after registration");
  return resolved;
}

async function authedJson<T>(context: BrowserContext, page: Page, accessToken:string, url: string, init?: { method?: string; body?: unknown }) {
  const res = await context.request.fetch(apiUrl(page,url), {
    method: init?.method || "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
    data: init?.body,
  });
  let body: unknown = null;
  try { body = await res.json(); } catch { body = null; }
  return { status: res.status(), body } as { status:number; body:T|null };
}

test("V41 notification inbox archives and restores a durable notification", async ({ page, context }) => {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const email = `v41-notify-${stamp}@example.test`;

  await page.goto("/register");
  await page.getByPlaceholder("Họ và tên").fill("V41 Notification Customer");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Nhập mật khẩu").fill(PASSWORD);
  await page.getByPlaceholder("Nhập lại mật khẩu").fill(PASSWORD);
  const registerResponse=page.waitForResponse(response=>response.url().includes("/api/auth/register")&&response.request().method()==="POST");
  await page.getByRole("button", { name:"Đăng ký" }).click();
  const authResponse=await registerResponse;
  expect(authResponse.status()).toBe(201);
  await expect(page).toHaveURL(/\/$/);
  const auth=await authFromStorage(context,page);
  expect(auth.accessToken).toBeTruthy();

  const created = await authedJson<{ id:string; title:string; priority:string; archived:boolean }>(context,page,auth.accessToken, "/api/notifications/test", { method:"POST" });
  expect(created.status).toBe(200);
  expect(created.body?.title).toBe("Thông báo thử CineBooking");
  expect(created.body?.priority).toBe("NORMAL");
  expect(created.body?.archived).toBe(false);
  const id = created.body!.id;

  const before = await authedJson<{ unreadCount:number; archivedCount:number }>(context,page,auth.accessToken, "/api/notifications/summary");
  expect(before.status).toBe(200);
  expect(before.body!.unreadCount).toBeGreaterThanOrEqual(1);

  await page.goto("/notifications");
  await expect(page.getByRole("heading", { name:"Trung tâm thông báo" })).toBeVisible();
  await expect(page.getByText("🏆 Loyalty & thành viên", { exact:true })).toBeVisible();
  await expect(page.getByText("💺 Waitlist", { exact:true })).toBeVisible();
  let card = page.getByTestId("notification-card").filter({ hasText:"Thông báo thử CineBooking" }).first();
  await expect(card).toBeVisible();
  await card.getByTestId("notification-archive-toggle").click();
  await expect(card).toHaveCount(0);

  const archivedSummary = await authedJson<{ unreadCount:number; archivedCount:number }>(context,page,auth.accessToken, "/api/notifications/summary");
  expect(archivedSummary.status).toBe(200);
  expect(archivedSummary.body!.archivedCount).toBeGreaterThanOrEqual(1);

  await page.getByTestId("notifications-archived-tab").click();
  card = page.getByTestId("notification-card").filter({ hasText:"Thông báo thử CineBooking" }).first();
  await expect(card).toBeVisible();
  await expect(card.getByTestId("notification-archive-toggle")).toHaveText("Khôi phục");
  await card.getByTestId("notification-archive-toggle").click();
  await expect(card).toHaveCount(0);

  await page.getByTestId("notifications-active-tab").click();
  card = page.getByTestId("notification-card").filter({ hasText:"Thông báo thử CineBooking" }).first();
  await expect(card).toBeVisible();
  await card.getByRole("button").first().click();
  await expect(page).toHaveURL(/\/notifications$/);

  const active = await authedJson<Array<{ id:string; read:boolean; archived:boolean }>>(context,page,auth.accessToken, "/api/notifications?view=ACTIVE");
  expect(active.status).toBe(200);
  const restored = active.body!.find(n => n.id === id);
  expect(restored?.archived).toBe(false);
  expect(restored?.read).toBe(true);
});
