import type { Language } from "@/lib/usePresentationLanguage";

function englishVndSuffix(value: string): string {
  return value.replace(/(\d{1,3}(?:\.\d{3})+|\d+)đ/gu, (_match, amount: string) => `${amount.replaceAll(".", ",")} ₫`);
}

const PRICING_RULE_PREFIX_EN: ReadonlyArray<readonly [string, string]> = Object.freeze([
  ["Ưu đãi suất tối thứ Hai", "Monday evening promotion"],
  ["Ưu đãi suất tối thứ Ba", "Tuesday evening promotion"],
  ["Khung giờ vàng giữa tuần", "Midweek golden-hours promotion"],
  ["Phụ thu ghế VIP buổi tối", "Evening VIP-seat surcharge"],
  ["Ưu đãi suất sớm", "Early-show promotion"],
  ["Giá cuối tuần buổi tối", "Weekend evening pricing"],
  ["Ưu đãi thành viên buổi tối", "Evening member promotion"],
  ["Khung giờ thấp điểm", "Off-peak hours"],
  ["Phụ thu suất công chiếu", "Premiere-show surcharge"],
  ["Ưu đãi đặt vé trực tuyến", "Online booking promotion"],
  ["Khung giờ tối", "Evening peak hours"],
  ["Cuối tuần", "Weekend"],
]);

export function pricingRuleDisplayName(value: string | null | undefined, language: Language): string {
  const raw = String(value ?? "");
  if (language !== "en") return raw;
  for (const [source, translated] of PRICING_RULE_PREFIX_EN) {
    if (raw === source) return translated;
    if (raw.startsWith(`${source} `)) return `${translated}${englishVndSuffix(raw.slice(source.length))}`;
  }
  return raw;
}

const STAFF_JOB_TITLE_EN: Readonly<Record<string, string>> = Object.freeze({
  "Giám sát ca": "Shift supervisor",
  "Nhân viên rạp": "Cinema staff",
  "Nhân viên quầy vé": "Ticket counter staff",
  "Nhân viên bắp nước": "Concessions staff",
  "Nhân viên chăm sóc khách hàng": "Customer support staff",
  "Kỹ thuật viên phòng chiếu": "Projection technician",
  "Nhân viên vận hành": "Operations staff",
  "Nhân viên hỗ trợ sảnh": "Lobby support staff",
  "Nhân viên kho": "Inventory staff",
  "Nhân viên soát vé": "Ticket-checking staff",
  "Quản lý rạp": "Cinema manager",
});

export function staffJobTitleDisplay(value: string | null | undefined, language: Language): string {
  const raw = String(value ?? "");
  return language === "en" ? (STAFF_JOB_TITLE_EN[raw] ?? raw) : raw;
}

const INCIDENT_TITLE_EN: Readonly<Record<string, string>> = Object.freeze({
  "Máy POS mất kết nối": "POS terminal lost connection",
  "Khách để quên tài sản": "Customer left personal property behind",
  "Cửa thoát hiểm khó đóng": "Emergency exit is difficult to close",
  "Máy chiếu giảm độ sáng": "Projector brightness has dropped",
  "Quầy bắp nước mất điện tạm thời": "Concessions counter had a temporary power outage",
  "Khách cần hỗ trợ đổi vị trí ghế": "Customer needs help changing seats",
  "Nhiệt độ phòng chiếu cao": "Auditorium temperature is high",
  "Âm thanh kênh trái bị nhỏ": "Left audio channel is too quiet",
  "Máy quét QR phản hồi chậm": "QR scanner is responding slowly",
  "Lối đi có vật cản": "Aisle is obstructed",
});

