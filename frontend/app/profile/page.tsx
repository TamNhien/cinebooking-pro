"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { clearAuth, getAuth, setAuth } from "@/lib/auth";
import { isStrongPassword } from "@/lib/password";
import PasswordInput from "@/components/PasswordInput";
import PasswordStrength from "@/components/PasswordStrength";
import type { LoyaltyTransaction, UserProfile, SecuritySession, LoginSecurityEvent } from "@/lib/types";

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loyalty, setLoyalty] = useState<LoyaltyTransaction[]>([]);
  const [busy, setBusy] = useState(false);
  const [sessions, setSessions] = useState<SecuritySession[]>([]);
  const [loginEvents, setLoginEvents] = useState<LoginSecurityEvent[]>([]);
  const validPassword = isStrongPassword(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  useEffect(() => {
    // Always enter the account page at its real top on mobile. Some mobile browsers
    // restore the previous scroll offset after client-side navigation, which made the
    // first cards look as if they were hidden behind the sticky header.
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
    if (!getAuth()) {
      location.href = "/login";
      return;
    }
    Promise.all([api<UserProfile>("/me"), api<LoyaltyTransaction[]>("/loyalty/transactions")])
      .then(([p, tx]) => {
        setProfile(p);
        setName(p.fullName);
        setPhone(p.phone || "");
        setLoyalty(tx);
        Promise.all([api<SecuritySession[]>("/me/security/sessions"), api<LoginSecurityEvent[]>("/me/security/events")])
          .then(([ss, events]) => { setSessions(ss); setLoginEvents(events); })
          .catch(e => setMsg(`Không tải được dữ liệu bảo mật: ${e.message}`));
      })
      .catch(e => setMsg(e.message));
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      const p = await api<UserProfile>("/me", { method: "PUT", body: JSON.stringify({ fullName: name, phone }) });
      setProfile(p);
      const a = getAuth();
      if (a) setAuth({ ...a, fullName: p.fullName, email: p.email });
      setMsg("Đã cập nhật thông tin.");
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    setMsg("");
    if (!validPassword) {
      setMsg("Mật khẩu mới phải có chữ hoa, chữ thường, số và ký tự đặc biệt.");
      return;
    }
    if (!passwordsMatch) {
      setMsg("Mật khẩu xác nhận không khớp.");
      return;
    }
    setBusy(true);
    try {
      await api("/me/password", { method: "PUT", body: JSON.stringify({ currentPassword, newPassword }) });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMsg("Đã đổi mật khẩu.");
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function revokeSession(id: string, current: boolean) {
    if (!confirm(current ? "Thu hồi phiên hiện tại? Bạn sẽ phải đăng nhập lại." : "Đăng xuất thiết bị này?")) return;
    setBusy(true); setMsg("");
    try {
      await api(`/me/security/sessions/${id}`, { method: "DELETE" });
      if (current) { clearAuth(); location.href = "/login?reason=expired"; return; }
      setSessions(await api<SecuritySession[]>("/me/security/sessions"));
      setMsg("Đã thu hồi phiên đăng nhập.");
    } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  }

  async function revokeOtherSessions() {
    if (!confirm("Đăng xuất tất cả thiết bị khác và chỉ giữ phiên hiện tại?")) return;
    setBusy(true); setMsg("");
    try {
      const r = await api<{revoked:number}>("/me/security/sessions", { method: "DELETE" });
      setSessions(await api<SecuritySession[]>("/me/security/sessions"));
      setMsg(`Đã đăng xuất ${r.revoked} phiên trên thiết bị khác.`);
    } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  }

  if (!profile) return <div className="text-slate-400">Đang tải hồ sơ...</div>;

  return (
    <div className="profile-page mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tài khoản của tôi</h1>
        <p className="text-slate-400">Cập nhật thông tin cá nhân và mật khẩu.</p>
      </div>
      <section className="profile-member-grid grid gap-4 sm:grid-cols-3">
        <div className="card p-5 sm:col-span-2">
          <div className="text-xs font-bold tracking-[.2em] text-rose-400">CINEBOOKING MEMBER</div>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div><div className="text-2xl font-bold">Hạng {profile.membershipTier}</div><div className="mt-1 text-sm text-slate-400">Tích điểm tự động sau mỗi giao dịch thanh toán thành công.</div></div>
            <div className="text-right"><div className="text-3xl font-bold text-amber-400">{profile.loyaltyPoints}</div><div className="text-xs text-slate-400">điểm thành viên</div></div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-rose-500 to-amber-400" style={{width:`${Math.min(100, profile.membershipTier==="DIAMOND"?100:profile.membershipTier==="GOLD"?(profile.loyaltyPoints-1500)/25:profile.membershipTier==="SILVER"?(profile.loyaltyPoints-500)/10:profile.loyaltyPoints/5)}%`}}/></div>
          <div className="mt-2 text-xs text-slate-500">BRONZE · 500 SILVER · 1.500 GOLD · 4.000 DIAMOND</div>
        </div>
        <div className="card p-5"><div className="text-sm text-slate-400">Quy đổi hiện tại</div><div className="mt-2 text-xl font-bold">10.000đ = 1 điểm</div><p className="mt-2 text-xs leading-5 text-slate-500">Điểm được cộng một lần cho mỗi payment thành công, kể cả callback được gửi lại.</p></div>
      </section>


      <section className="card profile-card p-6">
        <div className="flex items-end justify-between gap-3"><div><h2 className="text-xl font-bold">Lịch sử điểm</h2><p className="mt-1 text-sm text-slate-400">Theo dõi điểm tích, điểm đã dùng và điểm được hoàn khi booking hết hạn.</p></div></div>
        <div className="mt-4 divide-y divide-slate-800">{loyalty.slice(0,12).map(tx => <div key={tx.id} className="flex items-center justify-between gap-4 py-3"><div><div className="font-semibold">{tx.type === "EARN" ? "Tích điểm" : tx.type === "REDEEM" ? "Dùng điểm" : "Hoàn điểm"}</div><div className="mt-1 text-xs text-slate-500">{tx.description || "Giao dịch thành viên"} · {new Date(tx.createdAt).toLocaleString("vi-VN")}</div></div><div className={`text-lg font-black ${tx.type === "REDEEM" ? "text-rose-300" : "text-emerald-300"}`}>{tx.type === "REDEEM" ? "-" : "+"}{tx.points}</div></div>)}{!loyalty.length&&<div className="py-5 text-sm text-slate-500">Chưa có giao dịch điểm.</div>}</div>
      </section>

      <form onSubmit={save} className="card profile-card p-6 space-y-4">
        <h2 className="text-xl font-bold">Thông tin cá nhân</h2>
        <div><label className="text-sm text-slate-400">Email</label><input className="input mt-1" value={profile.email} disabled /></div>
        <div><label className="text-sm text-slate-400">Họ và tên</label><input className="input mt-1" value={name} onChange={e => setName(e.target.value)} required /></div>
        <div><label className="text-sm text-slate-400">Số điện thoại</label><input className="input mt-1" value={phone} onChange={e => setPhone(e.target.value)} placeholder="09xxxxxxxx" /></div>
        <button disabled={busy} className="btn btn-primary">Lưu thay đổi</button>
      </form>


      <section className="card profile-card p-6 space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h2 className="text-xl font-bold">Bảo mật & thiết bị</h2><p className="mt-1 text-sm text-slate-400">Refresh token được xoay vòng. Phiên bị thu hồi sẽ mất quyền truy cập ngay cả khi access token chưa hết hạn.</p></div>
          <button type="button" disabled={busy || sessions.filter(s=>s.active&&!s.current).length===0} onClick={revokeOtherSessions} className="btn btn-secondary">Đăng xuất thiết bị khác</button>
        </div>
        <div className="space-y-3">
          {sessions.map(s => <div key={s.id} className={`rounded-2xl border p-4 ${s.current ? "border-emerald-500/40 bg-emerald-500/5" : "border-slate-800 bg-slate-950/40"}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><div className="font-bold">{s.deviceName} {s.current && <span className="ml-2 rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] font-black text-emerald-300">PHIÊN HIỆN TẠI</span>}</div><div className="mt-1 text-xs text-slate-500">IP {s.ipAddress || "—"} · xác thực {new Date(s.lastSeenAt).toLocaleString("vi-VN")}</div><div className="mt-1 text-xs text-slate-600">Hết hạn refresh: {new Date(s.expiresAt).toLocaleString("vi-VN")}</div>{!s.active&&<div className="mt-2 text-xs font-semibold text-rose-300">Đã thu hồi{s.revokeReason?` · ${s.revokeReason}`:""}</div>}</div>
              {s.active&&<button type="button" disabled={busy} onClick={()=>revokeSession(s.id,s.current)} className="btn btn-secondary !px-3 !py-2">{s.current?"Thu hồi phiên":"Đăng xuất"}</button>}
            </div>
          </div>)}
          {!sessions.length&&<div className="text-sm text-slate-500">Chưa có dữ liệu phiên.</div>}
        </div>
        <div>
          <h3 className="font-bold">Đăng nhập gần đây</h3>
          <div className="mt-3 divide-y divide-slate-800">{loginEvents.slice(0,8).map((e,i)=><div key={`${e.createdAt}-${i}`} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><div><b className={e.action==="LOGIN_SUCCESS"?"text-emerald-300":"text-rose-300"}>{e.action==="LOGIN_SUCCESS"?"Thành công":e.action==="LOGIN_BLOCKED"?"Bị chặn":"Thất bại"}</b><span className="ml-2 text-slate-500">{e.ipAddress||"—"}</span></div><span className="text-xs text-slate-500">{new Date(e.createdAt).toLocaleString("vi-VN")}</span></div>)}{!loginEvents.length&&<div className="py-3 text-sm text-slate-500">Chưa có lịch sử đăng nhập.</div>}</div>
        </div>
      </section>

      <form onSubmit={changePassword} className="card profile-card p-6 space-y-4">
        <h2 className="text-xl font-bold">Đổi mật khẩu</h2>
        <PasswordInput label="Mật khẩu hiện tại" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Mật khẩu hiện tại" autoComplete="current-password" required />
        <PasswordInput label="Mật khẩu mới" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Mật khẩu mới" autoComplete="new-password" minLength={8} maxLength={100} required />
        <PasswordInput label="Xác nhận mật khẩu mới" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Nhập lại mật khẩu mới" autoComplete="new-password" minLength={8} maxLength={100} required />
        <PasswordStrength password={newPassword} confirmPassword={confirmPassword} showMatch />
        <button disabled={busy || !validPassword || !passwordsMatch} className="btn btn-primary">Đổi mật khẩu</button>
      </form>
      {msg && <div className="card p-4 text-sm">{msg}</div>}
    </div>
  );
}
