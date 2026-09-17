import type { Language } from "@/lib/usePresentationLanguage";

const SYSTEM_LOYALTY_EN: Readonly<Record<string, string>> = Object.freeze({
  "Mã ưu đãi thành viên 10.000đ": "Member voucher · VND 10,000 off",
  "Mã ưu đãi cuối tuần 10.000đ": "Weekend voucher · VND 10,000 off",
  "Mã ưu đãi sinh nhật 10.000đ": "Birthday voucher · VND 10,000 off",
  "Mã ưu đãi đặt vé trực tuyến 10.000đ": "Online booking voucher · VND 10,000 off",
  "Mã ưu đãi bắp nước 10.000đ": "Concessions voucher · VND 10,000 off",
  "Mã ưu đãi suất tối 10.000đ": "Evening-show voucher · VND 10,000 off",
  "Mã ưu đãi khách hàng thân thiết 10.000đ": "Loyal-customer voucher · VND 10,000 off",
  "Mã ưu đãi gia đình 10.000đ": "Family voucher · VND 10,000 off",
  "Mã ưu đãi học sinh sinh viên 10.000đ": "Student voucher · VND 10,000 off",
  "Mã ưu đãi tri ân 10.000đ": "Appreciation voucher · VND 10,000 off",
  "Mã ưu đãi đổi bằng điểm thành viên": "Voucher redeemed with loyalty points",
  "Voucher giảm 20.000đ": "VND 20,000 off voucher",
  "Mã ưu đãi giảm 20.000đ": "VND 20,000 off voucher",
  "Voucher giảm 10%": "10% off voucher",
  "Mã ưu đãi giảm 10%": "10% off voucher",
  "Bắp Caramel miễn phí": "Free Caramel Popcorn",
  "Đổi điểm lấy voucher cá nhân dùng một lần trong 30 ngày.": "Redeem points for a one-time personal voucher valid for 30 days.",
  "Giảm 10%, tối đa 50.000đ, dùng một lần trong 30 ngày.": "10% off, up to VND 50,000, for one use within 30 days.",
  "Đổi điểm lấy 1 Bắp Caramel. Đưa mã nhận quà cho nhân viên tại quầy.": "Redeem points for 1 Caramel Popcorn. Show the reward code to staff at the counter.",
});

export function systemLoyaltyPresentation(value: string | null | undefined, language: Language): string {
  if (!value) return value ?? "";
  return language === "en" ? SYSTEM_LOYALTY_EN[value] ?? value : value;
}

export function isSystemLoyaltyPresentation(value: string | null | undefined): boolean {
  return Boolean(value && SYSTEM_LOYALTY_EN[value]);
}