const INCIDENT_DESCRIPTION_EN: Readonly<Record<string, string>> = Object.freeze({
  "Máy POS tại quầy vé không kết nối được mạng nội bộ.": "The POS terminal at the ticket counter cannot connect to the internal network.",
  "Khách báo để quên ví tại khu vực ghế chờ.": "A customer reported leaving a wallet in the waiting area.",
  "Nhân viên phát hiện cửa thoát hiểm cần kiểm tra bản lề.": "Staff found that the emergency exit hinges need inspection.",
  "Độ sáng máy chiếu thấp hơn mức vận hành thông thường.": "Projector brightness is below the normal operating level.",
  "Nguồn điện tại quầy bắp nước gián đoạn trong vài phút.": "Power at the concessions counter was interrupted for several minutes.",
  "Khách cần hỗ trợ kiểm tra lại vị trí ghế trên vé.": "The customer needs help checking the seat position shown on the ticket.",
  "Nhiệt độ phòng chiếu tăng cao trong suất tối.": "The auditorium temperature rose during the evening show.",
  "Kênh loa bên trái có âm lượng thấp hơn các kênh còn lại.": "The left speaker channel is quieter than the other channels.",
  "Máy quét QR tại cổng phản hồi chậm khi soát vé.": "The QR scanner at the gate responds slowly during ticket checks.",
  "Nhân viên phát hiện vật cản tại lối đi và xử lý ngay.": "Staff found an obstruction in the aisle and cleared it immediately.",
  "Khách gặp khó khăn khi quét mã QR tại cổng soát vé và cần nhân viên hỗ trợ trực tiếp.": "The customer had trouble scanning the QR code at the ticket gate and needs direct staff assistance.",
});

const INCIDENT_RESOLUTION_EN: Readonly<Record<string, string>> = Object.freeze({
  "Sự cố đã được xử lý và ghi nhận trong ca trực": "The incident was resolved and recorded during the shift.",
  "Đã kiểm tra mã vé, hướng dẫn khách quét lại và xác nhận vào rạp thành công": "The ticket code was checked, the customer was guided to scan again, and entry was confirmed successfully.",
  "Đã kiểm tra mã vé và hỗ trợ khách vào rạp thành công": "The ticket code was checked and the customer was assisted into the auditorium successfully.",
});

export function staffIncidentPresentation(
  title: string | null | undefined,
  description: string | null | undefined,
  resolutionNote: string | null | undefined,
  language: Language,
): { title: string; description: string; resolutionNote: string } {
  const rawTitle = String(title ?? "");
  const rawDescription = String(description ?? "");
  const rawResolution = String(resolutionNote ?? "");
  if (language !== "en") return { title: rawTitle, description: rawDescription, resolutionNote: rawResolution };

  const ticketGate = rawTitle.match(/^Khách cần hỗ trợ tại cổng soát vé(?:\s+(.+))?$/u);
  const translatedTitle = ticketGate
    ? `Customer needs help at the ticket gate${ticketGate[1] ? ` ${ticketGate[1]}` : ""}`
    : (INCIDENT_TITLE_EN[rawTitle] ?? rawTitle);

  return {
    title: translatedTitle,
    description: INCIDENT_DESCRIPTION_EN[rawDescription] ?? rawDescription,
    resolutionNote: INCIDENT_RESOLUTION_EN[rawResolution] ?? rawResolution,
  };
}

