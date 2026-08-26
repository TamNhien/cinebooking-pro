import { expect, test } from "@playwright/test";

async function loginAdmin(page:any){
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

test("V59 admin receives websocket operations signals and manages alert state",async({page})=>{
  await loginAdmin(page);
  await page.goto("/admin/operations-control");

  await expect(page.getByTestId("operations-control-center-v59")).toContainText("Realtime Operations · V59");
  await expect(page.getByTestId("operations-control-realtime-v59")).toContainText("WebSocket: Đã kết nối",{timeout:20000});
  await expect(page.getByTestId("operations-control-summary-v58")).toBeVisible();
  await expect(page.getByTestId("operations-control-domains-v58")).toBeVisible();
  await expect(page.getByTestId("operations-control-history-v59")).toBeVisible();
  await expect(page.getByTestId("operations-control-detail-v58")).toContainText("STOMP_WEBSOCKET");

  const actionGroups=page.getByTestId("operations-control-alert-actions-v59");
  if(await actionGroups.count()){
    const first=actionGroups.first();
    const ack=first.getByRole("button",{name:/Tiếp nhận/});
    if(await ack.isEnabled()){
      await ack.click();
      await expect(first.getByRole("button",{name:/Đã tiếp nhận/})).toBeVisible();
      await expect(page.getByTestId("operations-control-history-v59")).toContainText("Tiếp nhận cảnh báo");
    }
  }

  const cinema=page.getByTestId("operations-control-cinema-filter-v58");
  await expect.poll(async()=>cinema.locator("option").count(),{timeout:15000}).toBeGreaterThan(1);
  await cinema.selectOption({index:1});
  await expect(page.getByTestId("operations-control-realtime-v59")).toContainText("Đã kết nối");
});
