import { expect, test, type Page, type BrowserContext } from "@playwright/test";

const AUTH_KEY="cinebooking_auth_v3";
const STEP_KEY="cinebooking_admin_step_up_v68";

async function loginAdmin(page:Page){
  const email=process.env.E2E_ADMIN_EMAIL||"admin@cine.local";
  const password=process.env.E2E_ADMIN_PASSWORD||"Admin@123";
  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Mật khẩu").fill(password);
  await page.getByRole("button",{name:"Đăng nhập"}).click();
  await page.waitForURL(/\/admin$/,{timeout:15000});
  return {email,password};
}

async function tokens(page:Page){
  return page.evaluate(({authKey,stepKey})=>{
    const authRaw=localStorage.getItem(authKey);
    const stepRaw=sessionStorage.getItem(stepKey);
    return {
      accessToken:authRaw?JSON.parse(authRaw).accessToken as string:"",
      stepUpToken:stepRaw?JSON.parse(stepRaw).token as string:"",
    };
  },{authKey:AUTH_KEY,stepKey:STEP_KEY});
}

function apiUrl(page:Page,path:string){return new URL(path,new URL(page.url()).origin).toString();}

async function removeTemp(context:BrowserContext,page:Page,id:string,accessToken:string,stepUpToken:string){
  await context.request.delete(apiUrl(page,`/api/admin/users/${id}`),{headers:{Authorization:`Bearer ${accessToken}`,"X-Step-Up-Token":stepUpToken}}).catch(()=>undefined);
}

test("V68 admin step-up protects sensitive writes and emits security headers",async({page,context})=>{
  const admin=await loginAdmin(page);
  const tile=page.getByTestId("admin-security-identity-v68");
  await expect(tile).toBeVisible();
  await expect(tile).toContainText("Security & Identity V68");
  await tile.click();
  await expect(page).toHaveURL(/\/admin\/security$/);
  await expect(page.getByTestId("security-identity-v68")).toContainText("V68 · SECURITY & IDENTITY 5.0");
  await expect(page.getByTestId("security-identity-summary-v68")).toContainText("V68-SECURITY-IDENTITY-5");
  await expect(page.getByTestId("security-headers-v68")).toContainText("HSTS khi HTTPS");

  const initial=await tokens(page);
  expect(initial.accessToken).toBeTruthy();
  const stamp=Date.now().toString(36);
  const email=`v68.security.${stamp}@example.com`;
  const body={email,password:"V68E2e!User123",fullName:"Nguyễn An Nhiên",phone:"0900000068",role:"USER"};

  const blocked=await context.request.post(apiUrl(page,"/api/admin/users"),{
    headers:{Authorization:`Bearer ${initial.accessToken}`,"Content-Type":"application/json"},data:body,
  });
  expect(blocked.status()).toBe(428);
  expect(blocked.headers()["x-step-up-required"]).toBe("true");
  expect((await blocked.json()).message).toContain("xác thực tăng cường V68");

  await page.getByTestId("step-up-password-v68").fill(admin.password);
  await page.getByTestId("step-up-unlock-v68").click();
  await expect(page.getByTestId("step-up-status-v68")).toContainText("UNLOCKED");
  const elevated=await tokens(page);
  expect(elevated.stepUpToken).toBeTruthy();

  let createdId="";
  try{
    const created=await context.request.post(apiUrl(page,"/api/admin/users"),{
      headers:{Authorization:`Bearer ${elevated.accessToken}`,"X-Step-Up-Token":elevated.stepUpToken,"Content-Type":"application/json"},data:body,
    });
    expect(created.status()).toBe(201);
    const createdBody=await created.json() as {id:string;email:string};
    createdId=createdBody.id;
    expect(createdBody.email).toBe(email);

    const summary=await context.request.get(apiUrl(page,"/api/admin/identity-security/summary"),{headers:{Authorization:`Bearer ${elevated.accessToken}`}});
    expect(summary.status()).toBe(200);
    expect(summary.headers()["x-content-type-options"]).toBe("nosniff");
    expect(summary.headers()["x-frame-options"]).toBe("DENY");
    expect(summary.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(summary.headers()["permissions-policy"]).toBe("camera=(), microphone=(), geolocation=(), payment=()");
    expect(summary.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(summary.headers()["strict-transport-security"]).toContain("max-age=31536000");
    expect((await summary.json()).strategyVersion).toBe("V68-SECURITY-IDENTITY-5");
  }finally{
    if(createdId) await removeTemp(context,page,createdId,elevated.accessToken,elevated.stepUpToken);
  }
});
