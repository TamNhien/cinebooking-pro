/* eslint-disable react-hooks/set-state-in-effect -- effects intentionally synchronize API/subscription state. */
"use client";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { api, dateTime } from "@/lib/api";
import { clearAuth, getAuth } from "@/lib/auth";
import { clearStepUp, getStepUp, setStepUp } from "@/lib/step-up";
import type { AdminIdentitySecuritySummaryV68, AdminSecurityAlertV46, AdminSecuritySummaryV46, StepUpGrantV68, StepUpStatusV68, UserProfile } from "@/lib/types";

const STRATEGY="V68-SECURITY-IDENTITY-5";

const protectedGroups=[
  "Quản trị tài khoản người dùng",
  "Quản trị hồ sơ / quyền nhân viên",
  "Payment recovery & reconciliation",
  "Thay đổi Dynamic Pricing rules",
  "Launch CRM campaign",
  "Approve / reject refund",
  "Thu hồi session người dùng",
  "Hủy booking / refund / manual check-in",
];

export default function AdminSecurity(){
 const [summary,setSummary]=useState<AdminSecuritySummaryV46|null>(null);
 const [identity,setIdentity]=useState<AdminIdentitySecuritySummaryV68|null>(null);
 const [alerts,setAlerts]=useState<AdminSecurityAlertV46[]>([]);
 const [status,setStatus]=useState<StepUpStatusV68|null>(null);
 const [password,setPassword]=useState("");
 const [msg,setMsg]=useState("");
 const [busy,setBusy]=useState(false);
 const [clock,setClock]=useState(0);

 const load=useCallback(async()=>{
  try{
   const me=await api<UserProfile>("/me");
   if(me.role!=="ADMIN"){clearAuth();window.location.assign("/login?returnTo=/admin/security&reason=admin");return;}
   const [s,a,i,st]=await Promise.all([
    api<AdminSecuritySummaryV46>("/admin/security/overview"),
    api<AdminSecurityAlertV46[]>("/admin/security/alerts"),
    api<AdminIdentitySecuritySummaryV68>("/admin/identity-security/summary"),
    api<StepUpStatusV68>("/security/step-up/status"),
   ]);
   setSummary(s);setAlerts(a);setIdentity(i);setStatus(st);
  }catch(e){setMsg((e as Error).message);}
 },[]);

 useEffect(()=>{if(!getAuth()){window.location.assign("/login?returnTo=/admin/security&reason=required");return;}void load();},[load]);
 useEffect(()=>{const tick=()=>setClock(Date.now());tick();const id=setInterval(tick,1000);return()=>clearInterval(id);},[]);

 const local=getStepUp();
 const remaining=useMemo(()=>Math.max(0,Math.ceil(((local?.expiresAt?new Date(local.expiresAt).getTime():0)-clock)/1000)),[local?.expiresAt,clock]);
 const active=Boolean(status?.active&&remaining>0);

 async function elevate(e:FormEvent){
  e.preventDefault();setBusy(true);setMsg("");
  try{
   const grant=await api<StepUpGrantV68>("/security/step-up",{method:"POST",body:JSON.stringify({password})});
   setStepUp({token:grant.token,expiresAt:grant.expiresAt,strategyVersion:grant.strategyVersion});
   setPassword("");setStatus({enabled:true,active:true,expiresAt:grant.expiresAt,ttlSeconds:grant.ttlSeconds,strategyVersion:grant.strategyVersion});
   setMsg("Đã xác thực tăng cường. Các thao tác Admin nhạy cảm được mở khóa tạm thời trên tab này.");
   await load();
  }catch(e){setMsg((e as Error).message);}finally{setBusy(false);}
 }
 async function revoke(){
  try{await api<void>("/security/step-up",{method:"DELETE"});}catch{}
  clearStepUp();setStatus(s=>s?{...s,active:false,expiresAt:undefined}:s);setMsg("Đã khóa lại quyền thao tác nhạy cảm V68.");
 }

 return <div className="mx-auto max-w-7xl space-y-6 px-4 py-8" data-testid="security-identity-v68">
  <div><p className="section-kicker">V68 · SECURITY & IDENTITY 5.0</p><h1 className="text-3xl font-black">Security Operations · Security & Identity</h1><p className="mt-2 text-slate-400">Step-up authentication cho thao tác Admin nhạy cảm, session-bound grant và security-header baseline cho HTTPS.</p></div>
  {msg&&<div data-testid="security-identity-message-v68" className="card p-4 text-sm">{msg}</div>}

  <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-testid="security-identity-summary-v68">
   {[['Strategy',identity?.strategyVersion||STRATEGY],['Active step-up grants',identity?.activeStepUpGrants??0],['Protected groups',identity?.protectedActionGroups??0],['TTL',identity?`${identity.stepUpTtlSeconds}s`:'—']].map(([k,v])=><div className="card p-5" key={String(k)}><div className="text-xs font-bold uppercase text-slate-500">{k}</div><div className="mt-2 break-words text-xl font-black">{v}</div></div>)}
  </section>

  <section className="card p-5" data-testid="admin-step-up-v68">
   <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-xl font-black">🔐 Admin step-up authentication</h2><p className="mt-1 max-w-3xl text-sm text-slate-400">Nhập lại mật khẩu Admin để nhận grant ngắn hạn gắn với đúng user + auth session. Raw token chỉ nằm trong <code>sessionStorage</code> của tab và backend chỉ lưu SHA-256 hash.</p></div><span className={`rounded-full px-3 py-1 text-xs font-black ${active?'bg-emerald-500/15 text-emerald-300':'bg-amber-500/15 text-amber-300'}`} data-testid="step-up-status-v68">{active?`UNLOCKED · ${remaining}s`:'LOCKED'}</span></div>
   {!active?<form onSubmit={elevate} className="mt-5 flex max-w-xl flex-col gap-3 sm:flex-row"><input data-testid="step-up-password-v68" className="input flex-1" type="password" autoComplete="current-password" placeholder="Mật khẩu Admin hiện tại" value={password} onChange={e=>setPassword(e.target.value)} required/><button data-testid="step-up-unlock-v68" className="btn btn-primary" disabled={busy}>{busy?'Đang xác thực...':'Mở khóa thao tác nhạy cảm'}</button></form>:<div className="mt-5 flex flex-wrap items-center gap-3"><div className="text-sm text-emerald-300">Grant hợp lệ đến {local?.expiresAt?dateTime(local.expiresAt):'—'}.</div><button data-testid="step-up-revoke-v68" className="btn btn-secondary" onClick={revoke}>Khóa lại ngay</button></div>}
   <div className="mt-5 grid gap-2 md:grid-cols-2">{protectedGroups.map(x=><div key={x} className="rounded-xl border border-slate-800 px-3 py-2 text-sm text-slate-300">✓ {x}</div>)}</div>
  </section>

  <section className="grid gap-4 lg:grid-cols-2">
   <div className="card p-5" data-testid="security-headers-v68"><h2 className="text-lg font-black">🧱 Security headers</h2><div className="mt-4 space-y-2 text-sm text-slate-300"><div>CSP: <b>{identity?.cspMode||'—'}</b></div><div>HSTS khi HTTPS: <b>{identity?.hstsWhenHttps?'ENABLED':'DISABLED'}</b></div><div>Frame protection: <b>DENY</b></div><div>Referrer policy: <b>strict-origin-when-cross-origin</b></div><div>Permissions: camera / microphone / geolocation / payment <b>disabled</b></div></div></div>
   <div className="card p-5"><h2 className="text-lg font-black">🛡 Security Operations V46 vẫn được giữ</h2><div className="mt-4 grid grid-cols-2 gap-3">{[['Cảnh báo 24h',summary?.alertsLast24Hours||0],['Chưa xác nhận',summary?.unacknowledgedAlerts||0],['Rủi ro cao',summary?.unacknowledgedHighRisk||0],['Trusted devices',summary?.activeTrustedDevices||0]].map(([k,v])=><div key={String(k)} className="rounded-xl border border-slate-800 p-3"><div className="text-xs text-slate-500">{k}</div><div className="text-2xl font-black">{v}</div></div>)}</div></div>
  </section>

  <section className="card overflow-x-auto p-5"><h2 className="mb-3 text-lg font-black">Security alerts</h2><table className="w-full min-w-[900px] text-sm"><thead><tr className="text-left text-slate-500"><th className="p-2">Thời gian</th><th className="p-2">Tài khoản</th><th className="p-2">Sự kiện</th><th className="p-2">Mức</th><th className="p-2">Risk</th><th className="p-2">Thiết bị</th><th className="p-2">IP</th><th className="p-2">Trạng thái</th></tr></thead><tbody>{alerts.map(a=><tr data-testid="admin-security-alert" key={a.id} className="border-t border-slate-800"><td className="p-2">{dateTime(a.createdAt)}</td><td className="p-2"><b>{a.userName}</b><div className="text-xs text-slate-500">{a.userEmail}</div></td><td className="p-2"><b>{a.title}</b><div className="text-xs text-slate-500">{a.eventType}</div></td><td className="p-2">{a.severity}</td><td className="p-2 font-black">{a.riskScore}</td><td className="p-2">{a.deviceName||'—'}</td><td className="p-2">{a.ipAddress||'—'}</td><td className="p-2">{a.acknowledgedAt?'Đã xác nhận':'Cần kiểm tra'}</td></tr>)}</tbody></table>{!alerts.length&&<div className="py-8 text-center text-slate-500">Chưa có cảnh báo.</div>}</section>
 </div>;
}
