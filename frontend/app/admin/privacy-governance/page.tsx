/* eslint-disable react-hooks/set-state-in-effect -- effects intentionally synchronize API/subscription state. */
"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, dateTime } from "@/lib/api";
import { clearAuth, getAuth } from "@/lib/auth";
import type { PrivacyGovernanceSummaryV70, PrivacyRequestV70, RetentionPolicyV70, SubjectInventoryV70, UserProfile } from "@/lib/types";

const STRATEGY="V70-DATA-GOVERNANCE-PRIVACY-5";

type RequestType="EXPORT"|"ERASURE"|"RECTIFICATION";

export default function PrivacyGovernancePage(){
  const router=useRouter();
  const [summary,setSummary]=useState<PrivacyGovernanceSummaryV70|null>(null);
  const [policies,setPolicies]=useState<RetentionPolicyV70[]>([]);
  const [requests,setRequests]=useState<PrivacyRequestV70[]>([]);
  const [inventory,setInventory]=useState<SubjectInventoryV70|null>(null);
  const [subjectEmail,setSubjectEmail]=useState("");
  const [requestType,setRequestType]=useState<RequestType>("EXPORT");
  const [reason,setReason]=useState("");
  const [busy,setBusy]=useState("");
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");

  const load=useCallback(async()=>{
    try{
      const me=await api<UserProfile>("/me");
      if(me.role!=="ADMIN"){
        clearAuth();
        router.replace("/login?returnTo=/admin/privacy-governance&reason=admin");
        return;
      }
      const [s,p,r]=await Promise.all([
        api<PrivacyGovernanceSummaryV70>("/admin/privacy-governance/summary"),
        api<RetentionPolicyV70[]>("/admin/privacy-governance/policies"),
        api<PrivacyRequestV70[]>("/admin/privacy-governance/requests?limit=50"),
      ]);
      setSummary(s);setPolicies(p);setRequests(r);setError("");
    }catch(e){setError((e as Error).message);}
  },[router]);

  useEffect(()=>{
    if(!getAuth()){router.replace("/login?returnTo=/admin/privacy-governance&reason=required");return;}
    void load();
  },[load,router]);

  const readiness=useMemo(()=>summary?.overdueRequestCount?"ACTION_REQUIRED":summary?.openRequestCount||summary?.approvedRequestCount?"REVIEW":"READY",[summary]);

  async function inspect(){
    const email=subjectEmail.trim();
    if(!email){setError("Nhập email người dùng cần kiểm kê.");return;}
    setBusy("inventory");setError("");setMessage("");
    try{setInventory(await api<SubjectInventoryV70>(`/admin/privacy-governance/subject-inventory?email=${encodeURIComponent(email)}`));}
    catch(e){setInventory(null);setError((e as Error).message);}finally{setBusy("");}
  }

  async function createRequest(e:FormEvent){
    e.preventDefault();
    setBusy("create");setError("");setMessage("");
    try{
      const created=await api<PrivacyRequestV70>("/admin/privacy-governance/requests",{method:"POST",body:JSON.stringify({subjectEmail,requestType,reason})});
      setMessage(`Đã tạo ${created.requestKey}.`);setReason("");await load();
    }catch(e){setError((e as Error).message);}finally{setBusy("");}
  }

  async function review(row:PrivacyRequestV70,decision:"APPROVED"|"REJECTED"|"CANCELLED"){
    const reviewNote=prompt(decision==="APPROVED"?"Ghi chú phê duyệt:":decision==="REJECTED"?"Lý do từ chối:":"Lý do hủy request:","");
    if(reviewNote===null)return;
    setBusy(row.id);setError("");setMessage("");
    try{
      const updated=await api<PrivacyRequestV70>(`/admin/privacy-governance/requests/${row.id}/review`,{method:"POST",body:JSON.stringify({decision,reviewNote})});
      setMessage(`${updated.requestKey} → ${updated.status}`);await load();
    }catch(e){setError((e as Error).message);}finally{setBusy("");}
  }

  return <div className="mx-auto max-w-7xl space-y-6 px-4 py-8" data-testid="privacy-governance-v70">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="section-kicker">V70 · DATA GOVERNANCE & PRIVACY 5.0</p><h1 className="text-3xl font-black">Data Governance & Privacy</h1><p className="mt-2 max-w-3xl text-slate-400">Privacy request workflow, subject-data inventory và retention-policy catalog có guardrail. V70 không tự động xóa dữ liệu.</p></div>
      <div className="flex gap-2"><Link className="btn btn-secondary" href="/admin/security">🔐 Step-up V68</Link><Link className="btn btn-secondary" href="/admin">← Admin Dashboard</Link></div>
    </div>

    {error&&<div className="card border border-rose-500/40 p-4 text-sm text-rose-300" data-testid="privacy-governance-error-v70">{error}</div>}
    {message&&<div className="card border border-emerald-500/30 p-4 text-sm text-emerald-300">{message}</div>}

    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" data-testid="privacy-governance-summary-v70">
      <div className="card p-5"><div className="text-xs font-bold uppercase text-slate-500">Strategy</div><div className="mt-2 text-lg font-black">{summary?.strategyVersion||STRATEGY}</div></div>
      <div className="card p-5"><div className="text-xs font-bold uppercase text-slate-500">Posture</div><div className="mt-2 text-xl font-black">{readiness}</div></div>
      <div className="card p-5"><div className="text-xs font-bold uppercase text-slate-500">Open requests</div><div className="mt-2 text-2xl font-black">{summary?.openRequestCount??0}</div></div>
      <div className="card p-5"><div className="text-xs font-bold uppercase text-slate-500">Overdue</div><div className="mt-2 text-2xl font-black">{summary?.overdueRequestCount??0}</div></div>
      <div className="card p-5"><div className="text-xs font-bold uppercase text-slate-500">Retention mode</div><div className="mt-2 text-lg font-black">{summary?.dryRunOnly?"DRY-RUN ONLY":"ENABLED"}</div></div>
    </section>

    <section className="grid gap-4 lg:grid-cols-2">
      <div className="card p-5" data-testid="privacy-subject-inventory-v70">
        <h2 className="text-lg font-black">🔎 Subject data inventory</h2>
        <p className="mt-2 text-sm text-slate-400">Kiểm kê record liên quan theo email. Endpoint chỉ đếm dữ liệu; <b>không xóa, không anonymize</b>.</p>
        <div className="mt-4 flex gap-2"><input className="input flex-1" value={subjectEmail} onChange={e=>setSubjectEmail(e.target.value)} placeholder="user@example.com"/><button className="btn btn-secondary" onClick={()=>void inspect()} disabled={busy==="inventory"}>{busy==="inventory"?"Đang kiểm kê...":"Kiểm kê"}</button></div>
        {inventory&&<div className="mt-4 space-y-2 text-sm"><div><b>{inventory.fullName}</b> · {inventory.email}</div><div>Tổng record liên quan: <b>{inventory.totalRelatedRecords}</b></div><div>Destructive action: <b>{inventory.destructiveActionPerformed?"YES":"NO"}</b></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{inventory.items.map(item=><div className="rounded-xl border border-slate-800 p-3" key={item.source}><div className="font-bold">{item.source}</div><div className="text-slate-400">{item.dataDomain} · {item.handling}</div><div className="mt-1 text-lg font-black">{item.recordCount}</div></div>)}</div></div>}
      </div>

      <form className="card p-5" onSubmit={createRequest} data-testid="privacy-request-form-v70">
        <h2 className="text-lg font-black">🧾 Tạo privacy request</h2>
        <p className="mt-2 text-sm text-slate-400">Write action yêu cầu Step-up V68. V70 chỉ tạo/review workflow; không thực thi data deletion tự động.</p>
        <label className="mt-4 block text-xs font-bold uppercase text-slate-500">Email người dùng</label><input className="input mt-2 w-full" required value={subjectEmail} onChange={e=>setSubjectEmail(e.target.value)} placeholder="user@example.com"/>
        <label className="mt-4 block text-xs font-bold uppercase text-slate-500">Request type</label><select className="input mt-2 w-full" value={requestType} onChange={e=>setRequestType(e.target.value as RequestType)}><option value="EXPORT">EXPORT</option><option value="ERASURE">ERASURE</option><option value="RECTIFICATION">RECTIFICATION</option></select>
        <label className="mt-4 block text-xs font-bold uppercase text-slate-500">Lý do</label><textarea className="input mt-2 min-h-24 w-full" required minLength={8} maxLength={500} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Mô tả yêu cầu và căn cứ xử lý..."/>
        <button className="btn btn-primary mt-4" disabled={busy==="create"}>{busy==="create"?"Đang tạo...":"Tạo request"}</button>
      </form>
    </section>

    <section className="card overflow-x-auto p-5" data-testid="privacy-retention-policies-v70">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-black">🗂 Retention policy catalog</h2><p className="mt-1 text-sm text-slate-400">Operational defaults; không phải tuyên bố tuân thủ pháp lý. Automatic destructive execution mặc định OFF.</p></div><div className="text-sm text-slate-400">SLA request: <b>{summary?.requestSlaHours??72}h</b></div></div>
      <table className="mt-4 min-w-full text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="p-2">Policy</th><th className="p-2">Class</th><th className="p-2">Table</th><th className="p-2">Retention</th><th className="p-2">Action</th><th className="p-2">Auto destructive</th></tr></thead><tbody>{policies.map(p=><tr className="border-t border-slate-800" key={p.id}><td className="p-2 font-bold">{p.policyKey}</td><td className="p-2">{p.dataClass}</td><td className="p-2"><code>{p.tableName}</code></td><td className="p-2">{p.retentionDays} ngày</td><td className="p-2">{p.retentionAction}</td><td className="p-2 font-bold">{p.destructiveExecutionEnabled?"ON":"OFF"}</td></tr>)}</tbody></table>
    </section>

    <section className="card overflow-x-auto p-5" data-testid="privacy-requests-v70">
      <h2 className="text-lg font-black">📋 Privacy request queue</h2>
      <table className="mt-4 min-w-full text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="p-2">Request</th><th className="p-2">Subject</th><th className="p-2">Type</th><th className="p-2">Status</th><th className="p-2">Due</th><th className="p-2">Action</th></tr></thead><tbody>{requests.map(r=><tr className="border-t border-slate-800" key={r.id}><td className="p-2"><div className="font-bold">{r.requestKey}</div><div className="text-xs text-slate-500">{dateTime(r.createdAt)}</div></td><td className="p-2"><div>{r.subjectName}</div><div className="text-xs text-slate-500">{r.subjectEmail}</div></td><td className="p-2">{r.requestType}</td><td className="p-2"><span className={r.overdue?"text-rose-300":""}>{r.status}{r.overdue?" · OVERDUE":""}</span></td><td className="p-2">{dateTime(r.dueAt)}</td><td className="p-2">{r.status==="OPEN"?<div className="flex flex-wrap gap-2"><button className="btn btn-secondary" disabled={busy===r.id} onClick={()=>void review(r,"APPROVED")}>Approve</button><button className="btn btn-secondary" disabled={busy===r.id} onClick={()=>void review(r,"REJECTED")}>Reject</button><button className="btn btn-secondary" disabled={busy===r.id} onClick={()=>void review(r,"CANCELLED")}>Cancel</button></div>:<span className="text-xs text-slate-500">{r.reviewedByEmail||"—"}</span>}</td></tr>)}</tbody></table>
      {!requests.length&&<div className="mt-4 text-sm text-slate-500">Chưa có privacy request nào.</div>}
    </section>
  </div>;
}
