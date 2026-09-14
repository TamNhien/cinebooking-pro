"use client";

import { useLanguage } from "@/components/LanguageProvider";

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  return (
    <div className="language-switcher-wrap" aria-label={language === "vi" ? "Bộ chọn ngôn ngữ" : "Language selector"} data-i18n-skip="true">
      <div className="language-switcher" role="group" aria-label={language === "vi" ? "Ngôn ngữ" : "Language"}>
        <button
          type="button"
          className={`language-option ${language === "vi" ? "active" : ""}`}
          onClick={() => setLanguage("vi")}
          aria-pressed={language === "vi"}
          title="Tiếng Việt"
          data-testid="language-switch-vi"
        >
          VN
        </button>
        <button
          type="button"
          className={`language-option ${language === "en" ? "active" : ""}`}
          onClick={() => setLanguage("en")}
          aria-pressed={language === "en"}
          title="English"
          data-testid="language-switch-en"
        >
          EN
        </button>
      </div>
      <div className="language-dots" aria-hidden="true">
        <span/><span/><span/><span/><span/><span/>
      </div>
    </div>
  );
}
