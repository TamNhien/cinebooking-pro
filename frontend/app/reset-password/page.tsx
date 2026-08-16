"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, FormEvent, useState } from "react";
import { api } from "@/lib/api";
import { isStrongPassword } from "@/lib/password";
import PasswordInput from "@/components/PasswordInput";
import PasswordStrength from "@/components/PasswordStrength";

function Inner() {
  const q = useSearchParams();
  const token = q.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const validPassword = isStrongPassword(password);
  const passwordsMatch = password.length > 0 && password === confirm;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr("");
    setMsg("");
    if (!validPassword) {
      setErr("Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.");
      return;
    }
    if (!passwordsMatch) {
      setErr("Mật khẩu xác nhận không khớp.");
      return;
    }
    setBusy(true);
    try {
      await api("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, newPassword: password }),
      });
      setMsg("Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.");
      setPassword("");
      setConfirm("");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md card p-7">
      <h1 className="text-3xl font-bold">Đặt lại mật khẩu</h1>
      <p className="mt-2 text-sm text-slate-400">Tạo mật khẩu mới đủ mạnh để bảo vệ tài khoản.</p>
      {!token ? (
        <p className="mt-4 text-red-300">Liên kết đặt lại mật khẩu thiếu token hoặc không hợp lệ.</p>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4">
          <PasswordInput
            label="Mật khẩu mới"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Nhập mật khẩu mới"
            autoComplete="new-password"
            minLength={8}
            maxLength={100}
            required
          />
          <PasswordInput
            label="Xác nhận mật khẩu"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="Nhập lại mật khẩu mới"
            autoComplete="new-password"
            minLength={8}
            maxLength={100}
            required
          />
          <PasswordStrength password={password} confirmPassword={confirm} showMatch />
          <button disabled={busy || !validPassword || !passwordsMatch} className="btn btn-primary w-full">
            {busy ? "Đang cập nhật..." : "Đặt lại mật khẩu"}
          </button>
        </form>
      )}
      {err && <p className="mt-4 text-red-300 text-sm">{err}</p>}
      {msg && <p className="mt-4 text-emerald-300 text-sm">{msg}</p>}
      <p className="mt-5 text-sm"><Link className="text-rose-400" href="/login">Quay lại đăng nhập</Link></p>
    </div>
  );
}

export default function ResetPassword() {
  return <Suspense fallback={<div>Đang tải...</div>}><Inner /></Suspense>;
}
