"use client";
import { useEffect, useState } from "react";
import { api, dateTime } from "@/lib/api";
import type { SecurityAlertV46, SecurityOverviewV46, TrustedDeviceV46 } from "@/lib/types";

export default function SecurityCenter(){
  const [overview,setOverview]=useState<SecurityOverviewV46|null>(null);
  const [devices,setDevices]=useState<TrustedDeviceV46[]>([]);
  const [alerts,setAlerts]=useState<SecurityAlertV46[]>([]);
  const [label,setLabel]=useState("");
  const [msg,setMsg]=useState("");
  const [busy,setBusy]=useState(false);
  async function load(){
    try{await api("/me/security/client-context",{method:"PATCH"});const [o,d,a]=await Promise.all([api<SecurityOverviewV46>("/me/security/overview"),api<TrustedDeviceV46[]>("/me/security/trusted-devices"),api<SecurityAlertV46[]>("/me/security/alerts")]);setOverview(o);setDevices(d);setAlerts(a);}catch(e){setMsg((e as Error).message);}
  }
  useEffect(()=>{void load();},[]);
  async function trust(){setBusy(true);try{await api("/me/security/trusted-devices/current",{method:"POST",body:JSON.stringify({label:label.trim()||null})});setLabel("");setMsg("Đã đánh dấu thiết bị hiện tại là tin cậy.");await load();}catch(e){setMsg((e as Error).message);}finally{setBusy(false);}}
  async function revoke(id:string){if(!confirm("Thu hồi thiết bị tin cậy này?"))return;setBusy(true);try{await api(`/me/security/trusted-devices/${id}`,{method:"DELETE"});await load();}catch(e){setMsg((e as Error).message);}finally{setBusy(false);}}
  async function ack(id:string){setBusy(true);try{await api(`/me/security/alerts/${id}/acknowledge`,{method:"PATCH"});await load();}catch(e){setMsg((e as Error).message);}finally{setBusy(false);}}
  const sev=(s:string)=>s==="CRITICAL"?"text-rose-200 bg-rose-500/20":s==="HIGH"?"text-orange-200 bg-orange-500/20":s==="MEDIUM"?"text-amber-200 bg-amber-500/20":"text-slate-300 bg-slate-500/20";
  return <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
    <div><p className="section-kicker">V46 · SECURITY & ACCOUNT PROTECTION 2.0</p><h1 className="text-3xl font-black">Trung tâm bảo mật tài khoản</h1><p className="mt-2 text-slate-400">Theo dõi cảnh báo rủi ro, thiết bị tin cậy và phiên đăng nhập của tài khoản.</p></div>
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {[['Phiên đang hoạt động',overview?.activeSessions||0],['Thiết bị tin cậy',overview?.trustedDevices||0],['Cảnh báo chưa xác nhận',overview?.unacknowledgedAlerts||0],['Rủi ro cao',overview?.highRiskAlerts||0]].map(([k,v])=><div key={String(k)} className="card p-5"><div className="text-xs font-bold uppercase text-slate-500">{k}</div><div className="mt-2 text-3xl font-black">{v}</div></div>)}
    </section>
    <section className="card p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><h2 className="text-xl font-black">Thiết bị tin cậy</h2><p className="mt-1 text-sm text-slate-400">Đánh dấu thiết bị cá nhân để phân biệt với lần đăng nhập từ thiết bị mới.</p></div><div className="flex gap-2"><input aria-label="Nhãn thiết bị tin cậy" className="input" value={label} onChange={e=>setLabel(e.target.value)} placeholder="VD: Laptop cá nhân"/><button disabled={busy} onClick={trust} className="btn btn-primary">Tin cậy thiết bị hiện tại</button></div></div>
      <div className="mt-5 space-y-3">{devices.map(d=><div data-testid="trusted-device" key={d.id} className="rounded-2xl border border-slate-800 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="font-bold">{d.label}</div><div className="mt-1 text-sm text-slate-400">{d.deviceName} · IP gần nhất {d.lastIp||'—'}</div><div className="mt-1 text-xs text-slate-500">Tin cậy {dateTime(d.trustedAt)} · thấy gần nhất {dateTime(d.lastSeenAt)}</div>{!d.active&&<div className="mt-2 text-xs font-bold text-rose-300">Đã thu hồi</div>}</div>{d.active&&<button disabled={busy} className="btn btn-secondary" onClick={()=>revoke(d.id)}>Thu hồi tin cậy</button>}</div></div>)}{!devices.length&&<div className="text-sm text-slate-500">Chưa có thiết bị tin cậy.</div>}</div>
    </section>
    <section className="card p-6"><h2 className="text-xl font-black">Cảnh báo bảo mật</h2><div className="mt-4 space-y-3">{alerts.map(a=><article data-testid="security-alert" key={a.id} className="rounded-2xl border border-slate-800 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2 py-1 text-[10px] font-black ${sev(a.severity)}`}>{a.severity} · RISK {a.riskScore}</span><b>{a.title}</b></div><p className="mt-2 text-sm text-slate-300">{a.details}</p><div className="mt-2 text-xs text-slate-500">{a.deviceName||'—'} · IP {a.ipAddress||'—'} · {dateTime(a.createdAt)}</div>{a.acknowledgedAt&&<div className="mt-2 text-xs font-bold text-emerald-300">Đã xác nhận {dateTime(a.acknowledgedAt)}</div>}</div>{!a.acknowledgedAt&&<button disabled={busy} onClick={()=>ack(a.id)} className="btn btn-secondary">Tôi đã kiểm tra</button>}</div></article>)}{!alerts.length&&<div className="text-sm text-slate-500">Chưa có cảnh báo bảo mật.</div>}</div></section>
    {msg&&<div className="card p-4 text-sm">{msg}</div>}
  </div>;
}
