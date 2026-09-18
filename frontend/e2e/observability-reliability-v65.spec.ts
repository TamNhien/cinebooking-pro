import { expect, test, type BrowserContext, type Page } from "@playwright/test";

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
  if(!resolved)throw new Error("ADMIN auth storage missing for V65 observability E2E");
  return resolved;
}

async function waitForObservabilityApi(context:BrowserContext,page:Page,auth:StoredAuth){
  const endpoint=new URL("/api/admin/observability/summary",page.url()).toString();
  await expect.poll(async()=>{
    try{
      const response=await context.request.get(endpoint,{
        headers:{Authorization:`Bearer ${auth.accessToken}`},
        timeout:10_000,
      });
      if(!response.ok())return false;
      const body=await response.json() as {strategyVersion?:string};
      return body.strategyVersion==="V65-OBSERVABILITY-RELIABILITY-4";
    }catch{return false;}
  },{timeout:60_000,intervals:[500,1_000,2_000,3_000]}).toBe(true);
}

async function loginAdmin(page:Page){
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

test("V65 exposes admin SLO, dependency probes and trace correlation",async({page,context})=>{
  await loginAdmin(page);
  const auth=await adminAuth(context,page);
  // V78.0.19-R6: the full 47-test suite can temporarily saturate dependency
  // probes. Warm the real ADMIN summary contract before navigating so this
  // journey measures the UI rather than racing a transient backend backlog.
  await waitForObservabilityApi(context,page,auth);
  const tile=page.getByTestId("admin-observability-v65");
  await expect(tile).toBeVisible();
  await expect(tile).toContainText("Khả năng quan sát V65");
  await tile.click();

  await expect(page).toHaveURL(/\/admin\/observability$/);
  const root=page.getByTestId("observability-v65");
  await expect(root).toContainText("V65 · KHẢ NĂNG QUAN SÁT & ĐỘ TIN CẬY 4.0");
  await expect(root).toHaveAttribute("data-runtime-state","READY",{timeout:45_000});
  await expect(page.getByTestId("observability-summary-v65")).toContainText("V65-OBSERVABILITY-RELIABILITY-4");
  await expect(page.getByTestId("slo-v65")).toContainText("Availability");
  await expect(page.getByTestId("slo-v65")).toContainText("API P95 latency");
  await expect(page.getByTestId("dependencies-v65")).toContainText("PostgreSQL");
  await expect(page.getByTestId("dependencies-v65")).toContainText("Redis");
  await expect(page.getByTestId("recent-traces-v65")).toContainText(/Mã truy vết|Trace ID/);
});
