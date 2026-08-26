import { expect, test } from "@playwright/test";

test("V49 Smart Planner suggests demand-balanced conflict-free showtimes and commits provenance",async({page})=>{
  const adminEmail=process.env.E2E_ADMIN_EMAIL||"admin-v29@cine.local";
  const adminPassword=process.env.E2E_ADMIN_PASSWORD||"V29SmokeOnly-ChangeMe";
  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(adminEmail);
  await page.getByPlaceholder("Mật khẩu").fill(adminPassword);
  await Promise.all([page.waitForURL(/\/admin$/,{timeout:15000}),page.getByRole("button",{name:"Đăng nhập"}).click()]);

  await page.goto("/admin/showtimes");
  await expect(page.getByTestId("smart-showtime-planner")).toBeVisible();
  const cinema=page.getByTestId("smart-cinema-select");
  const movie=page.getByTestId("smart-movie-select");
  await expect.poll(async()=>cinema.locator("option").count()).toBeGreaterThan(1);
  await expect.poll(async()=>movie.locator("option").count()).toBeGreaterThan(1);
  // Do not select the first cinema: V48 creates a transfer-only branch with no
  // auditorium earlier in this serial suite, which can sort before the baseline.
  await cinema.selectOption({label:"CineHub Quận 1"});
  await movie.selectOption({label:"Hành Trình Sao Hỏa · 128 phút"});
  await page.getByLabel("Từ ngày Smart Planner").fill("2026-10-15");
  await page.getByLabel("Đến ngày Smart Planner").fill("2026-10-15");
  await page.getByLabel("Mục tiêu suất mỗi ngày").fill("2");
  await page.getByLabel("Giờ mở Smart Planner").fill("09:00");
  await page.getByLabel("Giờ đóng Smart Planner").fill("23:30");
  await page.getByLabel("Bước quét Smart Planner").selectOption("30");
  await page.getByTestId("smart-preview-button").click();

  await expect(page.getByTestId("smart-suggested-metric")).toBeVisible();
  await expect.poll(async()=>{
    const text=await page.getByTestId("smart-suggested-metric").innerText();
    const value=Number(text.match(/\d+/)?.[0]||"0");
    return value;
  },{timeout:15000}).toBeGreaterThan(0);
  await expect(page.getByText("Đã loại trừ lịch trùng và khoảng bảo trì").first()).toBeVisible();

  page.once("dialog",dialog=>dialog.accept());
  await page.getByTestId("smart-commit-button").click();
  await expect(page.getByText(/V49 Smart Planner đã tạo/)).toBeVisible();
  await expect(page.getByTestId("smart-planning-run").first()).toBeVisible();
  await expect(page.getByText(/SMART/).first()).toBeVisible();
});
