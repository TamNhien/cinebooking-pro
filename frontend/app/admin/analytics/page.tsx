"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api, apiBlob, currency } from "@/lib/api";
import { getAuth } from "@/lib/auth";
import type {
  AnalyticsDashboard,
  AnalyticsNameValue,
  AnalyticsSeatHeatCell,
  AnalyticsStatusCount,
  Cinema,
} from "@/lib/types";

const pct = (value:number) => `${Number(value || 0).toLocaleString("vi-VN", {maximumFractionDigits:1})}%`;
const number = (value:number) => Number(value || 0).toLocaleString("vi-VN");
const dateTime = (value:string) => new Date(value).toLocaleString("vi-VN", {day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"});

export default function AnalyticsPage(){
  const [days,setDays]=useState(30);
  const [cinemaId,setCinemaId]=useState("");
  const [cinemas,setCinemas]=useState<Cinema[]>([]);
  const [data,setData]=useState<AnalyticsDashboard|null>(null);
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(true);
  const [exporting,setExporting]=useState<"csv"|"xlsx"|null>(null);

  useEffect(()=>{
    const auth=getAuth();
    if(!auth||!["MANAGER","ADMIN"].includes(auth.role)){
      location.href="/login?next=/admin/analytics";
      return;
    }
    api<Cinema[]>("/cinemas").then(setCinemas).catch(()=>setCinemas([]));
  },[]);

  useEffect(()=>{
    const auth=getAuth();
    if(!auth||!["MANAGER","ADMIN"].includes(auth.role)) return;
    setLoading(true); setError("");
    const query=new URLSearchParams({days:String(days)});
    if(cinemaId) query.set("cinemaId",cinemaId);
    api<AnalyticsDashboard>(`/admin/analytics?${query}`)
      .then(setData)
      .catch(e=>{setData(null);setError(e.message||"Không tải được Analytics.");})
      .finally(()=>setLoading(false));
  },[days,cinemaId]);

  const maxDaily=useMemo(()=>Math.max(1,...(data?.dailyRevenue.map(x=>x.revenue)||[1])),[data]);
  const maxHourTickets=useMemo(()=>Math.max(1,...(data?.hourlyDemand.map(x=>x.tickets)||[1])),[data]);
  const maxSeatBookings=useMemo(()=>Math.max(1,...(data?.seatHeatmap.map(x=>x.bookings)||[1])),[data]);
  const heatRows=useMemo(()=>{
    const map=new Map<string,AnalyticsSeatHeatCell[]>();
    for(const cell of data?.seatHeatmap||[]){
      const row=map.get(cell.rowLabel)||[];
      row.push(cell);
      map.set(cell.rowLabel,row);
    }
    return [...map.entries()].map(([row,cells])=>[row,cells.sort((a,b)=>a.seatNumber-b.seatNumber)] as const);
  },[data]);

  async function exportAnalytics(format:"csv"|"xlsx"){
    setExporting(format);
    setError("");
    try{
      const query=new URLSearchParams({days:String(days)});
      if(cinemaId) query.set("cinemaId",cinemaId);
      const blob=await apiBlob(`/admin/analytics/export.${format}?${query}`);
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a");
      const today=new Date().toISOString().slice(0,10);
      a.href=url;
      a.download=`cinebooking-analytics-${days}d-${today}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }catch(e){
      setError(e instanceof Error?e.message:"Không thể xuất báo cáo Analytics.");
    }finally{
      setExporting(null);
    }
  }

  return <div className="space-y-7 pb-16">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="section-kicker">ANALYTICS V2</p>
        <h1 className="text-3xl font-black">Doanh thu & hiệu suất vận hành</h1>
        <p className="mt-1 max-w-3xl text-slate-400">Theo dõi doanh thu, tỷ lệ lấp đầy ghế, thanh toán, hoàn vé, giờ cao điểm, vị trí ghế được chọn nhiều và hiệu suất check-in nhân viên.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <select className="input !w-auto min-w-36" value={days} onChange={e=>setDays(Number(e.target.value))}>
          <option value={7}>7 ngày</option><option value={30}>30 ngày</option><option value={90}>90 ngày</option><option value={365}>365 ngày</option>
        </select>
        <select className="input !w-auto min-w-52" value={cinemaId} onChange={e=>setCinemaId(e.target.value)}>
          <option value="">Tất cả rạp</option>
          {cinemas.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button className="btn btn-secondary" type="button" disabled={loading||!!exporting} onClick={()=>exportAnalytics("csv")}>{exporting==="csv"?"Đang xuất...":"Xuất CSV"}</button>
        <button className="btn btn-primary" type="button" disabled={loading||!!exporting} onClick={()=>exportAnalytics("xlsx")}>{exporting==="xlsx"?"Đang xuất...":"Xuất Excel"}</button>
        <Link className="btn btn-secondary" href="/admin">← Admin</Link>
      </div>
    </div>

    {error&&<div className="rounded-xl border border-red-800/60 bg-red-950/50 p-4 text-red-200">{error}</div>}
    {loading&&<div className="card p-8 text-center text-slate-400">Đang tổng hợp dữ liệu vận hành...</div>}

    {!loading&&data&&<>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi title="Doanh thu" value={currency(data.kpi.revenue)} note={`${number(data.kpi.confirmedBookings)} booking xác nhận`}/>
        <Kpi title="Giá trị đơn TB" value={currency(data.kpi.averageOrderValue)} note={`${number(data.kpi.tickets)} vé đã bán`}/>
        <Kpi title="Tỷ lệ lấp đầy" value={pct(data.kpi.occupancyRate)} note="Theo các suất đã diễn ra"/>
        <Kpi title="Thanh toán thành công" value={pct(data.kpi.paymentSuccessRate)} note="SUCCESS + REFUNDED / giao dịch đã xử lý"/>
        <Kpi title="Doanh thu bắp nước" value={currency(data.kpi.concessionRevenue)} note="Booking đã xác nhận"/>
        <Kpi title="Tỷ lệ hoàn vé" value={pct(data.kpi.refundRate)} note="REFUNDED / booking đã quyết toán"/>
        <Kpi title="Check-in" value={number(data.kpi.checkIns)} note="Lượt soát vé trong kỳ"/>
        <Kpi title="Người dùng" value={number(data.kpi.users)} note={`+${number(data.kpi.newUsers)} tài khoản mới`}/>
      </div>

      <section className="card overflow-hidden p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-bold">Doanh thu theo ngày</h2><p className="text-sm text-slate-500">Chiều cao cột = doanh thu; phía dưới có số booking / vé / check-in.</p></div></div>
        <div className="mt-6 flex min-h-72 items-end gap-2 overflow-x-auto pb-2">
          {data.dailyRevenue.length?data.dailyRevenue.map(x=><div key={x.day} className="flex min-w-20 flex-1 flex-col items-center justify-end gap-2">
            <div className="text-center text-[10px] text-slate-400">{x.revenue?currency(x.revenue).replace(" ₫","đ"):"0đ"}</div>
            <div className="w-full max-w-20 rounded-t-xl bg-gradient-to-t from-rose-700 via-rose-500 to-amber-300" style={{height:`${Math.max(8,Math.round(x.revenue/maxDaily*190))}px`}}/>
            <div className="text-center text-[10px] leading-4 text-slate-500">{x.bookings} đơn · {x.tickets} vé<br/>{x.checkIns} check-in</div>
            <span className="text-[10px] font-semibold text-slate-400">{new Date(x.day+"T00:00:00").toLocaleDateString("vi-VN",{day:"2-digit",month:"2-digit"})}</span>
          </div>):<div className="m-auto text-slate-500">Chưa có giao dịch thành công trong khoảng thời gian này.</div>}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card p-5 sm:p-6">
          <h2 className="text-xl font-bold">Hiệu suất theo rạp</h2>
          <p className="mt-1 text-sm text-slate-500">Doanh thu và occupancy của các suất đã diễn ra.</p>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="pb-3">Rạp</th><th>Doanh thu</th><th>Booking</th><th>Vé</th><th>Sức chứa</th><th>Lấp đầy</th></tr></thead>
              <tbody className="divide-y divide-slate-800/70">{data.cinemaPerformance.map(x=><tr key={x.cinemaId}><td className="py-3 font-semibold">{x.cinemaName}</td><td>{currency(x.revenue)}</td><td>{number(x.bookings)}</td><td>{number(x.tickets)}</td><td>{number(x.capacity)}</td><td><Progress value={x.occupancyRate}/></td></tr>)}</tbody>
            </table>
            {!data.cinemaPerformance.length&&<p className="py-6 text-center text-slate-500">Chưa có dữ liệu.</p>}
          </div>
        </section>

        <section className="card p-5 sm:p-6">
          <h2 className="text-xl font-bold">Nhu cầu theo khung giờ</h2>
          <p className="mt-1 text-sm text-slate-500">Giờ bắt đầu suất chiếu theo múi giờ Việt Nam.</p>
          <div className="mt-5 space-y-3">
            {data.hourlyDemand.map(x=><div key={x.hour} className="grid grid-cols-[56px_1fr_auto] items-center gap-3">
              <div className="font-black">{String(x.hour).padStart(2,"0")}:00</div>
              <div className="h-7 overflow-hidden rounded-lg bg-slate-900"><div className="h-full rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-400" style={{width:`${Math.max(4,x.tickets/maxHourTickets*100)}%`}}/></div>
              <div className="min-w-28 text-right text-xs text-slate-400"><b className="text-slate-200">{x.tickets} vé</b><br/>{currency(x.revenue)}</div>
            </div>)}
            {!data.hourlyDemand.length&&<p className="text-sm text-slate-500">Chưa có dữ liệu.</p>}
          </div>
        </section>
      </div>

      <section className="card p-5 sm:p-6">
        <div><h2 className="text-xl font-bold">Heatmap vị trí ghế</h2><p className="mt-1 text-sm text-slate-500">Tổng hợp vị trí ghế được mua nhiều trong kỳ. Màu sáng hơn = được chọn nhiều hơn.</p></div>
        <div className="mt-5 overflow-x-auto pb-2">
          {heatRows.length?<div className="min-w-max space-y-2">{heatRows.map(([row,cells])=><div key={row} className="flex items-center gap-2"><div className="w-8 text-center font-black text-slate-400">{row}</div>{cells.map(cell=>{
            const intensity=cell.bookings/maxSeatBookings;
            return <div key={`${cell.rowLabel}-${cell.seatNumber}`} title={`${cell.rowLabel}${cell.seatNumber}: ${cell.bookings} lượt · ${currency(cell.revenue)}`} className="grid h-11 w-11 place-items-center rounded-lg border border-slate-700 text-xs font-black" style={{background:`rgba(244,63,94,${0.12+intensity*0.78})`}}>{cell.seatNumber}</div>;
          })}</div>)}</div>:<p className="text-sm text-slate-500">Chưa có dữ liệu ghế đã bán.</p>}
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <h2 className="text-xl font-bold">Top suất chiếu</h2>
        <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[860px] text-sm"><thead className="text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="pb-3">Phim / suất</th><th>Rạp</th><th>Vé</th><th>Sức chứa</th><th>Lấp đầy</th><th>Doanh thu</th></tr></thead><tbody className="divide-y divide-slate-800/70">{data.topShowtimes.map(x=><tr key={x.showtimeId}><td className="py-3"><div className="font-semibold">{x.movieTitle}</div><div className="text-xs text-slate-500">{dateTime(x.startTime)} · {x.auditoriumName}</div></td><td>{x.cinemaName}</td><td>{x.tickets}</td><td>{x.capacity}</td><td><Progress value={x.occupancyRate}/></td><td className="font-semibold text-emerald-300">{currency(x.revenue)}</td></tr>)}</tbody></table></div>
        {!data.topShowtimes.length&&<p className="mt-4 text-sm text-slate-500">Chưa có suất đã diễn ra trong kỳ.</p>}
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <Rank title="Top phim" items={data.topMovies}/>
        <Rank title="Phương thức thanh toán" items={data.paymentProviders}/>
        <Rank title="Top bắp nước" items={data.topConcessions}/>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <StatusCard title="Trạng thái booking" items={data.bookingStatuses}/>
        <StatusCard title="Trạng thái payment" items={data.paymentStatuses}/>
        <section className="card p-5"><h2 className="font-bold">Hiệu suất check-in nhân viên</h2><div className="mt-4 space-y-3">{data.staffPerformance.map((x,i)=><div key={`${x.userId}-${x.cinemaName}`} className="flex items-center gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-800 text-sm font-black">{i+1}</span><div className="min-w-0 flex-1"><div className="truncate font-semibold">{x.employeeCode} · {x.fullName}</div><div className="truncate text-xs text-slate-500">{x.cinemaName}</div></div><b>{x.checkedTickets} vé</b></div>)}{!data.staffPerformance.length&&<p className="text-sm text-slate-500">Chưa có lượt check-in.</p>}</div></section>
      </div>
    </>}
  </div>;
}

function Kpi({title,value,note}:{title:string;value:string;note:string}){
  return <div className="card p-5"><div className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</div><div className="mt-2 break-words text-2xl font-black">{value}</div><div className="mt-1 text-xs text-slate-500">{note}</div></div>;
}

function Progress({value}:{value:number}){
  const safe=Math.max(0,Math.min(100,Number(value||0)));
  return <div className="min-w-28"><div className="mb-1 flex justify-between text-xs"><span>{pct(safe)}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-emerald-400" style={{width:`${safe}%`}}/></div></div>;
}

function Rank({title,items}:{title:string;items:AnalyticsNameValue[]}){
  return <section className="card p-5"><h2 className="font-bold">{title}</h2><div className="mt-4 space-y-3">{items.map((x,i)=><div key={x.name} className="flex items-center gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-800 text-sm font-black">{i+1}</span><div className="min-w-0 flex-1"><div className="truncate font-semibold">{x.name}</div><div className="text-xs text-slate-500">{number(x.count)} lượt</div></div><div className="text-right text-sm font-bold text-emerald-300">{currency(x.value)}</div></div>)}{!items.length&&<p className="text-sm text-slate-500">Chưa có dữ liệu.</p>}</div></section>;
}

function StatusCard({title,items}:{title:string;items:AnalyticsStatusCount[]}){
  const max=Math.max(1,...items.map(x=>x.count));
  return <section className="card p-5"><h2 className="font-bold">{title}</h2><div className="mt-4 space-y-3">{items.map(x=><div key={x.status}><div className="mb-1 flex justify-between gap-3 text-sm"><span className="font-semibold">{x.status}</span><span>{number(x.count)}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-sky-400" style={{width:`${Math.max(4,x.count/max*100)}%`}}/></div></div>)}{!items.length&&<p className="text-sm text-slate-500">Chưa có dữ liệu.</p>}</div></section>;
}
