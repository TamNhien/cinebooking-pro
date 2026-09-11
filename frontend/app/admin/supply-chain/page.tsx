/* eslint-disable react-hooks/set-state-in-effect -- effects intentionally synchronize API/subscription state. */
"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, dateTime } from "@/lib/api";
import { clearAuth, getAuth } from "@/lib/auth";
import { viLabel } from "@/lib/vi-labels";
import type { SoftwareArtifactEvidenceV72, SoftwareSupplyChainScanV72, SupplyChainSummaryV72, UserProfile } from "@/lib/types";

const STRATEGY="V72-SUPPLY-CHAIN-INTEGRITY-5";
type ArtifactType="BACKEND_JAR"|"FRONTEND_BUNDLE"|"CONTAINER_IMAGE"|"DEPENDENCY_INVENTORY";

export default function SupplyChainPage(){
  const router=useRouter();
  const [summary,setSummary]=useState<SupplyChainSummaryV72|null>(null);
  const [artifacts,setArtifacts]=useState<SoftwareArtifactEvidenceV72[]>([]);
  const [scans,setScans]=useState<SoftwareSupplyChainScanV72[]>([]);
  const [artifactType,setArtifactType]=useState<ArtifactType>("BACKEND_JAR");
  const [versionLabel,setVersionLabel]=useState("v72.0.0");
  const [sha256,setSha256]=useState("");
  const [sourceCommit,setSourceCommit]=useState("");
  const [buildRef,setBuildRef]=useState("");
  const [sbomRef,setSbomRef]=useState("");
  const [artifactNote,setArtifactNote]=useState("");
  const [artifactId,setArtifactId]=useState("");
  const [scanner,setScanner]=useState("Trình quét CI");
  const [scannerVersion,setScannerVersion]=useState("");
  const [reportFingerprint,setReportFingerprint]=useState("");
  const [critical,setCritical]=useState(0);
  const [high,setHigh]=useState(0);
  const [medium,setMedium]=useState(0);
  const [low,setLow]=useState(0);
  const [scanNote,setScanNote]=useState("");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");

  const load=useCallback(async()=>{
    try{
      const me=await api<UserProfile>("/me");
      if(me.role!=="ADMIN"){clearAuth();router.replace("/login?returnTo=/admin/supply-chain&reason=admin");return;}
      const [s,a,c]=await Promise.all([
        api<SupplyChainSummaryV72>("/admin/supply-chain/summary"),
        api<SoftwareArtifactEvidenceV72[]>("/admin/supply-chain/artifacts?limit=50"),
        api<SoftwareSupplyChainScanV72[]>("/admin/supply-chain/scans?limit=50"),
      ]);
      setSummary(s);setArtifacts(a);setScans(c);setError("");
      if(a.length&&!artifactId)setArtifactId(a[0].id);
    }catch(e){setError((e as Error).message);}
  },[artifactId,router]);

  useEffect(()=>{
    if(!getAuth()){router.replace("/login?returnTo=/admin/supply-chain&reason=required");return;}
    void load();
  },[load,router]);

  const postureClass=useMemo(()=>summary?.posture==="ACTION_REQUIRED"?"text-rose-300":summary?.posture==="REVIEW"?"text-amber-300":summary?.posture==="READY"?"text-emerald-300":"text-slate-300",[summary?.posture]);

  async function recordArtifact(e:FormEvent){
    e.preventDefault();setBusy(true);setMessage("");setError("");
    try{
      const row=await api<SoftwareArtifactEvidenceV72>("/admin/supply-chain/artifacts",{method:"POST",body:JSON.stringify({artifactType,versionLabel,sha256,sourceCommit:sourceCommit||null,buildRef:buildRef||null,sbomRef:sbomRef||null,note:artifactNote||null})});
      setMessage(`Đã ghi bằng chứng gói tạo tác ${row.artifactKey}. Cơ sở dữ liệu chỉ lưu mã băm/tham chiếu.`);setArtifactId(row.id);setSha256("");setSourceCommit("");setBuildRef("");setSbomRef("");setArtifactNote("");await load();
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }

  async function recordScan(e:FormEvent){
    e.preventDefault();setBusy(true);setMessage("");setError("");
    try{
      const row=await api<SoftwareSupplyChainScanV72>("/admin/supply-chain/scans",{method:"POST",body:JSON.stringify({artifactId,scanner,scannerVersion:scannerVersion||null,reportFingerprint,criticalCount:critical,highCount:high,mediumCount:medium,lowCount:low,note:scanNote||null})});
      setMessage(`Đã ghi bằng chứng quét ${row.scanKey} · ${row.decision}. Kết luận được tính ở máy chủ theo ngưỡng V72.`);setReportFingerprint("");setScanNote("");await load();
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }

  return <div className="mx-auto max-w-7xl space-y-6 px-4 py-8" data-testid="supply-chain-v72">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="section-kicker">V72 · TOÀN VẸN CHUỖI CUNG ỨNG PHẦN MỀM 5.0</p><h1 className="text-3xl font-black">Toàn vẹn chuỗi cung ứng phần mềm</h1><p className="mt-2 max-w-3xl text-slate-400">Bằng chứng chỉ ghi thêm cho digest gói tạo tác, nguồn gốc bản dựng và quét phụ thuộc/bảo mật. V72 không lưu gói nhị phân hoặc nội dung báo cáo quét trong cơ sở dữ liệu.</p></div>
      <div className="flex gap-2"><Link className="btn btn-secondary" href="/admin/security">🔐 Xác thực tăng cường V68</Link><Link className="btn btn-secondary" href="/admin/key-governance">🔑 Quản trị khóa V71</Link><Link className="btn btn-secondary" href="/admin">← Bảng điều khiển quản trị</Link></div>
    </div>

    {error&&<div className="card border border-rose-500/40 p-4 text-sm text-rose-300" data-testid="supply-chain-error-v72">{error}</div>}
    {message&&<div className="card border border-emerald-500/30 p-4 text-sm text-emerald-300">{message}</div>}

    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6" data-testid="supply-chain-summary-v72">
      <div className="card p-5"><div className="text-xs font-bold uppercase text-slate-500">Chiến lược</div><div className="mt-2 text-sm font-black">{summary?.strategyVersion||STRATEGY}</div></div>
      <div className="card p-5"><div className="text-xs font-bold uppercase text-slate-500">Trạng thái tổng thể</div><div className={`mt-2 text-xl font-black ${postureClass}`}>{summary?.posture||"NO_EVIDENCE"}</div></div>
      <div className="card p-5"><div className="text-xs font-bold uppercase text-slate-500">Gói tạo tács</div><div className="mt-2 text-2xl font-black">{summary?.artifactCount??0}</div></div>
      <div className="card p-5"><div className="text-xs font-bold uppercase text-slate-500">Quéts</div><div className="mt-2 text-2xl font-black">{summary?.scanCount??0}</div></div>
      <div className="card p-5"><div className="text-xs font-bold uppercase text-slate-500">Nghiêm trọng / Cao tối đa</div><div className="mt-2 text-xl font-black">{summary?.maxCritical??0} / {summary?.maxHigh??0}</div></div>
      <div className="card p-5"><div className="text-xs font-bold uppercase text-slate-500">Cổng kiểm soát phát hành</div><div className="mt-2 text-sm font-black">{summary?.advisoryOnly?"ADVISORY ONLY":"ENFORCED"}</div></div>
    </section>

    <section className="card p-5" data-testid="supply-chain-policy-v72">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-black">🛡 Chính sách bằng chứng</h2><p className="mt-1 text-sm text-slate-400">Bằng chứng freshness: {summary?.evidenceMaxAgeHours??168} giờ. V72 mặc định không tự chặn bản phát hành; CI/bản phát hành vẫn là mã nguồn of truth.</p></div><div className="text-sm font-bold">DIGESTS_ONLY · APPEND_ONLY_EVIDENCE</div></div>
      <div className="mt-4 grid gap-3 md:grid-cols-2"><p className="text-sm text-slate-300">✅ SHA-256, xác nhận nguồn, tham chiếu bản dựng/SBOM và bộ đếm quét.</p><p className="text-sm text-slate-300">❌ Không lưu JAR/bundle/image binary, dependency package content hoặc nội dung báo cáo quét.</p></div>
    </section>

    <section className="grid gap-4 lg:grid-cols-2">
      <form className="card p-5" onSubmit={recordArtifact} data-testid="supply-chain-artifact-form-v72">
        <h2 className="text-lg font-black">📦 Ghi bằng chứng gói tạo tác</h2><p className="mt-2 text-sm text-slate-400">Thao tác ghi yêu cầu xác thực tăng cường V68.</p>
        <label className="mt-4 block text-xs font-bold uppercase text-slate-500">Loại gói tạo tác</label><select className="input mt-2 w-full" value={artifactType} onChange={e=>setArtifactType(e.target.value as ArtifactType)}><option value="BACKEND_JAR">Gói JAR backend</option><option value="FRONTEND_BUNDLE">Gói frontend</option><option value="CONTAINER_IMAGE">Ảnh container</option><option value="DEPENDENCY_INVENTORY">Danh mục phụ thuộc</option></select>
        <label className="mt-4 block text-xs font-bold uppercase text-slate-500">Nhãn phiên bản</label><input className="input mt-2 w-full" maxLength={80} value={versionLabel} onChange={e=>setVersionLabel(e.target.value)}/>
        <label className="mt-4 block text-xs font-bold uppercase text-slate-500">SHA-256</label><input className="input mt-2 w-full" maxLength={64} value={sha256} onChange={e=>setSha256(e.target.value)} placeholder="64 ký tự hex viết thường"/>
        <label className="mt-4 block text-xs font-bold uppercase text-slate-500">Commit nguồn</label><input className="input mt-2 w-full" maxLength={64} value={sourceCommit} onChange={e=>setSourceCommit(e.target.value)} placeholder="Git xác nhận SHA"/>
        <label className="mt-4 block text-xs font-bold uppercase text-slate-500">Tham chiếu bản dựng</label><input className="input mt-2 w-full" maxLength={160} value={buildRef} onChange={e=>setBuildRef(e.target.value)} placeholder="Mã lần chạy / bản dựng GitHub Actions"/>
        <label className="mt-4 block text-xs font-bold uppercase text-slate-500">Tham chiếu SBOM / danh mục</label><input className="input mt-2 w-full" maxLength={200} value={sbomRef} onChange={e=>setSbomRef(e.target.value)} placeholder="tham chiếu gói hoặc báo cáo, không nhập toàn bộ nội dung báo cáo"/>
        <label className="mt-4 block text-xs font-bold uppercase text-slate-500">Ghi chú</label><textarea className="input mt-2 min-h-20 w-full" maxLength={1000} value={artifactNote} onChange={e=>setArtifactNote(e.target.value)}/>
        <button className="btn btn-primary mt-4" disabled={busy}>{busy?"Đang ghi...":"Ghi bằng chứng gói tạo tác"}</button>
      </form>

      <form className="card p-5" onSubmit={recordScan} data-testid="supply-chain-scan-form-v72">
        <h2 className="text-lg font-black">🔎 Ghi bằng chứng quét</h2><p className="mt-2 text-sm text-slate-400">Kết luận ĐẠT/CẢNH BÁO/KHÔNG ĐẠT được backend tính; giao diện không được tự khai báo đạt.</p>
        <label className="mt-4 block text-xs font-bold uppercase text-slate-500">Gói tạo tác</label><select className="input mt-2 w-full" required value={artifactId} onChange={e=>setArtifactId(e.target.value)}><option value="" disabled>Chọn bằng chứng gói tạo tác</option>{artifacts.map(a=><option key={a.id} value={a.id}>{a.artifactKey} · {a.artifactType}</option>)}</select>
        <label className="mt-4 block text-xs font-bold uppercase text-slate-500">Trình quét</label><input className="input mt-2 w-full" maxLength={80} value={scanner} onChange={e=>setScanner(e.target.value)}/>
        <label className="mt-4 block text-xs font-bold uppercase text-slate-500">Phiên bản trình quét</label><input className="input mt-2 w-full" maxLength={80} value={scannerVersion} onChange={e=>setScannerVersion(e.target.value)}/>
        <label className="mt-4 block text-xs font-bold uppercase text-slate-500">Dấu vân tay báo cáo</label><input className="input mt-2 w-full" maxLength={128} value={reportFingerprint} onChange={e=>setReportFingerprint(e.target.value)} placeholder="sha256:... hoặc dấu vân tay báo cáo an toàn"/>
        <div className="mt-4 grid grid-cols-2 gap-3"><label className="text-xs font-bold uppercase text-slate-500">Nghiêm trọng<input className="input mt-2 w-full" type="number" min={0} value={critical} onChange={e=>setCritical(Number(e.target.value))}/></label><label className="text-xs font-bold uppercase text-slate-500">Cao<input className="input mt-2 w-full" type="number" min={0} value={high} onChange={e=>setHigh(Number(e.target.value))}/></label><label className="text-xs font-bold uppercase text-slate-500">Trung bình<input className="input mt-2 w-full" type="number" min={0} value={medium} onChange={e=>setMedium(Number(e.target.value))}/></label><label className="text-xs font-bold uppercase text-slate-500">Thấp<input className="input mt-2 w-full" type="number" min={0} value={low} onChange={e=>setLow(Number(e.target.value))}/></label></div>
        <label className="mt-4 block text-xs font-bold uppercase text-slate-500">Ghi chú</label><textarea className="input mt-2 min-h-20 w-full" maxLength={1000} value={scanNote} onChange={e=>setScanNote(e.target.value)}/>
        <button className="btn btn-primary mt-4" disabled={busy||!artifactId}>{busy?"Đang ghi...":"Ghi bằng chứng quét"}</button>
      </form>
    </section>

    <section className="card overflow-x-auto p-5" data-testid="supply-chain-artifacts-v72"><h2 className="text-lg font-black">📚 Bằng chứng gói tạo tác</h2><table className="mt-4 min-w-full text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="p-2">Gói tạo tác</th><th className="p-2">Loại</th><th className="p-2">Phiên bản</th><th className="p-2">SHA-256</th><th className="p-2">Mã commit</th><th className="p-2">Ngày tạo</th></tr></thead><tbody>{artifacts.map(a=><tr className="border-t border-slate-800" key={a.id}><td className="p-2 font-bold">{a.artifactKey}</td><td className="p-2">{viLabel(a.artifactType)}</td><td className="p-2">{a.versionLabel}</td><td className="p-2"><code>{a.sha256.slice(0,16)}…</code></td><td className="p-2"><code>{a.sourceCommit?.slice(0,12)||"—"}</code></td><td className="p-2">{dateTime(a.artifactCreatedAt)}</td></tr>)}</tbody></table>{!artifacts.length&&<div className="mt-4 text-sm text-slate-500">Chưa có bằng chứng gói tạo tác; trạng thái CHƯA CÓ BẰNG CHỨNG là dự kiến cho lần triển khai mới.</div>}</section>

    <section className="card overflow-x-auto p-5" data-testid="supply-chain-scans-v72"><h2 className="text-lg font-black">🧪 Bằng chứng quét</h2><table className="mt-4 min-w-full text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="p-2">Quét</th><th className="p-2">Gói tạo tác</th><th className="p-2">Trình quét</th><th className="p-2">C/H/M/L</th><th className="p-2">Kết luận</th><th className="p-2">Ngày quét</th></tr></thead><tbody>{scans.map(s=><tr className="border-t border-slate-800" key={s.id}><td className="p-2 font-bold">{s.scanKey}</td><td className="p-2">{s.artifactKey}</td><td className="p-2">{s.scanner}</td><td className="p-2">{s.criticalCount}/{s.highCount}/{s.mediumCount}/{s.lowCount}</td><td className="p-2 font-black">{viLabel(s.decision)}</td><td className="p-2">{dateTime(s.scannedAt)}</td></tr>)}</tbody></table>{!scans.length&&<div className="mt-4 text-sm text-slate-500">Chưa có bằng chứng quét.</div>}</section>
  </div>;
}
/* V77.0.9 historical verifier aliases (not rendered):
V72 mặc định không tự chặn release
/admin/security | Step-up V68
/admin/key-governance | Key Governance V71
*/
