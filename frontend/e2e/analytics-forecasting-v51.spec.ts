import { expect, test } from "@playwright/test";
import { ensureSurface, gotoSurface, loginExistingAdmin } from "./runtime-guards";

test("V51 admin analytics forecasts revenue and preserves unknown concession cost",async({page})=>{
  await loginExistingAdmin(page);
  await gotoSurface(page,"/admin/analytics","forecast-v51");

  await expect(page.getByTestId("analytics-v51")).toBeVisible();
  await expect(page.getByTestId("period-comparison-v51")).toBeVisible();
  await expect(page.getByTestId("forecast-v51")).toContainText("V51-WEEKDAY-WEIGHTED-MA-1");
  await expect(page.getByTestId("margin-v51")).toContainText("NULL / Chưa biết");
  await expect(page.getByTestId("auditorium-performance-v51")).toBeVisible();
  await expect(page.getByTestId("analytics-snapshots-v51")).toContainText("FOR UPDATE ... SKIP LOCKED");

  const cinemaFilter=page.getByTestId("analytics-cinema-filter");
  const optionCount=await cinemaFilter.locator("option").count();
  expect(optionCount).toBeGreaterThan(1);
  await cinemaFilter.selectOption({index:1});
  await expect(page.getByTestId("cost-basis-v51")).toBeVisible();

  const firstInput=page.getByTestId("cost-basis-v51").locator('input[placeholder="Chưa biết"]').first();
  const saveButton=page.getByTestId("cost-basis-v51").getByRole("button",{name:"Lưu cost"}).first();
  await firstInput.fill("");
  await saveButton.click();
  await expect(saveButton).toBeEnabled();
  await expect(page.getByTestId("cost-basis-v51")).toContainText("Chưa biết");

  const selectedCinemaId=await cinemaFilter.inputValue();
  const missing=await page.evaluate(async url=>{
    const raw=localStorage.getItem("cinebooking_auth_v3");
    if(!raw) throw new Error("Admin auth missing from browser storage");
    const auth=JSON.parse(raw) as {accessToken?:string};
    if(!auth.accessToken) throw new Error("Admin access token missing from browser storage");
    const response=await fetch(url,{
      credentials:"include",
      headers:{Authorization:`Bearer ${auth.accessToken}`},
    });
    if(!response.ok) throw new Error(`Missing cost endpoint failed: ${response.status}`);
    return response.json();
  },`/api/admin/analytics/missing-cost-basis?days=30&cinemaId=${selectedCinemaId}`) as {strategyVersion:string;missingUnits:number;affectedProductBranches:number;items:Array<{cinemaId:string;productName:string;missingUnits:number;actionable:boolean}>};
  expect(missing.strategyVersion).toBe("V75.0.1-COST-COVERAGE-DRILLDOWN-1");
  expect(missing.missingUnits).toBeGreaterThanOrEqual(0);
  expect(missing.affectedProductBranches).toBe(missing.items.length);
  if(missing.missingUnits>0){
    await expect(page.getByTestId("missing-cost-drilldown-toggle")).toBeVisible();
    await page.getByTestId("missing-cost-drilldown-toggle").click();
    await expect(page.getByTestId("missing-cost-drilldown-v75-patch")).toBeVisible();
    await expect(page.getByTestId("missing-cost-drilldown-v75-patch")).toContainText("COST COVERAGE DRILL-DOWN");
  }

  await page.reload({waitUntil:"domcontentloaded"});
  await ensureSurface(page,"forecast-v51","/admin/analytics");
  await expect(page.getByTestId("analytics-v51")).toBeVisible();
  await expect(page.getByTestId("forecast-v51")).toContainText("V51-WEEKDAY-WEIGHTED-MA-1",{timeout:30_000});
});
