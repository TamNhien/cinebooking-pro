"use client";
import { useEffect, useMemo, useState } from "react";
import { api, currency, dateTime } from "@/lib/api";
import { getAuth } from "@/lib/auth";
import type { FinancialDashboard, FinancialReconciliationIssue } from "@/lib/types";

function amount(entry: FinancialDashboard["ledgerEntries"][number]) {
  return entry.lines.filter(x=>x.direction==="DEBIT").reduce((sum,x)=>sum+x.amount,0);
}

export default function AdminFinancePage(){
  const [data,setData]=useState<FinancialDashboard|null>(null);
  const [date,setDate]=useState("");
  const [busy,setBusy]=useState(false);
  const [msg,setMsg]=useState("");

  async function load(day?:string){
    try{
      const d=await api<FinancialDashboard>(`/admin/finance${day?`?date=${day}`:""}`);
      setData(d);setDate(d.businessDate);
    }catch(e){setMsg((e as Error).message);}
  }
  useEffect(()=>{const auth=getAuth();if(!auth){location.href="/login?returnTo=/admin/finance&reason=required";return;}void load();},[]);
  async function reconcile(){if(!date)return;setBusy(true);setMsg("");try{const run=await api<{status:string;issueCount:number}>(`/admin/finance/reconcile?date=${date}`,{method:"POST"});setMsg(run.status==="CLEAN"?"Đối soát sạch: không phát hiện sai lệch.":`Đối soát phát hiện ${run.issueCount} vấn đề cần kiểm tra.`);await load(date);}catch(e){setMsg((e as Error).message);}finally{setBusy(false);}}
  async function resolve(issue:FinancialReconciliationIssue){setBusy(true);try{await api(`/admin/finance/issues/${issue.id}/resolve`,{method:"POST"});await load(date);}catch(e){setMsg((e as Error).message);}finally{setBusy(false);}}
  const openForDate=useMemo(()=>data?.openIssues.filter(i=>i.runId===data.latestRun?.id)||[],[data]);

  if(!data)return <div className="card p-6">Đang tải Financial Operations...</div>;
  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><div className="text-xs font-black tracking-[.22em] text-emerald-400">CINEBOOKING · V42</div><h1 className="text-3xl font-black">Financial Ledger & Reconciliation</h1><p className="text-sm text-slate-400">Sổ cái double-entry bất biến, daily close và đối soát payment/refund/loyalty.</p></div>
      <a className="btn btn-secondary" href="/admin">← Admin</a>
    </div>

    <div className="card flex flex-wrap items-end gap-3 p-5">
      <label className="space-y-1"><span className="text-xs text-slate-400">Ngày nghiệp vụ (Asia/Ho_Chi_Minh)</span><input data-testid="finance-business-date" className="input" type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
      <button data-testid="finance-load" className="btn btn-secondary" onClick={()=>load(date)}>Tải ngày</button>
      <button data-testid="finance-reconcile" className="btn btn-primary" disabled={busy} onClick={reconcile}>{busy?"Đang đối soát...":"Chạy đối soát"}</button>
      {msg&&<div className="text-sm">{msg}</div>}
    </div>

    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="card p-4"><div className="text-xs text-slate-400">Captured</div><div data-testid="finance-captured" className="text-2xl font-black">{currency(data.capturedAmount)}</div></div>
      <div className="card p-4"><div className="text-xs text-slate-400">Refunded</div><div data-testid="finance-refunded" className="text-2xl font-black">{currency(data.refundedAmount)}</div></div>
      <div className="card p-4"><div className="text-xs text-slate-400">Net</div><div data-testid="finance-net" className="text-2xl font-black">{currency(data.netAmount)}</div></div>
      <div className="card p-4"><div className="text-xs text-slate-400">Latest close</div><div data-testid="finance-run-status" className="text-2xl font-black">{data.latestRun?.status||"CHƯA CHẠY"}</div><div className="text-xs text-slate-500">{data.latestRun?`${data.latestRun.issueCount} issue · ${data.latestRun.loyaltyUsersChecked} loyalty users`:"-"}</div></div>
    </div>

    <section className="card p-5 space-y-3" data-testid="finance-ledger-section">
      <div><h2 className="text-xl font-black">Immutable Ledger</h2><p className="text-sm text-slate-400">Mỗi event có debit = credit. V42 chặn UPDATE/DELETE ở database.</p></div>
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-slate-400"><th className="p-2">Thời gian</th><th className="p-2">Event</th><th className="p-2">Amount</th><th className="p-2">Accounts</th><th className="p-2">Key</th></tr></thead><tbody>{data.ledgerEntries.map(e=><tr key={e.id} className="border-t border-slate-800" data-testid="finance-ledger-entry"><td className="p-2 whitespace-nowrap">{dateTime(e.occurredAt)}</td><td className="p-2 font-bold">{e.eventType}</td><td className="p-2">{currency(amount(e))}</td><td className="p-2 text-xs">{e.lines.map(l=>`${l.direction} ${l.accountCode}`).join(" · ")||"ZERO"}</td><td className="p-2 font-mono text-xs">{e.eventKey}</td></tr>)}{data.ledgerEntries.length===0&&<tr><td className="p-4 text-slate-500" colSpan={5}>Chưa có financial event trong ngày này.</td></tr>}</tbody></table></div>
    </section>

    <section className="card p-5 space-y-3" data-testid="finance-issues-section">
      <div><h2 className="text-xl font-black">Reconciliation Issues</h2><p className="text-sm text-slate-400">Missing ledger, amount mismatch và loyalty lot mismatch được giữ lại để Admin xử lý.</p></div>
      {openForDate.length===0?<div data-testid="finance-clean-state" className="rounded-xl border border-emerald-900/60 p-4 text-emerald-300">Không có issue đang mở cho lần đối soát gần nhất.</div>:<div className="space-y-2">{openForDate.map(i=><article key={i.id} className="rounded-xl border border-slate-800 p-4" data-testid="finance-issue"><div className="flex flex-wrap items-center justify-between gap-2"><div><b>{i.severity} · {i.issueType}</b><div className="text-sm text-slate-400">{i.message}</div><div className="text-xs text-slate-500">Expected {i.expectedValue ?? "-"} · Actual {i.actualValue ?? "-"}</div></div><button className="btn btn-secondary" disabled={busy} onClick={()=>resolve(i)}>Đánh dấu đã xử lý</button></div></article>)}</div>}
    </section>

    <section className="card p-5"><h2 className="mb-3 text-xl font-black">Recent reconciliation runs</h2><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-slate-400"><th className="p-2">Ngày</th><th className="p-2">Status</th><th className="p-2">Captured</th><th className="p-2">Refund</th><th className="p-2">Issues</th><th className="p-2">Actor</th></tr></thead><tbody>{data.recentRuns.map(r=><tr key={r.id} className="border-t border-slate-800"><td className="p-2">{r.businessDate}</td><td className="p-2 font-bold">{r.status}</td><td className="p-2">{currency(r.paymentAmount)}</td><td className="p-2">{currency(r.refundAmount)}</td><td className="p-2">{r.issueCount}</td><td className="p-2">{r.startedBy}</td></tr>)}</tbody></table></div></section>
  </div>;
}
