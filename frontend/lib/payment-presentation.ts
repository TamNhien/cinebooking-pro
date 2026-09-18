import type { Language } from "@/lib/usePresentationLanguage";

const PAYMENT_EXACT_EN: Readonly<Record<string, string>> = Object.freeze({
  "Thanh toán nội bộ (MOCK)": "Internal payment (MOCK)",
  "Thanh toán mô phỏng nội bộ": "Internal mock payment",
  "Không phải gateway production": "Not a production payment gateway",
  "MOCK chỉ dành cho local/CI, không phải cổng thanh toán production": "MOCK is for local/CI only; it is not a production payment gateway",
  "MOCK đã tắt bằng cấu hình": "MOCK is disabled by configuration",
  "Sẵn sàng cho local/CI": "Ready for local/CI",
  "Đã tắt bằng cấu hình": "Disabled by configuration",
  "Đã có merchant credentials": "Merchant credentials are configured",
  "Chưa cấu hình merchant credentials": "Merchant credentials are not configured",
  "Gateway đang ở sandbox; chưa phải production traffic": "Gateway is in sandbox mode; it is not serving production traffic",
  "Return URL hiện chỉ phù hợp local/sandbox; gateway công khai cần callback HTTPS reachable": "Return URL is suitable only for local/sandbox; a public gateway requires a reachable HTTPS callback",
  "IPN URL hiện chỉ phù hợp local/sandbox; gateway công khai cần callback HTTPS reachable": "IPN URL is suitable only for local/sandbox; a public gateway requires a reachable HTTPS callback",
  "Checkout endpoint phải dùng HTTPS ở production": "Checkout endpoint must use HTTPS in production",
  "Query endpoint phải dùng HTTPS ở production": "Query endpoint must use HTTPS in production",
  "Return URL phải dùng HTTPS ở production": "Return URL must use HTTPS in production",
  "IPN URL phải dùng HTTPS ở production": "IPN URL must use HTTPS in production",
  "Checkout endpoint không được trỏ localhost/private placeholder ở production": "Checkout endpoint must not point to localhost/private placeholders in production",
  "Query endpoint không được trỏ localhost/private placeholder ở production": "Query endpoint must not point to localhost/private placeholders in production",
  "Return URL không được trỏ localhost/private placeholder ở production": "Return URL must not point to localhost/private placeholders in production",
  "IPN URL không được trỏ localhost/private placeholder ở production": "IPN URL must not point to localhost/private placeholders in production",
  "Return URL chưa phải URL hợp lệ": "Return URL is not a valid URL",
  "IPN URL chưa phải URL hợp lệ": "IPN URL is not a valid URL",
  "Provider không hợp lệ": "Invalid provider",
  "Chưa cấu hình VNPAY": "VNPay is not configured",
  "Chưa cấu hình MoMo": "MoMo is not configured",
  "Mock payment đã bị tắt": "Mock payment is disabled",
  "Payment không phải MOCK": "Payment is not MOCK",
  "Không có quyền": "You do not have permission",
});

export function paymentPresentationCopy(value: string | null | undefined, language: Language): string {
  const raw = String(value ?? "");
  if (language !== "en" || !raw) return raw;
  const exact = PAYMENT_EXACT_EN[raw];
  if (exact) return exact;

  let match = raw.match(/^(.+) chưa được cấu hình merchant credentials$/u);
  if (match) return `${match[1]} merchant credentials are not configured`;
  match = raw.match(/^(.+) production guard chặn checkout: (.+)$/u);
  if (match) return `${match[1]} production guard blocked checkout: ${match[2].split("; ").map(x => paymentPresentationCopy(x, language)).join("; ")}`;
  return raw;
}

export function paymentProviderDisplayName(value: string | null | undefined, language: Language): string {
  return paymentPresentationCopy(value, language);
}
