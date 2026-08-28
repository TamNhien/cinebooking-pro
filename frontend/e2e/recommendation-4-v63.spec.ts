import { expect, test } from "@playwright/test";

const PASSWORD="V63E2e!DeepTaste123";

test("V63 Recommendation 4.0 deep profile, explainability and discovery mode",async({page})=>{
  const stamp=`${Date.now()}-${Math.floor(Math.random()*100000)}`;
  const email=`minh.khoi.v63+${stamp}@example.com`;

  await page.goto("/register");
  await page.getByPlaceholder("Họ và tên").fill("Nguyễn Minh Khôi");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Nhập mật khẩu").fill(PASSWORD);
  await page.getByPlaceholder("Nhập lại mật khẩu").fill(PASSWORD);
  await page.getByRole("button",{name:"Đăng ký"}).click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto("/for-you");
  await expect(page.getByTestId("for-you-v63")).toBeVisible();
  await expect(page.getByText("V63 · RECOMMENDATION 4.0")).toBeVisible();
  await expect(page.getByTestId("recommendation-mode-v63")).toBeVisible();
  await expect(page.getByTestId("taste-profile")).toContainText("Độ mạnh hồ sơ");

  const cards=page.getByTestId("recommendation-item-v50");
  await expect.poll(async()=>cards.count()).toBeGreaterThan(0);

  // One explicit anchor gives V63 enough real metadata to learn genre/language/duration facets.
  await cards.first().getByTestId("more-like-this").click();
  await expect(page.getByTestId("recommendation-feedback-message")).toContainText("Đã ưu tiên thêm phim");
  await expect(page.getByTestId("taste-profile")).toContainText(/Ngôn ngữ hợp gu|Thời lượng thường xem/);
  await expect(page.getByTestId("score-breakdown-v63").first()).toBeVisible();

  // DISCOVERY is deterministic but increases novelty/diversity pressure without fabricating history.
  const discovery=page.getByTestId("recommendation-mode-discovery");
  await discovery.click();
  await expect(discovery).toHaveClass(/border-violet-400/);
  await expect(page.getByTestId("score-breakdown-v63").first()).toBeVisible();
  await expect.poll(async()=>page.getByTestId("new-to-you-v63").count()).toBeGreaterThan(0);

  await page.reload();
  await expect(page.getByTestId("for-you-v63")).toBeVisible();
  await expect(page.getByText(/Vì bạn muốn xem thêm phim giống|Hợp gu|Khám phá mới/).first()).toBeVisible();
});