const VOUCHER_NAME_EN: Readonly<Record<string, string>> = Object.freeze({
  "Ưu đãi thành viên mới": "New member promotion",
  "Ưu đãi thành viên mới 10%": "New member promotion 10%",
  "Ưu đãi tháng 8": "August promotion",
  "Ưu đãi thành viên 10.000đ": "Member promotion · VND 10,000 off",
  "Ưu đãi cuối tuần 10.000đ": "Weekend promotion · VND 10,000 off",
  "Ưu đãi vé xem phim 10.000đ": "Movie-ticket promotion · VND 10,000 off",
  "Ưu đãi bắp nước 10.000đ": "Concessions promotion · VND 10,000 off",
  "Ưu đãi đặt vé trực tuyến 10.000đ": "Online-booking promotion · VND 10,000 off",
  "Ưu đãi khách hàng thân thiết 10.000đ": "Loyal-customer promotion · VND 10,000 off",
  "Ưu đãi suất tối 10.000đ": "Evening-show promotion · VND 10,000 off",
  "Ưu đãi học sinh sinh viên 10.000đ": "Student promotion · VND 10,000 off",
  "Ưu đãi gia đình 10.000đ": "Family promotion · VND 10,000 off",
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
  "Voucher thành viên 10.000đ": "Member voucher · VND 10,000 off",
  "Voucher cuối tuần 10.000đ": "Weekend voucher · VND 10,000 off",
  "Voucher sinh nhật 10.000đ": "Birthday voucher · VND 10,000 off",
  "Voucher đặt vé trực tuyến 10.000đ": "Online booking voucher · VND 10,000 off",
  "Voucher bắp nước 10.000đ": "Concessions voucher · VND 10,000 off",
  "Voucher suất tối 10.000đ": "Evening-show voucher · VND 10,000 off",
  "Voucher khách hàng thân thiết 10.000đ": "Loyal-customer voucher · VND 10,000 off",
  "Voucher gia đình 10.000đ": "Family voucher · VND 10,000 off",
  "Voucher học sinh sinh viên 10.000đ": "Student voucher · VND 10,000 off",
  "Voucher tri ân 10.000đ": "Appreciation voucher · VND 10,000 off",
  "Voucher giảm 20.000đ": "20,000 ₫ off voucher",
  "Giảm 20.000đ": "20,000 ₫ off",
  "Voucher giảm 10%": "10% off voucher",
});

export function voucherDisplayName(value: string | null | undefined, language: Language): string {
  const raw = String(value ?? "");
  if (language !== "en") return raw;
  const fixed = raw.match(/^Giảm\s+(\d{1,3}(?:\.\d{3})+|\d+)đ$/u);
  if (fixed) return `${fixed[1].replaceAll(".", ",")} ₫ off`;
  return VOUCHER_NAME_EN[raw] ?? raw;
}

export function pricingSignalPresentation(
  label: string | null | undefined,
  evidence: string | null | undefined,
  language: Language,
): { label: string; evidence: string } {
  const rawLabel=String(label??"");
  const rawEvidence=String(evidence??"");
  if(language!=="en")return {label:rawLabel,evidence:rawEvidence};
  const labels:Readonly<Record<string,string>>={
    "Mức lấp đầy":"Occupancy",
    "Tốc độ nhu cầu":"Demand velocity",
    "Thời gian tới suất chiếu":"Lead time to showtime",
  };
  let translatedEvidence=rawEvidence;
  let match=rawEvidence.match(/^Đã giữ\/đặt (\d+)\/(\d+) ghế \((.+)%\)$/u);
  if(match)translatedEvidence=`Reserved/booked ${match[1]}/${match[2]} seats (${match[3]}%)`;
  match=rawEvidence.match(/^(\d+) booking attempt trong 30 phút gần nhất$/u);
  if(match)translatedEvidence=`${match[1]} booking attempt${match[1]==="1"?"":"s"} in the last 30 minutes`;
  match=rawEvidence.match(/^Còn khoảng (.+) giờ tới giờ chiếu$/u);
  if(match)translatedEvidence=`About ${match[1]} hours until showtime`;
  return {label:labels[rawLabel]??rawLabel,evidence:translatedEvidence};
}

const STAFF_HANDOVER_EN:Readonly<Record<string,string>>=Object.freeze({
  "Bàn giao quầy vé, không còn giao dịch chờ.":"Ticket counter handed over; no transactions are pending.",
  "Bàn giao cổng soát vé, thiết bị hoạt động bình thường.":"Ticket gate handed over; equipment is operating normally.",
  "Bàn giao quầy bắp nước, tồn kho đã đối chiếu.":"Concessions counter handed over; inventory has been reconciled.",
  "Bàn giao phòng kỹ thuật, hệ thống ổn định.":"Technical room handed over; systems are stable.",
  "Bàn giao khu vực sảnh, không còn yêu cầu tồn đọng.":"Lobby handed over; no requests remain outstanding.",
  "Bàn giao chăm sóc khách hàng, các trường hợp đã cập nhật.":"Customer support handed over; cases have been updated.",
  "Bàn giao phòng chiếu, lịch suất tiếp theo đã kiểm tra.":"Auditorium handed over; the next show schedule has been checked.",
  "Bàn giao vận hành, checklist cuối ca đã hoàn tất.":"Operations handed over; the end-of-shift checklist is complete.",
  "Bàn giao kho, số lượng hàng đã đối soát.":"Inventory handed over; stock quantities have been reconciled.",
  "Bàn giao ca tối, không còn công việc khẩn cấp.":"Evening shift handed over; no urgent tasks remain.",
});

