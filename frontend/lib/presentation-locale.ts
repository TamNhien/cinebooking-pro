export function presentationLocale(): "vi-VN" | "en-US" {
  if (typeof document !== "undefined" && document.documentElement.lang === "en") return "en-US";
  return "vi-VN";
}
