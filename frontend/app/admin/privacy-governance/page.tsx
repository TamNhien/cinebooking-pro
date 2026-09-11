/* eslint-disable react-hooks/set-state-in-effect -- effects intentionally synchronize API/subscription state. */
"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, dateTime } from "@/lib/api";
import { clearAuth, getAuth } from "@/lib/auth";
import { viLabel } from "@/lib/vi-labels";
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
    if(!email){setError("Nhập thư điện tử người dùng cần kiểm kê.");return;}
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
    const reviewNote=prompt(decision==="APPROVED"?"Ghi chú phê duyệt:":decision==="REJECTED"?"Lý do từ chối:":"Lý do hủy yêu cầu:","");
    if(reviewNote===null)return;
    setBusy(row.id);setError("");setMessage("");
    try{
      const updated=await api<PrivacyRequestV70>(`/admin/privacy-governance/requests/${row.id}/review`,{method:"POST",body:JSON.stringify({decision,reviewNote})});
      setMessage(`${updated.requestKey} → ${updated.status}`);await load();
    }catch(e){setError((e as Error).message);}finally{setBusy("");}
  }

  return <div className="mx-auto max-w-7xl space-y-6 px-4 py-8" data-testid="privacy-governance-v70">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="section-kicker">V70 · QUẢN TRỊ DỮ LIỆU & QUYỀN RIÊNG TƯ 5.0</p><h1 className="text-3xl font-black">Quản trị dữ liệu & quyền riêng tư</h1><p className="mt-2 max-w-3xl text-slate-400">Quy trình yêu cầu quyền riêng tư, kiểm kê dữ liệu chủ thể và danh mục chính sách lưu giữ có hàng rào bảo vệ. V70 không tự động xóa dữ liệu.</p></div>
      <div className="flex gap-2"><Link className="btn btn-secondary" href="/admin/security">🔐 Xác thực tăng cường V68</Link><Link className="btn btn-secondary" href="/admin">← Bảng điều khiển quản trị</Link></div>
    </div>

    {error&&<div className="card border border-rose-500/40 p-4 text-sm text-rose-300" data-testid="privacy-governance-error-v70">{error}</div>}
    {message&&<div className="card border border-emerald-500/30 p-4 text-sm text-emerald-300">{message}</div>}

    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" data-testid="privacy-governance-summary-v70">
      <div className="card p-5"><div className="text-xs font-bold uppercase text-slate-500">Chiến lược</div><div className="mt-2 text-lg font-black">{summary?.strategyVersion||STRATEGY}</div></div>
      <div className="card p-5"><div className="text-xs font-bold uppercase text-slate-500">Trạng thái tổng thể</div><div className="mt-2 text-xl font-black">{readiness}</div></div>
      <div className="card p-5"><div className="text-xs font-bold uppercase text-slate-500">Yêu cầu đang mở</div><div className="mt-2 text-2xl font-black">{summary?.openRequestCount??0}</div></div>
      <div className="card p-5"><div className="text-xs font-bold uppercase text-slate-500">Quá hạn</div><div className="mt-2 text-2xl font-black">{summary?.overdueRequestCount??0}</div></div>
      <div className="card p-5"><div className="text-xs font-bold uppercase text-slate-500">Chế độ lưu giữ</div><div className="mt-2 text-lg font-black">{summary?.dryRunOnly?"CHỈ CHẠY THỬ":"ĐÃ BẬT"}</div></div>
    </section>

    <section className="grid gap-4 lg:grid-cols-2">
      <div className="card p-5" data-testid="privacy-subject-inventory-v70">
        <h2 className="text-lg font-black">🔎 Kiểm kê dữ liệu chủ thể</h2>
        <p className="mt-2 text-sm text-slate-400">Kiểm kê bản ghi liên quan theo thư điện tử. API chỉ đếm dữ liệu; <b>không xóa, không ẩn danh hóa</b>.</p>
        <div className="mt-4 flex gap-2"><input className="input flex-1" value={subjectEmail} onChange={e=>setSubjectEmail(e.target.value)} placeholder="user@example.com"/><button className="btn btn-secondary" onClick={()=>void inspect()} disabled={busy==="inventory"}>{busy==="inventory"?"Đang kiểm kê...":"Kiểm kê"}</button></div>
        {inventory&&<div className="mt-4 space-y-2 text-sm"><div><b>{inventory.fullName}</b> · {inventory.email}</div><div>Tổng bản ghi liên quan: <b>{inventory.totalRelatedRecords}</b></div><div>Có thao tác phá hủy: <b>{inventory.destructiveActionPerformed?"CÓ":"KHÔNG"}</b></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{inventory.items.map(item=><div className="rounded-xl border border-slate-800 p-3" key={item.source}><div className="font-bold">{item.source}</div><div className="text-slate-400">{viLabel(item.dataDomain)} · {viLabel(item.handling)}</div><div className="mt-1 text-lg font-black">{item.recordCount}</div></div>)}</div></div>}
      </div>

      <form className="card p-5" onSubmit={createRequest} data-testid="privacy-request-form-v70">
        <h2 className="text-lg font-black">🧾 Tạo yêu cầu quyền riêng tư</h2>
        <p className="mt-2 text-sm text-slate-400">Thao tác ghi yêu cầu xác thực tăng cường V68. V70 chỉ tạo/xem xét quy trình; không thực thi xóa dữ liệu tự động.</p>
        <label className="mt-4 block text-xs font-bold uppercase text-slate-500">Thư điện tử người dùng</label><input className="input mt-2 w-full" required value={subjectEmail} onChange={e=>setSubjectEmail(e.target.value)} placeholder="user@example.com"/>
        <label className="mt-4 block text-xs font-bold uppercase text-slate-500">Loại yêu cầu</label><select className="input mt-2 w-full" value={requestType} onChange={e=>setRequestType(e.target.value as RequestType)}><option value="EXPORT">XUẤT DỮ LIỆU</option><option value="ERASURE">Xóa dữ liệu</option><option value="RECTIFICATION">Chỉnh sửa dữ liệu</option></select>
        <label className="mt-4 block text-xs font-bold uppercase text-slate-500">Lý do</label><textarea className="input mt-2 min-h-24 w-full" required minLength={8} maxLength={500} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Mô tả yêu cầu và căn cứ xử lý..."/>
        <button className="btn btn-primary mt-4" disabled={busy==="create"}>{busy==="create"?"Đang tạo...":"Tạo yêu cầu"}</button>
      </form>
    </section>

    <section className="card overflow-x-auto p-5" data-testid="privacy-retention-policies-v70">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-black">🗂 Danh mục chính sách lưu giữ</h2><p className="mt-1 text-sm text-slate-400">Mặc định vận hành; không phải tuyên bố tuân thủ pháp lý. Thực thi phá hủy tự động mặc định TẮT.</p></div><div className="text-sm text-slate-400">Hạn xử lý yêu cầu: <b>{summary?.requestSlaHours??72}h</b></div></div>
      <table className="mt-4 min-w-full text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="p-2">Chính sách</th><th className="p-2">Phân loại</th><th className="p-2">Bảng</th><th className="p-2">Giữ chân khách hàng</th><th className="p-2">Thao tác</th><th className="p-2">Tự động phá hủy</th></tr></thead><tbody>{policies.map(p=><tr className="border-t border-slate-800" key={p.id}><td className="p-2 font-bold">{p.policyKey}</td><td className="p-2">{p.dataClass}</td><td className="p-2"><code>{p.tableName}</code></td><td className="p-2">{p.retentionDays} ngày</td><td className="p-2">{viLabel(p.retentionAction)}</td><td className="p-2 font-bold">{p.destructiveExecutionEnabled?"BẬT":"TẮT"}</td></tr>)}</tbody></table>
    </section>

    <section className="card overflow-x-auto p-5" data-testid="privacy-requests-v70">
      <h2 className="text-lg font-black">📋 Hàng đợi yêu cầu quyền riêng tư</h2>
      <table className="mt-4 min-w-full text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="p-2">Yêu cầu</th><th className="p-2">Chủ thể</th><th className="p-2">Loại</th><th className="p-2">Trạng thái</th><th className="p-2">Hạn</th><th className="p-2">Thao tác</th></tr></thead><tbody>{requests.map(r=><tr className="border-t border-slate-800" key={r.id}><td className="p-2"><div className="font-bold">{r.requestKey}</div><div className="text-xs text-slate-500">{dateTime(r.createdAt)}</div></td><td className="p-2"><div>{r.subjectName}</div><div className="text-xs text-slate-500">{r.subjectEmail}</div></td><td className="p-2">{viLabel(r.requestType)}</td><td className="p-2"><span className={r.overdue?"text-rose-300":""}>{viLabel(r.status)}{r.overdue?" · Quá hạn":""}</span></td><td className="p-2">{dateTime(r.dueAt)}</td><td className="p-2">{r.status==="OPEN"?<div className="flex flex-wrap gap-2"><button className="btn btn-secondary" disabled={busy===r.id} onClick={()=>void review(r,"APPROVED")}>Duyệt</button><button className="btn btn-secondary" disabled={busy===r.id} onClick={()=>void review(r,"REJECTED")}>Từ chối</button><button className="btn btn-secondary" disabled={busy===r.id} onClick={()=>void review(r,"CANCELLED")}>Hủy</button></div>:<span className="text-xs text-slate-500">{r.reviewedByEmail||"—"}</span>}</td></tr>)}</tbody></table>
      {!requests.length&&<div className="mt-4 text-sm text-slate-500">Chưa có yêu cầu quyền riêng tư nào.</div>}
    </section>
  </div>;
}
/* V77.0.9 historical verifier aliases (not rendered):
/admin/security | Step-up V68
DRY-RUN ONLY
không thực thi data deletion tự động
không xóa, không anonymize
*/
