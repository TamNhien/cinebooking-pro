"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, currency, dateTime } from "@/lib/api";
import { getAuth } from "@/lib/auth";
import type { RefundItem } from "@/lib/types";

export default function RefundAdminPage(){
 const [items,setItems]=useState<RefundItem[]>([]); const [msg,setMsg]=useState(""); const [refs,setRefs]=useState<Record<string,string>>({});
 async function load(){setItems(await api<RefundItem[]>("/admin/refunds"));}
 useEffect(()=>{const a=getAuth();if(!a||a.role!=="ADMIN"){location.href="/login?next=/admin/refunds";return;}load().catch(e=>setMsg(e.message));},[]);
 async function approve(x:RefundItem){
  const providerReference=refs[x.bookingId]?.trim()||undefined;
  if(!confirm("Xác nhận giao dịch hoàn tiền đã được xử lý? Ghế, loyalty, voucher và tồn kho sẽ được hoàn tự động."))return;
  try{await api(`/admin/refunds/${x.bookingId}/approve`,{method:"POST",body:JSON.stringify({providerReference})});setMsg("Đã duyệt và hoàn tất hoàn tiền.");await load();}catch(e){setMsg((e as Error).message)}
 }
 async function reject(id:string){if(!confirm("Từ chối yêu cầu hoàn vé? Vé sẽ trở lại trạng thái CONFIRMED."))return;try{await api(`/admin/refunds/${id}/reject`,{method:"POST"});setMsg("Đã từ chối yêu cầu hoàn vé.");await load();}catch(e){setMsg((e as Error).message)}}
 return <div className="space-y-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="section-kicker">V38 · REFUND OPERATIONS</p><h1 className="text-3xl font-bold">Hoàn vé & hủy booking</h1><p className="mt-2 text-slate-400">MOCK đủ điều kiện được hoàn tự động; VNPay/MoMo cần reference hoàn tiền trước khi admin xác nhận.</p></div><Link href="/admin" className="btn btn-secondary">← Admin</Link></div>{msg&&<div className="rounded-xl bg-slate-900 p-4">{msg}</div>}<div className="grid gap-4">{items.map(x=><article key={x.bookingId} className="card p-5"><div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0"><div className="font-bold">Booking #{x.bookingId}</div><div className="mt-1 text-sm text-slate-400">Yêu cầu: {x.requestedAt?dateTime(x.requestedAt):"—"}</div><div className="mt-2 text-sm">Lý do: {x.reason||"—"}</div><div className="mt-3 flex flex-wrap gap-2 text-xs"><span className="rounded-lg bg-slate-800 px-2 py-1">{x.policyCode||"POLICY"}</span><span className="rounded-lg bg-slate-800 px-2 py-1">Hoàn {x.ratePercent||0}%</span><span className="rounded-lg bg-slate-800 px-2 py-1">{x.automatic?"AUTO":"MANUAL"}</span></div></div><div className="w-full lg:max-w-md lg:text-right"><div className="text-sm text-slate-500">Tổng {currency(x.totalAmount)}</div><div className="text-xl font-black text-emerald-300">Hoàn {currency(x.refundAmount||0)}</div><div className="text-sm text-amber-300">Phí hủy {currency(x.feeAmount||0)}</div><label className="mt-3 block text-left text-xs text-slate-400" htmlFor={`refund-ref-${x.bookingId}`}>Reference hoàn tiền VNPay/MoMo (bỏ trống với MOCK)</label><input id={`refund-ref-${x.bookingId}`} className="input mt-1" value={refs[x.bookingId]||""} onChange={e=>setRefs(v=>({...v,[x.bookingId]:e.target.value}))} placeholder="VD: VNPAY-REFUND-..."/><div className="mt-3 flex justify-end gap-2"><button onClick={()=>approve(x)} className="btn btn-primary">Xác nhận đã hoàn tiền</button><button onClick={()=>reject(x.bookingId)} className="btn btn-secondary">Từ chối</button></div></div></div></article>)}{!items.length&&<div className="card p-6 text-slate-400">Không có yêu cầu hoàn tiền thủ công đang chờ. Các giao dịch MOCK đủ điều kiện có thể đã được xử lý tự động.</div>}</div></div>
}
