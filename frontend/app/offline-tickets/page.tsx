/* eslint-disable @next/next/no-img-element, react-hooks/exhaustive-deps, react-hooks/set-state-in-effect -- effects intentionally synchronize API/subscription state; dependency lifecycle is intentionally bounded; native img is required for QR/data/user-provided image sources. */
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getAuth } from "@/lib/auth";
import { deleteOfflineTicket, listOfflineTickets, syncOfflineTickets, type OfflineTicketSnapshot, type OfflineTicketSyncResult } from "@/lib/offlineTickets";
import { presentationLocale } from "@/lib/presentation-locale";
import { currency } from "@/lib/api";
import { usePresentationLanguage } from "@/lib/usePresentationLanguage";

const money = (v:number) => currency(v, presentationLocale());
const time = (v:string) => new Intl.DateTimeFormat(presentationLocale(),{dateStyle:"medium",timeStyle:"short"}).format(new Date(v));

export default function OfflineTicketsPage(){
  const { t }=usePresentationLanguage();
  const [items,setItems]=useState<OfflineTicketSnapshot[]>([]);
  const [selected,setSelected]=useState<string|null>(null);
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");
  const [syncing,setSyncing]=useState(false);
  const [syncResult,setSyncResult]=useState<OfflineTicketSyncResult|null>(null);
  const auth=getAuth();

  async function load(){
    if(!auth?.userId){setItems([]);setError(t("Hãy đăng nhập lại đúng tài khoản để mở vé ngoại tuyến đã lưu trên thiết bị này.","Sign in again with the correct account to open offline tickets saved on this device."));return;}
    try{setItems(await listOfflineTickets(auth.userId));}
    catch(e){setError((e as Error).message);}
  }
  useEffect(()=>{load();},[]);
  useEffect(()=>{
    if(!auth?.userId||typeof navigator==="undefined"||!navigator.onLine)return;
    runSync(true);
  },[auth?.userId]);

  const staleCount=useMemo(()=>items.filter(t=>t.syncState==="STALE").length,[items]);
  const freshCount=useMemo(()=>items.filter(t=>t.syncState==="FRESH").length,[items]);

  async function runSync(silent=false){
    if(!auth?.userId)return;
    setSyncing(true);if(!silent){setError("");setMessage("");}
    try{
      const result=await syncOfflineTickets(auth.userId);setSyncResult(result);await load();
      if(!silent)setMessage(t(`Đã kiểm tra ${result.checked} vé: ${result.refreshed} hợp lệ, ${result.stale} không còn hợp lệ, ${result.failed} chưa xác minh được.`,`Checked ${result.checked} tickets: ${result.refreshed} valid, ${result.stale} no longer valid, ${result.failed} could not be verified.`));
    }catch(e){if(!silent)setError((e as Error).message);}finally{setSyncing(false);}
  }

  async function remove(id:string){
    if(!confirm(t("Xóa bản vé ngoại tuyến khỏi thiết bị này?","Delete this offline ticket from the device?")))return;
    await deleteOfflineTicket(id); if(selected===id)setSelected(null); await load();
  }

  return <div className="mx-auto max-w-4xl" data-testid="offline-tickets-v52">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="section-kicker">PWA · V52</p><h1 className="text-3xl font-black">Vé ngoại tuyến đã kiểm soát</h1><p className="mt-2 text-slate-400">QR được lưu cục bộ, có trạng thái đồng bộ và tự đánh dấu stale khi vé bị chuyển, hoàn hoặc không còn hợp lệ.</p></div>
      <div className="flex flex-wrap gap-2"><Link href="/mobile" className="btn btn-secondary">📱 Trung tâm di động</Link><Link href="/bookings" className="btn btn-secondary">← Vé của tôi</Link></div>
    </div>

    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      <div className="card p-4"><div className="text-xs text-slate-500">Đã lưu</div><div className="mt-1 text-2xl font-black">{items.length}</div></div>
      <div className="card p-4"><div className="text-xs text-slate-500">Đã xác minh</div><div className="mt-1 text-2xl font-black text-emerald-300">{freshCount}</div></div>
      <div className="card p-4"><div className="text-xs text-slate-500">Không còn hợp lệ</div><div className="mt-1 text-2xl font-black text-red-300">{staleCount}</div></div>
    </div>

    <div className="mt-4 rounded-xl border border-amber-700/40 bg-amber-950/25 p-4 text-sm text-amber-200">🔐 Vé ngoại tuyến chứa QR soát vé. Chỉ lưu trên thiết bị cá nhân. Khi có mạng, V52 đối chiếu lại máy chủ; QR lỗi thời sẽ bị ẩn để tránh dùng nhầm.</div>
    <div className="mt-4 flex flex-wrap items-center gap-3"><button className="btn btn-primary" disabled={syncing||!auth?.userId} onClick={()=>runSync(false)}>{syncing?"Đang đồng bộ...":"↻ Đồng bộ tất cả vé"}</button><span data-testid="offline-sync-status-v7820r1" className="text-xs text-slate-500">{typeof navigator!=="undefined"&&navigator.onLine?t("Đang online","Online"):t("Đang offline","Offline")}{syncResult?t(` · lần gần nhất kiểm tra ${syncResult.checked} vé`,` · last checked ${syncResult.checked} tickets`):""}</span></div>
    {(error||message)&&<div className={`mt-4 rounded-xl p-4 text-sm ${error?"bg-red-950/40 text-red-200":"bg-emerald-950/30 text-emerald-200"}`}>{error||message}</div>}

    <div className="mt-6 grid gap-4">
      {items.map(ticket=>{
        const open=selected===ticket.bookingId;const stale=ticket.syncState==="STALE";
        return <article key={ticket.bookingId} className={`card overflow-hidden ${stale?"border-red-800/60":""}`}>
          <button type="button" className="w-full p-5 text-left" onClick={()=>setSelected(open?null:ticket.bookingId)}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div><div className="text-lg font-black">{ticket.movieTitle}</div><div className="mt-1 text-sm text-slate-400">{time(ticket.showtimeStart)} · {t("Ghế","Seats")} {ticket.seats.map(s=>s.code).join(", ")}</div><div className="mt-1 text-xs text-slate-500">QR v{ticket.ticketVersion} · {t("kiểm tra","checked")} {time(ticket.lastValidatedAt)}</div></div>
              <div className="sm:text-right"><div className="font-bold">{money(ticket.totalAmount)}</div><span className={`mt-1 inline-flex rounded-lg px-2 py-1 text-xs font-bold ${stale?"bg-red-950 text-red-300":ticket.checkedInAt?"bg-emerald-950 text-emerald-300":"bg-slate-800 text-slate-300"}`}>{stale?t("⛔ KHÔNG CÒN HỢP LỆ","⛔ NO LONGER VALID"):ticket.checkedInAt?t("✅ ĐÃ CHECK-IN","✅ CHECKED IN"):t("🎟 SẴN SÀNG","🎟 READY")}</span></div>
            </div>
          </button>
          {open&&<div className="border-t border-slate-800 p-5 text-center">
            {stale?<div className="rounded-xl border border-red-800/60 bg-red-950/30 p-4 text-sm text-red-200">{t("QR đã được ẩn.","The QR code is hidden.")} {ticket.invalidReason||t("Vé không còn hợp lệ trên máy chủ.","The ticket is no longer valid on the server.")}</div>:<img src={ticket.qrDataUrl} alt={t(`QR vé ${ticket.movieTitle}`,`Ticket QR for ${ticket.movieTitle}`)} className={`mx-auto w-72 max-w-full rounded-2xl bg-white p-3 ${ticket.checkedInAt?"opacity-40":""}`}/>}
            <div className="mt-4 break-all text-xs text-slate-500">{t("Mã đặt vé","Booking code")} #{ticket.bookingId}</div>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {!stale&&typeof navigator!=="undefined"&&navigator.onLine&&<Link href={`/ticket/${ticket.bookingId}`} className="btn btn-primary">{t("Mở vé trực tuyến","Open online ticket")}</Link>}
              <button type="button" className="btn btn-secondary" onClick={()=>remove(ticket.bookingId)}>{t("Xóa khỏi thiết bị","Remove from device")}</button>
            </div>
          </div>}
        </article>;
      })}
      {!items.length&&!error&&<div className="card p-7 text-center text-slate-400"><div className="text-4xl">🎟️</div><p className="mt-3 font-semibold text-slate-200">Chưa có vé ngoại tuyến</p><p className="mt-1 text-sm">Mở một vé ĐÃ XÁC NHẬN rồi chọn “Lưu vé ngoại tuyến”.</p><Link href="/bookings" className="btn btn-primary mt-5">Mở vé của tôi</Link></div>}
    </div>
  </div>;
}
