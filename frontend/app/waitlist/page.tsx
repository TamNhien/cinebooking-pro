"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api, dateTime } from "@/lib/api";
import { getAuth } from "@/lib/auth";
import type { WaitlistItem } from "@/lib/types";

export default function WaitlistPage(){
  const [items,setItems]=useState<WaitlistItem[]>([]);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState("");

  async function load(){setItems(await api<WaitlistItem[]>("/waitlist/me"));}
  useEffect(()=>{if(!getAuth()){location.href="/login?returnTo=/waitlist&reason=required";return;}load().catch(e=>setError((e as Error).message));},[]);

  const active=useMemo(()=>items.filter(x=>x.status==="ACTIVE"),[items]);
  const history=useMemo(()=>items.filter(x=>x.status!=="ACTIVE"),[items]);

  async function cancel(showtimeId:string){
    setBusy(showtimeId);setError("");
    try{await api(`/waitlist/showtimes/${showtimeId}`,{method:"DELETE"});await load();}
    catch(e){setError((e as Error).message);}finally{setBusy("");}
  }

  const card=(x:WaitlistItem)=><article key={x.id} className="card p-5">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-bold">{x.movieTitle}</h3><span className={`rounded-full px-2 py-1 text-[11px] font-black ${x.status==="ACTIVE"?"bg-amber-500/15 text-amber-300":x.status==="NOTIFIED"?"bg-emerald-500/15 text-emerald-300":"bg-slate-800 text-slate-400"}`}>{x.status}</span></div>
        <p className="mt-2 text-sm text-slate-300">{x.cinemaName} · {x.auditoriumName}</p>
        <p className="mt-1 text-sm text-slate-500">{dateTime(x.showtimeStart)}</p>
        {x.status==="NOTIFIED"&&<p className="mt-2 text-sm text-emerald-300">Đã phát hiện {x.lastAvailableCount} ghế trống{x.notifiedAt?` · ${dateTime(x.notifiedAt)}`:""}.</p>}
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <Link href={`/booking/${x.showtimeId}`} className="btn btn-primary">Mở sơ đồ ghế</Link>
        {x.status==="ACTIVE"&&<button className="btn btn-secondary" disabled={busy===x.showtimeId} onClick={()=>cancel(x.showtimeId)}>{busy===x.showtimeId?"Đang huỷ...":"Huỷ theo dõi"}</button>}
      </div>
    </div>
  </article>;

  return <div className="mx-auto max-w-5xl space-y-8">
    <div><p className="section-kicker">V32 · SEAT ALERTS</p><h1 className="text-3xl font-bold">Danh sách chờ suất chiếu</h1><p className="mt-2 text-slate-400">Theo dõi các suất đang hết ghế. CineBooking sẽ báo khi có ghế được mở lại do huỷ đơn, hết hạn giữ ghế hoặc hoàn vé.</p></div>
    {error&&<div className="rounded-xl border border-red-800/60 bg-red-950/40 p-4 text-sm text-red-200">{error}</div>}
    <section className="space-y-3"><div className="flex items-end justify-between"><div><h2 className="text-xl font-bold">Đang theo dõi</h2><p className="text-sm text-slate-500">{active.length} suất</p></div><Link href="/cinemas" className="btn btn-secondary">Tìm suất chiếu</Link></div>{active.length?active.map(card):<div className="card p-7 text-center text-slate-500">Bạn chưa theo dõi suất chiếu nào đang hết ghế.</div>}</section>
    {history.length>0&&<section className="space-y-3"><div><h2 className="text-xl font-bold">Lịch sử</h2><p className="text-sm text-slate-500">Đã báo, đã huỷ hoặc suất đã qua.</p></div>{history.slice(0,20).map(card)}</section>}
  </div>;
}
