import { expect, test, type Page } from "@playwright/test";

async function loginAdmin(page:Page){
  const email=process.env.E2E_ADMIN_EMAIL||"admin@cine.local";
  const password=process.env.E2E_ADMIN_PASSWORD||"Admin@123";
  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Mật khẩu").fill(password);
  await page.getByRole("button",{name:"Đăng nhập"}).click();
  await page.waitForURL(/\/admin$/,{timeout:15000});
}

test("V74 Reliability & Resilience exposes burn-rate, incident evidence, failover guard and runbook",async({page})=>{
  await loginAdmin(page);
  const v73Tile=page.getByTestId("admin-actions-runtime-v73");
  await expect(v73Tile).toBeVisible();
  await expect(v73Tile).toContainText("Actions Runtime V73");
  await expect(v73Tile).toHaveAttribute("href","/admin/actions-runtime");

  const tile=page.getByTestId("admin-reliability-v74");
  await expect(tile).toBeVisible();
  await expect(tile).toContainText("Reliability V74");

  const versionLabels=await page.locator('[data-testid="admin-action-grid-v59"] a').allTextContents();
  const versions=versionLabels.map(label=>label.match(/\bV(\d+)\b/)).filter((m):m is RegExpMatchArray=>Boolean(m)).map(m=>Number(m[1]));
  expect(versions).toEqual([...versions].sort((a,b)=>a-b));
  expect(versions).toContain(73);
  expect(versions.at(-1)).toBeGreaterThanOrEqual(74);

  await v73Tile.click();
  await expect(page).toHaveURL(/\/admin\/actions-runtime$/);
  await expect(page.getByTestId("actions-runtime-v73")).toContainText("V73 · GITHUB ACTIONS RUNTIME MODERNIZATION 5.0");
  await expect(page.getByTestId("actions-runtime-summary-v73")).toContainText("V73-GITHUB-ACTIONS-NODE24-5");
  await expect(page.getByTestId("actions-runtime-policy-v73")).toContainText("actions/upload-artifact@v4");
  await page.goto("/admin");

  await page.getByTestId("admin-reliability-v74").click();
  await expect(page).toHaveURL(/\/admin\/reliability$/);
  await expect(page.getByTestId("reliability-v74")).toContainText("V74 · RELIABILITY & RESILIENCE 5.0");
  await expect(page.getByTestId("reliability-summary-v74")).toContainText("V74-RELIABILITY-RESILIENCE-5");
  await expect(page.getByTestId("burn-rate-v74")).toContainText("Fast burn");
  await expect(page.getByTestId("burn-rate-v74")).toContainText("Slow burn");
  await expect(page.getByTestId("reliability-policy-v74")).toContainText("NO_SYNTHETIC_INCIDENTS");
  await expect(page.getByTestId("failover-drill-v74")).toContainText("PLAN ONLY");
  await expect(page.getByTestId("failover-drill-v74")).toContainText("-Execute");
  await expect(page.getByTestId("reliability-runbook-v74")).toContainText("FAILOVER");
  await expect(page.getByTestId("reliability-error-v74")).toHaveCount(0);
});
