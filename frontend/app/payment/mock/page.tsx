"use client";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { api, currency } from "@/lib/api";
import type { Booking } from "@/lib/types";

function MockInner(){
 const q=useSearchParams(); const bookingId=q.get("bookingId")||""; const [booking,setBooking]=useState<Booking|null>(null); const [msg,setMsg]=useState(""); const [busy,setBusy]=useState(false);
 async function load(){try{setBooking(await api<Booking>(`/bookings/${bookingId}`));}catch(e){setMsg((e as Error).message)}}
 if(!booking&&!msg) void load();
 async function finish(ok:boolean){setBusy(true);try{await api(`/payments/bookings/${bookingId}/mock/${ok?"success":"fail"}`,{method:"POST"});location.href="/bookings";}catch(e){setMsg((e as Error).message);setBusy(false)}}
 return <div className="mx-auto max-w-lg card p-7"><div className="text-sm font-bold uppercase tracking-widest text-amber-400">Payment Simulator</div><h1 className="mt-2 text-3xl font-bold">Mock Gateway</h1><p className="mt-3 text-slate-400">Dùng để demo luồng thanh toán không cần tài khoản merchant.</p>{booking&&<div className="mt-6 rounded-xl bg-slate-900 p-4"><div className="font-bold">{booking.movieTitle}</div><div className="text-sm text-slate-400">Ghế {booking.seats.map(s=>s.code).join(", ")}</div><div className="mt-3 text-xl font-bold">{currency(booking.totalAmount)}</div></div>}{msg&&<p className="mt-4 text-red-300">{msg}</p>}<div className="mt-6 grid grid-cols-2 gap-3"><button disabled={busy} onClick={()=>finish(false)} className="btn btn-secondary">Giả lập thất bại</button><button disabled={busy} onClick={()=>finish(true)} className="btn btn-primary">Giả lập thành công</button></div></div>
}
export default function MockPayment(){return <Suspense fallback={<div>Loading...</div>}><MockInner/></Suspense>}
