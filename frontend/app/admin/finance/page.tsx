/* eslint-disable react-hooks/set-state-in-effect -- effects intentionally synchronize API/subscription state. */
"use client";
import { useEffect, useMemo, useState } from "react";
import { api, currency, dateTime } from "@/lib/api";
import { getAuth } from "@/lib/auth";
import type { FinancialDashboard, FinancialReconciliationIssue } from "@/lib/types";
import { viLabel } from "@/lib/vi-labels";

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
  useEffect(()=>{const auth=getAuth();if(!auth){window.location.assign("/login?returnTo=/admin/finance&reason=required");return;}void load();},[]);
  async function reconcile(){if(!date)return;setBusy(true);setMsg("");try{const run=await api<{status:string;issueCount:number}>(`/admin/finance/reconcile?date=${date}`,{method:"POST"});setMsg(run.status==="CLEAN"?"Đối soát sạch: không phát hiện sai lệch.":`Đối soát phát hiện ${run.issueCount} vấn đề cần kiểm tra.`);await load(date);}catch(e){setMsg((e as Error).message);}finally{setBusy(false);}}
  async function resolve(issue:FinancialReconciliationIssue){setBusy(true);try{await api(`/admin/finance/issues/${issue.id}/resolve`,{method:"POST"});await load(date);}catch(e){setMsg((e as Error).message);}finally{setBusy(false);}}
  const openForDate=useMemo(()=>data?.openIssues.filter(i=>i.runId===data.latestRun?.id)||[],[data]);

  if(!data)return <div className="card p-6">Đang tải vận hành tài chính...</div>;
  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><div className="text-xs font-black tracking-[.22em] text-emerald-400">CINEBOOKING · V42</div><h1 className="text-3xl font-black">Sổ cái tài chính & đối soát</h1><p className="text-sm text-slate-400">Sổ cái kế toán kép bất biến, chốt sổ hằng ngày và đối soát thanh toán/hoàn tiền/điểm thân thiết.</p></div>
      <a className="btn btn-secondary" href="/admin">← Quản trị</a>
    </div>

    <div className="card flex flex-wrap items-end gap-3 p-5">
      <label className="space-y-1"><span className="text-xs text-slate-400">Ngày nghiệp vụ (Asia/Ho_Chi_Minh)</span><input data-testid="finance-business-date" className="input" type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
      <button data-testid="finance-load" className="btn btn-secondary" onClick={()=>load(date)}>Tải ngày</button>
      <button data-testid="finance-reconcile" className="btn btn-primary" disabled={busy} onClick={reconcile}>{busy?"Đang đối soát...":"Chạy đối soát"}</button>
      {msg&&<div className="text-sm">{msg}</div>}
    </div>

    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="card p-4"><div className="text-xs text-slate-400">Đã ghi nhận</div><div data-testid="finance-captured" className="text-2xl font-black">{currency(data.capturedAmount)}</div></div>
      <div className="card p-4"><div className="text-xs text-slate-400">Đã hoàn tiền</div><div data-testid="finance-refunded" className="text-2xl font-black">{currency(data.refundedAmount)}</div></div>
      <div className="card p-4"><div className="text-xs text-slate-400">Ròng</div><div data-testid="finance-net" className="text-2xl font-black">{currency(data.netAmount)}</div></div>
      <div className="card p-4"><div className="text-xs text-slate-400">Lần chốt gần nhất</div><div data-testid="finance-run-status" className="text-2xl font-black">{data.latestRun?viLabel(data.latestRun.status):"CHƯA CHẠY"}</div><div className="text-xs text-slate-500">{data.latestRun?`${data.latestRun.issueCount} vấn đề · ${data.latestRun.loyaltyUsersChecked} tài khoản thành viên`:"-"}</div></div>
    </div>

    <section className="card p-5 space-y-3" data-testid="finance-ledger-section">
      <div><h2 className="text-xl font-black">Sổ cái bất biến</h2><p className="text-sm text-slate-400">Mỗi sự kiện có ghi nợ = ghi có. V42 chặn CẬP NHẬT/XÓA trong cơ sở dữ liệu.</p></div>
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-slate-400"><th className="p-2">Thời gian</th><th className="p-2">Sự kiện</th><th className="p-2">Số tiền</th><th className="p-2">Tài khoản</th><th className="p-2">Khóa</th></tr></thead><tbody>{data.ledgerEntries.map(e=><tr key={e.id} className="border-t border-slate-800" data-testid="finance-ledger-entry"><td className="p-2 whitespace-nowrap">{dateTime(e.occurredAt)}</td><td className="p-2 font-bold">{viLabel(e.eventType)}</td><td className="p-2">{currency(amount(e))}</td><td className="p-2 text-xs">{e.lines.map(l=>`${viLabel(l.direction)} ${l.accountCode}`).join(" · ")||"Không phát sinh"}</td><td className="p-2 font-mono text-xs">{e.eventKey}</td></tr>)}{data.ledgerEntries.length===0&&<tr><td className="p-4 text-slate-500" colSpan={5}>Chưa có sự kiện tài chính trong ngày này.</td></tr>}</tbody></table></div>
    </section>

    <section className="card p-5 space-y-3" data-testid="finance-issues-section">
      <div><h2 className="text-xl font-black">Vấn đề đối soát</h2><p className="text-sm text-slate-400">Thiếu bút toán, sai lệch số tiền và sai lệch lô điểm thân thiết được giữ lại để quản trị viên xử lý.</p></div>
      {openForDate.length===0?<div data-testid="finance-clean-state" className="rounded-xl border border-emerald-900/60 p-4 text-emerald-300">Không có vấn đề đang mở cho lần đối soát gần nhất.</div>:<div className="space-y-2">{openForDate.map(i=><article key={i.id} className="rounded-xl border border-slate-800 p-4" data-testid="finance-issue"><div className="flex flex-wrap items-center justify-between gap-2"><div><b>{viLabel(i.severity)} · {viLabel(i.issueType)}</b><div className="text-sm text-slate-400">{i.message}</div><div className="text-xs text-slate-500">Dự kiến {i.expectedValue ?? "-"} · Thực tế {i.actualValue ?? "-"}</div></div><button className="btn btn-secondary" disabled={busy} onClick={()=>resolve(i)}>Đánh dấu đã xử lý</button></div></article>)}</div>}
    </section>

    <section className="card p-5"><h2 className="mb-3 text-xl font-black">Các lần đối soát gần đây</h2><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-slate-400"><th className="p-2">Ngày</th><th className="p-2">Trạng thái</th><th className="p-2">Đã ghi nhận</th><th className="p-2">Hoàn tiền</th><th className="p-2">Vấn đề</th><th className="p-2">Người thực hiện</th></tr></thead><tbody>{data.recentRuns.map(r=><tr key={r.id} className="border-t border-slate-800"><td className="p-2">{r.businessDate}</td><td className="p-2 font-bold">{viLabel(r.status)}</td><td className="p-2">{currency(r.paymentAmount)}</td><td className="p-2">{currency(r.refundAmount)}</td><td className="p-2">{r.issueCount}</td><td className="p-2">{r.startedBy}</td></tr>)}</tbody></table></div></section>
  </div>;
}
