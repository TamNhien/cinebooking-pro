"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, currency, dateTime } from "@/lib/api";
import { getAuth } from "@/lib/auth";
import type { Booking } from "@/lib/types";

export default function Bookings(){
 const [items,setItems]=useState<Booking[]>([]); const [error,setError]=useState(""); const [msg,setMsg]=useState("");
 async function load(){setItems(await api<Booking[]>("/bookings/me"));}
 useEffect(()=>{if(!getAuth()){location.href="/login";return;}load().catch(e=>setError(e.message));},[]);
 async function refund(b:Booking){const reason=prompt("Lý do yêu cầu hoàn vé (không bắt buộc):","")??null;if(reason===null)return;setMsg("");try{await api(`/bookings/${b.id}/refund-request`,{method:"POST",body:JSON.stringify({reason})});setMsg("Đã gửi yêu cầu hoàn vé. Admin sẽ xử lý yêu cầu của bạn.");await load();}catch(e){setMsg((e as Error).message)}}
 const badge=(s:string)=>s==="CONFIRMED"?"bg-emerald-900 text-emerald-200":s==="PENDING"?"bg-amber-900 text-amber-200":s==="REFUND_REQUESTED"?"bg-orange-900 text-orange-200":s==="REFUNDED"?"bg-cyan-950 text-cyan-200":"bg-slate-800 text-slate-300";
 return <div><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-3xl font-bold">Vé và booking của tôi</h1><p className="mt-2 text-slate-400">Theo dõi trạng thái, QR check-in, bắp nước, ưu đãi và yêu cầu hoàn vé.</p></div><Link href="/offline-tickets" className="btn btn-secondary">📴 Vé offline</Link></div>{error&&<p className="mt-5 text-red-300">{error}</p>}{msg&&<div className="mt-5 rounded-xl bg-slate-900 p-4 text-sm">{msg}</div>}<div className="mt-6 grid gap-4">
  {items.map(b=><div key={b.id} className="card p-5"><div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div><div className="text-lg font-extrabold">{b.movieTitle}</div><div className="mt-1 text-sm text-slate-400">{dateTime(b.showtimeStart)} · Ghế {b.seats.map(s=>s.code).join(", ")}</div><div className="mt-2 text-xs text-slate-500">Booking #{b.id}</div>{b.checkedInAt&&<div className="mt-2 inline-flex rounded-lg bg-emerald-950 px-2 py-1 text-xs font-bold text-emerald-300">✅ Đã check-in {dateTime(b.checkedInAt)}</div>}</div><div className="md:text-right"><div className="text-xl font-bold">{currency(b.totalAmount)}</div><div className={`mt-1 inline-block rounded-lg px-2 py-1 text-xs font-bold ${badge(b.status)}`}>{b.status}</div>{b.refundAmount!=null&&<div className="mt-1 text-xs text-cyan-300">Mức hoàn: {currency(b.refundAmount)}</div>}</div></div>
   <div className="mt-4 grid gap-3 border-t border-slate-800 pt-4 text-sm sm:grid-cols-2 lg:grid-cols-4"><div><span className="text-slate-500">Tiền vé</span><div className="font-semibold">{currency(b.seatAmount??b.totalAmount)}</div></div><div><span className="text-slate-500">Bắp nước</span><div className="font-semibold">{currency(b.concessionAmount||0)}</div></div><div><span className="text-slate-500">Giảm giá</span><div className="font-semibold text-emerald-300">-{currency(b.discountAmount||0)}</div></div><div><span className="text-slate-500">Ưu đãi</span><div className="font-semibold">{b.voucherCode||"—"}{b.pointsRedeemed?` · ${b.pointsRedeemed} điểm`:""}</div></div></div>
   {!!b.concessions?.length&&<div className="mt-3 rounded-xl bg-slate-950/55 p-3 text-sm"><b>🍿 Bắp nước</b><div className="mt-2 flex flex-wrap gap-2">{b.concessions.map((x,i)=><span key={`${x.productId}-${i}`} className="rounded-lg border border-slate-700 px-2 py-1 text-slate-300">{x.name} × {x.quantity}</span>)}</div></div>}
   <div className="mt-4 flex flex-wrap gap-2">{b.status==="CONFIRMED"&&<Link className="btn btn-primary" href={`/ticket/${b.id}`}>Mở QR vé</Link>}{b.status==="CONFIRMED"&&!b.checkedInAt&&<button className="btn btn-secondary" onClick={()=>refund(b)}>↩ Yêu cầu hoàn vé</button>}{b.status==="REFUND_REQUESTED"&&<span className="rounded-xl bg-orange-950/40 px-3 py-2 text-sm text-orange-200">Đang chờ duyệt hoàn tiền</span>}{b.status==="REFUNDED"&&<span className="rounded-xl bg-cyan-950/40 px-3 py-2 text-sm text-cyan-200">Đã hoàn tiền</span>}</div>
  </div>)}
  {!items.length&&!error&&<div className="card p-6 text-slate-400">Chưa có booking nào.</div>}
 </div></div>
}
