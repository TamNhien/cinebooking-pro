"use client";

export default function LanguageSwitcher() {
  return (
    <div className="language-switcher-wrap" aria-label="Ngôn ngữ giao diện">
      <div className="language-switcher" role="group" aria-label="Ngôn ngữ">
        <button
          type="button"
          className="language-option active"
          aria-pressed="true"
          title="Tiếng Việt"
          disabled
        >
          VN
        </button>
      </div>
      <div className="language-dots" aria-hidden="true">
        <span/><span/><span/><span/><span/><span/>
      </div>
    </div>
  );
}
