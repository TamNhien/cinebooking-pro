"use client";

import { useLayoutEffect } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { LEGACY_INTERACTIVE_UI_EN } from "@/lib/interactive-ui-translations";
import { V77_0_42_PRESENTATION_UI_EN } from "@/lib/presentation-ui-translations-v77-0-42";
import { V77_0_43_PRESENTATION_UI_EN } from "@/lib/presentation-ui-translations-v77-0-43";
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
  const exact = LEGACY_INTERACTIVE_UI_EN[core] ?? V77_0_43_PRESENTATION_UI_EN[core] ?? V77_0_42_PRESENTATION_UI_EN[core] ?? VI_LABEL_TO_EN[core];
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
    return () => observer.disconnect();
  }, [language]);

  return null;
}
