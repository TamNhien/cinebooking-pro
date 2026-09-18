import type { Language } from "@/lib/usePresentationLanguage";

const SECURITY_ALERT_EN: Readonly<Record<string, readonly [string, string]>> = Object.freeze({
  "Đăng nhập từ thiết bị chưa tin cậy": [
    "Sign-in from an untrusted device",
    "CineBooking detected a new sign-in session. If this was not you, revoke the session and change your password.",
  ],
  "Nhiều lần đăng nhập thất bại": [
    "Multiple failed sign-in attempts",
    "Brute-force protection has rate-limited sign-in for the account or network address.",
  ],
  "Mật khẩu đã được đặt lại": [
    "Password was reset",
    "The password was reset through account recovery. All previous sessions were revoked.",
  ],
  "Mật khẩu đã được thay đổi": [
    "Password was changed",
    "The account password was changed. Other devices were signed out.",
  ],
});



const SUPPORT_SUBJECT_EN: Readonly<Record<string, string>> = Object.freeze({
  "Không nhận được thư điện tử xác nhận vé": "Booking confirmation email not received",
  "Không nhận được email xác nhận vé": "Booking confirmation email not received",
  "Thanh toán thành công nhưng vé chưa cập nhật": "Payment succeeded but the ticket was not updated",
  "Cần kiểm tra trạng thái hoàn tiền": "Refund status needs review",
  "Mã QR vé không hiển thị": "Ticket QR code is not displayed",
  "Âm thanh phòng chiếu quá nhỏ": "Auditorium audio is too quiet",
  "Cần hỗ trợ từ nhân viên tại rạp": "Assistance from cinema staff is needed",
  "Thay đổi thông tin liên hệ": "Contact information change",
  "Ghế đã chọn không đúng vị trí": "Selected seat position is incorrect",
  "Giao dịch thanh toán bị treo": "Payment transaction is pending",
  "Muốn xác nhận chính sách hoàn vé": "Refund policy confirmation requested",
});

const SUPPORT_DESCRIPTION_EN: Readonly<Record<string, string>> = Object.freeze({
  "Khách chưa nhận được thư điện tử xác nhận sau khi hoàn tất đặt vé.": "The customer has not received a confirmation email after completing the booking.",
  "Khách thấy giao dịch thành công nhưng trạng thái vé chưa cập nhật.": "The customer sees a successful payment, but the ticket status has not been updated.",
  "Khách muốn biết thời điểm khoản hoàn tiền được ghi nhận.": "The customer wants to know when the refund will be credited.",
  "Ứng dụng không hiển thị mã QR của lượt đặt vé đã xác nhận.": "The application is not displaying the QR code for the confirmed booking.",
  "Khách phản ánh âm lượng tại phòng chiếu thấp hơn bình thường.": "The customer reports that auditorium volume is lower than normal.",
  "Khách cần nhân viên rạp hỗ trợ tại khu vực sảnh.": "The customer needs cinema staff assistance in the lobby area.",
  "Khách muốn cập nhật số điện thoại liên hệ của tài khoản.": "The customer wants to update the account contact phone number.",
  "Khách cần kiểm tra vị trí ghế đã chọn trên sơ đồ.": "The customer needs the selected seat position checked on the seating map.",
  "Trang thanh toán đang hiển thị giao dịch ở trạng thái chờ.": "The payment page is showing the transaction as pending.",
  "Khách cần được giải thích điều kiện và thời hạn hoàn vé.": "The customer needs an explanation of refund conditions and deadlines.",
  "Khách đã thanh toán thành công nhưng chưa nhận được email xác nhận vé và cần kiểm tra lại booking.": "The customer completed payment but has not received the ticket confirmation email and needs the booking checked.",
  "Khách đã hoàn tất thao tác nhưng cần CineBooking kiểm tra lại trạng thái booking và hỗ trợ xác nhận.": "The customer completed the action but needs CineBooking to review the booking status and provide confirmation.",
});

const MAINTENANCE_ASSET_PREFIX_EN: ReadonlyArray<readonly [string, string]> = Object.freeze([
  ["Máy chiếu ", "Projector "],
  ["Bộ xử lý âm thanh ", "Audio processor "],
  ["Dàn lạnh ", "Air-conditioning unit "],
  ["Màn chiếu ", "Projection screen "],
  ["Máy POS ", "POS terminal "],
  ["Tủ trung tâm báo cháy ", "Fire alarm control panel "],
]);

