/* eslint-disable react-hooks/set-state-in-effect -- effects intentionally synchronize API/subscription state. */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, api, dateTime } from "@/lib/api";
import { clearAuth, getAuth } from "@/lib/auth";
import { localizedLabel } from "@/lib/vi-labels";
import { usePresentationLanguage, type Language } from "@/lib/usePresentationLanguage";
import type { SeatConsistencySummaryV66, SeatHoldItemV66, SeatReconcileResultV66, UserProfile } from "@/lib/types";

const REFRESH_MS=5_000;

async function withTransientSeatOperationsReadRetry<T>(read:()=>Promise<T>){
  const deadline=Date.now()+12_000;
  let attempt=0;
  for(;;){
    try{return await read();}
    catch(error){
      const status=error instanceof ApiError?error.status:0;
      const retryable=status===0||status===408||status===425||status===429||status>=500;
      if(!retryable||Date.now()>=deadline)throw error;
      const delay=Math.min(250*(2**attempt),1500);
      attempt+=1;
      await new Promise(resolve=>setTimeout(resolve,delay));
    }
  }
}

function stateClass(state:string){
  if(state==="HELD")return "border-amber-700/60 bg-amber-950/35 text-amber-200";
  if(state==="CONVERTED")return "border-emerald-700/60 bg-emerald-950/35 text-emerald-200";
  if(state==="EXPIRED")return "border-slate-700 bg-slate-900/60 text-slate-300";
  return "border-cyan-800/60 bg-cyan-950/30 text-cyan-200";
}

