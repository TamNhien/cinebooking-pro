"use client";

import { useCallback } from "react";
import { useLanguage, type Language } from "@/components/LanguageProvider";

export type { Language } from "@/components/LanguageProvider";

export function usePresentationLanguage() {
  // V77.0.20: LanguageProvider owns the single external-store snapshot. Do not
  // create a second localStorage/document store here; two stores can converge
  // in a different order during hard navigation and briefly render mixed copy.
  const { language, setLanguage } = useLanguage();

  const t = useCallback(
    (vi: string, en: string) => (language === "en" ? en : vi),
    [language],
  );
  const locale = language === "en" ? "en-US" : "vi-VN";

  return { language: language as Language, locale, setLanguage, t };
}
