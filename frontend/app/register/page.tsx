"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { api } from "@/lib/api";
import { setAuth } from "@/lib/auth";
import { isStrongPassword } from "@/lib/password";
import PasswordInput from "@/components/PasswordInput";
import PasswordStrength from "@/components/PasswordStrength";
import type { AuthResponse } from "@/lib/types";

export default function Register() {
  const [fullName, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const validPassword = isStrongPassword(password);
  const passwordsMatch = password.length > 0 && password === confirm;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!validPassword) {
      setError("Mật khẩu phải có chữ hoa, chữ thường, số và ký tự đặc biệt.");
      return;
    }
    if (!passwordsMatch) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }
    setLoading(true);
    try {
      const r = await api<AuthResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ fullName, email, password }),
      });
      setAuth(r);
      location.href = "/";
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md card p-7">
      <h1 className="text-3xl font-bold">Tạo tài khoản</h1>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <input className="input" value={fullName} onChange={e => setName(e.target.value)} placeholder="Họ và tên" required />
        <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" autoComplete="email" required />
        <PasswordInput label="Mật khẩu" value={password} onChange={e => setPassword(e.target.value)} placeholder="Nhập mật khẩu" autoComplete="new-password" minLength={8} maxLength={100} required />
        <PasswordInput label="Xác nhận mật khẩu" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Nhập lại mật khẩu" autoComplete="new-password" minLength={8} maxLength={100} required />
        <PasswordStrength password={password} confirmPassword={confirm} showMatch />
        {error && <p className="text-sm text-red-300">{error}</p>}
        <button disabled={loading || !validPassword || !passwordsMatch} className="btn btn-primary w-full">{loading ? "Đang tạo..." : "Đăng ký"}</button>
      </form>
      <p className="mt-5 text-sm text-slate-400">Đã có tài khoản? <Link className="text-rose-400" href="/login">Đăng nhập</Link></p>
    </div>
  );
}
