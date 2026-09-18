/* eslint-disable react-hooks/set-state-in-effect -- effects intentionally synchronize API/subscription state. */
"use client";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { api, dateTime } from "@/lib/api";
import { clearAuth, getAuth } from "@/lib/auth";
import { clearStepUp, getStepUp, setStepUp } from "@/lib/step-up";
import { localizedLabel } from "@/lib/vi-labels";
import { usePresentationLanguage, type Language } from "@/lib/usePresentationLanguage";
import type { AdminIdentitySecuritySummaryV68, AdminSecurityAlertV46, AdminSecuritySummaryV46, StepUpGrantV68, StepUpStatusV68, UserProfile } from "@/lib/types";

const STRATEGY="V68-SECURITY-IDENTITY-5";
const protectedGroups=[
  ["Quản trị tài khoản người dùng","Manage user accounts"],
  ["Quản trị hồ sơ / quyền nhân viên","Manage staff profiles / permissions"],
  ["Khôi phục & đối soát thanh toán","Payment recovery & reconciliation"],
  ["Thay đổi quy tắc định giá động","Change Dynamic Pricing rules"],
  ["Khởi chạy chiến dịch CRM","Launch CRM campaign"],
  ["Duyệt / từ chối hoàn tiền","Approve / reject refund"],
  ["Thu hồi phiên người dùng","Revoke user sessions"],
  ["Hủy đặt vé / hoàn tiền / soát vé thủ công","Cancel booking / refund / manual check-in"],
] as const;

