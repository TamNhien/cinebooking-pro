"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getAuth } from "@/lib/auth";
import { deleteOfflineTicket, listOfflineTickets, type OfflineTicketSnapshot } from "@/lib/offlineTickets";

const money = (v:number) => new Intl.NumberFormat("vi-VN",{style:"currency",currency:"VND"}).format(v);
const time = (v:string) => new Intl.DateTimeFormat("vi-VN",{dateStyle:"medium",timeStyle:"short"}).format(new Date(v));

export default function OfflineTicketsPage(){
  const [items,setItems]=useState<OfflineTicketSnapshot[]>([]);
  const [selected,setSelected]=useState<string|null>(null);
  const [error,setError]=useState("");
  const auth=getAuth();

  async function load(){
    try{setItems(await listOfflineTickets(auth?.userId));}
    catch(e){setError((e as Error).message);}
  }
  useEffect(()=>{load();},[]);

  async function remove(id:string){
    if(!confirm("Xóa bản vé offline khỏi thiết bị này?"))return;
    await deleteOfflineTicket(id); if(selected===id)setSelected(null); await load();
  }

  return <div className="mx-auto max-w-4xl">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="section-kicker">PWA · V26</p><h1 className="text-3xl font-black">Vé đã lưu offline</h1><p className="mt-2 text-slate-400">QR được lưu cục bộ trên thiết bị. Bạn có thể mở vé khi điện thoại mất mạng.</p></div>
      <Link href="/bookings" className="btn btn-secondary">← Vé của tôi</Link>
    </div>
    <div className="mt-4 rounded-xl border border-amber-700/40 bg-amber-950/25 p-4 text-sm text-amber-200">🔐 Vé offline chứa QR check-in. Chỉ lưu trên thiết bị cá nhân và nên xóa sau khi xem phim. Nhân viên quét vé vẫn cần kết nối tới máy chủ CineBooking.</div>
    {error&&<div className="mt-4 rounded-xl bg-red-950/40 p-4 text-red-200">{error}</div>}
    <div className="mt-6 grid gap-4">
      {items.map(t=>{
        const open=selected===t.bookingId;
        return <article key={t.bookingId} className="card overflow-hidden">
          <button type="button" className="w-full p-5 text-left" onClick={()=>setSelected(open?null:t.bookingId)}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div><div className="text-lg font-black">{t.movieTitle}</div><div className="mt-1 text-sm text-slate-400">{time(t.showtimeStart)} · Ghế {t.seats.map(s=>s.code).join(", ")}</div><div className="mt-1 text-xs text-slate-500">Lưu lúc {time(t.savedAt)}</div></div>
              <div className="sm:text-right"><div className="font-bold">{money(t.totalAmount)}</div><span className={`mt-1 inline-flex rounded-lg px-2 py-1 text-xs font-bold ${t.checkedInAt?"bg-emerald-950 text-emerald-300":"bg-slate-800 text-slate-300"}`}>{t.checkedInAt?"✅ ĐÃ CHECK-IN":"🎟 SẴN SÀNG"}</span></div>
            </div>
          </button>
          {open&&<div className="border-t border-slate-800 p-5 text-center">
            <img src={t.qrDataUrl} alt={`QR vé ${t.movieTitle}`} className={`mx-auto w-72 max-w-full rounded-2xl bg-white p-3 ${t.checkedInAt?"opacity-40":""}`}/>
            <div className="mt-4 break-all text-xs text-slate-500">Booking #{t.bookingId}</div>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {typeof navigator!=="undefined"&&navigator.onLine&&<Link href={`/ticket/${t.bookingId}`} className="btn btn-primary">Đồng bộ vé online</Link>}
              <button type="button" className="btn btn-secondary" onClick={()=>remove(t.bookingId)}>Xóa khỏi thiết bị</button>
            </div>
          </div>}
        </article>;
      })}
      {!items.length&&!error&&<div className="card p-7 text-center text-slate-400"><div className="text-4xl">🎟️</div><p className="mt-3 font-semibold text-slate-200">Chưa có vé offline</p><p className="mt-1 text-sm">Mở một vé CONFIRMED rồi chọn “Lưu vé offline”.</p><Link href="/bookings" className="btn btn-primary mt-5">Mở vé của tôi</Link></div>}
    </div>
  </div>;
}
