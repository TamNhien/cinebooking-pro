"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, currency, dateTime } from "@/lib/api";
import { getAuth } from "@/lib/auth";
import type { RefundItem } from "@/lib/types";
export default function RefundAdminPage(){
 const [items,setItems]=useState<RefundItem[]>([]);const [msg,setMsg]=useState("");
 async function load(){setItems(await api<RefundItem[]>("/admin/refunds"));}
 useEffect(()=>{const a=getAuth();if(!a||a.role!=="ADMIN"){location.href="/login?next=/admin/refunds";return;}load().catch(e=>setMsg(e.message));},[]);
 async function approve(id:string){if(!confirm("Duyệt hoàn tiền booking này? Ghế sẽ được mở bán lại và điểm/voucher sẽ được hoàn/điều chỉnh."))return;try{await api(`/admin/refunds/${id}/approve`,{method:"POST"});setMsg("Đã duyệt hoàn tiền.");await load();}catch(e){setMsg((e as Error).message)}} async function reject(id:string){if(!confirm("Từ chối yêu cầu hoàn vé? Vé sẽ trở lại trạng thái CONFIRMED."))return;try{await api(`/admin/refunds/${id}/reject`,{method:"POST"});setMsg("Đã từ chối yêu cầu hoàn vé.");await load();}catch(e){setMsg((e as Error).message)}}
 return <div className="space-y-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="section-kicker">REFUND OPERATIONS</p><h1 className="text-3xl font-bold">Yêu cầu hoàn vé</h1><p className="mt-2 text-slate-400">Duyệt hoàn tiền, mở lại ghế và hoàn các quyền lợi liên quan.</p></div><Link href="/admin" className="btn btn-secondary">← Admin</Link></div>{msg&&<div className="rounded-xl bg-slate-900 p-4">{msg}</div>}<div className="grid gap-4">{items.map(x=><div key={x.bookingId} className="card p-5"><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><div className="font-bold">Booking #{x.bookingId}</div><div className="mt-1 text-sm text-slate-400">Yêu cầu: {x.requestedAt?dateTime(x.requestedAt):"—"}</div><div className="mt-2 text-sm">Lý do: {x.reason||"—"}</div></div><div className="md:text-right"><div className="text-sm text-slate-500">Tổng {currency(x.totalAmount)}</div><div className="text-xl font-black text-emerald-300">Hoàn {currency(x.refundAmount||0)}</div><div className="mt-3 flex gap-2"><button onClick={()=>approve(x.bookingId)} className="btn btn-primary">Duyệt hoàn tiền</button><button onClick={()=>reject(x.bookingId)} className="btn btn-secondary">Từ chối</button></div></div></div></div>)}{!items.length&&<div className="card p-6 text-slate-400">Không có yêu cầu hoàn tiền đang chờ.</div>}</div></div>
}
