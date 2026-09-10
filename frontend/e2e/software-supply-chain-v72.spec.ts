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

test("V72 Software Supply Chain Integrity exposes append-only digest posture and keeps version tiles ascending",async({page})=>{
  await loginAdmin(page);
  const tile=page.getByTestId("admin-supply-chain-v72");
  await expect(tile).toBeVisible();
  await expect(tile).toContainText("Supply Chain V72");

  const versionLabels=await page.locator('[data-testid="admin-action-grid-v59"] a').allTextContents();
  const versions=versionLabels.map(label=>label.match(/\bV(\d+)\b/)).filter((m):m is RegExpMatchArray=>Boolean(m)).map(m=>Number(m[1]));
  expect(versions).toEqual([...versions].sort((a,b)=>a-b));
  expect(versions.at(-1)).toBe(72);

  await tile.click();
  await expect(page).toHaveURL(/\/admin\/supply-chain$/);
  await expect(page.getByTestId("supply-chain-v72")).toContainText("V72 · SOFTWARE SUPPLY CHAIN INTEGRITY 5.0");
  await expect(page.getByTestId("supply-chain-summary-v72")).toContainText("V72-SUPPLY-CHAIN-INTEGRITY-5");
  await expect(page.getByTestId("supply-chain-policy-v72")).toContainText("DIGESTS_ONLY");
  await expect(page.getByTestId("supply-chain-policy-v72")).toContainText("V72 mặc định không tự chặn release");
  await expect(page.getByTestId("supply-chain-error-v72")).toHaveCount(0);
});
