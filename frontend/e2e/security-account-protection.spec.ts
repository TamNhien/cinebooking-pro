import { BrowserContext, expect, Page, test } from "@playwright/test";

const PASSWORD="V46Security!Customer123";

type SecurityAlertApi = {
  id: string;
  eventType: string;
  userEmail?: string;
};

async function authRole(page:Page){
  return page.evaluate(()=>{
    const raw=localStorage.getItem("cinebooking_auth_v3");
    if(!raw)return null;
    try{return (JSON.parse(raw) as {role?:string}).role||null;}catch{return null;}
  });
}

async function logoutToLogin(page:Page,context:BrowserContext){
  const status=await page.evaluate(async()=>{
    try{
      const response=await fetch("/api/auth/logout",{method:"POST",credentials:"include",cache:"no-store"});
      localStorage.removeItem("cinebooking_auth_v3");
      return response.status;
    }catch{
      localStorage.removeItem("cinebooking_auth_v3");
      return 0;
    }
  });
  expect(status).toBe(204);
  await context.clearCookies();
  await page.goto("/login",{waitUntil:"domcontentloaded"});
  await expect(page.getByRole("button",{name:"Đăng nhập"})).toBeVisible();
}

async function login(page:Page,email:string,password:string,expectedRole:"USER"|"ADMIN"){
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Mật khẩu").fill(password);
  const loginResponse=page.waitForResponse(response=>response.url().includes("/api/auth/login")&&response.request().method()==="POST");
  await page.getByRole("button",{name:"Đăng nhập"}).click();
  const response=await loginResponse;
  expect(response.status()).toBe(200);
  await expect.poll(()=>authRole(page),{timeout:15000}).toBe(expectedRole);
  if(expectedRole==="ADMIN") await page.waitForURL(url=>url.pathname.startsWith("/admin"),{timeout:15000});
  else await page.waitForURL(url=>url.pathname==="/",{timeout:15000});
}

async function currentNewDeviceAlert(page:Page):Promise<SecurityAlertApi>{
  return page.evaluate(async()=>{
    const raw=localStorage.getItem("cinebooking_auth_v3");
    if(!raw)throw new Error("auth missing while reading security alerts");
    const auth=JSON.parse(raw) as {accessToken?:string};
    const response=await fetch("/api/me/security/alerts",{
      credentials:"include",
      cache:"no-store",
      headers:{Authorization:`Bearer ${auth.accessToken||""}`}
    });
    if(!response.ok)throw new Error(`security alerts HTTP ${response.status}`);
    const alerts=await response.json() as SecurityAlertApi[];
    const match=alerts.find(alert=>alert.eventType==="NEW_DEVICE");
    if(!match)throw new Error("NEW_DEVICE alert missing for customer");
    return match;
  });
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
  await page.getByRole("button",{name:"Đăng ký"}).click();
  await expect(page).toHaveURL(/\/$/);

  await logoutToLogin(page,context);
  await login(page,email,PASSWORD,"USER");

  await page.goto("/security");
  await expect(page.getByRole("heading",{name:"Trung tâm bảo mật tài khoản"})).toBeVisible();
  const alert=page.getByTestId("security-alert").filter({hasText:"Đăng nhập từ thiết bị chưa tin cậy"}).first();
  await expect(alert).toBeVisible();
  await expect(alert).toContainText("Brave");
  const customerNewDeviceAlert=await currentNewDeviceAlert(page);
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
  await login(page,adminEmail,adminPassword,"ADMIN");

  const adminAlertsResponse=page.waitForResponse(response=>response.url().includes("/api/admin/security/alerts")&&response.request().method()==="GET");
  await page.goto("/admin/security");
  await expect(page.getByRole("heading",{name:"Security Operations"})).toBeVisible();
  const response=await adminAlertsResponse;
  expect(response.status()).toBe(200);
  const adminAlerts=await response.json() as SecurityAlertApi[];
  expect(adminAlerts.some(item=>item.id===customerNewDeviceAlert.id&&item.eventType==="NEW_DEVICE"&&item.userEmail===email)).toBeTruthy();
  const adminRow=page.getByTestId("admin-security-alert").filter({hasText:email}).filter({hasText:"NEW_DEVICE"}).first();
  await expect(adminRow).toBeVisible();
  await expect(adminRow).toContainText("Brave");
});
