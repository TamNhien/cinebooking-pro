"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { setAuth } from "@/lib/auth";
import PasswordInput from "@/components/PasswordInput";
import type { AuthResponse } from "@/lib/types";

function safeReturnTo(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const reason = new URLSearchParams(window.location.search).get("reason");
    if (reason === "expired") setNotice("Phiên đăng nhập cũ không còn hợp lệ. Vui lòng đăng nhập lại.");
    else if (reason === "required") setNotice("Vui lòng đăng nhập để tiếp tục.");
    else if (reason === "admin") setNotice("Tài khoản hiện tại không có quyền quản trị.");
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const r = await api<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      setAuth(r);
      const params = new URLSearchParams(window.location.search);
      const returnTo = safeReturnTo(params.get("returnTo"));
      location.href = returnTo || (r.role === "ADMIN" ? "/admin" : "/");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md card p-7">
      <h1 className="text-3xl font-bold">Đăng nhập</h1>
      <p className="mt-2 text-sm text-slate-400">Đăng nhập để đặt vé, quản lý vé và thông tin cá nhân.</p>
      {notice && <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">{notice}</div>}
      <form onSubmit={submit} className="mt-6 space-y-4">
        <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" autoComplete="email" required />
        <PasswordInput value={password} onChange={e => setPassword(e.target.value)} placeholder="Mật khẩu" autoComplete="current-password" required />
        {error && <p className="text-sm text-red-300">{error}</p>}
        <button disabled={loading} className="btn btn-primary w-full">{loading ? "Đang đăng nhập..." : "Đăng nhập"}</button>
      </form>
      <div className="mt-5 flex flex-wrap justify-between gap-3 text-sm">
        <Link className="text-rose-400" href="/register">Tạo tài khoản</Link>
        <Link className="text-slate-300 hover:text-white" href="/forgot-password">Quên mật khẩu?</Link>
      </div>
    </div>
  );
}
