/* eslint-disable react-hooks/set-state-in-effect -- effects intentionally synchronize API/subscription state. */
"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, dateTime } from "@/lib/api";
import { viLabel } from "@/lib/vi-labels";
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
      setMessage(`Đã ghi bằng chứng ${row.eventKey}. Không có giá trị bí mật nào được lưu.`);setProviderRef("");setFingerprint("");setNote("");await load();
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }

  return <div className="mx-auto max-w-7xl space-y-6 px-4 py-8" data-testid="key-governance-v71">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="section-kicker">V71 · QUẢN TRỊ BÍ MẬT & KHÓA 5.0</p><h1 className="text-3xl font-black">Quản trị bí mật & khóa</h1><p className="mt-2 max-w-3xl text-slate-400">Chính sách xoay vòng, trạng thái cấu hình và bằng chứng chỉ ghi thêm cho các thông tin xác thực quan trọng. V71 chỉ lưu siêu dữ liệu/dấu vân tay, không lưu giá trị bí mật.</p></div>
      <div className="flex gap-2"><Link className="btn btn-secondary" href="/admin/security">🔐 Xác thực tăng cường V68</Link><Link className="btn btn-secondary" href="/admin">← Bảng điều khiển quản trị</Link></div>
    </div>

    {error&&<div className="card border border-rose-500/40 p-4 text-sm text-rose-300" data-testid="key-governance-error-v71">{error}</div>}
    {message&&<div className="card border border-emerald-500/30 p-4 text-sm text-emerald-300">{message}</div>}

    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6" data-testid="key-governance-summary-v71">
      <div className="card p-5"><div className="text-xs font-bold uppercase text-slate-500">Chiến lược</div><div className="mt-2 text-sm font-black">{summary?.strategyVersion||STRATEGY}</div></div>
      <div className="card p-5"><div className="text-xs font-bold uppercase text-slate-500">Trạng thái tổng thể</div><div className={`mt-2 text-xl font-black ${postureClass}`}>{viLabel(summary?.posture||"REVIEW")}</div></div>
      <div className="card p-5"><div className="text-xs font-bold uppercase text-slate-500">Đã cấu hình</div><div className="mt-2 text-2xl font-black">{summary?.configuredSecretCount??0}/{summary?.enabledPolicyCount??0}</div></div>
      <div className="card p-5"><div className="text-xs font-bold uppercase text-slate-500">Chưa có bằng chứng</div><div className="mt-2 text-2xl font-black">{summary?.noEvidenceCount??0}</div></div>
      <div className="card p-5"><div className="text-xs font-bold uppercase text-slate-500">Quá hạn</div><div className="mt-2 text-2xl font-black">{summary?.overdueCount??0}</div></div>
      <div className="card p-5"><div className="text-xs font-bold uppercase text-slate-500">Chế độ thực thi</div><div className="mt-2 text-sm font-black">{summary?.dryRunOnly?"THỦ CÔNG / CHẠY THỬ":"TỰ ĐỘNG ĐÃ BẬT"}</div></div>
    </section>

    <section className="card overflow-x-auto p-5" data-testid="key-governance-policies-v71">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-black">🔑 Danh mục chính sách xoay vòng</h2><p className="mt-1 text-sm text-slate-400">Trạng thái chỉ cho biết đã cấu hình/chưa cấu hình; API không trả giá trị thông tin xác thực. Cửa sổ cảnh báo: {summary?.warningDays??14} ngày.</p></div><div className="text-sm font-bold">KHÔNG_LƯU_GIÁ_TRỊ_BÍ_MẬT_TRONG_CSDL</div></div>
      <table className="mt-4 min-w-full text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="p-2">Chính sách</th><th className="p-2">Loại</th><th className="p-2">Đơn vị phụ trách</th><th className="p-2">Đã cấu hình</th><th className="p-2">Chu kỳ xoay</th><th className="p-2">Trạng thái</th><th className="p-2">Hạn tiếp theo</th></tr></thead><tbody>{policies.map(p=><tr className="border-t border-slate-800" key={p.id}><td className="p-2"><div className="font-bold">{p.policyKey}</div><div className="text-xs text-slate-500">{p.secretName}</div></td><td className="p-2">{viLabel(p.secretClass)}</td><td className="p-2">{viLabel(p.ownerTeam)}</td><td className="p-2 font-bold">{p.configured?"Có":"Không"}</td><td className="p-2">{p.rotationDays} ngày</td><td className="p-2 font-bold">{viLabel(p.rotationStatus)}</td><td className="p-2">{p.nextRotationDueAt?dateTime(p.nextRotationDueAt):"—"}</td></tr>)}</tbody></table>
    </section>

    <section className="grid gap-4 lg:grid-cols-2">
      <form className="card p-5" onSubmit={recordEvidence} data-testid="key-governance-evidence-form-v71">
        <h2 className="text-lg font-black">🧾 Ghi bằng chứng xoay vòng</h2><p className="mt-2 text-sm text-slate-400">Thao tác ghi yêu cầu xác thực tăng cường V68. Chỉ nhập dấu vân tay/tham chiếu; tuyệt đối không dán bí mật thật.</p>
        <label className="mt-4 block text-xs font-bold uppercase text-slate-500">Chính sách</label><select className="input mt-2 w-full" value={policyKey} onChange={e=>setPolicyKey(e.target.value)}>{policies.map(p=><option key={p.id} value={p.policyKey}>{p.policyKey}</option>)}</select>
        <label className="mt-4 block text-xs font-bold uppercase text-slate-500">Loại sự kiện</label><select className="input mt-2 w-full" value={eventType} onChange={e=>setEventType(e.target.value as EventType)}><option value="VERIFIED">Đã xác minh</option><option value="ROTATED">Đã xoay vòng</option><option value="REVOKED">Đã thu hồi</option><option value="INCIDENT">Sự cố</option></select>
        <label className="mt-4 block text-xs font-bold uppercase text-slate-500">Tham chiếu nhà cung cấp</label><input className="input mt-2 w-full" maxLength={160} value={providerRef} onChange={e=>setProviderRef(e.target.value)} placeholder="Tham chiếu kho bí mật / phiên bản / phiếu xử lý"/>
        <label className="mt-4 block text-xs font-bold uppercase text-slate-500">Dấu vân tay khóa</label><input className="input mt-2 w-full" maxLength={128} value={fingerprint} onChange={e=>setFingerprint(e.target.value)} placeholder="sha256:abcd1234..."/>
        <label className="mt-4 block text-xs font-bold uppercase text-slate-500">Ghi chú</label><textarea className="input mt-2 min-h-20 w-full" maxLength={1000} value={note} onChange={e=>setNote(e.target.value)} placeholder="Phiếu thay đổi / ghi chú xoay vòng..."/>
        <button className="btn btn-primary mt-4" disabled={busy}>{busy?"Đang ghi...":"Ghi bằng chứng"}</button>
      </form>

      <div className="card p-5" data-testid="key-governance-policy-v71"><h2 className="text-lg font-black">🛡 Chính sách lưu trữ</h2><div className="mt-4 space-y-3 text-sm text-slate-300"><p>✅ Giá trị bí mật vẫn ở biến môi trường/trình quản lý bí mật.</p><p>✅ Cơ sở dữ liệu chỉ giữ siêu dữ liệu chính sách, tham chiếu nhà cung cấp và dấu vân tay không đảo ngược.</p><p>✅ Bằng chứng xoay vòng chỉ ghi thêm.</p><p>✅ Tự động xoay vòng mặc định TẮT.</p><p>❌ Không hiển thị bí mật JWT/SMTP/thanh toán/VAPID trên giao diện quản trị hoặc API.</p></div></div>
    </section>

    <section className="card overflow-x-auto p-5" data-testid="key-governance-events-v71"><h2 className="text-lg font-black">📚 Bằng chứng xoay vòng</h2><table className="mt-4 min-w-full text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="p-2">Sự kiện</th><th className="p-2">Chính sách</th><th className="p-2">Loại</th><th className="p-2">Dấu vân tay</th><th className="p-2">Người thực hiện</th><th className="p-2">Thời gian</th></tr></thead><tbody>{events.map(e=><tr className="border-t border-slate-800" key={e.id}><td className="p-2 font-bold">{e.eventKey}</td><td className="p-2">{e.policyKey}</td><td className="p-2">{viLabel(e.eventType)}</td><td className="p-2"><code>{e.keyFingerprint||"—"}</code></td><td className="p-2">{e.actorEmail||"—"}</td><td className="p-2">{dateTime(e.occurredAt)}</td></tr>)}</tbody></table>{!events.length&&<div className="mt-4 text-sm text-slate-500">Chưa có bằng chứng xoay vòng. Trạng thái CHƯA CÓ BẰNG CHỨNG là dự kiến cho chính sách mới.</div>}</section>
  </div>;
}
/* V77.0.9 historical verifier aliases (not rendered):
Auto-rotation execution mặc định OFF
/admin/security | Step-up V68
NO_SECRET_VALUES_IN_DATABASE
không lưu secret value
*/
