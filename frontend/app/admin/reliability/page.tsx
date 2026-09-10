/* eslint-disable react-hooks/set-state-in-effect -- effect bootstraps authenticated reliability snapshots from external APIs. */
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, dateTime } from "@/lib/api";
import { clearAuth, getAuth } from "@/lib/auth";
import type { ReliabilityBurnWindowV74, ReliabilityIncidentV74, ReliabilityRunbookStepV74, ReliabilitySummaryV74, UserProfile } from "@/lib/types";

export default function ReliabilityV74Page(){
  const [summary,setSummary]=useState<ReliabilitySummaryV74|null>(null);
  const [incidents,setIncidents]=useState<ReliabilityIncidentV74[]>([]);
  const [runbook,setRunbook]=useState<ReliabilityRunbookStepV74[]>([]);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);

  const load=useCallback(async()=>{
    setBusy(true);
    try{
      const me=await api<UserProfile>("/me");
      if(me.role!=="ADMIN"){
        clearAuth();
        window.location.assign("/login?returnTo=/admin/reliability&reason=admin");
        return;
      }
      const [s,i,r]=await Promise.all([
        api<ReliabilitySummaryV74>("/admin/reliability/summary"),
        api<ReliabilityIncidentV74[]>("/admin/reliability/incidents?limit=50"),
        api<ReliabilityRunbookStepV74[]>("/admin/reliability/runbook"),
      ]);
      setSummary(s);setIncidents(i);setRunbook(r);setError("");
    }catch(e){setError((e as Error).message)}finally{setBusy(false)}
  },[]);

  useEffect(()=>{
    if(!getAuth()){window.location.assign("/login?returnTo=/admin/reliability&reason=required");return;}
    void load();
  },[load]);

  const incidentCounts=useMemo(()=>({
    critical:incidents.filter(x=>x.severity==="CRITICAL").length,
    high:incidents.filter(x=>x.severity==="HIGH").length,
    ephemeral:incidents.filter(x=>x.source==="RUNTIME_5XX").length,
  }),[incidents]);

  return <div className="space-y-7" data-testid="reliability-v74">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="mb-2 text-sm text-slate-400"><Link href="/admin" className="hover:text-white">Admin</Link> / Reliability & Resilience</div>
        <div className="text-xs font-black tracking-[0.22em] text-emerald-300">V74 · RELIABILITY & RESILIENCE 5.0</div>
        <h1 className="mt-2 text-3xl font-bold">Burn-rate · Incident timeline · Failover · Runbook</h1>
        <p className="mt-1 max-w-4xl text-slate-400">Ghép telemetry V65, incident/audit thật và DR V69 thành một mặt phẳng reliability. Không tạo incident giả và không tự chạy chaos/failover.</p>
      </div>
      <div className="flex gap-2"><button className="btn btn-primary" onClick={()=>void load()} disabled={busy}>{busy?"Đang tải...":"↻ Làm mới"}</button><Link href="/admin" className="btn btn-secondary">← Dashboard</Link></div>
    </div>

    {error&&<div data-testid="reliability-error-v74" className="card border border-rose-800/60 p-4 text-sm text-rose-200">{error}</div>}

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6" data-testid="reliability-summary-v74">
      <Metric label="Strategy" value={summary?.strategyVersion??"V74-RELIABILITY-RESILIENCE-5"} compact/>
      <Metric label="Posture" value={summary?.posture??"-"} tone={postureTone(summary?.posture)}/>
      <Metric label="Availability SLO" value={summary?`${summary.availabilityTargetPercent.toFixed(3)}%`:"-"}/>
      <Metric label="Error budget" value={summary?`${summary.errorBudgetPercent.toFixed(3)}%`:"-"}/>
      <Metric label="Burn alert" value={summary?.burnAlertSeverity??"-"} tone={summary?.multiWindowBurnAlert?"text-rose-300":summary?.burnAlertSeverity==="HIGH"?"text-amber-300":"text-emerald-300"}/>
      <Metric label="DR readiness" value={summary?.disasterRecoveryReadiness??"-"} tone={summary?.disasterRecoveryReadiness==="READY"?"text-emerald-300":"text-amber-300"}/>
    </div>

    <section className="grid gap-5 lg:grid-cols-2" data-testid="burn-rate-v74">
      <BurnCard title="Fast burn" window={summary?.fastWindow}/>
      <BurnCard title="Slow burn" window={summary?.slowWindow}/>
    </section>

    <section className="card p-5" data-testid="reliability-policy-v74">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-xl font-bold">Reliability guardrails</h2><p className="mt-1 text-sm text-slate-500">Multi-window alert chỉ thành CRITICAL khi cả fast và slow window cùng vượt ngưỡng. Buffer bị truncate sẽ hiển thị PARTIAL thay vì PASS giả.</p></div><Status value={summary?.dependencyStatus??"NO_DATA"}/></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Mini label="Open incidents" value={String(summary?.openIncidents??0)}/><Mini label="Critical open" value={String(summary?.criticalOpenIncidents??0)}/><Mini label="Timeline critical" value={String(incidentCounts.critical)}/><Mini label="Runtime 5xx evidence" value={String(incidentCounts.ephemeral)}/></div>
      <div className="mt-3 text-xs text-slate-500">Baseline: <code>NO_SYNTHETIC_INCIDENTS</code> · chỉ hiển thị evidence có nguồn gốc thật.</div><div className="mt-4 flex flex-wrap gap-2">{summary?.evidencePolicy.map(x=><code key={x} className="rounded-lg bg-slate-900 px-2 py-1 text-xs text-cyan-300">{x}</code>)}</div>
    </section>

    <section className="card overflow-hidden" data-testid="incident-timeline-v74">
      <div className="border-b border-slate-800 p-5"><h2 className="text-xl font-bold">Incident timeline</h2><p className="mt-1 text-sm text-slate-500">Staff incident và audit là durable evidence; runtime 5xx là replica-local/ephemeral và được gắn nhãn rõ ràng.</p></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm"><thead className="bg-slate-900/70 text-xs uppercase text-slate-500"><tr><th className="p-3">Thời gian</th><th className="p-3">Nguồn</th><th className="p-3">Severity</th><th className="p-3">Status</th><th className="p-3">Sự kiện</th><th className="p-3">Evidence</th></tr></thead><tbody className="divide-y divide-slate-800">{incidents.map(x=><tr key={`${x.source}-${x.id}`}><td className="p-3 text-slate-400">{dateTime(x.occurredAt)}</td><td className="p-3">{x.source}</td><td className="p-3"><Status value={x.severity}/></td><td className="p-3">{x.status}</td><td className="p-3"><Link className="font-bold hover:text-cyan-300" href={x.href}>{x.title}</Link><div className="mt-1 max-w-xl text-xs text-slate-500">{x.detail}</div></td><td className="p-3"><code className="text-xs text-cyan-300">{x.evidenceRef}</code></td></tr>)}{incidents.length===0&&<tr><td className="p-4 text-slate-500" colSpan={6}>Không có incident/evidence phù hợp trong cửa sổ lookback.</td></tr>}</tbody></table></div>
    </section>

    <section className="card p-5" data-testid="failover-drill-v74">
      <h2 className="text-xl font-bold">Controlled failover exercise</h2>
      <p className="mt-1 text-sm text-slate-500">Script mặc định PLAN ONLY. Chỉ khi có <code>-Execute</code> mới dừng đúng một backend replica, probe qua nginx rồi luôn start replica trong <code>finally</code>. Không gọi <code>down -v</code>.</p>
      <code className="mt-4 block overflow-x-auto rounded-xl bg-slate-950 p-4 text-sm text-emerald-300">powershell -ExecutionPolicy Bypass -File .\tools\failover-drill-v74.ps1 -Execute</code>
      <div className="mt-3 text-xs text-slate-500">Explicit execute required: {summary?.failoverAutomationRequiresExplicitExecute?"YES":"NO"}</div>
    </section>

    <section className="card p-5" data-testid="reliability-runbook-v74">
      <h2 className="text-xl font-bold">Incident runbook</h2><p className="mt-1 text-sm text-slate-500">Detect → triage → stabilize → failover → recover → verify → close.</p>
      <div className="mt-5 space-y-3">{runbook.map(step=><div key={step.code} className="rounded-xl bg-slate-900/60 p-4"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-slate-800 px-2 py-1 text-xs font-black">{step.order}</span><b>{step.code} · {step.title}</b><span className="ml-auto text-xs text-slate-500">{step.safety}</span></div><p className="mt-2 text-sm text-slate-400">{step.objective}</p><code className="mt-2 block overflow-x-auto text-xs text-cyan-300">{step.command}</code></div>)}</div>
    </section>
  </div>;
}

function Metric({label,value,tone="text-white",compact=false}:{label:string;value:string;tone?:string;compact?:boolean}){return <div className="card p-5"><div className="text-xs uppercase tracking-wider text-slate-500">{label}</div><div className={`mt-2 font-black ${compact?"break-all text-sm":"text-2xl"} ${tone}`}>{value}</div></div>}
function Mini({label,value}:{label:string;value:string}){return <div className="rounded-xl bg-slate-900/60 p-4"><div className="text-xs text-slate-500">{label}</div><div className="mt-1 text-2xl font-black">{value}</div></div>}
function Status({value}:{value:string}){const cls=value==="CRITICAL"||value==="ACTION_REQUIRED"||value==="DEGRADED"||value==="ALERT"?"bg-rose-500/10 text-rose-300":value==="HIGH"||value==="WATCH"||value==="PARTIAL"||value==="NO_DATA"?"bg-amber-500/10 text-amber-300":"bg-emerald-500/10 text-emerald-300";return <span className={`rounded-full px-2.5 py-1 text-xs font-black ${cls}`}>{value}</span>}
function BurnCard({title,window}:{title:string;window?:ReliabilityBurnWindowV74}){return <div className="card p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-bold">{title}</h2><p className="mt-1 text-sm text-slate-500">{window?.windowMinutes??"-"} phút · threshold {window?.alertThreshold??"-"}x</p></div><Status value={window?.status??"NO_DATA"}/></div><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4"><Mini label="Requests" value={String(window?.requests??0)}/><Mini label="5xx" value={String(window?.serverErrors??0)}/><Mini label="Error rate" value={window?`${window.errorRatePercent.toFixed(3)}%`:"-"}/><Mini label="Burn rate" value={window?`${window.burnRate.toFixed(3)}x`:"-"}/></div>{window?.sampleBufferTruncated&&<div className="mt-3 text-xs text-amber-300">PARTIAL: sample ring-buffer đã đầy; không tuyên bố window đầy đủ.</div>}</div>}
function postureTone(value?:string){return value==="ACTION_REQUIRED"?"text-rose-300":value==="WATCH"||value==="NO_DATA"?"text-amber-300":"text-emerald-300"}
