"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, dateTime } from "@/lib/api";
import { clearAuth, getAuth } from "@/lib/auth";
import type { ObservabilitySummaryV65, ObservabilitySloV65, UserProfile } from "@/lib/types";

const REFRESH_MS=10_000;

export default function ObservabilityV65Page(){
  const [summary,setSummary]=useState<ObservabilitySummaryV65|null>(null);
  const [msg,setMsg]=useState("");
  const [busy,setBusy]=useState(false);

  const load=useCallback(async()=>{
    setBusy(true);
    try{
      const me=await api<UserProfile>("/me");
      if(me.role!=="ADMIN"){
        clearAuth();location.href="/login?returnTo=/admin/observability&reason=admin";return;
      }
      setSummary(await api<ObservabilitySummaryV65>("/admin/observability/summary"));
      setMsg("");
    }catch(e){
      setMsg((e as Error).message);
    }finally{setBusy(false)}
  },[]);

  useEffect(()=>{
    if(!getAuth()){location.href="/login?returnTo=/admin/observability&reason=required";return;}
    void load();
    const timer=window.setInterval(()=>void load(),REFRESH_MS);
    return()=>window.clearInterval(timer);
  },[load]);

  const heapPercent=useMemo(()=>summary&&summary.runtime.heapMaxBytes>0?summary.runtime.heapUsedBytes*100/summary.runtime.heapMaxBytes:0,[summary]);

  return <div className="space-y-7" data-testid="observability-v65">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="mb-2 text-sm text-slate-400"><Link href="/admin" className="hover:text-white">Admin</Link> / Observability & Reliability</div>
        <div className="text-xs font-black tracking-[0.22em] text-cyan-300">V65 · OBSERVABILITY & RELIABILITY 4.0</div>
        <h1 className="mt-2 text-3xl font-bold">Metrics · Logs · Trace · SLO</h1>
        <p className="mt-1 max-w-4xl text-slate-400">Quan sát trực tiếp replica backend đang phục vụ request; Prometheus/Grafana tổng hợp cả 2 replica. Trace ID được trả về bằng header X-Trace-Id và được gắn vào log backend.</p>
      </div>
      <div className="flex gap-2"><button className="btn btn-primary" onClick={()=>void load()} disabled={busy}>{busy?"Đang tải...":"↻ Làm mới"}</button><Link href="/admin" className="btn btn-secondary">← Dashboard</Link></div>
    </div>

    {msg&&<div className="card border border-rose-800/60 p-4 text-sm text-rose-200">{msg}</div>}

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5" data-testid="observability-summary-v65">
      <Metric label="Strategy" value={summary?.strategyVersion??"V65-OBSERVABILITY-RELIABILITY-4"} compact/>
      <Metric label="Replica" value={summary?.instanceId??"-"} compact/>
      <Metric label={`Availability · ${summary?.windowMinutes??5}m`} value={summary?`${summary.availabilityPercent.toFixed(3)}%`:"-"} tone={statusTone(summary?.slos.find(s=>s.code==="availability"))}/>
      <Metric label="5xx error rate" value={summary?`${summary.errorRatePercent.toFixed(3)}%`:"-"} tone={statusTone(summary?.slos.find(s=>s.code==="error_rate"))}/>
      <Metric label="API P95" value={summary?`${summary.p95LatencyMs} ms`:"-"} tone={statusTone(summary?.slos.find(s=>s.code==="p95_latency"))}/>
    </div>

    <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
      <section className="card p-5" data-testid="slo-v65">
        <div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-bold">SLO health</h2><p className="mt-1 text-sm text-slate-500">Cửa sổ local replica {summary?.windowMinutes??5} phút. Không có traffic thì hiển thị NO_DATA thay vì báo PASS giả.</p></div><Badge status={summary?.overallStatus??"NO_DATA"}/></div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">{summary?.slos.map(s=><SloCard key={s.code} slo={s}/>)??<div className="text-sm text-slate-500">Đang tải SLO...</div>}</div>
      </section>

      <section className="card p-5" data-testid="dependencies-v65">
        <h2 className="text-xl font-bold">Dependency probes</h2><p className="mt-1 text-sm text-slate-500">Probe đọc nhẹ, không ghi dữ liệu nghiệp vụ.</p>
        <div className="mt-4 space-y-3">{summary?.dependencies.map(d=><div key={d.name} className="flex items-center justify-between rounded-xl bg-slate-900/60 p-4"><div><div className="font-bold">{d.name}</div><div className="mt-1 text-xs text-slate-500">{d.detail}</div></div><div className="text-right"><Badge status={d.status}/><div className="mt-1 text-xs text-slate-500">{d.latencyMs} ms</div></div></div>)}</div>
      </section>
    </div>

    <div className="grid gap-6 xl:grid-cols-2">
      <section className="card p-5" data-testid="runtime-v65"><h2 className="text-xl font-bold">Runtime</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><RuntimeMetric label="Uptime" value={formatDuration(summary?.runtime.uptimeSeconds??0)}/><RuntimeMetric label="Heap" value={`${formatBytes(summary?.runtime.heapUsedBytes??0)} / ${formatBytes(summary?.runtime.heapMaxBytes??0)}`} detail={`${heapPercent.toFixed(1)}%`}/><RuntimeMetric label="Threads" value={String(summary?.runtime.liveThreads??0)}/><RuntimeMetric label="CPU logical" value={String(summary?.runtime.availableProcessors??0)}/><RuntimeMetric label="Active requests" value={String(summary?.runtime.activeRequests??0)}/><RuntimeMetric label="Requests window" value={String(summary?.requestsInWindow??0)} detail={`5xx: ${summary?.serverErrorsInWindow??0}`}/></div></section>
      <section className="card p-5" data-testid="stack-v65"><h2 className="text-xl font-bold">Prometheus / Grafana</h2><div className="mt-4 space-y-3 text-sm text-slate-300"><div className="rounded-xl bg-slate-900/60 p-4"><div className="font-bold">Metrics endpoint</div><code className="mt-1 block text-cyan-300">{summary?.prometheusPath??"/actuator/prometheus"}</code><div className="mt-2 text-xs text-slate-500">Không proxy qua nginx public; Prometheus scrape trực tiếp backend replicas trong Docker network.</div></div><div className="rounded-xl bg-slate-900/60 p-4"><div className="font-bold">Bật observability profile</div><code className="mt-1 block break-all text-emerald-300">docker compose --profile observability up -d prometheus grafana</code><div className="mt-2 text-xs text-slate-500">Dashboard provisioned: CineBooking V65 · Observability & Reliability.</div></div></div></section>
    </div>

    <section className="card overflow-hidden" data-testid="recent-traces-v65">
      <div className="border-b border-slate-800 p-5"><h2 className="text-xl font-bold">Recent request traces</h2><p className="mt-1 text-sm text-slate-500">Chỉ lưu ring-buffer in-memory của replica, path đã normalize ID/query để tránh high-cardinality và lộ dữ liệu. Dùng trace ID để grep log.</p></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-slate-900/70 text-xs uppercase text-slate-500"><tr><th className="p-3">Thời gian</th><th className="p-3">Method</th><th className="p-3">Path</th><th className="p-3">Status</th><th className="p-3">Latency</th><th className="p-3">Trace ID</th></tr></thead><tbody className="divide-y divide-slate-800">{summary?.recentRequests.map((r,i)=><tr key={`${r.traceId}-${i}`}><td className="p-3 text-slate-400">{dateTime(r.at)}</td><td className="p-3 font-bold">{r.method}</td><td className="p-3"><code>{r.path}</code></td><td className={`p-3 font-bold ${r.status>=500?"text-rose-300":r.status>=400?"text-amber-300":"text-emerald-300"}`}>{r.status}</td><td className="p-3">{r.durationMs} ms</td><td className="p-3"><code className="text-cyan-300">{r.traceId}</code></td></tr>)}{summary&&summary.recentRequests.length===0&&<tr><td className="p-4 text-slate-500" colSpan={6}>Chưa có request sample trên replica này.</td></tr>}</tbody></table></div>
    </section>

    <div className="card p-5 text-sm text-slate-400"><b className="text-white">Trace nhanh:</b> lấy <code>{summary?.traceHeader??"X-Trace-Id"}</code> từ response rồi chạy <code>docker compose logs backend-1 backend-2 | Select-String &quot;&lt;TRACE_ID&gt;&quot;</code>. V65 không ghi token, query-string hay payload vào request telemetry.</div>
  </div>;
}