export function staffHandoverSummary(value:string|null|undefined,language:Language):string{
  const raw=String(value??"");
  return language==="en"?(STAFF_HANDOVER_EN[raw]??raw):raw;
}

const RELIABILITY_DETAIL_REPLACEMENTS_EN: ReadonlyArray<readonly [string, string]> = Object.freeze([
  ["Incident đang mở", "Open incident"],
  ["Tồn kho thấp", "Low stock"],
  ["Thiết bị degraded / quá lịch service", "Degraded equipment / service overdue"],
  ["Payment FAILED trong 60 phút", "FAILED payments in 60 minutes"],
  ["Hết tồn khả dụng", "No available stock"],
  ["Support quá SLA", "Support past SLA"],
]);

export function reliabilityIncidentPresentation(
  title: string | null | undefined,
  detail: string | null | undefined,
  language: Language,
): { title: string; detail: string } {
  const rawTitle=String(title??"");
  const rawDetail=String(detail??"");
  if(language!=="en") return {title:rawTitle,detail:rawDetail};
  const staff=staffIncidentPresentation(rawTitle,rawDetail,"",language);
  let translatedDetail=staff.description;
  for(const [source,target] of RELIABILITY_DETAIL_REPLACEMENTS_EN){
    translatedDetail=translatedDetail.replace(source,target);
  }
  return {title:staff.title,detail:translatedDetail};
}

const INVENTORY_MOVEMENT_NOTE_EN: Readonly<Record<string,string>> = Object.freeze({
  "Nhập kho chi nhánh": "Branch restock",
  "Ghi nhận hao hụt": "Waste recorded",
  "Kiểm kê điều chỉnh tồn": "Inventory count adjustment",
  "Giữ tồn kho tại rạp cho booking chờ thanh toán": "Inventory reserved at the cinema for a pending booking",
  "Xuất kho tại rạp khi thanh toán thành công": "Cinema inventory issued after successful payment",
  "Hoàn kho tại rạp do booking được hoàn tiền": "Cinema inventory restored after booking refund",
  "Booking hết hạn - trả tồn kho đã giữ": "Booking expired - reserved inventory released",
  "Booking bị huỷ - trả tồn kho đã giữ": "Booking cancelled - reserved inventory released",
  "Bổ sung tồn kho cho ca tối": "Restock for the evening shift",
  "Hao hụt ghi nhận khi kiểm kê cuối ca": "Waste recorded during the end-of-shift inventory count",
});

export function inventoryMovementNotePresentation(value:string|null|undefined,language:Language):string{
  const raw=String(value??"");
  if(language!=="en"||!raw)return raw;
  const exact=INVENTORY_MOVEMENT_NOTE_EN[raw];
  if(exact)return exact;
  let match=raw.match(/^Đổi điểm loyalty · (.+)$/u);
  if(match)return `Loyalty points redemption · ${match[1]}`;
  match=raw.match(/^Điều chuyển tồn kho giữa các rạp\s*([→←])\s*(.+)$/u);
  if(match)return `Inter-cinema inventory transfer ${match[1]} ${match[2]}`;
  if(raw==="Điều chuyển tồn kho giữa các rạp")return "Inter-cinema inventory transfer";
  return raw;
}

