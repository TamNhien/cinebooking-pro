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

test("V65 exposes admin SLO, dependency probes and trace correlation",async({page})=>{
  await loginAdmin(page);
  const tile=page.getByTestId("admin-observability-v65");
  await expect(tile).toBeVisible();
  await expect(tile).toContainText("Observability V65");
  await tile.click();

  await expect(page).toHaveURL(/\/admin\/observability$/);
  await expect(page.getByTestId("observability-v65")).toContainText("V65 · OBSERVABILITY & RELIABILITY 4.0");
  await expect(page.getByTestId("observability-summary-v65")).toContainText("V65-OBSERVABILITY-RELIABILITY-4");
  await expect(page.getByTestId("slo-v65")).toContainText("Availability");
  await expect(page.getByTestId("slo-v65")).toContainText("API P95 latency");
  await expect(page.getByTestId("dependencies-v65")).toContainText("PostgreSQL");
  await expect(page.getByTestId("dependencies-v65")).toContainText("Redis");
  await expect(page.getByTestId("recent-traces-v65")).toContainText("Trace ID");
});
