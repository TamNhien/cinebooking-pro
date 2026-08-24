"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api, apiBlob, currency } from "@/lib/api";
import { getAuth } from "@/lib/auth";
import type {
  AnalyticsConcessionCostBasis,
  AnalyticsDashboard,
  AnalyticsNameValue,
  AnalyticsSeatHeatCell,
  AnalyticsStatusCount,
  Cinema,
} from "@/lib/types";

const pct = (value:number|null|undefined) => `${Number(value || 0).toLocaleString("vi-VN", {maximumFractionDigits:1})}%`;
const number = (value:number|null|undefined) => Number(value || 0).toLocaleString("vi-VN");
const dateTime = (value:string) => new Date(value).toLocaleString("vi-VN", {day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"});
const shortDate = (value:string) => new Date(`${value}T00:00:00`).toLocaleDateString("vi-VN", {day:"2-digit",month:"2-digit"});
const signedPct = (value:number) => `${value > 0 ? "+" : ""}${Number(value || 0).toLocaleString("vi-VN", {maximumFractionDigits:1})}%`;
const signedPoints = (value:number) => `${value > 0 ? "+" : ""}${Number(value || 0).toLocaleString("vi-VN", {maximumFractionDigits:1})} điểm`;
const moneyOrUnknown = (value:number|null|undefined) => value === null || value === undefined ? "Chưa biết" : currency(value);

export default function AnalyticsPage(){
  const [days,setDays]=useState(30);
  const [cinemaId,setCinemaId]=useState("");
  const [cinemas,setCinemas]=useState<Cinema[]>([]);
  const [data,setData]=useState<AnalyticsDashboard|null>(null);
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(true);
  const [exporting,setExporting]=useState<"csvzip"|"xlsx"|null>(null);
  const [costDraft,setCostDraft]=useState<Record<string,string>>({});
  const [savingCost,setSavingCost]=useState<string|null>(null);

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

  useEffect(()=>{
    const next:Record<string,string>={};
    for(const row of data?.concessionCostBasis||[]) next[row.productId]=row.unitCost===null?"":String(row.unitCost);
    setCostDraft(next);
  },[data?.concessionCostBasis]);

  const maxDaily=useMemo(()=>Math.max(1,...(data?.dailyRevenue.map(x=>x.revenue)||[1])),[data]);
  const maxHourTickets=useMemo(()=>Math.max(1,...(data?.hourlyDemand.map(x=>x.tickets)||[1])),[data]);
  const maxSeatBookings=useMemo(()=>Math.max(1,...(data?.seatHeatmap.map(x=>x.bookings)||[1])),[data]);
  const maxForecast=useMemo(()=>Math.max(1,...(data?.forecast.points.map(x=>x.revenue)||[1])),[data]);
  const heatRows=useMemo(()=>{
    const map=new Map<string,AnalyticsSeatHeatCell[]>();
    for(const cell of data?.seatHeatmap||[]){
      const row=map.get(cell.rowLabel)||[];
      row.push(cell);
      map.set(cell.rowLabel,row);
    }
    return [...map.entries()].map(([row,cells])=>[row,cells.sort((a,b)=>a.seatNumber-b.seatNumber)] as const);
  },[data]);

  async function downloadExport(kind:"csvzip"|"xlsx"){
    setExporting(kind);
    setError("");
    try{
      const query=new URLSearchParams({days:String(days)});
      if(cinemaId) query.set("cinemaId",cinemaId);
      const endpoint=kind==="csvzip"?"/admin/analytics/export-csv.zip":"/admin/analytics/export.xlsx";
      const blob=await apiBlob(`${endpoint}?${query}`);
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a");
      const today=new Date().toISOString().slice(0,10);
      a.href=url;
      a.download=kind==="csvzip"
        ?`cinebooking-analytics-${days}d-${today}-csv-tables.zip`
        :`cinebooking-analytics-${days}d-${today}.xlsx`;
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

  async function saveCostBasis(row:AnalyticsConcessionCostBasis){
    const raw=(costDraft[row.productId]??"").trim();
    const unitCost=raw===""?null:Number(raw);
    if(unitCost!==null&&(!Number.isFinite(unitCost)||unitCost<0)){
      setError("Giá vốn phải là số không âm hoặc để trống nếu chưa biết.");
      return;
    }
    setSavingCost(row.productId); setError("");
    try{
      const updated=await api<AnalyticsConcessionCostBasis>("/admin/analytics/cost-basis",{
        method:"PUT",
        body:JSON.stringify({cinemaId:row.cinemaId,productId:row.productId,unitCost}),
      });
      setData(prev=>prev?{...prev,concessionCostBasis:prev.concessionCostBasis.map(x=>x.cinemaId===updated.cinemaId&&x.productId===updated.productId?updated:x)}:prev);
    }catch(e){
      setError(e instanceof Error?e.message:"Không thể cập nhật giá vốn.");
    }finally{
      setSavingCost(null);
    }
  }

  return <div data-testid="analytics-v51" className="space-y-7 pb-16">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="section-kicker">V51 · ANALYTICS & FORECASTING 3.0</p>
        <h1 className="text-3xl font-black">Doanh thu, biên lợi nhuận & dự báo</h1>
        <p className="mt-1 max-w-4xl text-slate-400">So sánh kỳ trước, dự báo doanh thu theo <b>V51-WEEKDAY-WEIGHTED-MA-1</b>, theo dõi margin/cost coverage, doanh thu theo rạp/phim/phòng/giờ và snapshot DAILY/WEEKLY/MONTHLY. CSV chi tiết tải một gói gồm một file CSV UTF-8 riêng cho từng bảng; Excel chi tiết giữ worksheet riêng để tương thích quy trình V43.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <select className="input !w-auto min-w-36" value={days} onChange={e=>setDays(Number(e.target.value))}>
          <option value={7}>7 ngày</option><option value={30}>30 ngày</option><option value={90}>90 ngày</option><option value={365}>365 ngày</option>
        </select>
        <select data-testid="analytics-cinema-filter" className="input !w-auto min-w-52" value={cinemaId} onChange={e=>setCinemaId(e.target.value)}>
          <option value="">Tất cả rạp</option>
          {cinemas.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button className="btn btn-secondary" type="button" title="Tải ZIP gồm một file CSV UTF-8 riêng cho từng bảng Analytics" disabled={loading||!!exporting} onClick={()=>downloadExport("csvzip")}>{exporting==="csvzip"?"Đang xuất...":"Xuất CSV theo từng bảng"}</button>
        <button className="btn btn-primary" type="button" title="Mỗi bảng Analytics được xuất thành một worksheet riêng" disabled={loading||!!exporting} onClick={()=>downloadExport("xlsx")}>{exporting==="xlsx"?"Đang xuất...":"Xuất Excel chi tiết"}</button>
        <Link className="btn btn-secondary" href="/admin">← Admin</Link>
      </div>
    </div>

    {error&&<div className="rounded-xl border border-red-800/60 bg-red-950/50 p-4 text-red-200">{error}</div>}
    {loading&&<div className="card p-8 text-center text-slate-400">Đang tổng hợp dữ liệu vận hành và forecast...</div>}

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

      <div className="grid gap-6 xl:grid-cols-2">
        <section data-testid="period-comparison-v51" className="card p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="section-kicker">PERIOD COMPARISON</p><h2 className="text-xl font-bold">So với kỳ liền trước</h2><p className="mt-1 text-sm text-slate-500">Cùng độ dài {days} ngày, không trộn dữ liệu ngoài khoảng so sánh.</p></div><div className="text-right text-xs text-slate-500">{data.periodComparison.current.from} → {data.periodComparison.current.to}<br/>vs {data.periodComparison.previous.from} → {data.periodComparison.previous.to}</div></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Delta title="Doanh thu" current={currency(data.periodComparison.current.revenue)} previous={currency(data.periodComparison.previous.revenue)} delta={signedPct(data.periodComparison.revenueDeltaPct)}/>
            <Delta title="Booking" current={number(data.periodComparison.current.bookings)} previous={number(data.periodComparison.previous.bookings)} delta={signedPct(data.periodComparison.bookingsDeltaPct)}/>
            <Delta title="Vé" current={number(data.periodComparison.current.tickets)} previous={number(data.periodComparison.previous.tickets)} delta={signedPct(data.periodComparison.ticketsDeltaPct)}/>
            <Delta title="Occupancy" current={pct(data.periodComparison.current.occupancyRate)} previous={pct(data.periodComparison.previous.occupancyRate)} delta={signedPoints(data.periodComparison.occupancyDeltaPoints)}/>
          </div>
        </section>

        <section data-testid="forecast-v51" className="card p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="section-kicker">FORECAST</p><h2 className="text-xl font-bold">Dự báo 7 ngày tới</h2><p className="mt-1 text-sm text-slate-500">Weighted moving average theo đúng thứ trong tuần, ưu tiên 4 tuần gần nhất.</p></div><div className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-cyan-300">{data.forecast.algorithm}</div></div>
          <div className="mt-4 text-2xl font-black text-emerald-300">{currency(data.forecast.next7DaysRevenue)}</div>
          <div className="mt-5 flex min-h-52 items-end gap-2 overflow-x-auto pb-2">
            {data.forecast.points.map(x=><div key={x.day} className="flex min-w-16 flex-1 flex-col items-center justify-end gap-2">
              <div className="text-center text-[10px] text-slate-400">{currency(x.revenue).replace(" ₫","đ")}</div>
              <div className="w-full max-w-16 rounded-t-lg bg-gradient-to-t from-cyan-800 to-cyan-300" style={{height:`${Math.max(8,Math.round(x.revenue/maxForecast*130))}px`}}/>
              <div className="text-[10px] text-slate-500">tin cậy {pct(x.confidence)}</div>
              <span className="text-[10px] font-semibold text-slate-400">{shortDate(x.day)}</span>
            </div>)}
          </div>
        </section>
      </div>

      <section data-testid="margin-v51" className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="section-kicker">MARGIN & COST COVERAGE</p><h2 className="text-xl font-bold">Biên lợi nhuận theo cost basis bắp nước</h2><p className="mt-1 text-sm text-slate-500">Chi phí chưa biết luôn để <b>NULL / Chưa biết</b>, không tự biến thành 0. Gross margin chỉ hiện khi cost coverage đạt 100%.</p></div><div className="text-right"><div className="text-xs text-slate-500">Cost coverage</div><div className="text-2xl font-black">{pct(data.margin.costCoverageRate)}</div></div></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Kpi title="Doanh thu" value={currency(data.margin.revenue)} note="Payment SUCCESS"/>
          <Kpi title="Vé / dịch vụ" value={currency(data.margin.ticketRevenue)} note="Revenue trừ concession"/>
          <Kpi title="Bắp nước" value={currency(data.margin.concessionRevenue)} note={`${number(data.margin.concessionUnits)} đơn vị`}/>
          <Kpi title="Giá vốn bắp nước" value={moneyOrUnknown(data.margin.concessionCost)} note={`${number(data.margin.costedUnits)}/${number(data.margin.concessionUnits)} đơn vị có cost`}/>
          <Kpi title="Gross margin" value={moneyOrUnknown(data.margin.grossMargin)} note={data.margin.grossMarginRate===null?"Chưa đủ cost basis":pct(data.margin.grossMarginRate)}/>
        </div>
      </section>

      {cinemaId?<section data-testid="cost-basis-v51" className="card p-5 sm:p-6">
        <div><p className="section-kicker">BRANCH COST BASIS</p><h2 className="text-xl font-bold">Giá vốn bắp nước theo chi nhánh</h2><p className="mt-1 text-sm text-slate-500">Để trống khi chưa biết giá vốn. V51 lưu cost riêng theo cặp rạp/sản phẩm.</p></div>
        <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="pb-3">Sản phẩm</th><th>Giá bán</th><th>Giá vốn</th><th>Coverage</th><th></th></tr></thead><tbody className="divide-y divide-slate-800/70">{data.concessionCostBasis.map(row=><tr key={`${row.cinemaId}-${row.productId}`}><td className="py-3 font-semibold">{row.productName}</td><td>{currency(row.sellingPrice)}</td><td><input data-testid={`cost-input-${row.productId}`} className="input !w-40" inputMode="decimal" placeholder="Chưa biết" value={costDraft[row.productId]??""} onChange={e=>setCostDraft(v=>({...v,[row.productId]:e.target.value}))}/></td><td>{row.costKnown?<span className="text-emerald-300">Đã có cost</span>:<span className="text-amber-300">Chưa biết</span>}</td><td className="text-right"><button data-testid={`save-cost-${row.productId}`} className="btn btn-secondary" type="button" disabled={savingCost===row.productId} onClick={()=>saveCostBasis(row)}>{savingCost===row.productId?"Đang lưu...":"Lưu cost"}</button></td></tr>)}</tbody></table></div>
      </section>:<div className="card p-5 text-sm text-slate-400"><b>Cost basis theo chi nhánh:</b> chọn một rạp ở bộ lọc phía trên để xem và cập nhật giá vốn. Khi chưa có cost, margin không được giả định bằng 0.</div>}

      <section className="card overflow-hidden p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-bold">Doanh thu theo ngày</h2><p className="text-sm text-slate-500">Chiều cao cột = doanh thu; phía dưới có số booking / vé / check-in.</p></div></div>
        <div className="mt-6 flex min-h-72 items-end gap-2 overflow-x-auto pb-2">
          {data.dailyRevenue.length?data.dailyRevenue.map(x=><div key={x.day} className="flex min-w-20 flex-1 flex-col items-center justify-end gap-2">
            <div className="text-center text-[10px] text-slate-400">{x.revenue?currency(x.revenue).replace(" ₫","đ"):"0đ"}</div>
            <div className="w-full max-w-20 rounded-t-xl bg-gradient-to-t from-rose-700 via-rose-500 to-amber-300" style={{height:`${Math.max(8,Math.round(x.revenue/maxDaily*190))}px`}}/>
            <div className="text-center text-[10px] leading-4 text-slate-500">{x.bookings} đơn · {x.tickets} vé<br/>{x.checkIns} check-in</div>
            <span className="text-[10px] font-semibold text-slate-400">{shortDate(x.day)}</span>
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

      <section data-testid="auditorium-performance-v51" className="card p-5 sm:p-6">
        <div><p className="section-kicker">AUDITORIUM REVENUE</p><h2 className="text-xl font-bold">Doanh thu theo phòng chiếu</h2><p className="mt-1 text-sm text-slate-500">Tách riêng cấp auditorium để thấy phòng nào tạo doanh thu và occupancy tốt nhất.</p></div>
        <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[820px] text-sm"><thead className="text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="pb-3">Rạp / phòng</th><th>Doanh thu</th><th>Booking</th><th>Vé</th><th>Sức chứa</th><th>Lấp đầy</th></tr></thead><tbody className="divide-y divide-slate-800/70">{data.auditoriumPerformance.map(x=><tr key={x.auditoriumId}><td className="py-3"><div className="font-semibold">{x.auditoriumName}</div><div className="text-xs text-slate-500">{x.cinemaName}</div></td><td className="font-semibold text-emerald-300">{currency(x.revenue)}</td><td>{number(x.bookings)}</td><td>{number(x.tickets)}</td><td>{number(x.capacity)}</td><td><Progress value={x.occupancyRate}/></td></tr>)}</tbody></table>{!data.auditoriumPerformance.length&&<p className="py-6 text-center text-slate-500">Chưa có dữ liệu phòng chiếu.</p>}</div>
      </section>

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

      <section data-testid="analytics-snapshots-v51" className="card p-5 sm:p-6">
        <div><p className="section-kicker">SCHEDULED SNAPSHOTS</p><h2 className="text-xl font-bold">Snapshot DAILY / WEEKLY / MONTHLY</h2><p className="mt-1 text-sm text-slate-500">Scheduler đa backend khóa cinema bằng <code>FOR UPDATE ... SKIP LOCKED</code> trước khi upsert snapshot, tránh hai replica cùng xử lý một rạp.</p></div>
        <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[980px] text-sm"><thead className="text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="pb-3">Kỳ</th><th>Rạp</th><th>Khoảng</th><th>Doanh thu</th><th>Margin</th><th>Occupancy</th><th>Cost coverage</th><th>Forecast 7d</th></tr></thead><tbody className="divide-y divide-slate-800/70">{data.snapshots.slice(0,18).map(x=><tr key={x.id}><td className="py-3 font-black">{x.periodKind}</td><td>{x.cinemaName}</td><td>{x.periodStart} → {x.periodEnd}</td><td>{currency(x.revenue)}</td><td>{moneyOrUnknown(x.grossMargin)}</td><td>{pct(x.occupancyRate)}</td><td>{pct(x.costCoverageRate)}</td><td>{currency(x.forecastNext7d)}</td></tr>)}</tbody></table>{!data.snapshots.length&&<p className="py-6 text-center text-slate-500">Chưa có snapshot. Scheduler sẽ tạo dữ liệu khi backend chạy với Flyway V51.</p>}</div>
      </section>

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

function Delta({title,current,previous,delta}:{title:string;current:string;previous:string;delta:string}){
  return <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"><div className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</div><div className="mt-2 flex items-end justify-between gap-2"><div><div className="text-xl font-black">{current}</div><div className="text-xs text-slate-500">Kỳ trước: {previous}</div></div><b className={delta.startsWith("-")?"text-rose-300":"text-emerald-300"}>{delta}</b></div></div>;
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