const SEEDED_REVIEW_COMMENT_EN: Readonly<Record<string,string>> = Object.freeze({
  "Nội dung cuốn hút, nhịp phim tốt.": "Engaging content with good pacing.",
  "Hình ảnh đẹp và âm thanh ấn tượng.": "Beautiful visuals and impressive sound.",
  "Diễn xuất tự nhiên, câu chuyện dễ theo dõi.": "Natural performances and an easy-to-follow story.",
  "Phim phù hợp để xem cùng gia đình.": "A good movie to watch with the family.",
  "Phần âm nhạc tạo cảm xúc tốt.": "The music creates a strong emotional impact.",
  "Kịch bản có nhiều chi tiết thú vị.": "The screenplay has many interesting details.",
  "Trải nghiệm phòng chiếu rất tốt.": "The auditorium experience was very good.",
  "Phim có tiết tấu ổn và kết thúc hợp lý.": "The movie has solid pacing and a fitting ending.",
  "Hình ảnh điện ảnh, đáng xem tại rạp.": "Cinematic visuals that are worth seeing in a theater.",
  "Một lựa chọn giải trí tốt cho cuối tuần.": "A good entertainment choice for the weekend.",
});

export function movieReviewCommentPresentation(value:string|null|undefined,language:Language):string{
  const raw=String(value??"");
  return language==="en"?(SEEDED_REVIEW_COMMENT_EN[raw]??raw):raw;
}

const AUDIT_DETAIL_EXACT_EN: Readonly<Record<string,string>> = Object.freeze({
  "Incident đang mở": "Open incident",
  "Tồn kho thấp": "Low stock",
  "Thiết bị degraded / quá lịch service": "Degraded equipment / service overdue",
  "Hết tồn khả dụng": "No available stock",
  "Support quá SLA": "Support past SLA",
  "Đăng nhập thành công": "Signed in successfully",
  "Đăng xuất phiên": "Session signed out",
  "Đăng ký tài khoản": "Account registered",
  "Sai email hoặc mật khẩu": "Invalid email or password",
  "Tài khoản đã bị vô hiệu hoá": "Account is disabled",
  "Admin mở QR vé": "Admin opened ticket QR",
  "Đã kiểm tra mã vé, hướng dẫn khách quét lại và xác nhận vào rạp thành công": "The ticket code was checked, the customer was guided to scan again, and entry was confirmed successfully",
});

function auditoriumPrefixInAudit(value:string):string{
  return value.replace(/(^| · )Phòng (\d+)(?=$| · )/gu, (_m,prefix:string,no:string)=>`${prefix}Room ${no}`);
}

export function auditDetailPresentation(value:string|null|undefined,language:Language):string{
  const raw=String(value??"");
  if(language!=="en"||!raw)return raw;
  let match=raw.match(/^V68 step-up được cấp trong (\d+) giây$/u);
  if(match)return `V68 step-up granted for ${match[1]} seconds`;
  match=raw.match(/^([A-Z_]+) · (.+) · count=(\d+)$/u);
  if(match){
    let detail=match[2];
    detail=AUDIT_DETAIL_EXACT_EN[detail]??detail;
    const payment=detail.match(/^Payment FAILED trong (\d+) phút$/u);
    if(payment)detail=`FAILED payments in ${payment[1]} minutes`;
    return `${match[1]} · ${detail} · count=${match[3]}`;
  }
  const incidentCreate=raw.match(/^(MEDIUM|HIGH|LOW|CRITICAL) · (CUSTOMER|STAFF|SYSTEM) · (Khách cần hỗ trợ tại cổng soát vé(?:\s+.+)?)$/u);
  if(incidentCreate){
    const translated=staffIncidentPresentation(incidentCreate[3],"","",language).title;
    return `${incidentCreate[1]} · ${incidentCreate[2]} · ${translated}`;
  }
  const exact=AUDIT_DETAIL_EXACT_EN[raw];
  if(exact)return exact;
  match=raw.match(/^Payment FAILED trong (\d+) phút$/u);
  if(match)return `FAILED payments in ${match[1]} minutes`;
  const localizedAuditorium=auditoriumPrefixInAudit(raw);
  if(localizedAuditorium!==raw)return localizedAuditorium;
  return raw;
}
