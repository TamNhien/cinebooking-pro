"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, dateTime } from "@/lib/api";
import { clearAuth, getAuth } from "@/lib/auth";
import type { DisasterRecoverySummaryV69, DrBackupEvidenceV69, DrRestoreDrillEvidenceV69, UserProfile } from "@/lib/types";

const STRATEGY="V69-BACKUP-DR-5";

function bytes(value:number){
  if(value<1024) return `${value} B`;
  if(value<1024*1024) return `${(value/1024).toFixed(1)} KiB`;
  if(value<1024*1024*1024) return `${(value/1024/1024).toFixed(1)} MiB`;
  return `${(value/1024/1024/1024).toFixed(2)} GiB`;
}

export default function DisasterRecoveryPage(){
  const router=useRouter();
  const [summary,setSummary]=useState<DisasterRecoverySummaryV69|null>(null);
  const [backups,setBackups]=useState<DrBackupEvidenceV69[]>([]);
  const [drills,setDrills]=useState<DrRestoreDrillEvidenceV69[]>([]);
  const [error,setError]=useState("");

  const load=useCallback(async()=>{
    try{
      const me=await api<UserProfile>("/me");
      if(me.role!=="ADMIN"){
        clearAuth();
        router.replace("/login?returnTo=/admin/disaster-recovery&reason=admin");
        return;
      }
      const [s,b,d]=await Promise.all([
        api<DisasterRecoverySummaryV69>("/admin/disaster-recovery/summary"),
        api<DrBackupEvidenceV69[]>("/admin/disaster-recovery/backups?limit=20"),
        api<DrRestoreDrillEvidenceV69[]>("/admin/disaster-recovery/drills?limit=20"),
      ]);
      setSummary(s);setBackups(b);setDrills(d);setError("");
    }catch(e){setError((e as Error).message);}
  },[router]);

  useEffect(()=>{
    if(!getAuth()){router.replace("/login?returnTo=/admin/disaster-recovery&reason=required");return;}
    void load();
  },[load,router]);

  const readinessClass=useMemo(()=>summary?.readiness==="READY"?"text-emerald-300":summary?.readiness==="DEGRADED"?"text-amber-300":"text-slate-400",[summary?.readiness]);

  return <div className="mx-auto max-w-7xl space-y-6 px-4 py-8" data-testid="disaster-recovery-v69">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="section-kicker">V69 · BACKUP & DISASTER RECOVERY 5.0</p><h1 className="text-3xl font-black">Backup & Disaster Recovery</h1><p className="mt-2 max-w-3xl text-slate-400">Verified PostgreSQL archive evidence, append-only DR history, non-destructive restore drills và RPO/RTO readiness.</p></div>
      <Link className="btn btn-secondary" href="/admin">← Admin Dashboard</Link>
    </div>

    {error&&<div className="card border border-rose-500/40 p-4 text-sm text-rose-300" data-testid="disaster-recovery-error-v69">{error}</div>}

    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-testid="disaster-recovery-summary-v69">
      <div className="card p-5"><div className="text-xs font-bold uppercase text-slate-500">Strategy</div><div className="mt-2 text-xl font-black">{summary?.strategyVersion||STRATEGY}</div></div>
      <div className="card p-5"><div className="text-xs font-bold uppercase text-slate-500">Readiness</div><div className={`mt-2 text-2xl font-black ${readinessClass}`}>{summary?.readiness||"NO_DATA"}</div></div>
      <div className="card p-5"><div className="text-xs font-bold uppercase text-slate-500">RPO target</div><div className="mt-2 text-2xl font-black">{summary?`${summary.rpoTargetMinutes} phút`:"—"}</div></div>
      <div className="card p-5"><div className="text-xs font-bold uppercase text-slate-500">RTO target</div><div className="mt-2 text-2xl font-black">{summary?`${summary.rtoTargetMinutes} phút`:"—"}</div></div>
    </section>

    <section className="grid gap-4 lg:grid-cols-3">
      <div className="card p-5" data-testid="dr-backup-health-v69"><h2 className="text-lg font-black">💾 Backup posture</h2><div className="mt-4 space-y-2 text-sm text-slate-300"><div>Verified backups: <b>{summary?.verifiedBackupCount??0}</b></div><div>Latest age: <b>{summary?.latestBackupAgeMinutes==null?"—":`${summary.latestBackupAgeMinutes} phút`}</b></div><div>Fresh within RPO: <b>{summary?.backupFresh?"PASS":"NOT READY"}</b></div><div>Retention: <b>{summary?`${summary.backupRetentionDays} ngày`:"—"}</b></div></div></div>
      <div className="card p-5" data-testid="dr-drill-health-v69"><h2 className="text-lg font-black">🧪 Restore drill posture</h2><div className="mt-4 space-y-2 text-sm text-slate-300"><div>Successful drills: <b>{summary?.successfulDrillCount??0}</b></div><div>Latest drill age: <b>{summary?.latestDrillAgeHours==null?"—":`${summary.latestDrillAgeHours} giờ`}</b></div><div>Drill fresh: <b>{summary?.drillFresh?"PASS":"NOT READY"}</b></div><div>RTO met: <b>{summary?.rtoMet?"PASS":"NOT READY"}</b></div></div></div>
      <div className="card p-5" data-testid="dr-evidence-policy-v69"><h2 className="text-lg font-black">🔒 Evidence policy</h2><div className="mt-4 space-y-2 text-sm text-slate-300"><div>DB evidence: <b>{summary?.immutableEvidence?"APPEND-ONLY":"—"}</b></div><div>Archive payload: <b>không lưu trong DB</b></div><div>Manifest: <b>metadata only</b></div><div>Critical catalog: <b>{summary?.criticalCatalog?.length??0} tables</b></div></div></div>
    </section>

    <section className="card p-5" data-testid="dr-runbook-v69">
      <h2 className="text-lg font-black">🧭 Runbook V69</h2>
      <p className="mt-2 text-sm text-slate-400">Backup được tạo/verify ở host, dump nằm trong <code>./backups</code>. Restore drill dùng database tạm trong PostgreSQL rồi xóa ngay; không overwrite database đang chạy.</p>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div><div className="mb-2 text-xs font-bold uppercase text-slate-500">Tạo verified backup</div><pre className="overflow-x-auto rounded-xl border border-slate-800 p-3 text-xs">powershell -ExecutionPolicy Bypass -File .\tools\backup-dr-v69.ps1</pre></div>
        <div><div className="mb-2 text-xs font-bold uppercase text-slate-500">Restore drill không phá dữ liệu</div><pre className="overflow-x-auto rounded-xl border border-slate-800 p-3 text-xs">powershell -ExecutionPolicy Bypass -File .\tools\dr-restore-drill-v69.ps1 -BackupFile .\backups\cinebooking-v69-YYYYMMDD-HHMMSS.dump</pre></div>
      </div>
    </section>

    <section className="card overflow-x-auto p-5" data-testid="dr-backups-v69"><h2 className="mb-3 text-lg font-black">Verified backup evidence</h2><table className="w-full min-w-[980px] text-sm"><thead><tr className="text-left text-slate-500"><th className="p-2">Verified</th><th className="p-2">Archive</th><th className="p-2">Size</th><th className="p-2">SHA-256</th><th className="p-2">Flyway</th><th className="p-2">Tables</th><th className="p-2">Retention</th></tr></thead><tbody>{backups.map(b=><tr key={b.id} className="border-t border-slate-800"><td className="p-2">{dateTime(b.verifiedAt)}</td><td className="p-2"><b>{b.storageName}</b><div className="text-xs text-slate-500">{b.backupKey}</div></td><td className="p-2">{bytes(b.sizeBytes)}</td><td className="p-2 font-mono text-xs">{b.checksumSha256.slice(0,16)}…</td><td className="p-2">V{b.latestFlywayVersion}</td><td className="p-2">{b.publicTableCount}</td><td className="p-2">{b.retentionUntil?dateTime(b.retentionUntil):"—"}</td></tr>)}</tbody></table>{!backups.length&&<div className="py-8 text-center text-slate-500">Chưa có verified backup V69. Chạy runbook backup ở trên.</div>}</section>

    <section className="card overflow-x-auto p-5" data-testid="dr-drills-v69"><h2 className="mb-3 text-lg font-black">Restore drill evidence</h2><table className="w-full min-w-[980px] text-sm"><thead><tr className="text-left text-slate-500"><th className="p-2">Completed</th><th className="p-2">Status</th><th className="p-2">Duration</th><th className="p-2">RPO age</th><th className="p-2">Flyway</th><th className="p-2">Tables</th><th className="p-2">Catalog</th></tr></thead><tbody>{drills.map(d=><tr key={d.id} className="border-t border-slate-800"><td className="p-2">{dateTime(d.completedAt)}</td><td className={`p-2 font-black ${d.status==="SUCCESS"?"text-emerald-300":"text-rose-300"}`}>{d.status}</td><td className="p-2">{d.restoreDurationSeconds==null?"—":`${d.restoreDurationSeconds.toFixed(3)}s`}</td><td className="p-2">{d.rpoSeconds==null?"—":`${Math.round(d.rpoSeconds/60)} phút`}</td><td className="p-2">{d.restoredFlywayVersion==null?"—":`V${d.restoredFlywayVersion}`}</td><td className="p-2">{d.restoredPublicTableCount??"—"}</td><td className="p-2">{d.criticalCatalogVerified?"PASS":"FAIL"}</td></tr>)}</tbody></table>{!drills.length&&<div className="py-8 text-center text-slate-500">Chưa có restore drill V69.</div>}</section>
  </div>;
}
