"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getAuth } from "@/lib/auth";
import { deleteOfflineTicket, listOfflineTickets, syncOfflineTickets, type OfflineTicketSnapshot, type OfflineTicketSyncResult } from "@/lib/offlineTickets";

const money = (v:number) => new Intl.NumberFormat("vi-VN",{style:"currency",currency:"VND"}).format(v);
const time = (v:string) => new Intl.DateTimeFormat("vi-VN",{dateStyle:"medium",timeStyle:"short"}).format(new Date(v));

export default function OfflineTicketsPage(){
  const [items,setItems]=useState<OfflineTicketSnapshot[]>([]);
  const [selected,setSelected]=useState<string|null>(null);
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");
  const [syncing,setSyncing]=useState(false);
  const [syncResult,setSyncResult]=useState<OfflineTicketSyncResult|null>(null);
  const auth=getAuth();

  async function load(){
    if(!auth?.userId){setItems([]);setError("Hãy đăng nhập lại đúng tài khoản để mở vé offline đã lưu trên thiết bị này.");return;}
    try{setItems(await listOfflineTickets(auth.userId));}
    catch(e){setError((e as Error).message);}
  }
  useEffect(()=>{load();},[]);
  useEffect(()=>{
    if(!auth?.userId||typeof navigator==="undefined"||!navigator.onLine)return;
    runSync(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[auth?.userId]);

  const staleCount=useMemo(()=>items.filter(t=>t.syncState==="STALE").length,[items]);
  const freshCount=useMemo(()=>items.filter(t=>t.syncState==="FRESH").length,[items]);

  async function runSync(silent=false){
    if(!auth?.userId)return;
    setSyncing(true);if(!silent){setError("");setMessage("");}
    try{
      const result=await syncOfflineTickets(auth.userId);setSyncResult(result);await load();
      if(!silent)setMessage(`Đã kiểm tra ${result.checked} vé: ${result.refreshed} hợp lệ, ${result.stale} không còn hợp lệ, ${result.failed} chưa xác minh được.`);
    }catch(e){if(!silent)setError((e as Error).message);}finally{setSyncing(false);}
  }

  async function remove(id:string){
    if(!confirm("Xóa bản vé offline khỏi thiết bị này?"))return;
    await deleteOfflineTicket(id); if(selected===id)setSelected(null); await load();
  }

  return <div className="mx-auto max-w-4xl">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="section-kicker">PWA · V52</p><h1 className="text-3xl font-black">Vé offline đã kiểm soát</h1><p className="mt-2 text-slate-400">QR được lưu cục bộ, có trạng thái đồng bộ và tự đánh dấu stale khi vé bị chuyển, hoàn hoặc không còn hợp lệ.</p></div>
      <div className="flex flex-wrap gap-2"><Link href="/mobile" className="btn btn-secondary">📱 Mobile Center</Link><Link href="/bookings" className="btn btn-secondary">← Vé của tôi</Link></div>
    </div>

    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      <div className="card p-4"><div className="text-xs text-slate-500">Đã lưu</div><div className="mt-1 text-2xl font-black">{items.length}</div></div>
      <div className="card p-4"><div className="text-xs text-slate-500">Đã xác minh</div><div className="mt-1 text-2xl font-black text-emerald-300">{freshCount}</div></div>
      <div className="card p-4"><div className="text-xs text-slate-500">Không còn hợp lệ</div><div className="mt-1 text-2xl font-black text-red-300">{staleCount}</div></div>
    </div>

    <div className="mt-4 rounded-xl border border-amber-700/40 bg-amber-950/25 p-4 text-sm text-amber-200">🔐 Vé offline chứa QR check-in. Chỉ lưu trên thiết bị cá nhân. Khi có mạng, V52 đối chiếu lại server; QR stale sẽ bị ẩn để tránh dùng nhầm.</div>
    <div className="mt-4 flex flex-wrap items-center gap-3"><button className="btn btn-primary" disabled={syncing||!auth?.userId} onClick={()=>runSync(false)}>{syncing?"Đang đồng bộ...":"↻ Đồng bộ tất cả vé"}</button><span className="text-xs text-slate-500">{typeof navigator!=="undefined"&&navigator.onLine?"Đang online":"Đang offline"}{syncResult?` · lần gần nhất kiểm tra ${syncResult.checked} vé`:""}</span></div>
    {(error||message)&&<div className={`mt-4 rounded-xl p-4 text-sm ${error?"bg-red-950/40 text-red-200":"bg-emerald-950/30 text-emerald-200"}`}>{error||message}</div>}

    <div className="mt-6 grid gap-4">
      {items.map(t=>{
        const open=selected===t.bookingId;const stale=t.syncState==="STALE";
        return <article key={t.bookingId} className={`card overflow-hidden ${stale?"border-red-800/60":""}`}>
          <button type="button" className="w-full p-5 text-left" onClick={()=>setSelected(open?null:t.bookingId)}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div><div className="text-lg font-black">{t.movieTitle}</div><div className="mt-1 text-sm text-slate-400">{time(t.showtimeStart)} · Ghế {t.seats.map(s=>s.code).join(", ")}</div><div className="mt-1 text-xs text-slate-500">QR v{t.ticketVersion} · kiểm tra {time(t.lastValidatedAt)}</div></div>
              <div className="sm:text-right"><div className="font-bold">{money(t.totalAmount)}</div><span className={`mt-1 inline-flex rounded-lg px-2 py-1 text-xs font-bold ${stale?"bg-red-950 text-red-300":t.checkedInAt?"bg-emerald-950 text-emerald-300":"bg-slate-800 text-slate-300"}`}>{stale?"⛔ KHÔNG CÒN HỢP LỆ":t.checkedInAt?"✅ ĐÃ CHECK-IN":"🎟 SẴN SÀNG"}</span></div>
            </div>
          </button>
          {open&&<div className="border-t border-slate-800 p-5 text-center">
            {stale?<div className="rounded-xl border border-red-800/60 bg-red-950/30 p-4 text-sm text-red-200">QR đã được ẩn. {t.invalidReason||"Vé không còn hợp lệ trên máy chủ."}</div>:<img src={t.qrDataUrl} alt={`QR vé ${t.movieTitle}`} className={`mx-auto w-72 max-w-full rounded-2xl bg-white p-3 ${t.checkedInAt?"opacity-40":""}`}/>}
            <div className="mt-4 break-all text-xs text-slate-500">Booking #{t.bookingId}</div>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {!stale&&typeof navigator!=="undefined"&&navigator.onLine&&<Link href={`/ticket/${t.bookingId}`} className="btn btn-primary">Mở vé online</Link>}
              <button type="button" className="btn btn-secondary" onClick={()=>remove(t.bookingId)}>Xóa khỏi thiết bị</button>
            </div>
          </div>}
        </article>;
      })}
      {!items.length&&!error&&<div className="card p-7 text-center text-slate-400"><div className="text-4xl">🎟️</div><p className="mt-3 font-semibold text-slate-200">Chưa có vé offline</p><p className="mt-1 text-sm">Mở một vé CONFIRMED rồi chọn “Lưu vé offline”.</p><Link href="/bookings" className="btn btn-primary mt-5">Mở vé của tôi</Link></div>}
    </div>
  </div>;
}
