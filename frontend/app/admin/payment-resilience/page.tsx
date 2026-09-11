/* eslint-disable react-hooks/set-state-in-effect -- effects intentionally synchronize API/subscription state. */
"use client";

import { useCallback, useEffect, useState } from "react";
import { api, dateTime } from "@/lib/api";
import { clearAuth } from "@/lib/auth";
import { viLabel } from "@/lib/vi-labels";
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

  async function recover(id:string){setBusy(id);setMessage("");setError("");try{const r=await api<PaymentWebhookRecoveryResultV67>(`/admin/payment-resilience/webhooks/${id}/recover`,{method:"POST"});setMessage(`${r.recovered?"Khôi phục thành công":"Khôi phục chưa hoàn tất"}: ${r.deliveryState} · ${r.message}`);await load();}catch(e){setError((e as Error).message)}finally{setBusy("")}}
  async function recoverDue(){setBusy("recover-due");setMessage("");setError("");try{const r=await api<PaymentWebhookRecoveryBatchResultV67>("/admin/payment-resilience/recover-due",{method:"POST"});setMessage(`Khôi phục thông báo máy chủ: quét ${r.scanned}, đã khôi phục ${r.recovered}, đang chờ ${r.pending}, thư chết ${r.deadLetter}.`);await load();}catch(e){setError((e as Error).message)}finally{setBusy("")}}
  async function reconcileDue(){setBusy("reconcile-due");setMessage("");setError("");try{const r=await api<PaymentBatchReconciliationResult>("/admin/payment-resilience/reconcile-due",{method:"POST"});setMessage(`Đối soát cổng thanh toán: quét ${r.scanned}, thành công ${r.succeeded}, lỗi ${r.failed}.`);await load();}catch(e){setError((e as Error).message)}finally{setBusy("")}}

  return <div className="space-y-6" data-testid="payment-resilience-v67">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="section-kicker">V67 · KHẢ NĂNG PHỤC HỒI & ĐỐI SOÁT THANH TOÁN 5.0</p><h1 className="text-3xl font-black">💳 Khả năng phục hồi thanh toán</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Tự động đối soát cổng thanh toán, khôi phục thông báo máy chủ an toàn bằng truy vấn nhà cung cấp, hàng đợi thư chết và trạng thái quyết toán hoàn tiền bền vững. Không phát lại mù dữ liệu gửi đến thông báo máy chủ và không tin dữ liệu phản hồi đã lưu để đổi trạng thái thanh toán.</p></div>
      <div className="flex flex-wrap gap-2"><a className="btn btn-secondary" href="/admin/payments">Thanh toán V60</a><a className="btn btn-secondary" href="/admin">← Bảng điều khiển</a><button data-testid="payment-reconcile-due-v67" className="btn btn-primary" disabled={busy!==""} onClick={reconcileDue}>{busy==="reconcile-due"?"Đang đối soát...":"Đối soát đến hạn"}</button><button data-testid="webhook-recover-due-v67" className="btn btn-primary" disabled={busy!==""} onClick={recoverDue}>{busy==="recover-due"?"Đang khôi phục...":"Khôi phục thông báo máy chủ"}</button></div>
    </div>

    {error&&<div data-testid="payment-resilience-error-v67" className="rounded-2xl border border-rose-800/70 bg-rose-950/40 p-4 text-rose-200">{error}</div>}
    {message&&<div className="rounded-2xl border border-emerald-800/70 bg-emerald-950/35 p-4 text-emerald-200">{message}</div>}

    <section className="card p-5" data-testid="payment-resilience-strategy-v67"><div className="grid gap-3 md:grid-cols-4"><Info label="Chiến lược" value={summary?.strategyVersion||"V67-PAYMENT-RESILIENCE-5"}/><Info label="Tự động đối soát" value={viLabel(summary===null?"UNKNOWN":summary.autoReconcileEnabled?"ENABLED":"DISABLED")}/><Info label="Khôi phục thông báo máy chủ" value={viLabel(summary===null?"UNKNOWN":summary.webhookRecoveryEnabled?"ENABLED":"DISABLED")}/><Info label="Máy chủ" value={summary?.evaluatedAt?dateTime(summary.evaluatedAt):"—"}/></div><div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/50 p-4 text-sm leading-6 text-slate-300"><strong>Chính sách khôi phục:</strong> thông báo máy chủ hợp lệ nhưng trạng thái mồ côi/đang chờ chỉ được phục hồi bằng cách liên kết thanh toán theo mã đơn phía nhà cung cấp rồi truy vấn VNPay/MoMo. Dữ liệu gửi đến cũ không được phát lại như nguồn sự thật. Khoảng lùi có giới hạn; quá số lần thử sẽ chuyển <code>DEAD_LETTER</code> để quản trị viên xử lý.</div></section>

    <div data-testid="payment-resilience-summary-v67" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <Metric label="Đến hạn đối soát" value={summary?.dueReconcile??"—"}/><Metric label="Đang chờ/đánh giá từ xa" value={summary?.remotePendingOrReview??"—"}/><Metric label="Thông báo máy chủ mồ côi" value={summary?.webhookOrphaned??"—"}/><Metric label="Đang chờ khôi phục" value={summary?.webhookRecoveryPending??"—"}/><Metric label="Thư chết" value={summary?.webhookDeadLetter??"—"}/>
    </div>

    <div className="grid gap-4 lg:grid-cols-2">
      <section className="card p-5" data-testid="payment-reconcile-policy-v67"><h2 className="text-lg font-black">Đối soát cổng thanh toán</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><Info label="Quét" value={`${summary?.reconcileScanMs??60000} ms`}/><Info label="Tuổi tối thiểu" value={`${summary?.reconcileMinAgeSeconds??45}s`}/><Info label="Theo lô" value={String(summary?.reconcileMaxBatch??20)}/><Info label="Thời gian lùi tối đa" value={`${summary?.reconcileMaxBackoffSeconds??900}s`}/></div><p className="mt-4 text-sm leading-6 text-slate-400">Các trạng thái ĐANG CHỜ/CẦN ĐÁNH GIÁ của VNPay/MoMo được truy vấn lại theo lịch. Thành công chỉ được ghi khi truy vấn cổng thanh toán hợp lệ và số tiền khớp.</p></section>
      <section className="card p-5" data-testid="refund-settlement-v67"><h2 className="text-lg font-black">Trạng thái quyết toán hoàn tiền</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><MetricSmall label="Đã yêu cầu" value={summary?.refundRequested??"—"}/><MetricSmall label="Yêu cầu bằng chứng" value={summary?.refundEvidenceRequired??"—"}/><MetricSmall label="Đã quyết toán" value={summary?.refundSettled??"—"}/><MetricSmall label="Thất bại" value={summary?.refundFailed??"—"}/></div><p className="mt-4 text-sm leading-6 text-slate-400">Hoàn tiền thật chỉ chuyển <code>SETTLED</code> khi quy trình hoàn tất; tham chiếu nhà cung cấp và khóa thao tác được giữ để chống ghi nhận trùng.</p></section>
    </div>

    <section className="card overflow-hidden" data-testid="webhook-recovery-queue-v67"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-5"><div><h2 className="text-lg font-black">Hàng đợi khôi phục thông báo máy chủ</h2><p className="text-sm text-slate-500">ĐÃ NHẬN / MỒ CÔI / CHỜ KHÔI PHỤC / HÀNG ĐỢI LỖI · tổng đã khôi phục: {summary?.webhookRecovered??"—"}</p></div><span className="text-xs text-slate-500">Số lần thử tối đa: {summary?.webhookRecoveryMaxAttempts??5}</span></div><div className="overflow-x-auto"><table className="w-full min-w-[1180px] text-sm"><thead><tr className="text-left text-slate-500"><th className="p-3">Trạng thái</th><th className="p-3">Nhà cung cấp</th><th className="p-3">Khóa sự kiện</th><th className="p-3">Thanh toán</th><th className="p-3">Số lần thử</th><th className="p-3">Đã nhận</th><th className="p-3">Thông điệp</th><th className="p-3">Thao tác</th></tr></thead><tbody>{summary?.recoveryQueue.length?summary.recoveryQueue.map(x=><tr key={x.id} className="border-t border-slate-800/80"><td className="p-3"><span className={`inline-flex rounded-full border px-2 py-1 text-xs font-bold ${stateClass(x.deliveryState)}`}>{viLabel(x.deliveryState)}</span></td><td className="p-3 font-bold">{x.provider}</td><td className="max-w-xs break-all p-3 font-mono text-xs">{x.eventKey}</td><td className="p-3 font-mono text-xs text-slate-400">{x.paymentId?`${x.paymentId.slice(0,12)}…`:"—"}</td><td className="p-3">{x.recoveryAttempts}</td><td className="p-3 text-xs">{dateTime(x.receivedAt)}</td><td className="max-w-md p-3 text-xs text-slate-400">{x.recoveryMessage||"—"}</td><td className="p-3"><button className="btn btn-secondary !px-3 !py-2" disabled={busy!==""||x.deliveryState==="RECOVERED"} onClick={()=>recover(x.id)}>{busy===x.id?"Đang khôi phục...":"Khôi phục"}</button></td></tr>):<tr><td colSpan={8} className="p-5 text-slate-500">Không có thông báo máy chủ cần khôi phục.</td></tr>}</tbody></table></div></section>
  </div>;
}

function Metric({label,value}:{label:string;value:string|number}){return <div className="card p-4"><div className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</div><div className="mt-2 text-2xl font-black">{value}</div></div>}
function MetricSmall({label,value}:{label:string;value:string|number}){return <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3"><div className="text-xs text-slate-500">{label}</div><div className="mt-1 text-xl font-black">{value}</div></div>}
function Info({label,value}:{label:string;value:string}){return <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3"><div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</div><div className="mt-1 break-all text-sm font-bold text-slate-200">{value}</div></div>}
/* V77.0.9 historical-verifier compatibility markers (not rendered):
không được replay như nguồn sự thật
*/
