"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { clearAuth, getAuth, setAuth } from "@/lib/auth";
import { isStrongPassword } from "@/lib/password";
import PasswordInput from "@/components/PasswordInput";
import PasswordStrength from "@/components/PasswordStrength";
import type { LoyaltyTransaction, LoyaltySummary, LoyaltyReward, LoyaltyRedemption, OwnedLoyaltyVoucher, BirthdayRewardResult, UserProfile, SecuritySession, LoginSecurityEvent } from "@/lib/types";

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loyalty, setLoyalty] = useState<LoyaltyTransaction[]>([]);
  const [loyaltySummary, setLoyaltySummary] = useState<LoyaltySummary | null>(null);
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [redemptions, setRedemptions] = useState<LoyaltyRedemption[]>([]);
  const [ownedVouchers, setOwnedVouchers] = useState<OwnedLoyaltyVoucher[]>([]);
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
    Promise.all([
      api<UserProfile>("/me"),
      api<LoyaltySummary>("/loyalty/summary"),
      api<LoyaltyTransaction[]>("/loyalty/transactions"),
      api<LoyaltyReward[]>("/loyalty/rewards"),
      api<LoyaltyRedemption[]>("/loyalty/redemptions"),
      api<OwnedLoyaltyVoucher[]>("/loyalty/vouchers"),
    ])
      .then(([p, summary, tx, rewardRows, redemptionRows, voucherRows]) => {
        setProfile(p);
        setName(p.fullName);
        setPhone(p.phone || "");
        setBirthDate(p.birthDate || "");
        setLoyaltySummary(summary);
        setLoyalty(tx);
        setRewards(rewardRows);
        setRedemptions(redemptionRows);
        setOwnedVouchers(voucherRows);
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
      const p = await api<UserProfile>("/me", { method: "PUT", body: JSON.stringify({ fullName: name, phone, birthDate: birthDate || null }) });
      setProfile(p);
      setBirthDate(p.birthDate || "");
      const a = getAuth();
      if (a) setAuth({ ...a, fullName: p.fullName, email: p.email });
      setMsg("Đã cập nhật thông tin.");
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function refreshLoyalty() {
    const [summary, tx, rewardRows, redemptionRows, voucherRows, p] = await Promise.all([
      api<LoyaltySummary>("/loyalty/summary"), api<LoyaltyTransaction[]>("/loyalty/transactions"),
      api<LoyaltyReward[]>("/loyalty/rewards"), api<LoyaltyRedemption[]>("/loyalty/redemptions"),
      api<OwnedLoyaltyVoucher[]>("/loyalty/vouchers"), api<UserProfile>("/me")
    ]);
    setLoyaltySummary(summary); setLoyalty(tx); setRewards(rewardRows); setRedemptions(redemptionRows); setOwnedVouchers(voucherRows); setProfile(p);
  }

  async function redeemReward(id: string) {
    if (!confirm("Đổi điểm lấy phần thưởng này? Điểm sẽ được trừ ngay.")) return;
    setBusy(true); setMsg("");
    try { const r = await api<LoyaltyRedemption>(`/loyalty/rewards/${id}/redeem`, { method: "POST" }); await refreshLoyalty(); setMsg(r.rewardType === "VOUCHER" ? `Đã đổi điểm. Voucher: ${r.voucherCode}` : `Đã đổi điểm. Mã nhận quà: ${r.redemptionCode}`); }
    catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  }

  async function claimBirthdayReward() {
    setBusy(true); setMsg("");
    try { const r = await api<BirthdayRewardResult>("/loyalty/birthday-reward", { method: "POST" }); await refreshLoyalty(); setMsg(`${r.message} Mã: ${r.voucherCode}`); }
    catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
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
  const member = loyaltySummary;
  const tierFloor = member?.membershipTier === "DIAMOND" ? 4000 : member?.membershipTier === "GOLD" ? 1500 : member?.membershipTier === "SILVER" ? 500 : 0;
  const tierCeiling = member?.nextTierAt || tierFloor || 1;
  const tierProgress = member?.nextTierAt ? Math.max(0, Math.min(100, ((member.lifetimePoints - tierFloor) / Math.max(1, tierCeiling - tierFloor)) * 100)) : 100;
  const debitTypes = new Set(["REDEEM", "REVERSAL", "EXPIRE", "REWARD", "ADJUST_DEBIT"]);
  const txName = (type: LoyaltyTransaction["type"]) => ({ EARN:"Tích điểm", REDEEM:"Dùng điểm cho booking", REFUND:"Hoàn điểm", REVERSAL:"Thu hồi điểm", EXPIRE:"Điểm hết hạn", REWARD:"Đổi phần thưởng", ADJUST_CREDIT:"Admin cộng điểm", ADJUST_DEBIT:"Admin trừ điểm" }[type] || type);

  return (
    <div className="profile-page mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tài khoản của tôi</h1>
        <p className="text-slate-400">Cập nhật thông tin cá nhân và mật khẩu.</p>
      </div>
      <section className="profile-member-grid grid gap-4 sm:grid-cols-3">
        <div className="card p-5 sm:col-span-2">
          <div className="text-xs font-bold tracking-[.2em] text-rose-400">CINEBOOKING MEMBER · V40</div>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div><div className="text-2xl font-bold">Hạng {member?.membershipTier || profile.membershipTier}</div><div className="mt-1 text-sm text-slate-400">Hạng dựa trên điểm tích luỹ trọn đời, không tụt khi bạn dùng điểm.</div></div>
            <div className="text-right"><div className="text-3xl font-bold text-amber-400">{member?.balancePoints ?? profile.loyaltyPoints}</div><div className="text-xs text-slate-400">điểm khả dụng</div></div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-rose-500 to-amber-400" style={{width:`${tierProgress}%`}}/></div>
          <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-slate-500"><span>Lifetime: {member?.lifetimePoints ?? profile.loyaltyLifetimePoints} điểm</span><span>{member?.nextTier ? `Còn ${member.pointsToNextTier} điểm → ${member.nextTier}` : "Đã đạt hạng cao nhất"}</span></div>
          <div className="mt-3 text-xs text-slate-500">BRONZE · 500 SILVER · 1.500 GOLD · 4.000 DIAMOND</div>
        </div>
        <div className="card p-5"><div className="text-sm text-slate-400">Tốc độ tích điểm</div><div className="mt-2 text-xl font-bold">x{Number(member?.earnMultiplier || 1).toFixed(2)}</div><p className="mt-2 text-xs leading-5 text-slate-500">Base: 10.000đ = 1 điểm. SILVER x1,10 · GOLD x1,25 · DIAMOND x1,50.</p></div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="card p-5">
          <div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-bold">⏳ Hạn điểm</h2><p className="mt-1 text-sm text-slate-400">Mỗi lô điểm mới có hạn {member?.pointExpiryMonths || 12} tháng và hệ thống ưu tiên dùng lô hết hạn sớm nhất.</p></div><div className="text-right"><div className="text-2xl font-black text-amber-300">{member?.expiringSoonPoints || 0}</div><div className="text-xs text-slate-500">sắp hết hạn</div></div></div>
          <div className="mt-3 text-sm text-slate-300">{member?.nextExpiryAt ? `Lô gần nhất hết hạn: ${new Date(member.nextExpiryAt).toLocaleString("vi-VN")}` : "Hiện chưa có lô điểm đang chờ hết hạn."}</div>
        </div>
        <div className="card p-5">
          <h2 className="text-lg font-bold">🎂 Quà sinh nhật</h2>
          <p className="mt-1 text-sm text-slate-400">Voucher cá nhân 20%, tối đa 50.000đ, nhận đúng ngày sinh và dùng trong 30 ngày.</p>
          {!profile.birthDate ? <p className="mt-3 text-sm text-amber-300">Hãy thiết lập ngày sinh bên dưới để kích hoạt quyền lợi.</p> : <p className="mt-3 text-sm text-slate-300">Ngày sinh: {new Date(`${profile.birthDate}T00:00:00`).toLocaleDateString("vi-VN")}</p>}
          {member?.birthdayRewardEligible && <button type="button" disabled={busy} onClick={claimBirthdayReward} className="btn btn-primary mt-3">Nhận quà sinh nhật 🎁</button>}
          {profile.birthDate && !member?.birthdayRewardEligible && <div className="mt-3 text-xs text-slate-500">Quà sẽ mở đúng ngày sinh; mỗi năm chỉ nhận một lần.</div>}
        </div>
      </section>

      <section className="card profile-card p-6">
        <div><h2 className="text-xl font-bold">🎁 Đổi điểm lấy phần thưởng</h2><p className="mt-1 text-sm text-slate-400">Voucher được gắn với đúng tài khoản. Quà bắp nước tạo mã nhận quà để nhân viên xác nhận tại quầy.</p></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{rewards.map(r => <article key={r.id} className="rounded-2xl border border-slate-800 bg-slate-950/45 p-4"><div className="text-xs font-black text-rose-300">{r.rewardType === "CONCESSION" ? "BẮP NƯỚC" : "VOUCHER"}</div><h3 className="mt-2 font-bold">{r.name}</h3><p className="mt-1 min-h-10 text-xs leading-5 text-slate-500">{r.description}</p><div className="mt-3 flex items-end justify-between gap-3"><div><div className="text-xl font-black text-amber-300">{r.pointsCost} điểm</div><div className="text-xs text-slate-500">Hiệu lực {r.validityDays} ngày</div></div><button type="button" disabled={busy || !r.canRedeem} onClick={()=>redeemReward(r.id)} className="btn btn-primary !px-3 !py-2">{r.canRedeem ? "Đổi" : "Chưa đủ"}</button></div></article>)}{!rewards.length&&<div className="text-sm text-slate-500">Chưa có phần thưởng đang mở.</div>}</div>
      </section>

      <section className="card profile-card p-6">
        <h2 className="text-xl font-bold">🎟 Ví phần thưởng</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div><h3 className="font-bold">Voucher cá nhân</h3><div className="mt-2 space-y-2">{ownedVouchers.map(v=><div key={v.id} className="rounded-xl border border-slate-800 p-3"><div className="font-mono font-black text-amber-300">{v.code}</div><div className="mt-1 text-sm">{v.name}</div><div className="mt-1 text-xs text-slate-500">{v.active?"Có thể sử dụng":"Đã dùng / hết hạn"}{v.endsAt?` · hết hạn ${new Date(v.endsAt).toLocaleDateString("vi-VN")}`:""}</div></div>)}{!ownedVouchers.length&&<div className="text-sm text-slate-500">Chưa có voucher cá nhân.</div>}</div></div>
          <div><h3 className="font-bold">Mã nhận bắp nước</h3><div className="mt-2 space-y-2">{redemptions.filter(r=>r.rewardType==="CONCESSION").map(r=><div key={r.id} className="rounded-xl border border-slate-800 p-3"><div className="font-mono font-black text-emerald-300">{r.redemptionCode}</div><div className="mt-1 text-sm">{r.rewardName}</div><div className="mt-1 text-xs text-slate-500">{r.status==="CLAIMED"?`Đã nhận ${r.claimedAt?new Date(r.claimedAt).toLocaleString("vi-VN"):""}`:`Chưa nhận · hết hạn ${new Date(r.expiresAt).toLocaleDateString("vi-VN")}`}</div></div>)}{!redemptions.some(r=>r.rewardType==="CONCESSION")&&<div className="text-sm text-slate-500">Chưa có mã nhận quà tại quầy.</div>}</div></div>
        </div>
      </section>

      <section className="card profile-card p-6">
        <div className="flex items-end justify-between gap-3"><div><h2 className="text-xl font-bold">Lịch sử điểm</h2><p className="mt-1 text-sm text-slate-400">Bao gồm tích, dùng, hoàn, thu hồi, hết hạn, đổi thưởng và điều chỉnh có audit.</p></div></div>
        <div className="mt-4 divide-y divide-slate-800">{loyalty.slice(0,20).map(tx => { const debit=debitTypes.has(tx.type); return <div key={tx.id} className="flex items-center justify-between gap-4 py-3"><div><div className="font-semibold">{txName(tx.type)}</div><div className="mt-1 text-xs text-slate-500">{tx.description || "Giao dịch thành viên"} · {new Date(tx.createdAt).toLocaleString("vi-VN")}{tx.expiresAt?` · hạn ${new Date(tx.expiresAt).toLocaleDateString("vi-VN")}`:""}</div></div><div className="text-right"><div className={`text-lg font-black ${debit ? "text-rose-300" : "text-emerald-300"}`}>{debit ? "-" : "+"}{tx.points}</div>{tx.balanceAfter!==undefined&&<div className="text-[10px] text-slate-600">còn {tx.balanceAfter}</div>}</div></div>})}{!loyalty.length&&<div className="py-5 text-sm text-slate-500">Chưa có giao dịch điểm.</div>}</div>
      </section>

      <form onSubmit={save} className="card profile-card p-6 space-y-4">
        <h2 className="text-xl font-bold">Thông tin cá nhân</h2>
        <div><label className="text-sm text-slate-400">Email</label><input className="input mt-1" value={profile.email} disabled /></div>
        <div><label className="text-sm text-slate-400">Họ và tên</label><input className="input mt-1" value={name} onChange={e => setName(e.target.value)} required /></div>
        <div><label className="text-sm text-slate-400">Số điện thoại</label><input className="input mt-1" value={phone} onChange={e => setPhone(e.target.value)} placeholder="09xxxxxxxx" /></div>
        <div><label className="text-sm text-slate-400">Ngày sinh</label><input className="input mt-1" type="date" value={birthDate} disabled={Boolean(profile.birthDate)} onChange={e => setBirthDate(e.target.value)} max={new Date().toISOString().slice(0,10)} /><div className="mt-1 text-xs text-slate-500">Để bảo vệ quyền lợi sinh nhật, khách hàng chỉ tự thiết lập ngày sinh một lần.</div></div>
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
