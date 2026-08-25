import { expect, test } from "@playwright/test";

const PASSWORD="V50E2e!Taste123";

test("V50 user tunes explainable recommendations with explicit taste feedback",async({page})=>{
  const stamp=`${Date.now()}-${Math.floor(Math.random()*100000)}`;
  const email=`hoang.anh+${stamp}@example.com`;

  await page.goto("/register");
  await page.getByPlaceholder("Họ và tên").fill("Phạm Hoàng Anh");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Nhập mật khẩu").fill(PASSWORD);
  await page.getByPlaceholder("Nhập lại mật khẩu").fill(PASSWORD);
  await page.getByRole("button",{name:"Đăng ký"}).click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto("/for-you");
  await expect(page.getByTestId("for-you-v50")).toBeVisible();
  await expect(page.getByTestId("taste-profile")).toBeVisible();
  const cards=page.getByTestId("recommendation-item-v50");
  await expect.poll(async()=>cards.count()).toBeGreaterThan(0);

  // A new user begins on discovery fallback. Explicit MORE_LIKE_THIS becomes a durable strong taste signal.
  await cards.first().getByTestId("more-like-this").click();
  await expect(page.getByTestId("recommendation-feedback-message")).toContainText("Đã ưu tiên thêm phim");
  await expect(page.getByTestId("taste-profile")).toContainText(/phản hồi/);

  // Feedback survives a reload and the explanation is now personalized.
  await page.reload();
  await expect(page.getByTestId("for-you-v50")).toBeVisible();
  await expect(page.getByText(/Vì bạn muốn xem thêm phim giống|Hợp gu/).first()).toBeVisible();

  const afterReload=page.getByTestId("recommendation-item-v50");
  await expect.poll(async()=>afterReload.count()).toBeGreaterThan(0);
  const hiddenCard=afterReload.first();
  const hiddenHref=await hiddenCard.locator('a[href^="/movies/"]').first().getAttribute("href");
  expect(hiddenHref).toBeTruthy();
  await hiddenCard.getByTestId("hide-recommendation").click();
  await expect(page.getByTestId("recommendation-feedback-message")).toContainText("Đã ẩn phim này");
  if(hiddenHref){
    await expect(page.getByTestId("recommendation-item-v50").locator(`a[href="${hiddenHref}"]`)).toHaveCount(0);
  }
});
