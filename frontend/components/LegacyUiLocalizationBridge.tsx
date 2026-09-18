"use client";

import { useLayoutEffect } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { LEGACY_INTERACTIVE_UI_EN } from "@/lib/interactive-ui-translations";
import { V77_0_42_PRESENTATION_UI_EN } from "@/lib/presentation-ui-translations-v77-0-42";
import { V77_0_43_PRESENTATION_UI_EN } from "@/lib/presentation-ui-translations-v77-0-43";
import { V78_0_13_PRESENTATION_UI_EN } from "@/lib/presentation-ui-translations-v78-0-13";
import { V78_FULL_SOURCE_UI_EN } from "@/lib/presentation-ui-translations-v78";
import { VI_LABEL_TO_EN } from "@/lib/vi-labels";

const ATTRS = ["aria-label", "title", "placeholder", "alt"] as const;
const originalText = new WeakMap<Text, string>();
const originalAttrs = new WeakMap<Element, Map<string, string>>();
let applying = false;

function preserveOuterWhitespace(original: string, translatedCore: string) {
  const leading = original.match(/^\s*/)?.[0] ?? "";
  const trailing = original.match(/\s*$/)?.[0] ?? "";
  return `${leading}${translatedCore}${trailing}`;
}

function patternTranslation(core: string): string | null {
  const rules: Array<[RegExp, (...parts: string[]) => string]> = [
    [/^Mã đặt vé #(.*)$/u, rest => `Booking code #${rest}`],
    [/^MÃ ĐẶT VÉ #(.*)$/u, rest => `BOOKING CODE #${rest}`],
    [/^Mã giao dịch:\s*(.*)$/u, rest => `Transaction ID: ${rest}`],
    [/^Bởi\s+(.+)$/u, rest => `By ${rest}`],
    [/^Mã (.+) đã tồn tại$/u, code => `Code ${code} already exists`],
    [/^Trạng thái đặt vé:\s*(.*)$/u, rest => `Booking status: ${rest}`],
    [/^Ghế\s+(.+)$/u, rest => `Seats ${rest}`],
    [/^(\d+(?:[.,]\d+)?)\s+phút$/u, n => `${n} minutes`],
    [/^(\d+(?:[.,]\d+)?)\s+ngày$/u, n => `${n} days`],
    [/^(\d+)\s+đánh giá$/u, n => `${n} reviews`],
    [/^Đã soát vé\s+(.+)$/u, rest => `Checked in ${rest}`],
    [/^Mức hoàn:\s*(.+)$/u, rest => `Refund amount: ${rest}`],
    [/^Hạn phản hồi\s+(.+)$/u, rest => `Response due ${rest}`],
    [/^Tạo lúc\s+(.+)$/u, rest => `Generated at ${rest}`],
    [/^Hiển thị\s+(.+)$/u, rest => `Showing ${rest}`],
    [/^Tổng\s+(.+)$/u, rest => `Total ${rest}`],
    [/^Đã hủy lần thanh toán #(\d+)\. Booking vẫn được giữ đến khi hết hạn\.$/u, n => `Payment attempt #${n} was cancelled. The booking remains held until expiry.`],
    [/^Đã quét (\d+) giao dịch đến hạn: (\d+) thành công, (\d+) lỗi\.$/u, (scanned, succeeded, failed) => `Scanned ${scanned} due transactions: ${succeeded} succeeded, ${failed} failed.`],
    [/^Mã (.+) đã tồn tại\. Hãy bấm Sửa mã hiện có hoặc nhập một mã mới\.$/u, code => `Code ${code} already exists. Edit the existing code or enter a new one.`],
    [/^Mã (.+) đã tồn tại$/u, code => `Code ${code} already exists`],
    [/^Test (.+) thành công: giảm (.+)\.$/u, (code, amount) => `Test ${code} succeeded: discount ${amount}.`],
    [/^Xem trước (.+): (\d+)\/(\d+) khách có thể nhận chiến dịch\.$/u, (code, contactable, eligible) => `Preview ${code}: ${contactable}/${eligible} customers can receive the campaign.`],
    [/^Đã thực thi (.+): (\d+) thông báo mới, (\d+) khách được cơ chế loại trừ bảo vệ\.$/u, (code, notifications, suppressed) => `Executed ${code}: ${notifications} new notifications, ${suppressed} customers protected by suppression rules.`],
    [/^Ưu tiên (.+)$/u, id => `Priority ${id}`],
    [/^Phụ trách (.+)$/u, id => `Assignee ${id}`],
    [/^ · Đặt vé (.+)$/u, id => ` · Booking ${id}`],
    [/^ · (.+) điểm$/u, points => ` · ${points} points`],
    [/^ · hạn (.+)$/u, date => ` · expires ${date}`],
    [/^ · hết hạn (.+)$/u, date => ` · expires ${date}`],
    [/^ · lần gần nhất kiểm tra (\d+) vé$/u, n => ` · last checked ${n} tickets`],
    [/^ · trễ (\d+) phút$/u, n => ` · ${n} minutes late`],
    [/^ · tối đa (.+)$/u, amount => ` · maximum ${amount}`],
    [/^(\d+(?:[.,]\d+)?) giờ$/u, n => `${n} hours`],
    [/^(\d+(?:[.,]\d+)?) cặp rạp\/sản phẩm$/u, n => `${n} cinema/product pairs`],
    [/^(\d+) vấn đề · (\d+) tài khoản thành viên$/u, (issues, users) => `${issues} issues · ${users} loyalty accounts`],
    [/^(\d+) booking hoàn tiền trong 30 ngày$/u, n => `${n} refunded bookings in 30 days`],
    [/^(\d+) cảnh báo bảo mật trong 7 ngày$/u, n => `${n} security alerts in 7 days`],
    [/^(\d+) lượt dùng mã ưu đãi trong 24 giờ$/u, n => `${n} voucher redemptions in 24 hours`],
    [/^(\d+) lượt đặt vé trong 30 phút$/u, n => `${n} bookings in 30 minutes`],
    [/^(\d+) lần thanh toán thất bại trong 24 giờ$/u, n => `${n} failed payments in 24 hours`],
    [/^(\d+) lần thử thanh toán trong 24 giờ$/u, n => `${n} payment attempts in 24 hours`],
    [/^(\d+) lần đăng nhập thất bại trong 1 giờ$/u, n => `${n} failed logins in 1 hour`],
    [/^(\d+) địa chỉ IP đăng nhập khác nhau trong 24 giờ$/u, n => `${n} distinct login IP addresses in 24 hours`],
    [/^Còn (\d+) điểm → (.+)$/u, (points, tier) => `${points} points remaining → ${tier}`],
    [/^Giảm (.+)$/u, amount => `Discount ${amount}`],
    [/^Gỡ thiết bị (.+)\?$/u, device => `Remove device ${device}?`],
    [/^Không tải được dữ liệu bảo mật: (.+)$/u, error => `Unable to load security data: ${error}`],
    [/^Lô gần nhất hết hạn: (.+)$/u, date => `Nearest points expiry: ${date}`],
    [/^QR vé (.+)$/u, title => `Ticket QR ${title}`],
    [/^Thanh toán hiện ở trạng thái (.+)\.$/u, status => `Payment is currently ${VI_LABEL_TO_EN[status] ?? status}.`],
    [/^Trạng thái đặt vé: (.+)$/u, status => `Booking status: ${VI_LABEL_TO_EN[status] ?? status}`],
    [/^Đã bắt đầu\/tiếp tục xử lý phiếu “(.+)”\.$/u, title => `Started/resumed work order “${title}”.`],
    [/^Đã chuyển phiếu “(.+)” sang trạng thái đang bị chặn\.$/u, title => `Moved work order “${title}” to blocked status.`],
    [/^Đã cập nhật ngày sinh cho (.+)\.$/u, email => `Birth date updated for ${email}.`],
    [/^Đã hoàn tất phiếu bảo trì “(.+)”\.$/u, title => `Completed maintenance work order “${title}”.`],
    [/^Đã hủy phiếu bảo trì “(.+)”\.$/u, title => `Cancelled maintenance work order “${title}”.`],
    [/^Đã hoàn vé tự động (.+)\. Ghế đã được mở bán lại\.$/u, amount => `Automatic refund completed: ${amount}. Seats are available for sale again.`],
    [/^Đã sao chép mã booking (.+)\.$/u, id => `Copied booking code ${id}.`],
    [/^Đã tạo (.+)\.$/u, key => `Created ${key}.`],
    [/^Đã điều chuyển (\d+) (.+) đến (.+)\. Mã (.+)$/u, (qty, product, cinema, ref) => `Transferred ${qty} ${product} to ${cinema}. Reference ${ref}`],
    [/^Đã đăng xuất (\d+) phiên trên thiết bị khác\.$/u, n => `Signed out ${n} sessions on other devices.`],
    [/^Đã đối soát: (\d+) hold hết hạn · (\d+) hold đang hoạt động · (\d+) Bản sao Redis\.$/u, (expired, active, mirrored) => `Reconciled: ${expired} expired holds · ${active} active holds · ${mirrored} Redis mirrors.`],
    [/^Đã đổi điểm\. Voucher: (.+)$/u, code => `Points redeemed. Voucher: ${code}`],
    [/^Đã đổi điểm\. Mã nhận quà: (.+)$/u, code => `Points redeemed. Reward code: ${code}`],
    [/^Đã quét hạn điểm\. Hết hạn (\d+) điểm\.$/u, n => `Points expiry scan complete. ${n} points expired.`],
    [/^Đã lưu (\d+) vị trí ghế\.$/u, n => `Saved ${n} seat positions.`],
    [/^Đối soát phát hiện (\d+) vấn đề cần kiểm tra\.$/u, n => `Reconciliation found ${n} issues requiring review.`],
    [/^Đồng bộ (\d+) vé: (\d+) hợp lệ, (\d+) cần đồng bộ lại, (\d+) chưa xác minh\.$/u, (checked, refreshed, stale, failed) => `Synced ${checked} tickets: ${refreshed} valid, ${stale} need resync, ${failed} unverified.`],
    [/^Đã kiểm tra (\d+) vé: (\d+) hợp lệ, (\d+) không còn hợp lệ, (\d+) chưa xác minh được\.$/u, (checked, refreshed, stale, failed) => `Checked ${checked} tickets: ${refreshed} valid, ${stale} no longer valid, ${failed} could not be verified.`],
    [/^Đối soát cổng thanh toán: quét (\d+), thành công (\d+), lỗi (\d+)\.$/u, (scanned, succeeded, failed) => `Gateway reconciliation: scanned ${scanned}, ${succeeded} succeeded, ${failed} failed.`],
    [/^Khôi phục thông báo máy chủ: quét (\d+), đã khôi phục (\d+), đang chờ (\d+), thư chết (\d+)\.$/u, (scanned, recovered, pending, dead) => `Webhook recovery: scanned ${scanned}, recovered ${recovered}, pending ${pending}, dead-letter ${dead}.`],
    [/^📋 Đã sao chép mã đặt vé (.+)\.$/u, id => `📋 Copied booking code ${id}.`],
    [/^📅 Đã tải lịch suất chiếu \(\.ics\)\.$/u, () => `📅 Showtime calendar (.ics) downloaded.`],
    [/^, tối đa (.+)$/u, amount => `, maximum ${amount}`],
    [/^Chính sách hoàn vé (.+)$/u, id => `Refund policy ${id}`],
    [/^Chưa nhận · hết hạn (.+)$/u, date => `Not claimed · expires ${date}`],
    [/^Ghế (.+)$/u, code => `Seat ${code}`],
    [/^Phát hành chiến dịch (.+) cho (\d+) khách\? Mỗi khách sẽ nhận 1 voucher cá nhân và thông báo theo tùy chọn promotion\.$/u, (code, count) => `Launch campaign ${code} to ${count} customers? Each customer will receive one personal voucher and a notification according to promotion preferences.`],
    [/^Đã bắt đầu\/tiếp tục xử lý phiếu “(.+)”\.$/u, title => `Started/resumed work order “${title}”.`],
    [/^Đã kết thúc ca · làm (.+)$/u, detail => `Shift ended · worked ${detail}`],
    [/^Đã nhận (.*)$/u, date => `Claimed ${date}`],
    [/^⛔ Bản vé ngoại tuyến này đã bị máy chủ đánh dấu không còn hợp lệ: (.+)$/u, reason => `⛔ The server marked this offline ticket copy as invalid: ${reason}`],
    [/^(.+): kết quả redirect không hợp lệ\. Trạng thái thanh toán không được thay đổi từ trình duyệt\.$/u, provider => `${provider}: invalid redirect result. Payment status cannot be changed from the browser.`],
    [/^(.+): không tìm thấy payment tương ứng\.$/u, provider => `${provider}: matching payment not found.`],
    [/^(.+): redirect hợp lệ\. Đang chờ xác nhận server-to-server\.\.\.$/u, provider => `${provider}: valid redirect. Waiting for server-to-server confirmation...`],
    [/^(.+): (\d+) lượt · (.+)$/u, (seat, bookings, revenue) => `${seat}: ${bookings} bookings · ${revenue}`],
    [/^(.+): (đã tạm dừng|đã kích hoạt)\.$/u, (name, state) => `${name}: ${state === "đã tạm dừng" ? "paused" : "activated"}.`],
    [/^(Khôi phục thành công|Khôi phục chưa hoàn tất): (.+) · (.+)$/u, (state, delivery, message) => `${state === "Khôi phục thành công" ? "Recovery succeeded" : "Recovery incomplete"}: ${delivery} · ${message}`],
    [/^(.+) Mã: (.+)$/u, (message, code) => `${message} Code: ${code}`],
    [/^Đã cập nhật ngày sinh cho (.+)\.$/u, email => `Birth date updated for ${email}.`],
    [/^Điểm rủi ro bảo mật cao nhất (.+)$/u, score => `maximum security risk score ${score}`],
  ];
  for (const [pattern, render] of rules) {
    const match = core.match(pattern);
    if (match) return render(...match.slice(1));
  }
  return null;
}

export function translateLegacyUiCopy(value: string): string {
  const core = value.trim();
  if (!core) return value;
  const exact = V78_0_13_PRESENTATION_UI_EN[core] ?? V78_FULL_SOURCE_UI_EN[core] ?? LEGACY_INTERACTIVE_UI_EN[core] ?? V77_0_43_PRESENTATION_UI_EN[core] ?? V77_0_42_PRESENTATION_UI_EN[core] ?? VI_LABEL_TO_EN[core];
  if (exact) return preserveOuterWhitespace(value, exact);
  const patterned = patternTranslation(core);
  return patterned ? preserveOuterWhitespace(value, patterned) : value;
}

function skipNode(node: Node) {
  const parent = node.nodeType === Node.ELEMENT_NODE ? node as Element : node.parentElement;
  return Boolean(parent?.closest("script,style,code,pre,[data-i18n-skip='true']"));
}

function translateTextNode(node: Text) {
  if (skipNode(node)) return;
  const current = node.nodeValue ?? "";
  const saved = originalText.get(node);
  if (saved == null) {
    const firstTranslation = translateLegacyUiCopy(current);
    if (firstTranslation === current) return;
    originalText.set(node, current);
  } else if (!applying && current !== translateLegacyUiCopy(saved)) {
    const nextTranslation = translateLegacyUiCopy(current);
    if (nextTranslation === current) return;
    originalText.set(node, current);
  }
  const base = originalText.get(node) ?? current;
  const translated = translateLegacyUiCopy(base);
  if (translated !== current) node.nodeValue = translated;
}

function restoreTextNode(node: Text) {
  const saved = originalText.get(node);
  if (saved != null && node.nodeValue !== saved) node.nodeValue = saved;
}

function translateAttributes(element: Element) {
  if (skipNode(element)) return;
  let saved = originalAttrs.get(element);
  if (!saved) {
    saved = new Map<string, string>();
    originalAttrs.set(element, saved);
  }
  for (const attr of ATTRS) {
    const current = element.getAttribute(attr);
    if (current == null) continue;
    const old = saved.get(attr);
    if (old == null) {
      const firstTranslation = translateLegacyUiCopy(current);
      if (firstTranslation === current) continue;
      saved.set(attr, current);
    } else if (!applying && current !== translateLegacyUiCopy(old)) {
      const nextTranslation = translateLegacyUiCopy(current);
      if (nextTranslation === current) continue;
      saved.set(attr, current);
    }
    const base = saved.get(attr) ?? current;
    const translated = translateLegacyUiCopy(base);
    if (translated !== current) element.setAttribute(attr, translated);
  }
}

function restoreAttributes(element: Element) {
  const saved = originalAttrs.get(element);
  if (!saved) return;
  for (const [attr, value] of saved) {
    if (element.getAttribute(attr) !== value) element.setAttribute(attr, value);
  }
}

function walk(root: ParentNode, mode: "en" | "vi") {
  applying = true;
  try {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let current: Node | null = walker.nextNode();
    while (current) {
      if (mode === "en") translateTextNode(current as Text);
      else restoreTextNode(current as Text);
      current = walker.nextNode();
    }
    const elements: Element[] = [];
    if (root instanceof Element) elements.push(root);
    elements.push(...Array.from(root.querySelectorAll("[aria-label],[title],[placeholder],[alt]")));
    for (const element of elements) {
      if (mode === "en") translateAttributes(element);
      else restoreAttributes(element);
    }
  } finally {
    applying = false;
  }
}

/**
 * V77.0.43 compatibility bridge.
 *
 * New/actively maintained surfaces should keep using usePresentationLanguage().
 * This bridge makes older static controls react to the global VN/EN selector while
 * they are migrated, without translating machine enums, backend payloads, movie
 * titles, customer data, or arbitrary text. Only source-audited catalog entries
 * and a few deterministic UI patterns are translated.
 */
export default function LegacyUiLocalizationBridge() {
  const { language } = useLanguage();

  useLayoutEffect(() => {
    walk(document.body, language);

    // V78: native dialogs are outside the DOM, so the mutation bridge cannot
    // localize them. Keep the original browser functions and translate only
    // source-owned UI copy when EN is active. Dynamic business values captured
    // by audited patterns stay intact.
    const nativeAlert = window.alert.bind(window);
    const nativeConfirm = window.confirm.bind(window);
    const nativePrompt = window.prompt.bind(window);
    window.alert = (message?: unknown) =>
      nativeAlert(language === "en" ? translateLegacyUiCopy(String(message ?? "")) : String(message ?? ""));
    window.confirm = (message?: string) =>
      nativeConfirm(language === "en" ? translateLegacyUiCopy(String(message ?? "")) : String(message ?? ""));
    window.prompt = (message?: string, defaultValue?: string) =>
      nativePrompt(language === "en" ? translateLegacyUiCopy(String(message ?? "")) : String(message ?? ""), defaultValue);

    const observer = new MutationObserver(mutations => {
      if (applying) return;
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          const text = mutation.target as Text;
          if (language === "en") translateTextNode(text);
          else restoreTextNode(text);
          continue;
        }
        if (mutation.type === "attributes") {
          const element = mutation.target as Element;
          if (language === "en") translateAttributes(element);
          else restoreAttributes(element);
          continue;
        }
        for (const added of Array.from(mutation.addedNodes)) {
          if (!(added instanceof Element) && !(added instanceof Text)) continue;
          if (added instanceof Text) {
            if (language === "en") translateTextNode(added);
            else restoreTextNode(added);
          } else {
            walk(added, language);
          }
        }
      }
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...ATTRS],
    });
    return () => {
      observer.disconnect();
      window.alert = nativeAlert;
      window.confirm = nativeConfirm;
      window.prompt = nativePrompt;
    };
  }, [language]);

  return null;
}
