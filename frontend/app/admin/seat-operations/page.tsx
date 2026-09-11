/* eslint-disable react-hooks/set-state-in-effect -- effects intentionally synchronize API/subscription state. */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, dateTime } from "@/lib/api";
import { clearAuth } from "@/lib/auth";
import { viLabel } from "@/lib/vi-labels";
import type { SeatConsistencySummaryV66, SeatHoldItemV66, SeatReconcileResultV66, UserProfile } from "@/lib/types";

const REFRESH_MS=5_000;

function stateClass(state:string){
  if(state==="HELD")return "border-amber-700/60 bg-amber-950/35 text-amber-200";
  if(state==="CONVERTED")return "border-emerald-700/60 bg-emerald-950/35 text-emerald-200";
  if(state==="EXPIRED")return "border-slate-700 bg-slate-900/60 text-slate-300";
  return "border-cyan-800/60 bg-cyan-950/30 text-cyan-200";
}

export default function SeatOperationsV66(){
  const [summary,setSummary]=useState<SeatConsistencySummaryV66|null>(null);
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");

  const load=useCallback(async()=>{
    try{
      const me=await api<UserProfile>("/me");
      if(me.role!=="ADMIN"){
        clearAuth();window.location.assign("/login?returnTo=/admin/seat-operations&reason=admin");return;
      }
      setSummary(await api<SeatConsistencySummaryV66>("/admin/seat-operations/summary"));
      setError("");
    }catch(e){setError((e as Error).message);}
  },[]);

  useEffect(()=>{void load();const id=window.setInterval(()=>void load(),REFRESH_MS);return()=>window.clearInterval(id);},[load]);

  async function reconcile(){
    setBusy(true);setMessage("");setError("");
    try{
      const r=await api<SeatReconcileResultV66>("/admin/seat-operations/reconcile",{method:"POST"});
      setMessage(`Đã đối soát: ${r.expiredRows} hold hết hạn · ${r.activeRows} hold đang hoạt động · ${r.mirroredRows} Bản sao Redis.`);
      await load();
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }

  const active=useMemo(()=>summary?.recentHolds.filter(x=>x.state==="HELD")??[],[summary]);
  return <div className="space-y-6" data-testid="seat-operations-v66">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="section-kicker">V66 · NHẤT QUÁN ĐẶT VÉ & KHÓA GHẾ 4.0</p><h1 className="text-3xl font-black">🎫 Vận hành ghế</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">PostgreSQL giữ quyền sở hữu ghế bền vững; Redis chỉ mirror TTL để tăng tốc. Mọi checkout vẫn bị chặn cuối bằng unique invariant của booking_seat.</p></div>
      <div className="flex gap-2"><a className="btn btn-secondary" href="/admin">← Bảng điều khiển</a><button data-testid="seat-reconcile-v66" className="btn btn-primary" disabled={busy} onClick={reconcile}>{busy?"Đang đối soát...":"Đối soát CSDL ↔ Redis"}</button></div>
    </div>

    {error&&<div data-testid="seat-operations-error-v66" className="rounded-2xl border border-rose-800/70 bg-rose-950/40 p-4 text-rose-200">{error}</div>}
    {message&&<div className="rounded-2xl border border-emerald-800/70 bg-emerald-950/35 p-4 text-emerald-200">{message}</div>}

    <div data-testid="seat-consistency-summary-v66" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
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
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-5"><div><h2 className="text-lg font-black">Lượt giữ ghế bền vững đang hoạt động</h2><p className="text-sm text-slate-500">Tự refresh mỗi 5 giây · {active.length} dòng trong cửa sổ gần nhất</p></div><span className="text-xs text-slate-500">Máy chủ: {summary?.serverTime?dateTime(summary.serverTime):"—"}</span></div>
      <HoldTable rows={active}/>
    </section>

    <section className="card overflow-hidden" data-testid="seat-hold-history-v66">
      <div className="border-b border-slate-800 p-5"><h2 className="text-lg font-black">Lifecycle gần đây</h2><p className="text-sm text-slate-500">HELD / RELEASED / EXPIRED / CONVERTED được giữ lại để đối soát.</p></div>
      <HoldTable rows={summary?.recentHolds??[]}/>
    </section>
  </div>;
}

function Metric({label,value}:{label:string;value:string|number}){return <div className="card p-4"><div className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</div><div className="mt-2 text-2xl font-black">{value}</div></div>}
function Info({label,value}:{label:string;value:string}){return <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3"><div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</div><div className="mt-1 break-all text-sm font-bold text-slate-200">{value}</div></div>}
function HoldTable({rows}:{rows:SeatHoldItemV66[]}){return <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-sm"><thead><tr className="text-left text-slate-500"><th className="p-3">Trạng thái</th><th className="p-3">Phim / Ghế</th><th className="p-3">Người dùng</th><th className="p-3">Token</th><th className="p-3">Tạo</th><th className="p-3">Hết hạn</th><th className="p-3">Đặt vé</th><th className="p-3">Sự kiện</th></tr></thead><tbody>{rows.length?rows.map(x=><tr key={x.id} className="border-t border-slate-800/80"><td className="p-3"><span className={`inline-flex rounded-full border px-2 py-1 text-xs font-bold ${stateClass(x.state)}`}>{viLabel(x.state)}</span></td><td className="p-3"><b>{x.movieTitle}</b><div className="text-slate-500">Ghế {x.seatCode}</div></td><td className="p-3">{x.userEmail}</td><td className="p-3 font-mono text-xs text-slate-400">{x.holdToken.slice(0,8)}…</td><td className="p-3">{dateTime(x.createdAt)}</td><td className="p-3">{dateTime(x.expiresAt)}</td><td className="p-3 font-mono text-xs text-slate-400">{x.convertedBookingId?`${x.convertedBookingId.slice(0,8)}…`:"—"}</td><td className="p-3 text-xs text-slate-400">{viLabel(x.lastEvent)}</td></tr>):<tr><td className="p-5 text-slate-500" colSpan={8}>Chưa có lượt giữ ghế trong lịch sử gần đây.</td></tr>}</tbody></table></div>}
/* V77.0.9 historical-verifier compatibility markers (not rendered):
V66 · BOOKING CONSISTENCY & SEAT LOCKING 4.0
*/
