/* eslint-disable react-hooks/set-state-in-effect -- effects intentionally synchronize API/subscription state. */
"use client";

import { useCallback, useEffect, useState } from "react";
import { api, dateTime } from "@/lib/api";
import { clearAuth } from "@/lib/auth";
import type { PaymentBatchReconciliationResult, PaymentResilienceSummaryV67, PaymentWebhookRecoveryBatchResultV67, PaymentWebhookRecoveryResultV67, UserProfile } from "@/lib/types";

const REFRESH_MS=10_000;

function stateClass(state:string){
  if(state==="RECOVERED")return "border-emerald-700/60 bg-emerald-950/35 text-emerald-200";
  if(state==="DEAD_LETTER")return "border-rose-700/60 bg-rose-950/35 text-rose-200";
  if(state==="ORPHANED")return "border-amber-700/60 bg-amber-950/35 text-amber-200";
  if(state==="RECOVERY_PENDING")return "border-cyan-700/60 bg-cyan-950/35 text-cyan-200";
  return "border-slate-700 bg-slate-900/60 text-slate-300";
}

export default function PaymentResilienceV67(){
  const [summary,setSummary]=useState<PaymentResilienceSummaryV67|null>(null);
  const [busy,setBusy]=useState("");
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");

  const load=useCallback(async()=>{
    try{
      const me=await api<UserProfile>("/me");
      if(me.role!=="ADMIN"){clearAuth();window.location.assign("/login?returnTo=/admin/payment-resilience&reason=admin");return;}
      setSummary(await api<PaymentResilienceSummaryV67>("/admin/payment-resilience/summary"));
      setError("");
    }catch(e){setError((e as Error).message);}
  },[]);

  useEffect(()=>{void load();const id=window.setInterval(()=>void load(),REFRESH_MS);return()=>window.clearInterval(id);},[load]);

  async function recover(id:string){setBusy(id);setMessage("");setError("");try{const r=await api<PaymentWebhookRecoveryResultV67>(`/admin/payment-resilience/webhooks/${id}/recover`,{method:"POST"});setMessage(`${r.recovered?"Recovery thành công":"Recovery chưa hoàn tất"}: ${r.deliveryState} · ${r.message}`);await load();}catch(e){setError((e as Error).message)}finally{setBusy("")}}
  async function recoverDue(){setBusy("recover-due");setMessage("");setError("");try{const r=await api<PaymentWebhookRecoveryBatchResultV67>("/admin/payment-resilience/recover-due",{method:"POST"});setMessage(`Webhook recovery: quét ${r.scanned}, recovered ${r.recovered}, pending ${r.pending}, dead-letter ${r.deadLetter}.`);await load();}catch(e){setError((e as Error).message)}finally{setBusy("")}}
  async function reconcileDue(){setBusy("reconcile-due");setMessage("");setError("");try{const r=await api<PaymentBatchReconciliationResult>("/admin/payment-resilience/reconcile-due",{method:"POST"});setMessage(`Gateway reconciliation: quét ${r.scanned}, thành công ${r.succeeded}, lỗi ${r.failed}.`);await load();}catch(e){setError((e as Error).message)}finally{setBusy("")}}

  return <div className="space-y-6" data-testid="payment-resilience-v67">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="section-kicker">V67 · PAYMENT RESILIENCE & RECONCILIATION 5.0</p><h1 className="text-3xl font-black">💳 Payment Resilience</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Tự động đối soát gateway, recovery webhook an toàn bằng provider query, dead-letter queue và trạng thái refund settlement bền vững. Không replay mù payload webhook và không tin dữ liệu callback đã lưu để đổi trạng thái payment.</p></div>
      <div className="flex flex-wrap gap-2"><a className="btn btn-secondary" href="/admin/payments">Payment V60</a><a className="btn btn-secondary" href="/admin">← Dashboard</a><button data-testid="payment-reconcile-due-v67" className="btn btn-primary" disabled={busy!==""} onClick={reconcileDue}>{busy==="reconcile-due"?"Đang đối soát...":"Đối soát đến hạn"}</button><button data-testid="webhook-recover-due-v67" className="btn btn-primary" disabled={busy!==""} onClick={recoverDue}>{busy==="recover-due"?"Đang recovery...":"Recovery webhook"}</button></div>
    </div>

    {error&&<div data-testid="payment-resilience-error-v67" className="rounded-2xl border border-rose-800/70 bg-rose-950/40 p-4 text-rose-200">{error}</div>}
    {message&&<div className="rounded-2xl border border-emerald-800/70 bg-emerald-950/35 p-4 text-emerald-200">{message}</div>}

    <section className="card p-5" data-testid="payment-resilience-strategy-v67"><div className="grid gap-3 md:grid-cols-4"><Info label="Strategy" value={summary?.strategyVersion||"V67-PAYMENT-RESILIENCE-5"}/><Info label="Auto reconcile" value={summary===null?"UNKNOWN":summary.autoReconcileEnabled?"ENABLED":"DISABLED"}/><Info label="Webhook recovery" value={summary===null?"UNKNOWN":summary.webhookRecoveryEnabled?"ENABLED":"DISABLED"}/><Info label="Server" value={summary?.evaluatedAt?dateTime(summary.evaluatedAt):"—"}/></div><div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/50 p-4 text-sm leading-6 text-slate-300"><strong>Recovery policy:</strong> webhook hợp lệ nhưng orphan/pending chỉ được phục hồi bằng cách liên kết payment theo provider order rồi query VNPay/MoMo. Payload cũ không được replay như nguồn sự thật. Backoff có giới hạn; quá số lần thử sẽ chuyển <code>DEAD_LETTER</code> để Admin xử lý.</div></section>

    <div data-testid="payment-resilience-summary-v67" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <Metric label="Due reconcile" value={summary?.dueReconcile??"—"}/><Metric label="Remote pending/review" value={summary?.remotePendingOrReview??"—"}/><Metric label="Webhook orphaned" value={summary?.webhookOrphaned??"—"}/><Metric label="Recovery pending" value={summary?.webhookRecoveryPending??"—"}/><Metric label="Dead letter" value={summary?.webhookDeadLetter??"—"}/>
    </div>

    <div className="grid gap-4 lg:grid-cols-2">
      <section className="card p-5" data-testid="payment-reconcile-policy-v67"><h2 className="text-lg font-black">Gateway reconciliation</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><Info label="Scan" value={`${summary?.reconcileScanMs??60000} ms`}/><Info label="Min age" value={`${summary?.reconcileMinAgeSeconds??45}s`}/><Info label="Batch" value={String(summary?.reconcileMaxBatch??20)}/><Info label="Max backoff" value={`${summary?.reconcileMaxBackoffSeconds??900}s`}/></div><p className="mt-4 text-sm leading-6 text-slate-400">PENDING/REVIEW của VNPay/MoMo được query lại theo lịch. Success chỉ được ghi khi gateway query hợp lệ và amount khớp.</p></section>
      <section className="card p-5" data-testid="refund-settlement-v67"><h2 className="text-lg font-black">Refund settlement state</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><MetricSmall label="Requested" value={summary?.refundRequested??"—"}/><MetricSmall label="Evidence required" value={summary?.refundEvidenceRequired??"—"}/><MetricSmall label="Settled" value={summary?.refundSettled??"—"}/><MetricSmall label="Failed" value={summary?.refundFailed??"—"}/></div><p className="mt-4 text-sm leading-6 text-slate-400">Refund thật chỉ chuyển <code>SETTLED</code> khi workflow hoàn tất; provider reference và operation key được giữ để chống ghi nhận trùng.</p></section>
    </div>

    <section className="card overflow-hidden" data-testid="webhook-recovery-queue-v67"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-5"><div><h2 className="text-lg font-black">Webhook recovery queue</h2><p className="text-sm text-slate-500">RECEIVED / ORPHANED / RECOVERY_PENDING / DEAD_LETTER · recovered tổng: {summary?.webhookRecovered??"—"}</p></div><span className="text-xs text-slate-500">Max attempts: {summary?.webhookRecoveryMaxAttempts??5}</span></div><div className="overflow-x-auto"><table className="w-full min-w-[1180px] text-sm"><thead><tr className="text-left text-slate-500"><th className="p-3">State</th><th className="p-3">Provider</th><th className="p-3">Event key</th><th className="p-3">Payment</th><th className="p-3">Attempts</th><th className="p-3">Received</th><th className="p-3">Message</th><th className="p-3">Action</th></tr></thead><tbody>{summary?.recoveryQueue.length?summary.recoveryQueue.map(x=><tr key={x.id} className="border-t border-slate-800/80"><td className="p-3"><span className={`inline-flex rounded-full border px-2 py-1 text-xs font-bold ${stateClass(x.deliveryState)}`}>{x.deliveryState}</span></td><td className="p-3 font-bold">{x.provider}</td><td className="max-w-xs break-all p-3 font-mono text-xs">{x.eventKey}</td><td className="p-3 font-mono text-xs text-slate-400">{x.paymentId?`${x.paymentId.slice(0,12)}…`:"—"}</td><td className="p-3">{x.recoveryAttempts}</td><td className="p-3 text-xs">{dateTime(x.receivedAt)}</td><td className="max-w-md p-3 text-xs text-slate-400">{x.recoveryMessage||"—"}</td><td className="p-3"><button className="btn btn-secondary !px-3 !py-2" disabled={busy!==""||x.deliveryState==="RECOVERED"} onClick={()=>recover(x.id)}>{busy===x.id?"Đang recovery...":"Recovery"}</button></td></tr>):<tr><td colSpan={8} className="p-5 text-slate-500">Không có webhook cần recovery.</td></tr>}</tbody></table></div></section>
  </div>;
}

function Metric({label,value}:{label:string;value:string|number}){return <div className="card p-4"><div className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</div><div className="mt-2 text-2xl font-black">{value}</div></div>}
function MetricSmall({label,value}:{label:string;value:string|number}){return <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3"><div className="text-xs text-slate-500">{label}</div><div className="mt-1 text-xl font-black">{value}</div></div>}
function Info({label,value}:{label:string;value:string}){return <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3"><div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</div><div className="mt-1 break-all text-sm font-bold text-slate-200">{value}</div></div>}