function Metric({label,value,tone="text-white",compact=false}:{label:string;value:string;tone?:string;compact?:boolean}){return <div className="card p-5"><div className="text-xs uppercase tracking-wider text-slate-500">{label}</div><div className={`mt-2 font-black ${compact?"break-all text-sm":"text-3xl"} ${tone}`}>{value}</div></div>}
function RuntimeMetric({label,value,detail}:{label:string;value:string;detail?:string}){return <div className="rounded-xl bg-slate-900/60 p-4"><div className="text-xs text-slate-500">{label}</div><div className="mt-1 font-bold">{value}</div>{detail&&<div className="mt-1 text-xs text-slate-500">{detail}</div>}</div>}
function SloCard({slo}:{slo:ObservabilitySloV65}){return <div className="rounded-xl bg-slate-900/60 p-4"><div className="flex items-start justify-between gap-2"><div className="font-bold">{slo.label}</div><Badge status={slo.status}/></div><div className={`mt-3 text-2xl font-black ${statusTone(slo)}`}>{formatSlo(slo.currentValue,slo.unit)}</div><div className="mt-1 text-xs text-slate-500">Target {slo.comparison} {formatSlo(slo.targetValue,slo.unit)} · n={slo.sampleCount}</div></div>}
function Badge({status}:{status:string}){const cls=status==="PASS"?"bg-emerald-500/10 text-emerald-300":status==="FAIL"?"bg-rose-500/10 text-rose-300":status==="WARN"?"bg-amber-500/10 text-amber-300":"bg-slate-700/50 text-slate-300";return <span className={`rounded-full px-2.5 py-1 text-xs font-black ${cls}`}>{status}</span>}
function statusTone(slo?:ObservabilitySloV65){if(!slo||slo.status==="NO_DATA")return "text-slate-300";return slo.status==="PASS"?"text-emerald-300":slo.status==="FAIL"?"text-rose-300":"text-amber-300"}
function formatSlo(v:number,unit:string){return unit==="%"?`${v.toFixed(3)}%`:unit==="ms"?`${Math.round(v)} ms`:`${v} ${unit}`}
function formatBytes(v:number){if(v<=0)return "0 B";const u=["B","KB","MB","GB"];const i=Math.min(u.length-1,Math.floor(Math.log(v)/Math.log(1024)));return `${(v/1024**i).toFixed(i>1?1:0)} ${u[i]}`}
function formatDuration(s:number){const h=Math.floor(s/3600),m=Math.floor((s%3600)/60);return h>0?`${h}h ${m}m`:`${m}m`}
