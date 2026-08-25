import { BrowserContext, expect, Page, test } from "@playwright/test";

const PASSWORD="V46Security!Customer123";
const AUTH_STORAGE_KEY="cinebooking_auth_v3";

type AuthResponseApi = {
  accessToken: string;
  role: string;
  email: string;
};

type SecurityAlertApi = {
  id: string;
  eventType: string;
  userEmail?: string;
};

function apiUrl(page:Page,path:string){
  return new URL(path,new URL(page.url()).origin).toString();
}

async function authFromStorage(context:BrowserContext,page:Page,expectedRole:"USER"|"ADMIN"):Promise<AuthResponseApi>{
  const origin=new URL(page.url()).origin;
  let resolved:AuthResponseApi|null=null;
  await expect.poll(async()=>{
    const state=await context.storageState();
    const originState=state.origins.find(item=>item.origin===origin);
    const raw=originState?.localStorage.find(item=>item.name===AUTH_STORAGE_KEY)?.value;
    if(!raw)return false;
    try{
      const auth=JSON.parse(raw) as AuthResponseApi;
      if(auth.role!==expectedRole||!auth.accessToken)return false;
      resolved=auth;
      return true;
    }catch{
      return false;
    }
  },{timeout:15000}).toBe(true);
  if(!resolved)throw new Error(`authenticated storage state missing for ${expectedRole}`);
  return resolved;
}

async function logoutToLogin(page:Page,context:BrowserContext){
  // V54 CI hardening: do not click the header logout button here. Its product
  // handler performs a full location.href="/" navigation after the logout
  // request, which can race this helper's immediate navigation to /login.
  // This journey tests V46 security behavior, not header navigation, so make
  // logout deterministic and keep exactly one browser navigation afterwards.
  const status=await page.evaluate(async(authStorageKey)=>{
    const response=await fetch("/api/auth/logout",{method:"POST",credentials:"include",cache:"no-store"});
    localStorage.removeItem(authStorageKey);
    return response.status;
  },AUTH_STORAGE_KEY);
  expect(status).toBe(204);
  await context.clearCookies();
  await page.goto("/login",{waitUntil:"domcontentloaded"});
  await expect(page.getByRole("button",{name:"Đăng nhập"})).toBeVisible();
}

async function login(page:Page,context:BrowserContext,email:string,password:string,expectedRole:"USER"|"ADMIN"):Promise<AuthResponseApi>{
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Mật khẩu").fill(password);
  const loginResponse=page.waitForResponse(response=>response.url().includes("/api/auth/login")&&response.request().method()==="POST");
  await page.getByRole("button",{name:"Đăng nhập"}).click();
  const response=await loginResponse;
  expect(response.status()).toBe(200);
  if(expectedRole==="ADMIN") await page.waitForURL(url=>url.pathname.startsWith("/admin"),{timeout:15000,waitUntil:"domcontentloaded"});
  else await page.waitForURL(url=>url.pathname==="/",{timeout:15000,waitUntil:"domcontentloaded"});
  const auth=await authFromStorage(context,page,expectedRole);
  expect(auth.role).toBe(expectedRole);
  expect(auth.accessToken).toBeTruthy();
  return auth;
}

async function currentNewDeviceAlert(context:BrowserContext,page:Page,accessToken:string):Promise<SecurityAlertApi>{
  const response=await context.request.get(apiUrl(page,"/api/me/security/alerts"),{
    headers:{Authorization:`Bearer ${accessToken}`}
  });
  expect(response.status()).toBe(200);
  const alerts=await response.json() as SecurityAlertApi[];
  const match=alerts.find(alert=>alert.eventType==="NEW_DEVICE");
  if(!match)throw new Error("NEW_DEVICE alert missing for customer");
  return match;
}

test("V46 user trusts a Brave device and admin sees security alerts",async({page,context})=>{
  await page.addInitScript(()=>{Object.defineProperty(navigator,"brave",{configurable:true,value:{isBrave:async()=>true}});});
  const stamp=`${Date.now()}-${Math.floor(Math.random()*100000)}`;
  const email=`v46-security-${stamp}@example.test`;
  await page.goto("/register");
  await page.getByPlaceholder("Họ và tên").fill("V46 Security Customer");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Nhập mật khẩu").fill(PASSWORD);
  await page.getByPlaceholder("Nhập lại mật khẩu").fill(PASSWORD);
  const registerResponse=page.waitForResponse(response=>response.url().includes("/api/auth/register")&&response.request().method()==="POST");
  await page.getByRole("button",{name:"Đăng ký"}).click();
  expect((await registerResponse).status()).toBe(201);
  await expect(page).toHaveURL(/\/$/);

  await logoutToLogin(page,context);
  const customerAuth=await login(page,context,email,PASSWORD,"USER");

  await page.goto("/security",{waitUntil:"domcontentloaded"});
  await expect(page.getByRole("heading",{name:"Trung tâm bảo mật tài khoản"})).toBeVisible();
  const alert=page.getByTestId("security-alert").filter({hasText:"Đăng nhập từ thiết bị chưa tin cậy"}).first();
  await expect(alert).toBeVisible();
  await expect(alert).toContainText("Brave");
  const customerNewDeviceAlert=await currentNewDeviceAlert(context,page,customerAuth.accessToken);
  expect(customerNewDeviceAlert.eventType).toBe("NEW_DEVICE");

  await page.getByLabel("Nhãn thiết bị tin cậy").fill("Laptop E2E V46");
  await page.getByRole("button",{name:"Tin cậy thiết bị hiện tại"}).click();
  const trusted=page.getByTestId("trusted-device").filter({hasText:"Laptop E2E V46"});
  await expect(trusted).toBeVisible();
  await expect(trusted).toContainText("Brave");
  await alert.getByRole("button",{name:"Tôi đã kiểm tra"}).click();
  await expect(alert).toContainText("Đã xác nhận");

  await logoutToLogin(page,context);
  const adminEmail=process.env.E2E_ADMIN_EMAIL||"admin-v29@cine.local";
  const adminPassword=process.env.E2E_ADMIN_PASSWORD||"V29SmokeOnly-ChangeMe";
  const adminAuth=await login(page,context,adminEmail,adminPassword,"ADMIN");

  await page.goto("/admin/security",{waitUntil:"domcontentloaded"});
  await expect(page.getByRole("heading",{name:"Security Operations"})).toBeVisible();
  const adminAlertsResponse=await context.request.get(apiUrl(page,"/api/admin/security/alerts"),{
    headers:{Authorization:`Bearer ${adminAuth.accessToken}`}
  });
  expect(adminAlertsResponse.status()).toBe(200);
  const adminAlerts=await adminAlertsResponse.json() as SecurityAlertApi[];
  expect(adminAlerts.some(item=>item.id===customerNewDeviceAlert.id&&item.eventType==="NEW_DEVICE"&&item.userEmail===email)).toBeTruthy();
  const adminRow=page.getByTestId("admin-security-alert").filter({hasText:email}).filter({hasText:"NEW_DEVICE"}).first();
  await expect(adminRow).toBeVisible();
  await expect(adminRow).toContainText("Brave");
});
