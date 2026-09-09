import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";

const PASSWORD="V66SeatLock!Customer123";

async function register(page:Page,email:string,name:string){
  await page.goto("/register");
  await page.getByPlaceholder("Họ và tên").fill(name);
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Nhập mật khẩu").fill(PASSWORD);
  await page.getByPlaceholder("Nhập lại mật khẩu").fill(PASSWORD);
  await page.getByRole("button",{name:"Đăng ký"}).click();
  await expect(page).toHaveURL(/\/$/);
}

async function loginAdmin(page:Page){
  const email=process.env.E2E_ADMIN_EMAIL||"admin@cine.local";
  const password=process.env.E2E_ADMIN_PASSWORD||"Admin@123";
  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Mật khẩu").fill(password);
  await page.getByRole("button",{name:"Đăng nhập"}).click();
  try {
    await page.waitForURL(/\/admin$/,{timeout:15000});
  } catch {
    const error = await page.locator("p.text-red-300").textContent().catch(()=>null);
    throw new Error(`Admin login did not reach /admin. email=${email}; url=${page.url()}; error=${error||"none"}`);
  }
}

async function chooseShowtime(page:Page){
  const movie=page.getByLabel("1. Phim");
  await expect.poll(async()=>movie.locator("option").count()).toBeGreaterThan(1);
  await movie.selectOption({label:"Hành Trình Sao Hỏa"});
  const cinema=page.getByLabel("2. Rạp");
  await expect.poll(async()=>cinema.locator("option").count()).toBeGreaterThan(1);
  await cinema.selectOption({index:1});
  const date=page.getByLabel("3. Ngày");
  await expect.poll(async()=>date.locator("option").count()).toBeGreaterThan(1);
  await date.selectOption({index:1});
  const showtime=page.getByLabel("4. Suất");
  await expect.poll(async()=>showtime.locator("option").count()).toBeGreaterThan(1);
  await showtime.selectOption({index:1});
  await page.getByRole("button",{name:"Chọn ghế"}).click();
  await expect(page).toHaveURL(/\/booking\/[0-9a-f-]+$/i);
  return page.url().split("/").pop()!;
}

async function authedJson<T>(page:Page,url:string,init?:{method?:string;body?:unknown;headers?:Record<string,string>}){
  return page.evaluate(async({url,init})=>{
    const raw=localStorage.getItem("cinebooking_auth_v3");
    if(!raw)throw new Error("auth missing");
    const auth=JSON.parse(raw) as {accessToken?:string};
    const res=await fetch(url,{method:init?.method||"GET",credentials:"include",headers:{Authorization:`Bearer ${auth.accessToken||""}`,...(init?.body?{"Content-Type":"application/json"}:{}),...(init?.headers||{})},body:init?.body?JSON.stringify(init.body):undefined});
    let body:unknown=null;try{body=await res.json();}catch{body=null;}
    return {status:res.status,body,headers:Object.fromEntries(res.headers.entries())};
  },{url,init}) as Promise<{status:number;body:T|null;headers:Record<string,string>}>;
}

async function newUser(browser:Browser,email:string,name:string){
  const context=await browser.newContext({locale:"vi-VN",timezoneId:"Asia/Ho_Chi_Minh"});
  const page=await context.newPage();
  await register(page,email,name);
  return {context,page};
}

test("V66 durable hold serializes same-seat races and is visible to Admin",async({page,browser})=>{
  const stamp=`${Date.now()}-${Math.floor(Math.random()*100000)}`;
  await register(page,`minh.khang+${stamp}@example.com`,"Nguyễn Minh Khang");
  const showtimeId=await chooseShowtime(page);
  const suggestion=await authedJson<{suggestions:{seatIds:string[];seatCodes:string[]}[]}>(page,`/api/showtimes/${showtimeId}/seat-suggestions?count=2`);
  expect(suggestion.status).toBe(200);
  expect(suggestion.body!.suggestions.length).toBeGreaterThan(0);
  const pair=suggestion.body!.suggestions[0];

  const second=await newUser(browser,`thao.vy+${stamp}@example.com`,"Trần Thảo Vy");
  try{
    await second.page.goto(`/booking/${showtimeId}`);
    const [a,b]=await Promise.all([
      authedJson<{holdToken:string;authority:string}>(page,`/api/showtimes/${showtimeId}/holds`,{method:"POST",body:{seatIds:pair.seatIds}}),
      authedJson<{holdToken:string;authority:string}>(second.page,`/api/showtimes/${showtimeId}/holds`,{method:"POST",body:{seatIds:pair.seatIds}}),
    ]);
    expect([a.status,b.status].sort((x,y)=>x-y)).toEqual([200,409]);
    const winner=a.status===200?a:b;
    const winnerPage=a.status===200?page:second.page;
    expect(winner.body!.authority).toBe("POSTGRESQL_WITH_REDIS_MIRROR");
    expect(winner.body!.holdToken).toMatch(/^[0-9a-f-]{36}$/i);

    await winnerPage.goto(`/booking/${showtimeId}`);
    await expect(winnerPage.getByTestId("seat-hold-authority-v66")).toContainText("POSTGRESQL_WITH_REDIS_MIRROR");

    const adminContext:BrowserContext=await browser.newContext({locale:"vi-VN",timezoneId:"Asia/Ho_Chi_Minh"});
    const adminPage=await adminContext.newPage();
    try{
      await loginAdmin(adminPage);
      await expect(adminPage.getByTestId("admin-seat-operations-v66")).toBeVisible();
      await adminPage.getByTestId("admin-seat-operations-v66").click();
      await expect(adminPage).toHaveURL(/\/admin\/seat-operations$/);
      await expect(adminPage.getByTestId("seat-operations-v66")).toContainText("V66 · BOOKING CONSISTENCY & SEAT LOCKING 4.0");
      await expect(adminPage.getByTestId("seat-operations-error-v66")).toHaveCount(0);
      await expect(adminPage.getByTestId("seat-consistency-summary-v66")).not.toContainText("—");
      await expect(adminPage.getByTestId("seat-hold-authority-v66")).toContainText("POSTGRESQL_WITH_REDIS_MIRROR");
      await expect(adminPage.getByTestId("active-seat-holds-v66")).toContainText(pair.seatCodes[0]);
    }finally{await adminContext.close();}

    const released=await authedJson(winnerPage,`/api/showtimes/${showtimeId}/holds`,{method:"DELETE",body:{seatIds:pair.seatIds}});
    expect([200,204]).toContain(released.status);
  }finally{await second.context.close();}
});