const MAINTENANCE_WORK_DESCRIPTION_EN: Readonly<Record<string, string>> = Object.freeze({
  "Kiểm tra độ sáng, quạt làm mát, nguồn và cân chỉnh khung hình của máy chiếu.": "Check brightness, cooling fans, power, and projector image alignment.",
  "Kiểm tra quang học, độ hội tụ và cân chỉnh màu RGB.": "Check optics, focus, and RGB color calibration.",
});

const MAINTENANCE_WORK_TITLE_PREFIX_EN: ReadonlyArray<readonly [string, string]> = Object.freeze([
  ["Cân chỉnh máy chiếu ", "Calibrate projector "],
  ["Vệ sinh máy chiếu định kỳ", "Periodic projector cleaning"],
  ["Kiểm tra hệ thống âm thanh", "Check audio system"],
  ["Bảo dưỡng điều hòa phòng chiếu", "Service auditorium air conditioning"],
  ["Vệ sinh màn chiếu", "Clean projection screen"],
  ["Kiểm tra nguồn điện phòng chiếu", "Check auditorium power supply"],
  ["Kiểm tra mạng nội bộ", "Check internal network"],
  ["Bảo trì ghế và lối đi", "Maintain seats and aisles"],
  ["Cân chỉnh máy chiếu laser", "Calibrate laser projector"],
  ["Đo kiểm âm thanh định kỳ", "Periodic audio measurement"],
  ["Kiểm tra hệ thống an toàn", "Check safety system"],
]);

const COMMAND_CENTER_ATTENTION_EN: Readonly<Record<string, string>> = Object.freeze({
  "Yêu cầu hỗ trợ quá SLA": "Support requests past SLA",
  "Work order bảo trì quá hạn": "Overdue maintenance work orders",
  "Sản phẩm đã hết tồn khả dụng": "Products out of available stock",
  "Sản phẩm chạm ngưỡng tồn thấp": "Products at low-stock threshold",
  "Sự cố vận hành đang mở": "Open operational incidents",
});

export function securityAlertPresentation(
  title: string,
  details: string,
  language: Language,
): { title: string; details: string } {
  if (language === "vi") return { title, details };
  const known = SECURITY_ALERT_EN[title];
  return known ? { title: known[0], details: known[1] } : { title, details };
}

export function commandCenterAttentionTitle(title: string, language: Language): string {
  return language === "en" ? (COMMAND_CENTER_ATTENTION_EN[title] ?? title) : title;
}

export function supportCasePresentation(
  subject: string,
  description: string,
  language: Language,
): { subject: string; description: string } {
  if (language === "vi") return { subject, description };
  const numbered = subject.match(/^Không nhận được email xác nhận vé #(\d+)$/u);
  const translatedSubject = numbered
    ? `Booking confirmation email not received #${numbered[1]}`
    : (SUPPORT_SUBJECT_EN[subject] ?? subject);
  return {
    subject: translatedSubject,
    description: SUPPORT_DESCRIPTION_EN[description] ?? description,
  };
}

export function maintenanceAssetName(name: string | null | undefined, language: Language): string {
  const value = String(name ?? "");
  if (language === "vi") return value;
  for (const [prefix, translatedPrefix] of MAINTENANCE_ASSET_PREFIX_EN) {
    if (value.startsWith(prefix)) return `${translatedPrefix}${value.slice(prefix.length)}`;
  }
  return value;
}



export function maintenanceWorkOrderPresentation(
  title: string,
  description: string,
  language: Language,
): { title: string; description: string } {
  if (language === "vi") return { title, description };
  let translatedTitle = title;
  const exactTitle = MAINTENANCE_WORK_TITLE_PREFIX_EN.find(([source]) => title === source);
  if (exactTitle) {
    translatedTitle = exactTitle[1];
  } else {
    const prefixedTitle = MAINTENANCE_WORK_TITLE_PREFIX_EN.find(([source]) => source.endsWith(" ") && title.startsWith(source));
    if (prefixedTitle) translatedTitle = `${prefixedTitle[1]}${title.slice(prefixedTitle[0].length)}`;
  }
  return {
    title: translatedTitle,
    description: MAINTENANCE_WORK_DESCRIPTION_EN[description] ?? description,
  };
}

export function auditoriumDisplayName(name: string | null | undefined, language: Language): string {
  const value = String(name ?? "");
  if (language !== "en") return value;
  const room = value.match(/^Phòng\s+(.+)$/u);
  return room ? `Room ${room[1]}` : value;
}
