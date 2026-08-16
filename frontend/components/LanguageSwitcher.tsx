"use client";

import { useLanguage } from "@/components/LanguageProvider";

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  return (
    <div className="language-switcher-wrap" aria-label="Language selector">
      <div className="language-switcher" role="group" aria-label="Language">
        <button
          type="button"
          className={`language-option ${language === "vi" ? "active" : ""}`}
          onClick={() => setLanguage("vi")}
          aria-pressed={language === "vi"}
          title="Tiếng Việt"
        >
          VN
        </button>
        <button
          type="button"
          className={`language-option ${language === "en" ? "active" : ""}`}
          onClick={() => setLanguage("en")}
          aria-pressed={language === "en"}
          title="English"
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
