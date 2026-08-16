"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { api, currency, dateTime } from "@/lib/api";
import { clearAuth, getAuth } from "@/lib/auth";
import type { AdminBookingActionResult, AdminBookingView, AdminTicketInfo, UserProfile } from "@/lib/types";

const statuses=["ALL","PENDING","CONFIRMED","REFUND_REQUESTED","REFUNDED","CANCELLED","EXPIRED"];
const paymentStatuses=["ALL","PENDING","SUCCESS","FAILED","REFUNDED","NONE"];

function badge(status:string){
  if(["CONFIRMED","SUCCESS"].includes(status)) return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  if(["REFUND_REQUESTED","PENDING"].includes(status)) return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  if(["REFUNDED"].includes(status)) return "border-sky-500/30 bg-sky-500/10 text-sky-300";
  if(["FAILED","CANCELLED","EXPIRED"].includes(status)) return "border-rose-500/30 bg-rose-500/10 text-rose-300";
  return "border-slate-600 bg-slate-800 text-slate-300";
}

export default function AdminBookingsPage(){
  const [items,setItems]=useState<AdminBookingView[]>([]);
  const [selected,setSelected]=useState<AdminBookingView|null>(null);
  const [ticket,setTicket]=useState<AdminTicketInfo|null>(null);
  const [q,setQ]=useState(""); const [status,setStatus]=useState("ALL"); const [payment,setPayment]=useState("ALL"); const [cinema,setCinema]=useState("ALL");
  const [loading,setLoading]=useState(true); const [busy,setBusy]=useState(""); const [msg,setMsg]=useState("");

  async function load(){
    setLoading(true);
    try{
      const me=await api<UserProfile>("/me");
      if(me.role!=="ADMIN"){ clearAuth(); location.href="/login?returnTo=/admin/bookings&reason=admin"; return; }
      const data=await api<AdminBookingView[]>("/admin/booking-ops"); setItems(data);
      const wanted=new URLSearchParams(location.search).get("booking"); if(wanted){ const found=data.find(x=>x.id===wanted); if(found) await openDetail(found.id); }
    }catch(e){setMsg((e as Error).message)}finally{setLoading(false)}
  }
  useEffect(()=>{if(!getAuth()){location.href="/login?returnTo=/admin/bookings&reason=required";return;}void load()},[]);

  const cinemas=useMemo(()=>Array.from(new Set(items.map(x=>x.cinemaName))).sort(),[items]);
  const filtered=useMemo(()=>items.filter(x=>{
    const hay=[x.id,x.customerName,x.customerEmail,x.customerPhone,x.movieTitle,x.cinemaName,x.auditoriumName,x.seats.map(s=>s.code).join(" ")].filter(Boolean).join(" ").toLowerCase();
    if(q.trim()&&!hay.includes(q.trim().toLowerCase()))return false;
    if(status!=="ALL"&&x.status!==status)return false;
    const ps=x.latestPayment?.status||"NONE"; if(payment!=="ALL"&&ps!==payment)return false;
    if(cinema!=="ALL"&&x.cinemaName!==cinema)return false;
    return true;
  }),[items,q,status,payment,cinema]);
  const stats=useMemo(()=>({total:items.length,confirmed:items.filter(x=>x.status==="CONFIRMED").length,refund:items.filter(x=>x.status==="REFUND_REQUESTED").length,revenue:items.filter(x=>x.latestPayment?.status==="SUCCESS").reduce((s,x)=>s+x.totalAmount,0)}),[items]);

  async function openDetail(id:string){try{setBusy("detail");const d=await api<AdminBookingView>(`/admin/booking-ops/${id}`);setSelected(d);setTicket(null)}catch(e){setMsg((e as Error).message)}finally{setBusy("")}}
  async function refreshOne(id:string){const d=await api<AdminBookingView>(`/admin/booking-ops/${id}`);setSelected(d);setItems(v=>v.map(x=>x.id===id?{...d,timeline:[]}:x));}
  async function action(path:string,body?:unknown,confirmText?:string){
    if(!selected)return; if(confirmText&&!confirm(confirmText))return;
    try{setBusy(path);const r=await api<AdminBookingActionResult>(path,{method:"POST",body:body===undefined?undefined:JSON.stringify(body)});setMsg(r.message);await refreshOne(selected.id)}catch(e){setMsg((e as Error).message)}finally{setBusy("")}
  }
  async function showQr(){if(!selected)return;try{setBusy("qr");setTicket(await api<AdminTicketInfo>(`/admin/booking-ops/${selected.id}/ticket`))}catch(e){setMsg((e as Error).message)}finally{setBusy("")}}
  async function refundRequest(){if(!selected)return;const reason=prompt("Lý do hoàn vé (không bắt buộc):","Admin hỗ trợ khách hàng hoàn vé");if(reason===null)return;await action(`/admin/booking-ops/${selected.id}/refund-request`,{reason},"Tạo yêu cầu hoàn tiền cho booking này?")}
  async function cancelPending(){if(!selected)return;const reason=prompt("Lý do huỷ booking PENDING:","Admin huỷ đơn chưa thanh toán");if(reason===null)return;await action(`/admin/booking-ops/${selected.id}/cancel`,{reason},"Huỷ booking và mở lại ghế?")}

  const closeDetail=()=>{setSelected(null);setTicket(null)};

  useEffect(()=>{
    if(!selected)return;
    const previous=document.body.style.overflow;
    document.body.style.overflow="hidden";
    const onKey=(event:KeyboardEvent)=>{if(event.key==="Escape")closeDetail()};
    window.addEventListener("keydown",onKey);
    return()=>{document.body.style.overflow=previous;window.removeEventListener("keydown",onKey)};
  },[selected?.id]);

  const bookingModal=selected&&typeof document!=="undefined"?createPortal(
    <div className="admin-booking-modal-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)closeDetail()}}>
      <section className="admin-booking-modal" role="dialog" aria-modal="true" aria-labelledby="admin-booking-modal-title">
        <div className="admin-booking-modal-header">
          <div><div className="text-xs text-rose-400">BOOKING #{selected.id}</div><h2 id="admin-booking-modal-title" className="text-2xl font-black">{selected.movieTitle}</h2></div>
          <button className="btn btn-secondary shrink-0" onClick={closeDetail}>Đóng ✕</button>
        </div>
        <div className="admin-booking-modal-scroll">
          <div className="admin-booking-modal-content grid gap-5 lg:grid-cols-[1.35fr_.8fr]">
            <div className="space-y-5">
              <section className="card p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-black">Khách hàng</h3><div>{selected.customerName}</div><div className="text-sm text-slate-400">{selected.customerEmail} · {selected.customerPhone||"-"}</div></div><span className={`rounded-full border px-3 py-1 text-xs font-black ${badge(selected.status)}`}>{selected.status}</span></div></section>
              <section className="card p-5"><h3 className="mb-3 font-black">Vé & suất chiếu</h3><div className="grid gap-2 text-sm sm:grid-cols-2"><div><span className="text-slate-400">Rạp:</span> {selected.cinemaName}</div><div><span className="text-slate-400">Phòng:</span> {selected.auditoriumName}</div><div><span className="text-slate-400">Suất:</span> {dateTime(selected.showtimeStart)}</div><div><span className="text-slate-400">Ghế:</span> {selected.seats.map(s=>s.code).join(", ")||"-"}</div><div><span className="text-slate-400">Tạo:</span> {dateTime(selected.createdAt)}</div><div><span className="text-slate-400">Check-in:</span> {selected.checkedInAt?dateTime(selected.checkedInAt):"Chưa"}</div></div></section>
              <section className="card p-5"><h3 className="mb-3 font-black">Chi tiết tiền</h3><div className="space-y-2 text-sm"><div className="flex justify-between"><span>Tiền vé</span><b>{currency(selected.seatAmount)}</b></div><div className="flex justify-between"><span>Bắp nước</span><b>{currency(selected.concessionAmount)}</b></div>{selected.concessions.map((c,i)=><div className="flex justify-between pl-4 text-slate-400" key={i}><span>{c.name} × {c.quantity}</span><span>{currency(c.subtotal)}</span></div>)}<div className="flex justify-between text-emerald-300"><span>Giảm giá {selected.voucherCode?`(${selected.voucherCode})`:""}</span><b>-{currency(selected.discountAmount)}</b></div><div className="flex justify-between"><span>Điểm đã dùng</span><b>{selected.pointsRedeemed}</b></div><div className="mt-2 flex justify-between border-t border-slate-700 pt-3 text-lg"><b>Tổng</b><b>{currency(selected.totalAmount)}</b></div></div></section>
              <section className="card p-5"><h3 className="mb-3 font-black">Payment</h3>{selected.payments.length?selected.payments.map(p=><div key={p.id} className="mb-3 rounded-xl border border-slate-800 p-3 text-sm"><div className="flex justify-between"><b>{p.provider}</b><span className={`rounded-full border px-2 py-1 text-xs ${badge(p.status)}`}>{p.status}</span></div><div className="mt-2 text-slate-400">{currency(p.amount)} · {dateTime(p.createdAt)}</div>{p.providerTransactionId&&<div className="break-all text-xs text-slate-500">Txn: {p.providerTransactionId}</div>}</div>):<div className="text-slate-500">Booking chưa có payment.</div>}</section>
              <section className="card p-5"><h3 className="mb-3 font-black">Lịch sử quản trị / Audit</h3><div className="space-y-3">{selected.timeline.map(t=><div key={t.id} className="border-l-2 border-slate-700 pl-3 text-sm"><div className="font-bold">{t.action}</div><div className="text-xs text-slate-400">{dateTime(t.createdAt)} · {t.actorEmail||"system"}{t.ipAddress?` · ${t.ipAddress}`:""}</div>{t.details&&<div className="mt-1 text-slate-300">{t.details}</div>}</div>)}{selected.timeline.length===0&&<div className="text-sm text-slate-500">Chưa có audit trực tiếp cho booking này.</div>}</div></section>
            </div>
            <aside className="admin-booking-modal-actions space-y-4">
              <div className="card p-5"><h3 className="mb-4 font-black">Thao tác Admin</h3><div className="grid gap-2">
                {selected.status==="CONFIRMED"&&<button className="btn btn-primary w-full" disabled={!!busy} onClick={showQr}>🎫 Xem QR vé</button>}
                {selected.status==="CONFIRMED"&&<button className="btn btn-secondary w-full" disabled={!!busy} onClick={()=>action(`/admin/booking-ops/${selected.id}/resend-ticket`,undefined,"Gửi lại vé qua email khách hàng?")}>📧 Gửi lại vé qua email</button>}
                {selected.status==="CONFIRMED"&&!selected.checkedInAt&&<button className="btn btn-secondary w-full" disabled={!!busy} onClick={()=>action(`/admin/booking-ops/${selected.id}/manual-checkin`,undefined,"Check-in thủ công booking này? Chỉ dùng khi đã xác minh khách tại rạp.")}>✅ Check-in thủ công</button>}
                {selected.status==="PENDING"&&<button className="btn btn-secondary w-full" disabled={!!busy} onClick={cancelPending}>❌ Huỷ đơn PENDING</button>}
                {selected.status==="CONFIRMED"&&!selected.checkedInAt&&<button className="btn btn-secondary w-full" disabled={!!busy} onClick={refundRequest}>↩ Tạo yêu cầu hoàn tiền</button>}
                {selected.status==="REFUND_REQUESTED"&&<><button className="btn btn-primary w-full" disabled={!!busy} onClick={()=>action(`/admin/booking-ops/${selected.id}/refund-approve`,undefined,"Duyệt hoàn tiền? Ghế sẽ được mở bán lại và payment chuyển REFUNDED.")}>✅ Duyệt hoàn tiền</button><button className="btn btn-secondary w-full" disabled={!!busy} onClick={()=>action(`/admin/booking-ops/${selected.id}/refund-reject`,undefined,"Từ chối yêu cầu hoàn tiền?")}>⛔ Từ chối hoàn tiền</button></>}
              </div><p className="text-xs leading-5 text-slate-500">Không xoá cứng booking. Huỷ/hoàn tiền giữ nguyên payment, check-in và audit để đối soát.</p></div>
              {selected.refundReason&&<div className="card p-5"><h3 className="font-black">Refund</h3><div className="mt-2 text-sm">{selected.refundReason}</div>{selected.refundAmount!==undefined&&<div className="mt-2 font-bold text-amber-300">{currency(selected.refundAmount)}</div>}</div>}
              {ticket&&<div className="card p-5 text-center"><h3 className="mb-3 font-black">QR vé</h3><img src={ticket.qrImageDataUrl} alt="QR vé" className="mx-auto w-full max-w-[320px] rounded-2xl bg-white p-3"/><div className="mt-3 break-all text-left text-xs text-slate-400">{ticket.qrUrl}</div><button className="btn btn-secondary mt-3 w-full" onClick={()=>navigator.clipboard?.writeText(ticket.qrUrl)}>Copy link QR</button></div>}
            </aside>
          </div>
        </div>
      </section>
    </div>,document.body):null;

  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><div className="text-xs font-black uppercase tracking-[.25em] text-rose-400">Booking Operations · V13</div><h1 className="text-3xl font-black">Quản lý booking</h1><p className="text-slate-400">Booking, payment, QR, check-in và refund trên cùng một màn hình.</p></div><div className="flex gap-2"><Link href="/admin" className="btn btn-secondary">← Dashboard</Link><Link href="/admin/refunds" className="btn btn-secondary">↩ Hàng đợi hoàn vé</Link></div></div>
    {msg&&<div className="card border border-rose-500/30 p-4 text-sm">{msg}</div>}
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="card p-4"><div className="text-xs text-slate-400">Tổng booking</div><div className="text-2xl font-black">{stats.total}</div></div><div className="card p-4"><div className="text-xs text-slate-400">CONFIRMED</div><div className="text-2xl font-black text-emerald-300">{stats.confirmed}</div></div><div className="card p-4"><div className="text-xs text-slate-400">Chờ hoàn tiền</div><div className="text-2xl font-black text-amber-300">{stats.refund}</div></div><div className="card p-4"><div className="text-xs text-slate-400">Giá trị payment SUCCESS</div><div className="text-2xl font-black">{currency(stats.revenue)}</div></div></div>
    <div className="card grid gap-3 p-4 md:grid-cols-4"><input className="input" placeholder="Mã booking, khách, phim, ghế..." value={q} onChange={e=>setQ(e.target.value)}/><select className="input" value={status} onChange={e=>setStatus(e.target.value)}>{statuses.map(x=><option key={x}>{x}</option>)}</select><select className="input" value={payment} onChange={e=>setPayment(e.target.value)}>{paymentStatuses.map(x=><option key={x}>{x}</option>)}</select><select className="input" value={cinema} onChange={e=>setCinema(e.target.value)}><option>ALL</option>{cinemas.map(x=><option key={x}>{x}</option>)}</select></div>
    <div className="card overflow-x-auto p-3">{loading?<div className="p-6 text-slate-400">Đang tải booking...</div>:<table className="w-full min-w-[1050px] text-sm"><thead><tr className="text-left text-slate-400"><th className="p-3">Booking / Khách</th><th className="p-3">Phim / Rạp</th><th className="p-3">Suất & ghế</th><th className="p-3">Booking</th><th className="p-3">Payment</th><th className="p-3">Tổng</th><th className="p-3">Thao tác</th></tr></thead><tbody>{filtered.map(x=><tr key={x.id} className="border-t border-slate-800 align-top"><td className="p-3"><button className="text-left font-bold text-rose-300 hover:underline" onClick={()=>openDetail(x.id)}>#{x.id.slice(0,8)}</button><div>{x.customerName}</div><div className="text-xs text-slate-400">{x.customerEmail}</div></td><td className="p-3"><b>{x.movieTitle}</b><div className="text-xs text-slate-400">{x.cinemaName} · {x.auditoriumName}</div></td><td className="p-3">{dateTime(x.showtimeStart)}<div className="text-xs text-slate-400">Ghế {x.seats.map(s=>s.code).join(", ")||"-"}</div></td><td className="p-3"><span className={`rounded-full border px-2 py-1 text-xs font-bold ${badge(x.status)}`}>{x.status}</span>{x.checkedInAt&&<div className="mt-2 text-xs text-emerald-300">✓ Đã check-in</div>}</td><td className="p-3">{x.latestPayment?<><span className={`rounded-full border px-2 py-1 text-xs font-bold ${badge(x.latestPayment.status)}`}>{x.latestPayment.status}</span><div className="mt-2 text-xs text-slate-400">{x.latestPayment.provider}</div></>:<span className="text-slate-500">Chưa có</span>}</td><td className="p-3 font-bold">{currency(x.totalAmount)}</td><td className="p-3"><button className="btn btn-primary !px-3 !py-2" onClick={()=>openDetail(x.id)}>Quản lý</button></td></tr>)}{filtered.length===0&&<tr><td colSpan={7} className="p-8 text-center text-slate-500">Không có booking phù hợp.</td></tr>}</tbody></table>}</div>

    {bookingModal}
  </div>
}
