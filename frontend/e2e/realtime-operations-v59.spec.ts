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
  await page.setViewportSize({width:1920,height:1080});
  await loginAdmin(page);

  const actionGrid=page.getByTestId("admin-action-grid-v59");
  await expect(actionGrid).toBeVisible();
  const actionButtons=actionGrid.locator(".admin-action-btn");
  await expect.poll(async()=>actionButtons.count()).toBeGreaterThan(10);
  const clipped=await actionButtons.evaluateAll(nodes=>nodes.filter((node:any)=>node.scrollWidth>node.clientWidth+1||node.scrollHeight>node.clientHeight+1).map((node:any)=>node.textContent?.trim()));
  expect(clipped).toEqual([]);
  const overlap=await actionButtons.evaluateAll(nodes=>{
    const rects=nodes.map((node:any)=>({text:node.textContent?.trim(),rect:node.getBoundingClientRect()}));
    const collisions:string[]=[];
    for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++){
      const a=rects[i],b=rects[j];
      const x=Math.min(a.rect.right,b.rect.right)-Math.max(a.rect.left,b.rect.left);
      const y=Math.min(a.rect.bottom,b.rect.bottom)-Math.max(a.rect.top,b.rect.top);
      if(x>1&&y>1)collisions.push(`${a.text} <> ${b.text}`);
    }
    return collisions;
  });
  expect(overlap).toEqual([]);
  await expect(page.getByTestId("admin-tab-grid-v59")).toBeVisible();

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
