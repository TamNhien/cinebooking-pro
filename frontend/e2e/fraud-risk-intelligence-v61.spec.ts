import {expect,test} from "@playwright/test";

async function loginAdmin(page:any){
  const email=process.env.E2E_ADMIN_EMAIL||"admin-v29@cine.local";
  const password=process.env.E2E_ADMIN_PASSWORD||"V29SmokeOnly-ChangeMe";
  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("M\u1eadt kh\u1ea9u").fill(password);
  await Promise.all([page.waitForURL(/\/admin$/,{timeout:15000}),page.getByRole("button",{name:"\u0110\u0103ng nh\u1eadp"}).click()]);
}

test("V61 admin reviews explainable fraud risk without automatic blocking",async({page})=>{
  await loginAdmin(page);
  await page.goto("/admin/risk");
  await expect(page.getByRole("heading",{name:"Fraud & Risk Intelligence"})).toBeVisible();
  await expect(page.getByTestId("fraud-risk-summary-v61")).toBeVisible();
  const engine=page.getByTestId("fraud-risk-engine-v61");
  await expect(engine).toContainText("Transparent scoring rules");
  await expect(engine).toContainText("V61_RULESET_1");
  await expect(engine).toContainText("no automatic blocking");
  const queue=page.getByTestId("fraud-risk-customers-v61");
  await expect(queue).toBeVisible();
  await expect(queue.locator("tbody tr").first()).toBeVisible();
  const body=await page.locator("body").innerText();
  expect(body).toContain("risk score is decision support");
  expect(body).toContain("BLOCK_RECOMMENDED");
  expect(body).not.toContain("AI detected fraud");
});