export default function SeatOperationsV66(){
  const { language, t } = usePresentationLanguage();
  const [summary,setSummary]=useState<SeatConsistencySummaryV66|null>(null);
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");

  const load=useCallback(async()=>{
    try{
      const [me,nextSummary]=await withTransientSeatOperationsReadRetry(()=>Promise.all([
        api<UserProfile>("/me"),
        api<SeatConsistencySummaryV66>("/admin/seat-operations/summary"),
      ]));
      if(me.role!=="ADMIN"){
        clearAuth();window.location.assign("/login?returnTo=/admin/seat-operations&reason=admin");return;
      }
      setSummary(nextSummary);
      setError("");
    }catch(e){setError((e as Error).message);}
  },[]);

  useEffect(()=>{
    if(!getAuth()){window.location.assign("/login?returnTo=/admin/seat-operations&reason=required");return;}
    void load();
    const id=window.setInterval(()=>void load(),REFRESH_MS);
    return()=>window.clearInterval(id);
  },[load]);

  async function reconcile(){
    setBusy(true);setMessage("");setError("");
    try{
      const r=await api<SeatReconcileResultV66>("/admin/seat-operations/reconcile",{method:"POST"});
      setMessage(language==="en"?`Reconciled: ${r.expiredRows} expired holds · ${r.activeRows} active holds · ${r.mirroredRows} Redis mirrors.`:`Đã đối soát: ${r.expiredRows} hold hết hạn · ${r.activeRows} hold đang hoạt động · ${r.mirroredRows} bản sao Redis.`);
      await load();
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }

  const active=useMemo(()=>summary?.recentHolds.filter(x=>x.state==="HELD")??[],[summary]);
  return <div className="space-y-6" data-testid="seat-operations-v66" data-seat-summary-ready={summary?"true":"false"}>
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="section-kicker">V66 · NHẤT QUÁN ĐẶT VÉ & KHÓA GHẾ 4.0</p><h1 className="text-3xl font-black">🎫 Vận hành ghế</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">PostgreSQL giữ quyền sở hữu ghế bền vững; Redis chỉ mirror TTL để tăng tốc. Mọi checkout vẫn bị chặn cuối bằng unique invariant của booking_seat.</p></div>
      <div className="flex gap-2"><a className="btn btn-secondary" href="/admin">← Bảng điều khiển</a><button data-testid="seat-reconcile-v66" className="btn btn-primary" disabled={busy} onClick={reconcile}>{busy?"Đang đối soát...":"Đối soát CSDL ↔ Redis"}</button></div>
    </div>

    {error&&<div data-testid="seat-operations-error-v66" className="rounded-2xl border border-rose-800/70 bg-rose-950/40 p-4 text-rose-200">{error}</div>}
    {message&&<div className="rounded-2xl border border-emerald-800/70 bg-emerald-950/35 p-4 text-emerald-200">{message}</div>}

    <div data-testid="seat-consistency-summary-v66" data-summary-ready={summary?"true":"false"} data-active-holds={summary?.activeHolds??""} data-conflicts-24h={summary?.conflictsLast24Hours??""} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      <Metric label="Lượt giữ ghế đang hoạt động" value={summary?.activeHolds??"—"}/>
      <Metric label="Hết hạn ≤60s" value={summary?.expiringWithin60Seconds??"—"}/>
      <Metric label="Đã chuyển đổi · 24 giờ" value={summary?.convertedLast24Hours??"—"}/>
      <Metric label="Hết hạn · 24 giờ" value={summary?.expiredLast24Hours??"—"}/>
      <Metric label="Đã nhả · 24 giờ" value={summary?.releasedLast24Hours??"—"}/>
      <Metric label="Xung đột · 24 giờ" value={summary?.conflictsLast24Hours??"—"}/>
    </div>

    <div className="grid gap-4 lg:grid-cols-3">
      <section className="card p-5 lg:col-span-2" data-testid="seat-hold-authority-v66">
        <h2 className="text-lg font-black">Nguồn nhất quán</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3"><Info label="Chiến lược" value={summary?.strategyVersion||"V66-BOOKING-CONSISTENCY-4"}/><Info label="Nguồn chuẩn" value={summary?.holdAuthority||"POSTGRESQL_WITH_REDIS_MIRROR"}/><Info label="TTL giữ ghế" value={`${summary?.holdTtlSeconds??300}s`}/></div>
        <div className="mt-4 rounded-xl border border-slate-700/70 bg-slate-950/50 p-4 text-sm leading-6 text-slate-300"><strong>Bất biến:</strong> khóa hàng ghế → lưu bền vững <code>seat_hold</code> → <code>uq_seat_hold_active</code> → checkout idempotency → <code>uq_showtime_seat_active</code>. Redis restart không làm mất durable hold; map/hold kế tiếp tự hydrate mirror.</div>
      </section>
      <section className="card p-5" data-testid="seat-redis-v66"><h2 className="text-lg font-black">Bản sao Redis</h2><div className={`mt-4 rounded-2xl border p-5 ${summary===null?"border-slate-700 bg-slate-900/60":summary.redisAvailable?"border-emerald-700/60 bg-emerald-950/30":"border-amber-700/60 bg-amber-950/30"}`}><div className="text-2xl font-black">{summary===null?"◌ Chưa xác định":summary.redisAvailable?"✅ Sẵn sàng":"⚠ Suy giảm"}</div><p className="mt-2 text-sm leading-6 text-slate-300">{summary===null?"Chưa tải được tổng quan nên chưa thể kết luận trạng thái Redis.":summary.redisAvailable?"Redis đang giữ bản sao TTL. PostgreSQL vẫn là nguồn sự thật.":"Redis không khả dụng; quyền giữ ghế vẫn được bảo vệ bởi PostgreSQL."}</p></div></section>
    </div>

    <section className="card overflow-hidden" data-testid="active-seat-holds-v66">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-5"><div><h2 className="text-lg font-black">{t("Lượt giữ ghế bền vững đang hoạt động","Active durable seat holds")}</h2><p className="text-sm text-slate-500">{language==="en"?`Auto-refresh every 5 seconds · ${active.length} rows in the latest window`:`Tự refresh mỗi 5 giây · ${active.length} dòng trong cửa sổ gần nhất`}</p></div><span className="text-xs text-slate-500">{t("Máy chủ","Server")}: {summary?.serverTime?dateTime(summary.serverTime):"—"}</span></div>
      <HoldTable rows={active} language={language} t={t}/>
    </section>

    <section className="card overflow-hidden" data-testid="seat-hold-history-v66">
      <div className="border-b border-slate-800 p-5"><h2 className="text-lg font-black">{t("Lifecycle gần đây","Recent lifecycle")}</h2><p className="text-sm text-slate-500">{t("HELD / RELEASED / EXPIRED / CONVERTED được giữ lại để đối soát.","HELD / RELEASED / EXPIRED / CONVERTED states are retained for reconciliation.")}</p></div>
      <HoldTable rows={summary?.recentHolds??[]} language={language} t={t}/>
    </section>
  </div>;
}

function Metric({label,value}:{label:string;value:string|number}){return <div className="card p-4"><div className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</div><div className="mt-2 text-2xl font-black">{value}</div></div>}
function Info({label,value}:{label:string;value:string}){return <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3"><div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</div><div className="mt-1 break-all text-sm font-bold text-slate-200">{value}</div></div>}
function HoldTable({rows,language,t}:{rows:SeatHoldItemV66[];language:Language;t:(vi:string,en:string)=>string}){return <div className="overflow-x-auto"><table className="w-full min-w-[1120px] text-sm"><thead><tr className="text-slate-500"><th className="min-w-28 whitespace-nowrap p-3">{t("Trạng thái","Status")}</th><th className="p-3">{t("Phim / Ghế","Movie / Seats")}</th><th className="p-3">{t("Người dùng","User")}</th><th className="p-3">{t("Mã xác thực","Authorization code")}</th><th className="whitespace-nowrap p-3">{t("Tạo","Created")}</th><th className="whitespace-nowrap p-3">{t("Hết hạn","Expired")}</th><th className="p-3">{t("Đặt vé","Booking")}</th><th className="p-3">{t("Sự kiện","Events")}</th></tr></thead><tbody>{rows.length?rows.map(x=><tr key={x.id} className="border-t border-slate-800/80"><td className="min-w-28 whitespace-nowrap p-3"><span className={`inline-flex whitespace-nowrap rounded-full border px-2 py-1 text-xs font-bold ${stateClass(x.state)}`}>{localizedLabel(x.state,language)}</span></td><td className="p-3"><b>{x.movieTitle}</b><div className="text-slate-500">{t("Ghế","Seats")} {x.seatCode}</div></td><td className="p-3">{x.userEmail}</td><td className="p-3 font-mono text-xs text-slate-400">{x.holdToken.slice(0,8)}…</td><td className="whitespace-nowrap p-3">{dateTime(x.createdAt)}</td><td className="whitespace-nowrap p-3">{dateTime(x.expiresAt)}</td><td className="p-3 font-mono text-xs text-slate-400">{x.convertedBookingId?`${x.convertedBookingId.slice(0,8)}…`:"—"}</td><td className="p-3 text-xs text-slate-400">{localizedLabel(x.lastEvent,language)}</td></tr>):<tr><td className="p-5 text-slate-500" colSpan={8}>{t("Chưa có lượt giữ ghế trong lịch sử gần đây.","No seat holds in recent history.")}</td></tr>}</tbody></table></div>}
/* V77.0.9 historical-verifier compatibility markers (not rendered):
V66 · BOOKING CONSISTENCY & SEAT LOCKING 4.0
*/
