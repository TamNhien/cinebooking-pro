"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api, currency, dateTime } from "@/lib/api";
import { clearAuth, getAuth } from "@/lib/auth";
import { localizedLabel } from "@/lib/vi-labels";
import { usePresentationLanguage } from "@/lib/usePresentationLanguage";
import type { Booking, Showtime, UserProfile } from "@/lib/types";

export default function BookingSeatIntelligenceAdminV57(){
  const { language, t } = usePresentationLanguage();
  const [showtimes,setShowtimes]=useState<Showtime[]>([]);
  const [bookings,setBookings]=useState<Booking[]>([]);
  const [loading,setLoading]=useState(true);
  const [message,setMessage]=useState("");
  const [status,setStatus]=useState("ALL");
  const [referenceNow,setReferenceNow]=useState<number|null>(null);

  async function load(){
    setLoading(true);setMessage("");
    try{
      const [shows,bookingRows]=await Promise.all([
        api<Showtime[]>("/admin/showtimes"),
        api<Booking[]>("/admin/bookings"),
      ]);
      setShowtimes(shows);
      setBookings(bookingRows);
      setReferenceNow(Date.now());
    }catch(e){setMessage((e as Error).message)}finally{setLoading(false)}
  }

  useEffect(()=>{
    const local=getAuth();
    if(!local){window.location.assign("/login?returnTo=/admin/booking-seat-intelligence&reason=required");return;}
    (async()=>{
      try{
        const profile=await api<UserProfile>("/me");
        if(profile.role!=="ADMIN"){
          clearAuth();
          window.location.assign("/login?returnTo=/admin/booking-seat-intelligence&reason=admin");
          return;
        }
        await load();
      }catch(e){setMessage((e as Error).message);setLoading(false)}
    })();
  },[]);

  const bookingCountByShowtime=useMemo(()=>{
    const map=new Map<string,number>();
    bookings.forEach(b=>map.set(b.showtimeId,(map.get(b.showtimeId)||0)+1));
    return map;
  },[bookings]);
  const activeBookingCountByShowtime=useMemo(()=>{
    const map=new Map<string,number>();
    bookings.filter(b=>!["CANCELLED","CANCELED","REFUNDED","EXPIRED"].includes(b.status)).forEach(b=>map.set(b.showtimeId,(map.get(b.showtimeId)||0)+1));
    return map;
  },[bookings]);
  const statuses=useMemo(()=>["ALL",...Array.from(new Set(showtimes.map(s=>s.status))).sort()],[showtimes]);
  const visible=useMemo(()=>showtimes
    .filter(s=>status==="ALL"||s.status===status)
    .sort((a,b)=>a.startTime.localeCompare(b.startTime)),[showtimes,status]);
  const upcoming=referenceNow===null?0:showtimes.filter(s=>new Date(s.startTime).getTime()>=referenceNow).length;
  const confirmed=bookings.filter(b=>b.status==="CONFIRMED"||b.status==="CHECKED_IN").length;

  return <main className="space-y-6" data-testid="admin-booking-seat-intelligence-page-v57">
    <section className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 text-sm text-slate-400"><Link href="/admin" className="hover:text-white">{t("Quản trị viên","Administration")}</Link> / {t("Đặt vé & gợi ý ghế V57","Booking & seat intelligence V57")}</div>
          <div className="text-xs font-black tracking-[0.22em] text-violet-300">{t("V57 · ĐẶT VÉ & TRÍ TUỆ GHẾ 3.0","V57 · BOOKING & SEAT INTELLIGENCE 3.0")}</div>
          <h1 className="mt-2 text-3xl font-black">{t("Đặt vé & gợi ý ghế V57","Booking & seat intelligence V57")}</h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-400">{t("Trang quản trị riêng dùng trực tiếp dữ liệu suất chiếu và lượt đặt vé đang có trong hệ thống. Từ mỗi suất chiếu, quản trị viên có thể mở sơ đồ ghế thật để kiểm tra gợi ý cụm ghế, giá động và trạng thái giữ ghế V57.","This dedicated admin page uses real showtime and booking data already in the system. From each showtime, an administrator can open the real seat map to inspect seat-cluster suggestions, dynamic pricing, and V57 seat-hold status.")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin" className="btn btn-secondary">{t("← Bảng điều khiển","← Admin Dashboard")}</Link>
          <button className="btn btn-primary" type="button" onClick={load} disabled={loading}>{loading?t("Đang tải...","Loading..."):t("Làm mới dữ liệu","Refresh data")}</button>
        </div>
      </div>
      {message&&<div className="mt-4 rounded-xl border border-rose-800/60 bg-rose-950/30 p-3 text-sm text-rose-200" data-testid="booking-seat-intelligence-error-v57">{message}</div>}
    </section>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" data-testid="booking-seat-intelligence-summary-v57">
      <Metric label={t("Tổng suất chiếu","Total showtimes")} value={showtimes.length}/>
      <Metric label={t("Suất sắp tới","Upcoming showtimes")} value={upcoming}/>
      <Metric label={t("Lượt đặt vé thực tế","Real bookings")} value={bookings.length}/>
      <Metric label={t("Đã xác nhận / soát vé","Confirmed / checked in")} value={confirmed}/>
    </section>

    <section className="card p-5" data-testid="booking-seat-intelligence-policy-v57">
      <div className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">{t("Nguồn dữ liệu vận hành thật","Real operational data sources")}</div>
      <div className="mt-3 grid gap-2 text-sm text-slate-300 sm:grid-cols-2 xl:grid-cols-4"><span>✓ /admin/showtimes</span><span>✓ /admin/bookings</span><span>✓ {t("Không tạo dữ liệu giả","No synthetic data")}</span><span>✓ {t("Mở đường dẫn đặt vé theo mã suất chiếu để xem sơ đồ ghế","Open the booking route by showtime ID to inspect the seat map")}</span></div>
    </section>

    <section className="card overflow-hidden" data-testid="booking-seat-intelligence-showtimes-v57">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-800 p-5">
        <div><h2 className="text-xl font-bold">{t("Suất chiếu & điểm vào sơ đồ ghế","Showtimes & seat-map entry points")}</h2><p className="mt-1 text-sm text-slate-500">{t("Số lượt đặt vé bên dưới được tổng hợp trực tiếp theo mã suất chiếu.","Booking counts below are aggregated directly by showtime ID.")}</p></div>
        <label className="w-full text-sm text-slate-300 sm:w-64">{t("Trạng thái suất chiếu","Showtime status")}<select className="input mt-2" value={status} onChange={e=>setStatus(e.target.value)}>{statuses.map(x=><option key={x} value={x}>{localizedLabel(x,language)}</option>)}</select></label>
      </div>
      <div className="hidden lg:block">
        <table className="w-full table-fixed text-sm">
          <thead className="bg-slate-950/60 text-left text-xs uppercase tracking-wider text-slate-500"><tr><th className="w-[21%] p-3">{t("Phim","Movie")}</th><th className="w-[20%] p-3">{t("Rạp / phòng","Cinema / auditorium")}</th><th className="w-[15%] p-3">{t("Bắt đầu","Starts")}</th><th className="w-[11%] p-3">{t("Trạng thái","Status")}</th><th className="w-[13%] p-3 text-right">{t("Giá cơ bản","Base price")}</th><th className="w-[11%] p-3 text-center">{t("Đặt vé / hiệu lực","Bookings / active")}</th><th className="w-[9%] p-3">{t("Sơ đồ ghế","Seat map")}</th></tr></thead>
          <tbody>{visible.map(s=><tr key={s.id} className="border-t border-slate-800 align-middle"><td className="p-3"><b className="break-words">{s.movieTitle}</b><div className="mt-1 truncate font-mono text-[11px] text-slate-600" title={s.id}>{s.id}</div></td><td className="p-3"><div className="break-words">{s.cinemaName}</div><div className="break-words text-xs text-slate-500">{s.auditoriumName}</div></td><td className="p-3">{dateTime(s.startTime)}</td><td className="p-3 font-semibold">{localizedLabel(s.status,language)}</td><td className="p-3 text-right">{currency(s.basePrice)}</td><td className="p-3 text-center"><b>{bookingCountByShowtime.get(s.id)||0}</b><div className="text-xs text-slate-500">{t("hiệu lực","active")}: {activeBookingCountByShowtime.get(s.id)||0}</div></td><td className="p-3"><Link href={`/booking/${s.id}`} className="btn btn-secondary !px-3 !py-2 text-xs" data-testid={`open-seat-map-v57-${s.id}`}>💺 {t("Mở","Open")}</Link></td></tr>)}{!visible.length&&<tr><td colSpan={7} className="p-8 text-center text-slate-500">{t("Không có suất chiếu phù hợp bộ lọc.","No showtimes match the current filter.")}</td></tr>}</tbody>
        </table>
      </div>
      <div className="grid gap-3 p-4 lg:hidden">
        {visible.map(s=><article key={s.id} className="rounded-2xl border border-slate-800 bg-slate-950/35 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="break-words font-bold">{s.movieTitle}</h3><div className="mt-1 text-xs text-slate-500">{s.cinemaName} · {s.auditoriumName}</div></div><span className="shrink-0 rounded-full border border-slate-700 px-2 py-1 text-[10px] font-bold">{localizedLabel(s.status,language)}</span></div><div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-300"><span>{t("Bắt đầu","Starts")}: <b>{dateTime(s.startTime)}</b></span><span>{t("Giá cơ bản","Base price")}: <b>{currency(s.basePrice)}</b></span><span>{t("Đặt vé","Bookings")}: <b>{bookingCountByShowtime.get(s.id)||0}</b></span><span>{t("Hiệu lực","Active")}: <b>{activeBookingCountByShowtime.get(s.id)||0}</b></span></div><Link href={`/booking/${s.id}`} className="btn btn-secondary mt-3 w-full" data-testid={`open-seat-map-v57-${s.id}`}>💺 {t("Mở sơ đồ ghế","Open seat map")}</Link></article>)}
        {!visible.length&&<div className="py-8 text-center text-slate-500">{t("Không có suất chiếu phù hợp bộ lọc.","No showtimes match the current filter.")}</div>}
      </div>
    </section>
  </main>;
}

function Metric({label,value}:{label:string;value:number}){return <div className="card p-4"><div className="text-xs text-slate-400">{label}</div><div className="mt-1 text-2xl font-black">{value}</div></div>}
