"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { api } from "@/lib/api";

type Resp = { message: string; devResetUrl?: string };

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [resp, setResp] = useState<Resp | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    setResp(null);
    try {
      setResp(await api<Resp>("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md card p-7">
      <h1 className="text-3xl font-bold">Quên mật khẩu</h1>
      <p className="mt-2 text-sm text-slate-400">Nhập email đã đăng ký. CineBooking sẽ gửi một liên kết đặt lại mật khẩu có thời hạn.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" autoComplete="email" required />
        <button disabled={busy} className="btn btn-primary w-full">{busy ? "Đang gửi email..." : "Gửi liên kết đặt lại mật khẩu"}</button>
      </form>
      {err && <p className="mt-4 text-sm text-red-300">{err}</p>}
      {resp && (
        <div className="mt-4 rounded-xl bg-emerald-950/40 p-4 text-sm text-emerald-200">
          <p>{resp.message}</p>
          <p className="mt-2 text-emerald-100/80">Nếu email đúng và tồn tại, hãy kiểm tra Hộp thư đến và cả thư mục Spam.</p>
          {resp.devResetUrl && <p className="mt-3">Chế độ phát triển: <a className="underline" href={resp.devResetUrl}>mở liên kết đặt lại mật khẩu</a>.</p>}
        </div>
      )}
      <p className="mt-5 text-sm text-slate-400"><Link className="text-rose-400" href="/login">Quay lại đăng nhập</Link></p>
    </div>
  );
}
