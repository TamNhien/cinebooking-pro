"use client";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { getAuth, token } from "@/lib/auth";
import { api, dateTime } from "@/lib/api";
import { blobToDataUrl, deleteOfflineTicket, getOfflineTicket, requestPersistentStorage, saveOfflineTicket, type OfflineTicketSnapshot } from "@/lib/offlineTickets";
import type { Booking, TicketInfo } from "@/lib/types";

export default function TicketPage({params}:{params:Promise<{bookingId:string}>}){
 const {bookingId}=use(params);
 const [qrDataUrl,setQrDataUrl]=useState("");
 const [booking,setBooking]=useState<Booking|null>(null);
 const [ticket,setTicket]=useState<TicketInfo|null>(null);
 const [offline,setOffline]=useState<OfflineTicketSnapshot|null>(null);
 const [usingOffline,setUsingOffline]=useState(false);
 const [error,setError]=useState("");
 const [saveMsg,setSaveMsg]=useState("");
 const [saving,setSaving]=useState(false);

 useEffect(()=>{let active=true;(async()=>{
   try{
     const [b,t]=await Promise.all([api<Booking>(`/bookings/${bookingId}`),api<TicketInfo>(`/tickets/${bookingId}`)]);
     const res=await fetch(`${process.env.NEXT_PUBLIC_API_URL||"/api"}/tickets/${bookingId}/qr`,{headers:{Authorization:`Bearer ${token()}`},credentials:"include",cache:"no-store"});
     if(!res.ok){let m="Không tải được QR";try{m=(await res.json()).message||m}catch{}throw new Error(m)}
     const dataUrl=await blobToDataUrl(await res.blob());
     if(!active)return;
     setBooking(b);setTicket(t);setQrDataUrl(dataUrl);setUsingOffline(false);
     const existing=await getOfflineTicket(bookingId).catch(()=>null);
     if(existing&&active){
       const refreshed=toSnapshot(b,t,dataUrl,existing.savedAt);
       await saveOfflineTicket(refreshed).catch(()=>{});
       setOffline(refreshed);
     }
   }catch(e){
     const cached=await getOfflineTicket(bookingId).catch(()=>null);
     if(cached&&active){setOffline(cached);setUsingOffline(true);setQrDataUrl(cached.qrDataUrl);setError("");}
     else if(active)setError((e as Error).message);
   }
 })();return()=>{active=false}},[bookingId]);

 function toSnapshot(b:Booking,t:TicketInfo,dataUrl:string,savedAt=new Date().toISOString()):OfflineTicketSnapshot{
   const auth=getAuth();
   return {bookingId:b.id,ownerUserId:auth?.userId||"",movieTitle:b.movieTitle,showtimeStart:b.showtimeStart,status:b.status,seats:b.seats.map(s=>({code:s.code,price:s.price})),totalAmount:b.totalAmount,checkedInAt:b.checkedInAt||t.checkedInAt||undefined,qrDataUrl:dataUrl,qrUrl:t.qrUrl,publicBaseUrl:t.publicBaseUrl,savedAt};
 }

 async function save(){
   if(!booking||!ticket||!qrDataUrl)return;
   setSaving(true);setSaveMsg("");
   try{
     const snapshot=toSnapshot(booking,ticket,qrDataUrl);
     await saveOfflineTicket(snapshot);
     await requestPersistentStorage();
     setOffline(snapshot);setSaveMsg("✅ Đã lưu QR trên thiết bị. Vé có thể mở khi mất mạng.");
   }catch(e){setSaveMsg((e as Error).message)}finally{setSaving(false)}
 }
 async function remove(){
   await deleteOfflineTicket(bookingId);setOffline(null);setSaveMsg("Đã xóa bản vé offline khỏi thiết bị.");
 }

 const shownMovie=booking?.movieTitle||offline?.movieTitle;
 const shownStart=booking?.showtimeStart||offline?.showtimeStart;
 const shownSeats=booking?.seats.map(s=>s.code).join(", ")||offline?.seats.map(s=>s.code).join(", ");
 const checkedIn=booking?.checkedInAt||offline?.checkedInAt;
 const publicBase=ticket?.publicBaseUrl||offline?.publicBaseUrl;
 const localOnly=!!publicBase&&/localhost|127\.0\.0\.1/i.test(publicBase);

 return <div className="mx-auto max-w-lg card p-7 text-center">
   <p className="section-kicker">E-TICKET · PWA V26</p><h1 className="text-3xl font-bold">Vé điện tử</h1>
   {usingOffline&&<div className="mt-4 rounded-xl border border-cyan-800/50 bg-cyan-950/30 p-3 text-sm font-semibold text-cyan-200">📴 Đang hiển thị bản vé offline đã lưu trên thiết bị.</div>}
   {shownMovie&&<><div className="mt-3 font-bold">{shownMovie}</div><div className="text-slate-400">{shownStart&&dateTime(shownStart)} · Ghế {shownSeats}</div>{checkedIn&&<div className="mt-3 rounded-xl bg-emerald-950/60 p-3 font-bold text-emerald-300">✅ Vé đã check-in lúc {dateTime(checkedIn)}</div>}</>}
   {qrDataUrl&&<img src={qrDataUrl} alt="QR URL vé CineBooking" className={`mx-auto mt-6 w-72 rounded-2xl bg-white p-3 ${checkedIn?"opacity-45":""}`}/>} 
   {error&&<p className="mt-5 text-red-300">{error}</p>}
   {!usingOffline&&booking&&ticket&&qrDataUrl&&<div className="mt-5 flex flex-wrap justify-center gap-2"><button type="button" className="btn btn-primary" disabled={saving} onClick={save}>{saving?"Đang lưu...":offline?"↻ Cập nhật vé offline":"⬇ Lưu vé offline"}</button>{offline&&<button type="button" className="btn btn-secondary" onClick={remove}>Xóa bản offline</button>}<Link href="/offline-tickets" className="btn btn-secondary">Vé offline</Link></div>}
   {usingOffline&&<div className="mt-5 flex flex-wrap justify-center gap-2"><Link href="/offline-tickets" className="btn btn-primary">Tất cả vé offline</Link>{typeof navigator!=="undefined"&&navigator.onLine&&<button className="btn btn-secondary" type="button" onClick={()=>location.reload()}>Đồng bộ lại</button>}</div>}
   {saveMsg&&<div className="mt-4 rounded-xl bg-slate-900 p-3 text-sm text-slate-300">{saveMsg}</div>}
   {(ticket||offline)&&!checkedIn&&<div className="mt-5 rounded-xl border border-slate-700 bg-slate-950/50 p-3 text-left text-xs leading-5 text-slate-400"><b className="text-slate-200">QR CineBooking:</b> camera mặc định trên điện thoại có thể mở thẳng trang check-in của CineBooking.{localOnly&&<div className="mt-2 text-amber-300">⚠ QR đang dùng {publicBase}. Điện thoại khác không truy cập được localhost. Hãy đặt TICKET_PUBLIC_BASE_URL thành IP LAN/domain của máy chủ rồi recreate backend.</div>}</div>}
   <p className="mt-5 text-xs leading-5 text-slate-500">QR được ký HMAC và chỉ check-in một lần. Bản offline chứa quyền vào rạp, vì vậy không chia sẻ ảnh QR và chỉ lưu trên thiết bị cá nhân.</p>
 </div>
}
