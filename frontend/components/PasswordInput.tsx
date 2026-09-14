"use client";

import { InputHTMLAttributes, useState } from "react";
import { usePresentationLanguage } from "@/lib/usePresentationLanguage";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: string;
};

export default function PasswordInput({ label, className = "", ...props }: Props) {
  const [visible, setVisible] = useState(false);
  const { t } = usePresentationLanguage();
  return (
    <div>
      {label && <label className="mb-1.5 block text-sm text-slate-300">{label}</label>}
      <div className="relative">
        <input
          {...props}
          type={visible ? "text" : "password"}
          className={`input pr-20 ${className}`}
        />
        <button
          type="button"
          className="absolute inset-y-0 right-2 my-auto h-9 rounded-lg px-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
          onClick={() => setVisible(v => !v)}
          aria-label={visible ? t("Ẩn mật khẩu","Hide password") : t("Hiện mật khẩu","Show password")}
          aria-pressed={visible}
        >
          {visible ? t("Ẩn","Hide") : t("Hiện","Show")}
        </button>
      </div>
    </div>
  );
}
