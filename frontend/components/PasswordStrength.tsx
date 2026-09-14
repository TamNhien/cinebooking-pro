"use client";

import { passwordChecks, passwordStrength } from "@/lib/password";
import { usePresentationLanguage } from "@/lib/usePresentationLanguage";

type Props = {
  password: string;
  confirmPassword?: string;
  showMatch?: boolean;
};

const levelClass = [
  "bg-slate-700",
  "bg-red-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-cyan-400",
];

export default function PasswordStrength({ password, confirmPassword = "", showMatch = false }: Props) {
  const { language, t } = usePresentationLanguage();
  const checks = passwordChecks(password);
  const strength = passwordStrength(password);
  const segments = strength.level;
  const match = showMatch && confirmPassword.length > 0 ? password === confirmPassword : null;

  const requirements = [
    [checks.length, t("Ít nhất 8 ký tự","At least 8 characters")],
    [checks.upper, t("Có chữ hoa (A-Z)","Includes an uppercase letter (A-Z)")],
    [checks.lower, t("Có chữ thường (a-z)","Includes a lowercase letter (a-z)")],
    [checks.number, t("Có chữ số (0-9)","Includes a number (0-9)")],
    [checks.special, t("Có ký tự đặc biệt (!@#$...)","Includes a special character (!@#$...)")],
  ] as const;
  const strengthLabel = language === "en"
    ? ({ "Chưa nhập":"Not entered", "Yếu":"Weak", "Trung bình":"Medium", "Mạnh":"Strong", "Rất mạnh":"Very strong" }[strength.label] ?? strength.label)
    : strength.label;

  return (
    <div className="space-y-3 rounded-xl border border-slate-700/80 bg-slate-950/35 p-4" aria-live="polite">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-slate-400">{t("Độ mạnh mật khẩu","Password strength")}</span>
        <span className="font-semibold text-slate-100">{strengthLabel}</span>
      </div>
      <div className="grid grid-cols-4 gap-1.5" aria-hidden="true">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className={`h-1.5 rounded-full ${i <= segments ? levelClass[strength.level] : "bg-slate-800"}`} />
        ))}
      </div>
      <div className="grid gap-1.5 text-xs sm:grid-cols-2">
        {requirements.map(([ok, label]) => (
          <div key={label} className={ok ? "text-emerald-300" : "text-slate-500"}>
            <span className="mr-1.5" aria-hidden="true">{ok ? "✓" : "○"}</span>{label}
          </div>
        ))}
      </div>
      {showMatch && (
        <div className={`text-sm font-medium ${match === null ? "text-slate-500" : match ? "text-emerald-300" : "text-red-300"}`}>
          {match === null ? t("Nhập lại mật khẩu để kiểm tra trùng khớp.","Re-enter the password to verify the match.") : match ? t("✓ Hai mật khẩu trùng khớp.","✓ Passwords match.") : t("✕ Mật khẩu xác nhận chưa trùng khớp.","✕ Confirmation password does not match.")}
        </div>
      )}
    </div>
  );
}
