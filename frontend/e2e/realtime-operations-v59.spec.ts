import { expect, test } from "@playwright/test";
import { gotoSurface, loginExistingAdmin } from "./runtime-guards";

test("V59 admin receives websocket operations signals and manages alert state",async({page})=>{
  await page.setViewportSize({width:1920,height:1080});
  await loginExistingAdmin(page);

  const actionGrid=page.getByTestId("admin-action-grid-v59");
  await expect(actionGrid).toBeVisible();
  const actionButtons=actionGrid.locator(".admin-action-btn");
  await expect.poll(async()=>actionButtons.count()).toBeGreaterThan(10);
  const clipped=await actionButtons.evaluateAll(nodes=>nodes.filter(node=>node.scrollWidth>node.clientWidth+1||node.scrollHeight>node.clientHeight+1).map(node=>node.textContent?.trim()));
  expect(clipped).toEqual([]);
  const overlap=await actionButtons.evaluateAll(nodes=>{
    const rects=nodes.map(node=>({text:node.textContent?.trim(),rect:(node as HTMLElement).getBoundingClientRect()}));
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

  await gotoSurface(page,"/admin/operations-control","operations-control-center-v59");

  await expect(page.getByTestId("operations-control-center-v59")).toContainText("Vận hành thời gian thực · V59");
  await expect(page.getByTestId("operations-control-realtime-v59")).toContainText("WebSocket: Đã kết nối",{timeout:20000});
  await expect(page.getByTestId("operations-control-summary-v58")).toBeVisible();
  await expect(page.getByTestId("operations-control-domains-v58")).toBeVisible();
  await expect(page.getByTestId("operations-control-history-v59")).toBeVisible();
  await expect(page.getByTestId("operations-control-detail-v58")).toContainText("STOMP_WEBSOCKET");

  // Alert snapshots are live and can legitimately change between two DOM reads.
  // Act only on an OPEN alert that still exposes the machine ack control; never
  // wait the whole test timeout for a presentation label that may disappear.
  const openAlerts=page.locator('[data-testid="operations-control-alert-v59"][data-alert-state="OPEN"]');
  if(await openAlerts.count()){
    const first=openAlerts.first();
    const fingerprint=await first.getAttribute("data-alert-fingerprint");
    const ack=first.getByTestId("operations-alert-ack-v59");
    const actionable=await ack.isEnabled({timeout:2_000}).catch(()=>false);
    if(fingerprint&&actionable){
      await ack.click();
      await expect.poll(async()=>page.getByTestId("operations-control-alert-v59").evaluateAll((nodes,target)=>{
        const node=nodes.find(item=>item.getAttribute("data-alert-fingerprint")===target);
        return node?.getAttribute("data-alert-state")??"MISSING";
      },fingerprint),{timeout:15_000}).toBe("ACKNOWLEDGED");
      await expect(page.getByTestId("operations-control-history-v59")).toContainText("Tiếp nhận cảnh báo");
    }
  }

  const cinema=page.getByTestId("operations-control-cinema-filter-v58");
  await expect.poll(async()=>cinema.locator("option").count(),{timeout:15000}).toBeGreaterThan(1);
  await cinema.selectOption({index:1});
  await expect(page.getByTestId("operations-control-realtime-v59")).toContainText("Đã kết nối");
});
