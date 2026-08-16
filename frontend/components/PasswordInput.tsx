"use client";

import { InputHTMLAttributes, useState } from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: string;
};

export default function PasswordInput({ label, className = "", ...props }: Props) {
  const [visible, setVisible] = useState(false);
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
          aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          aria-pressed={visible}
        >
          {visible ? "Ẩn" : "Hiện"}
        </button>
      </div>
    </div>
  );
}
