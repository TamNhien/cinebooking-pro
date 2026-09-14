import { expect, test } from "@playwright/test";
import { gotoSurface, loginExistingAdmin } from "./runtime-guards";

function isolatedPlannerDate(){
  const dayMs=86_400_000;
  const offsetDays=730+((Date.now()+process.pid*97)%7300);
  return new Date(Date.now()+offsetDays*dayMs).toISOString().slice(0,10);
}

test("V49 Smart Planner suggests demand-balanced conflict-free showtimes and commits provenance",async({page})=>{
  await loginExistingAdmin(page);

  await gotoSurface(page, "/admin/showtimes", "smart-showtime-planner");
  const cinema=page.getByTestId("smart-cinema-select");
  const movie=page.getByTestId("smart-movie-select");
  await expect.poll(async()=>cinema.locator("option").count(),{timeout:30_000}).toBeGreaterThan(1);
  await expect.poll(async()=>movie.locator("option").count(),{timeout:30_000}).toBeGreaterThan(1);
  // Do not select the first cinema: V48 creates a transfer-only branch with no
  // auditorium earlier in this serial suite, which can sort before the baseline.
  await cinema.selectOption({label:"CineHub Quận 1"});
  await movie.selectOption({index:1});
  const selectedMovieLabel=(await movie.locator("option:checked").textContent()||"").trim();
  const selectedMovie=selectedMovieLabel.split(" · ")[0].trim();
  expect(selectedMovie).not.toBe("");
  const planningDate=isolatedPlannerDate();
  await page.getByLabel("Từ ngày của Bộ lập lịch thông minh").fill(planningDate);
  await page.getByLabel("Đến ngày của Bộ lập lịch thông minh").fill(planningDate);
  await page.getByLabel("Mục tiêu suất mỗi ngày").fill("2");
  await page.getByLabel("Giờ mở của Bộ lập lịch thông minh").fill("09:00");
  await page.getByLabel("Giờ đóng của Bộ lập lịch thông minh").fill("23:30");
  await page.getByLabel("Bước quét của Bộ lập lịch thông minh").selectOption("30");
  await page.getByTestId("smart-preview-button").click();

  await expect(page.getByTestId("smart-suggested-metric")).toBeVisible();
  await expect.poll(async()=>{
    const text=await page.getByTestId("smart-suggested-metric").innerText();
    const value=Number(text.match(/\d+/)?.[0]||"0");
    return value;
  },{timeout:15000}).toBeGreaterThan(0);
  await expect(page.getByText("Đã loại trừ lịch trùng và khoảng bảo trì").first()).toBeVisible();

  const commitResponsePromise=page.waitForResponse(response=>
    response.url().includes("/api/admin/showtime-planner/smart/commit") && response.request().method()==="POST",
  );
  page.once("dialog",dialog=>dialog.accept());
  await page.getByTestId("smart-commit-button").click();
  const commitResponse=await commitResponsePromise;
  expect(commitResponse.ok()).toBeTruthy();
  const commitBody=await commitResponse.json() as {showtimes?:Array<{id?:string}>};
  const createdShowtimeIds=(commitBody.showtimes||[]).map(showtime=>showtime.id||"").filter(Boolean);
  expect(createdShowtimeIds.length).toBeGreaterThan(0);
  try{
    await expect(page.getByText(/V49 Bộ lập lịch thông minh đã tạo/)).toBeVisible();
    const run = page.getByTestId("smart-planning-run").filter({hasText:selectedMovie}).first();
    await expect(run).toBeVisible({timeout:30_000});
    await expect(run).toContainText(selectedMovie);
  }finally{
    // V77.0.45: keep the serial full-suite repeatable on the same persistent Docker DB.
    // The planning run remains as provenance, but the temporary generated showtimes
    // are removed so rerunning the suite cannot gradually saturate one fixed date.
    const accessToken=await page.evaluate(()=>{
      const raw=localStorage.getItem("cinebooking_auth_v3");
      if(!raw)return "";
      try{return (JSON.parse(raw) as {accessToken?:string}).accessToken||"";}catch{return "";}
    });
    expect(accessToken).not.toBe("");
    for(const id of createdShowtimeIds){
      const cleanup=await page.request.delete(`/api/admin/showtimes/${id}`,{headers:{Authorization:`Bearer ${accessToken}`}});
      expect(cleanup.ok(),`cleanup generated Smart Planner showtime ${id}`).toBeTruthy();
    }
  }
});