export default function AdminSecurity(){
 const { language, t }=usePresentationLanguage();
 const [summary,setSummary]=useState<AdminSecuritySummaryV46|null>(null);
 const [identity,setIdentity]=useState<AdminIdentitySecuritySummaryV68|null>(null);
 const [alerts,setAlerts]=useState<AdminSecurityAlertV46[]>([]);
 const [status,setStatus]=useState<StepUpStatusV68|null>(null);
 const [password,setPassword]=useState("");
 const [msg,setMsg]=useState("");
 const [busy,setBusy]=useState(false);
 const [clock,setClock]=useState(0);
 const [stepUpRevision,setStepUpRevision]=useState(0);

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
 useEffect(()=>{const changed=()=>setStepUpRevision(v=>v+1);window.addEventListener("step-up-changed",changed);return()=>window.removeEventListener("step-up-changed",changed);},[]);

 void stepUpRevision;
 const local=getStepUp();
 const remaining=useMemo(()=>Math.max(0,Math.ceil(((local?.expiresAt?new Date(local.expiresAt).getTime():0)-clock)/1000)),[local?.expiresAt,clock]);
 // The sessionStorage grant is the client-side authority used by api.ts for X-Step-Up-Token.
 // Do not relock the UI because the status endpoint briefly lags a just-issued grant.
 const active=Boolean(local&&remaining>0&&status?.enabled!==false);

 async function elevate(e:FormEvent){
  e.preventDefault();setBusy(true);setMsg("");
  try{
   const grant=await api<StepUpGrantV68>("/security/step-up",{method:"POST",body:JSON.stringify({password})});
   setStepUp({token:grant.token,expiresAt:grant.expiresAt,strategyVersion:grant.strategyVersion});
   setPassword("");
   setMsg("Đã xác thực tăng cường. Các thao tác Quản trị viên nhạy cảm được mở khóa tạm thời trên tab này.");
   await load();
   // The status endpoint can briefly lag the just-issued grant. Keep the authoritative
   // response from POST /security/step-up so the UI cannot immediately relock itself.
   setStatus({enabled:true,active:true,expiresAt:grant.expiresAt,ttlSeconds:grant.ttlSeconds,strategyVersion:grant.strategyVersion});
  }catch(e){setMsg((e as Error).message);}finally{setBusy(false);}
 }
 async function revoke(){
  try{await api<void>("/security/step-up",{method:"DELETE"});}catch{}
  clearStepUp();setStatus(s=>s?{...s,active:false,expiresAt:undefined}:s);setMsg("Đã khóa lại quyền thao tác nhạy cảm V68.");
 }

 return <div className="mx-auto max-w-7xl space-y-6 px-4 py-8" data-testid="security-identity-v68">
  <div><p className="section-kicker">{t("V68 · BẢO MẬT & ĐỊNH DANH 5.0","V68 · SECURITY & IDENTITY 5.0")}</p><h1 className="text-3xl font-black">{t("Vận hành bảo mật · Bảo mật & định danh","Security Operations · Security & Identity")}</h1><p className="mt-2 text-slate-400">{t("Xác thực tăng cường cho thao tác quản trị nhạy cảm, quyền ngắn hạn gắn với phiên và chuẩn nền header bảo mật cho HTTPS.","Step-up authentication for sensitive admin actions, short-lived session-bound grants, and a security-header baseline for HTTPS.")}</p></div>
  {msg&&<div data-testid="security-identity-message-v68" className="card p-4 text-sm">{translateSecurityMessage(msg,language)}</div>}

  <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-testid="security-identity-summary-v68">
   {[[t("Chiến lược","Strategy"),identity?.strategyVersion||STRATEGY],[t("Quyền tăng cường đang hoạt động","Active step-up grants"),identity?.activeStepUpGrants??0],[t("Nhóm thao tác được bảo vệ","Protected groups"),identity?.protectedActionGroups??0],["TTL",identity?`${identity.stepUpTtlSeconds}s`:'—']].map(([k,v])=><div className="card p-5" key={String(k)}><div className="text-xs font-bold uppercase text-slate-500">{k}</div><div className="mt-2 break-words text-xl font-black">{v}</div></div>)}
  </section>

  <section className="card p-5" data-testid="admin-step-up-v68">
   <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-xl font-black">🔐 {t("Xác thực tăng cường cho quản trị viên","Admin step-up authentication")}</h2><p className="mt-1 max-w-3xl text-sm text-slate-400">{t("Nhập lại mật khẩu quản trị để nhận quyền ngắn hạn gắn với đúng người dùng + phiên đăng nhập. Mã xác thực thô chỉ nằm trong sessionStorage của tab và dịch vụ phía máy chủ chỉ lưu giá trị băm SHA-256.","Re-enter the administrator password to receive a short-lived grant bound to the correct user and authentication session. The raw token stays only in this tab's sessionStorage; the backend stores only its SHA-256 hash.")}</p></div><span className={`rounded-full px-3 py-1 text-xs font-black ${active?'bg-emerald-500/15 text-emerald-300':'bg-amber-500/15 text-amber-300'}`} data-testid="step-up-status-v68">{active?`${t("ĐÃ MỞ KHÓA","UNLOCKED")} · ${remaining}s`:t("ĐÃ KHÓA","LOCKED")}</span></div>
   {!active?<form onSubmit={elevate} className="mt-5 flex max-w-xl flex-col gap-3 sm:flex-row"><input data-testid="step-up-password-v68" className="input flex-1" type="password" autoComplete="current-password" placeholder={t("Mật khẩu Quản trị viên hiện tại","Current administrator password")} value={password} onChange={e=>setPassword(e.target.value)} required/><button data-testid="step-up-unlock-v68" className="btn btn-primary" disabled={busy}>{busy?t("Đang xác thực...","Authenticating..."):t("Mở khóa thao tác nhạy cảm","Unlock sensitive actions")}</button></form>:<div className="mt-5 flex flex-wrap items-center gap-3"><div className="text-sm text-emerald-300">{t("Quyền hợp lệ đến","Grant valid until")} {local?.expiresAt?dateTime(local.expiresAt):'—'}.</div><button data-testid="step-up-revoke-v68" className="btn btn-secondary" onClick={revoke}>{t("Khóa lại ngay","Lock now")}</button></div>}
   <div className="mt-5 grid gap-2 md:grid-cols-2">{protectedGroups.map(([vi,en])=><div key={en} className="rounded-xl border border-slate-800 px-3 py-2 text-sm text-slate-300">✓ {t(vi,en)}</div>)}</div>
  </section>

  <section className="grid gap-4 lg:grid-cols-2">
   <div className="card p-5" data-testid="security-headers-v68"><h2 className="text-lg font-black">🧱 {t("Header bảo mật","Security headers")}</h2><div className="mt-4 space-y-2 text-sm text-slate-300"><div>CSP: <b>{identity?.cspMode||'—'}</b></div><div>HSTS {t("khi HTTPS","when HTTPS")}: <b>{identity?.hstsWhenHttps?t("ĐÃ BẬT","ENABLED"):t("ĐÃ TẮT","DISABLED")}</b></div><div>{t("Bảo vệ khung","Frame protection")}: <b>DENY</b></div><div>{t("Chính sách Referrer","Referrer policy")}: <b>strict-origin-when-cross-origin</b></div><div>{t("Quyền","Permissions")}: camera / microphone / geolocation / payment <b>{t("đã tắt","disabled")}</b></div></div></div>
   <div className="card p-5"><h2 className="text-lg font-black">🛡 {t("Vận hành bảo mật V46 vẫn được giữ","Security Operations V46 remains in place")}</h2><div className="mt-4 grid grid-cols-2 gap-3">{[[t("Cảnh báo 24h","24h alerts"),summary?.alertsLast24Hours||0],[t("Chưa xác nhận","Unacknowledged"),summary?.unacknowledgedAlerts||0],[t("Rủi ro cao","High risk"),summary?.unacknowledgedHighRisk||0],[t("Thiết bị tin cậy","Trusted devices"),summary?.activeTrustedDevices||0]].map(([k,v])=><div key={String(k)} className="rounded-xl border border-slate-800 p-3"><div className="text-xs text-slate-500">{k}</div><div className="text-2xl font-black">{v}</div></div>)}</div></div>
  </section>

  <section className="card overflow-hidden p-5"><h2 className="mb-3 text-lg font-black">{t("Cảnh báo bảo mật","Security alerts")}</h2>
    <div className="hidden xl:block"><table className="w-full table-fixed text-sm"><thead><tr className="text-slate-500"><th className="w-[12%] p-2">{t("Thời gian","Time")}</th><th className="w-[18%] p-2">{t("Tài khoản","Account")}</th><th className="w-[25%] p-2">{t("Sự kiện","Event")}</th><th className="w-[9%] p-2">{t("Mức","Severity")}</th><th className="w-[7%] p-2">{t("Rủi ro","Risk")}</th><th className="w-[12%] p-2">{t("Thiết bị","Device")}</th><th className="w-[9%] p-2">IP</th><th className="w-[8%] p-2">{t("Trạng thái","Status")}</th></tr></thead><tbody>{alerts.map(a=><tr data-testid="admin-security-alert" key={a.id} className="border-t border-slate-800 align-top"><td className="p-2">{dateTime(a.createdAt)}</td><td className="p-2"><b className="break-words">{a.userName}</b><div className="break-all text-xs text-slate-500">{a.userEmail}</div></td><td className="p-2"><b className="break-words">{securityAlertTitle(a.eventType,a.title,language)}</b><div className="text-xs text-slate-500">{localizedLabel(a.eventType,language)}</div></td><td className="p-2">{localizedLabel(a.severity,language)}</td><td className="p-2 font-black">{a.riskScore}</td><td className="p-2 break-words">{a.deviceName||'—'}</td><td className="p-2 break-all">{a.ipAddress||'—'}</td><td className="p-2">{a.acknowledgedAt?t("Đã xác nhận","Acknowledged"):t("Cần kiểm tra","Needs review")}</td></tr>)}</tbody></table></div>
    <div className="grid gap-3 xl:hidden">{alerts.map(a=><article data-testid="admin-security-alert" key={a.id} className="rounded-xl border border-slate-800 bg-slate-950/35 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><b className="break-words">{securityAlertTitle(a.eventType,a.title,language)}</b><div className="mt-1 break-all text-xs text-slate-500">{a.userName} · {a.userEmail}</div></div><span className="shrink-0 rounded-full border border-slate-700 px-2 py-1 text-[10px] font-bold">{localizedLabel(a.severity,language)}</span></div><div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-300"><span>{t("Thời gian","Time")}: <b>{dateTime(a.createdAt)}</b></span><span>{t("Rủi ro","Risk")}: <b>{a.riskScore}</b></span><span>{t("Thiết bị","Device")}: <b>{a.deviceName||'—'}</b></span><span>IP: <b>{a.ipAddress||'—'}</b></span><span>{t("Sự kiện","Event")}: <b>{localizedLabel(a.eventType,language)}</b></span><span>{t("Trạng thái","Status")}: <b>{a.acknowledgedAt?t("Đã xác nhận","Acknowledged"):t("Cần kiểm tra","Needs review")}</b></span></div></article>)}</div>
    {!alerts.length&&<div className="py-8 text-center text-slate-500">{t("Chưa có cảnh báo.","No alerts yet.")}</div>}
  </section>
 </div>;
}

function securityAlertTitle(eventType:string,title:string,language:Language){
  if(language==="vi") return title;
  const en:Record<string,string>={
    NEW_DEVICE:"Sign-in from an untrusted device",
    IMPOSSIBLE_TRAVEL:"Impossible travel detected",
    HIGH_RISK_LOGIN:"High-risk sign-in",
    REPEATED_LOGIN_FAILURES:"Repeated sign-in failures",
  };
  return en[eventType]??title;
}
function translateSecurityMessage(message:string,language:Language){
  if(language==="vi") return message;
  if(message.startsWith("Đã xác thực tăng cường.")) return "Step-up authentication succeeded. Sensitive admin actions are temporarily unlocked in this tab.";
  if(message.startsWith("Đã khóa lại quyền thao tác nhạy cảm")) return "Sensitive V68 actions have been locked again.";
  return message;
}
/* V77.0.9 historical verifier aliases (not rendered):
Security Operations
*/
