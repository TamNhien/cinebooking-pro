"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, dateTime } from "@/lib/api";
import { clearAuth, getAuth } from "@/lib/auth";
import type { KeyGovernanceSummaryV71, SecretRotationEventV71, SecretRotationPolicyV71, UserProfile } from "@/lib/types";

const STRATEGY="V71-SECRETS-KEY-GOVERNANCE-5";
type EventType="ROTATED"|"VERIFIED"|"REVOKED"|"INCIDENT";

export default function KeyGovernancePage(){
  const router=useRouter();
  const [summary,setSummary]=useState<KeyGovernanceSummaryV71|null>(null);
  const [policies,setPolicies]=useState<SecretRotationPolicyV71[]>([]);
  const [events,setEvents]=useState<SecretRotationEventV71[]>([]);
  const [policyKey,setPolicyKey]=useState("JWT_SIGNING_SECRET");
  const [eventType,setEventType]=useState<EventType>("VERIFIED");
  const [providerRef,setProviderRef]=useState("");
  const [fingerprint,setFingerprint]=useState("");
  const [note,setNote]=useState("");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");

  const load=useCallback(async()=>{
    try{
      const me=await api<UserProfile>("/me");
      if(me.role!=="ADMIN"){
        clearAuth();router.replace("/login?returnTo=/admin/key-governance&reason=admin");return;
      }
      const [s,p,e]=await Promise.all([
        api<KeyGovernanceSummaryV71>("/admin/key-governance/summary"),
        api<SecretRotationPolicyV71[]>("/admin/key-governance/policies"),
        api<SecretRotationEventV71[]>("/admin/key-governance/events?limit=50"),
      ]);
      setSummary(s);setPolicies(p);setEvents(e);setError("");
      if(p.length&&!p.some(x=>x.policyKey===policyKey))setPolicyKey(p[0].policyKey);
    }catch(e){setError((e as Error).message);}
  },[policyKey,router]);

  useEffect(()=>{
    if(!getAuth()){router.replace("/login?returnTo=/admin/key-governance&reason=required");return;}
    void load();
  },[load,router]);

  const postureClass=useMemo(()=>summary?.posture==="ACTION_REQUIRED"?"text-rose-300":summary?.posture==="REVIEW"?"text-amber-300":"text-emerald-300",[summary?.posture]);

  async function recordEvidence(e:FormEvent){
    e.preventDefault();setBusy(true);setError("");setMessage("");
    try{
      const row=await api<SecretRotationEventV71>("/admin/key-governance/events",{method:"POST",body:JSON.stringify({policyKey,eventType,providerRef:providerRef||null,keyFingerprint:fingerprint||null,note:note||null})});
      setMessage(`Đã ghi evidence ${row.eventKey}. Không có secret value nào được lưu.`);setProviderRef("");setFingerprint("");setNote("");await load();
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }

  return <div className="mx-auto max-w-7xl space-y-6 px-4 py-8" data-testid="key-governance-v71">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="section-kicker">V71 · SECRETS & KEY GOVERNANCE 5.0</p><h1 className="text-3xl font-black">Secrets & Key Governance</h1><p className="mt-2 max-w-3xl text-slate-400">Rotation policy, cấu hình-presence và append-only evidence cho các credential quan trọng. V71 chỉ lưu metadata/fingerprint, không lưu secret value.</p></div>
      <div className="flex gap-2"><Link className="btn btn-secondary" href="/admin/security">🔐 Step-up V68</Link><Link className="btn btn-secondary" href="/admin">← Admin Dashboard</Link></div>
    </div>

    {error&&<div className="card border border-rose-500/40 p-4 text-sm text-rose-300" data-testid="key-governance-error-v71">{error}</div>}
    {message&&<div className="card border border-emerald-500/30 p-4 text-sm text-emerald-300">{message}</div>}

    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6" data-testid="key-governance-summary-v71">
      <div className="card p-5"><div className="text-xs font-bold uppercase text-slate-500">Strategy</div><div className="mt-2 text-sm font-black">{summary?.strategyVersion||STRATEGY}</div></div>
      <div className="card p-5"><div className="text-xs font-bold uppercase text-slate-500">Posture</div><div className={`mt-2 text-xl font-black ${postureClass}`}>{summary?.posture||"REVIEW"}</div></div>
      <div className="card p-5"><div className="text-xs font-bold uppercase text-slate-500">Configured</div><div className="mt-2 text-2xl font-black">{summary?.configuredSecretCount??0}/{summary?.enabledPolicyCount??0}</div></div>
      <div className="card p-5"><div className="text-xs font-bold uppercase text-slate-500">No evidence</div><div className="mt-2 text-2xl font-black">{summary?.noEvidenceCount??0}</div></div>
      <div className="card p-5"><div className="text-xs font-bold uppercase text-slate-500">Overdue</div><div className="mt-2 text-2xl font-black">{summary?.overdueCount??0}</div></div>
      <div className="card p-5"><div className="text-xs font-bold uppercase text-slate-500">Execution</div><div className="mt-2 text-sm font-black">{summary?.dryRunOnly?"MANUAL / DRY-RUN":"AUTO ENABLED"}</div></div>
    </section>

    <section className="card overflow-x-auto p-5" data-testid="key-governance-policies-v71">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-black">🔑 Rotation policy catalog</h2><p className="mt-1 text-sm text-slate-400">Presence chỉ trả configured=true/false; API không trả giá trị credential. Warning window: {summary?.warningDays??14} ngày.</p></div><div className="text-sm font-bold">NO_SECRET_VALUES_IN_DATABASE</div></div>
      <table className="mt-4 min-w-full text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="p-2">Policy</th><th className="p-2">Class</th><th className="p-2">Owner</th><th className="p-2">Configured</th><th className="p-2">Rotation</th><th className="p-2">Status</th><th className="p-2">Next due</th></tr></thead><tbody>{policies.map(p=><tr className="border-t border-slate-800" key={p.id}><td className="p-2"><div className="font-bold">{p.policyKey}</div><div className="text-xs text-slate-500">{p.secretName}</div></td><td className="p-2">{p.secretClass}</td><td className="p-2">{p.ownerTeam}</td><td className="p-2 font-bold">{p.configured?"YES":"NO"}</td><td className="p-2">{p.rotationDays} ngày</td><td className="p-2 font-bold">{p.rotationStatus}</td><td className="p-2">{p.nextRotationDueAt?dateTime(p.nextRotationDueAt):"—"}</td></tr>)}</tbody></table>
    </section>

    <section className="grid gap-4 lg:grid-cols-2">
      <form className="card p-5" onSubmit={recordEvidence} data-testid="key-governance-evidence-form-v71">
        <h2 className="text-lg font-black">🧾 Ghi rotation evidence</h2><p className="mt-2 text-sm text-slate-400">Write action yêu cầu Step-up V68. Chỉ nhập fingerprint/reference; tuyệt đối không dán secret thật.</p>
        <label className="mt-4 block text-xs font-bold uppercase text-slate-500">Policy</label><select className="input mt-2 w-full" value={policyKey} onChange={e=>setPolicyKey(e.target.value)}>{policies.map(p=><option key={p.id} value={p.policyKey}>{p.policyKey}</option>)}</select>
        <label className="mt-4 block text-xs font-bold uppercase text-slate-500">Event type</label><select className="input mt-2 w-full" value={eventType} onChange={e=>setEventType(e.target.value as EventType)}><option>VERIFIED</option><option>ROTATED</option><option>REVOKED</option><option>INCIDENT</option></select>
        <label className="mt-4 block text-xs font-bold uppercase text-slate-500">Provider reference</label><input className="input mt-2 w-full" maxLength={160} value={providerRef} onChange={e=>setProviderRef(e.target.value)} placeholder="vault/version/ticket reference"/>
        <label className="mt-4 block text-xs font-bold uppercase text-slate-500">Key fingerprint</label><input className="input mt-2 w-full" maxLength={128} value={fingerprint} onChange={e=>setFingerprint(e.target.value)} placeholder="sha256:abcd1234..."/>
        <label className="mt-4 block text-xs font-bold uppercase text-slate-500">Note</label><textarea className="input mt-2 min-h-20 w-full" maxLength={1000} value={note} onChange={e=>setNote(e.target.value)} placeholder="Change ticket / rotation notes..."/>
        <button className="btn btn-primary mt-4" disabled={busy}>{busy?"Đang ghi...":"Ghi evidence"}</button>
      </form>

      <div className="card p-5" data-testid="key-governance-policy-v71"><h2 className="text-lg font-black">🛡 Storage policy</h2><div className="mt-4 space-y-3 text-sm text-slate-300"><p>✅ Secret values vẫn ở environment/secret manager.</p><p>✅ Database chỉ giữ policy metadata, provider reference và fingerprint không đảo ngược.</p><p>✅ Rotation evidence là append-only.</p><p>✅ Auto-rotation execution mặc định OFF.</p><p>❌ Không hiển thị JWT/SMTP/payment/VAPID secret trên Admin UI hoặc API.</p></div></div>
    </section>

    <section className="card overflow-x-auto p-5" data-testid="key-governance-events-v71"><h2 className="text-lg font-black">📚 Rotation evidence</h2><table className="mt-4 min-w-full text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="p-2">Event</th><th className="p-2">Policy</th><th className="p-2">Type</th><th className="p-2">Fingerprint</th><th className="p-2">Actor</th><th className="p-2">Occurred</th></tr></thead><tbody>{events.map(e=><tr className="border-t border-slate-800" key={e.id}><td className="p-2 font-bold">{e.eventKey}</td><td className="p-2">{e.policyKey}</td><td className="p-2">{e.eventType}</td><td className="p-2"><code>{e.keyFingerprint||"—"}</code></td><td className="p-2">{e.actorEmail||"—"}</td><td className="p-2">{dateTime(e.occurredAt)}</td></tr>)}</tbody></table>{!events.length&&<div className="mt-4 text-sm text-slate-500">Chưa có rotation evidence. Trạng thái NO_EVIDENCE là expected cho policy mới.</div>}</section>
  </div>;
}
