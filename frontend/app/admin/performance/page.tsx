"use client";

import { useEffect, useMemo, useState } from "react";
import { api, currency, dateTime } from "@/lib/api";
import { clearAuth, getAuth } from "@/lib/auth";
import type { PerformanceCinemaV54, PerformanceScorecardV54, UserProfile } from "@/lib/types";

const number=(v:number)=>new Intl.NumberFormat("vi-VN").format(v||0);
const pct=(v:number|null)=>v===null?"Mới":`${v>=0?"+":""}${v.toFixed(1)}%`;

function Delta({value}:{value:number|null}){
  const cls=value===null?"text-sky-300":value>0?"text-emerald-300":value<0?"text-rose-300":"text-slate-400";
  return <span className={`text-xs font-bold ${cls}`}>{pct(value)}</span>;
}

export default function PerformanceBenchmarkingV54(){
  const [me,setMe]=useState<UserProfile|null>(null);
  const [cinemas,setCinemas]=useState<PerformanceCinemaV54[]>([]);
  const [cinemaId,setCinemaId]=useState("");
  const [periodDays,setPeriodDays]=useState<7|30>(7);
  const [data,setData]=useState<PerformanceScorecardV54|null>(null);
  const [loading,setLoading]=useState(true);
  const [message,setMessage]=useState("");

  async function load(selected=cinemaId,days:7|30=periodDays){
    setLoading(true);setMessage("");
    try{
      const qs=new URLSearchParams({periodDays:String(days)});
      if(selected)qs.set("cinemaId",selected);
      setData(await api<PerformanceScorecardV54>(`/admin/performance/scorecard?${qs.toString()}`));
    }catch(e){setMessage((e as Error).message)}finally{setLoading(false)}
  }

  useEffect(()=>{
    const local=getAuth();
    if(!local){location.href="/login?returnTo=/admin/performance&reason=required";return;}
    (async()=>{
      try{
        const profile=await api<UserProfile>("/me");
        if(!["MANAGER","ADMIN"].includes(profile.role)){
          clearAuth();location.href="/login?returnTo=/admin/performance&reason=admin";return;
        }
        setMe(profile);
        const options=await api<PerformanceCinemaV54[]>("/admin/performance/cinemas");
        setCinemas(options);
        const initial=profile.role==="MANAGER"&&options.length?options[0].cinemaId:"";
        setCinemaId(initial);
        await load(initial,7);
      }catch(e){setMessage((e as Error).message);setLoading(false)}
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  const maxDaily=useMemo(()=>Math.max(1,...(data?.daily.map(x=>x.revenue)||[1])),[data]);

  return <main className="space-y-6" data-testid="performance-benchmarking-v54">
    <section className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.24em] text-sky-300">Performance Benchmarking · V54</div>
          <h1 className="mt-2 text-3xl font-black">So sánh hiệu suất đa rạp</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">Benchmark doanh thu, tăng trưởng, occupancy và forecast bằng dữ liệu giao dịch thật. Không chấm điểm giả, không seed KPI và không thay đổi trạng thái nghiệp vụ.</p>
        </div>
        <button className="btn btn-secondary" type="button" disabled={loading} onClick={()=>load()}>{loading?"Đang tải...":"↻ Làm mới"}</button>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {me?.role==="ADMIN"?<label className="text-sm text-slate-300">Phạm vi
          <select data-testid="performance-cinema-filter-v54" className="input ml-2 !w-auto min-w-56" value={cinemaId} onChange={async e=>{const next=e.target.value;setCinemaId(next);await load(next,periodDays)}}>
            <option value="">Toàn hệ thống</option>
            {cinemas.map(c=><option key={c.cinemaId} value={c.cinemaId}>{c.cinemaName}</option>)}
          </select>
        </label>:data&&<div className="rounded-xl border border-slate-700 px-3 py-2 text-sm">Rạp: <b>{data.cinemaName}</b></div>}
        <label className="text-sm text-slate-300">Cửa sổ
          <select data-testid="performance-period-v54" className="input ml-2 !w-auto" value={periodDays} onChange={async e=>{const next=Number(e.target.value) as 7|30;setPeriodDays(next);await load(cinemaId,next)}}>
            <option value={7}>7 ngày</option><option value={30}>30 ngày</option>
          </select>
        </label>
        {data&&<span className="text-xs text-slate-500">{data.fromDate} → {data.toDate} · cập nhật {dateTime(data.generatedAt)}</span>}
      </div>
      {message&&<div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{message}</div>}
    </section>

    {data&&<>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6" data-testid="performance-summary-v54">
        <div className="card p-4 xl:col-span-2"><div className="text-xs text-slate-400">Doanh thu {data.periodDays} ngày</div><div className="mt-1 text-2xl font-black">{currency(data.revenue)}</div><div className="mt-1 flex gap-2 text-xs text-slate-500">Kỳ trước {currency(data.previousRevenue)} <Delta value={data.revenueDeltaPct}/></div></div>
        <div className="card p-4"><div className="text-xs text-slate-400">Booking</div><div className="mt-1 text-2xl font-black">{number(data.bookings)}</div></div>
        <div className="card p-4"><div className="text-xs text-slate-400">Vé</div><div className="mt-1 text-2xl font-black">{number(data.tickets)}</div></div>
        <div className="card p-4"><div className="text-xs text-slate-400">Occupancy</div><div className="mt-1 text-2xl font-black">{data.occupancyRate.toFixed(1)}%</div></div>
        <div className="card p-4"><div className="text-xs text-slate-400">AOV</div><div className="mt-1 text-2xl font-black">{currency(data.averageOrderValue)}</div><div className="text-xs text-slate-500">doanh thu / booking</div></div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
        <div className="card overflow-hidden" data-testid="performance-branches-v54">
          <div className="border-b border-slate-800 p-5"><h2 className="text-xl font-bold">Xếp hạng rạp theo doanh thu</h2><p className="mt-1 text-sm text-slate-500">Rank là thứ tự doanh thu trong đúng cửa sổ đang chọn; share và delta đều được tính từ giao dịch SUCCESS thực tế.</p></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[780px] text-sm"><thead className="bg-slate-950/60 text-left text-xs uppercase tracking-wider text-slate-500"><tr><th className="p-3">#</th><th className="p-3">Rạp</th><th className="p-3 text-right">Doanh thu</th><th className="p-3 text-right">Δ kỳ trước</th><th className="p-3 text-right">Share</th><th className="p-3 text-right">Occupancy</th><th className="p-3 text-right">Forecast 7d</th></tr></thead><tbody>
            {data.branches.map(b=><tr key={b.cinemaId} className="border-t border-slate-800"><td className="p-3 font-black">{b.revenueRank}</td><td className="p-3"><div className="font-semibold">{b.cinemaName}</div><div className="text-xs text-slate-500">{number(b.bookings)} booking · {number(b.tickets)} vé</div></td><td className="p-3 text-right font-semibold">{currency(b.revenue)}</td><td className="p-3 text-right"><Delta value={b.revenueDeltaPct}/></td><td className="p-3 text-right">{b.revenueSharePct.toFixed(1)}%</td><td className="p-3 text-right">{b.occupancyRate.toFixed(1)}%</td><td className="p-3 text-right">{currency(b.forecastNext7d)}</td></tr>)}
          </tbody></table></div>
        </div>

        <div className="card p-5 sm:p-6">
          <h2 className="text-xl font-bold">Top phim theo doanh thu</h2>
          <div className="mt-4 space-y-3" data-testid="performance-top-movies-v54">
            {data.topMovies.length?data.topMovies.map((m,i)=><div key={m.movieId} className="rounded-xl border border-slate-800 p-3"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><div className="truncate font-semibold">{i+1}. {m.movieTitle}</div><div className="text-xs text-slate-500">{number(m.tickets)} vé</div></div><div className="shrink-0 text-sm font-bold">{currency(m.revenue)}</div></div></div>):<div className="rounded-xl border border-slate-800 p-4 text-sm text-slate-500">Chưa có doanh thu SUCCESS trong kỳ.</div>}
          </div>
          <div className="mt-5 rounded-xl border border-sky-500/20 bg-sky-500/5 p-4"><div className="text-xs uppercase tracking-wider text-sky-300">Forecast 7 ngày</div><div className="mt-1 text-2xl font-black">{currency(data.forecastNext7d)}</div><div className="mt-1 text-xs text-slate-500">Tổng forecast V51 weekday-weighted của các rạp trong phạm vi.</div></div>
        </div>
      </section>

      <section className="card p-5 sm:p-6" data-testid="performance-daily-v54">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-bold">Nhịp doanh thu theo ngày</h2><p className="mt-1 text-sm text-slate-500">Ngày không có giao dịch vẫn được giữ ở mức 0 để chuỗi thời gian không bị đứt.</p></div><span className="text-sm text-slate-400">{data.cinemaName}</span></div>
        <div className="mt-5 overflow-x-auto"><div className="flex min-w-max items-end gap-2 pb-2">
          {data.daily.map(d=><div key={d.day} className="w-14 shrink-0 text-center"><div className="mb-2 text-[10px] text-slate-500">{d.revenue>0?`${Math.round(d.revenue/1000000)}m`:"0"}</div><div className="mx-auto flex h-32 w-7 items-end rounded-md bg-slate-900"><div className="w-full rounded-md bg-sky-500/70" style={{height:`${Math.max(d.revenue>0?4:0,(d.revenue/maxDaily)*100)}%`}}/></div><div className="mt-2 text-[10px] text-slate-500">{d.day.slice(5)}</div></div>)}
        </div></div>
      </section>

      <section className="card p-5 text-xs leading-5 text-slate-500">V54 là lớp analytics read-only. Doanh thu chỉ lấy payment SUCCESS; booking/vé chỉ lấy CONFIRMED; ghế đã release không được tính; capacity loại ghế BLOCKED; so sánh kỳ dùng hai cửa sổ có cùng số ngày. Khi kỳ trước bằng 0 nhưng kỳ hiện tại có doanh thu, delta trả về <b className="text-slate-300">Mới</b> thay vì bịa phần trăm tăng trưởng.</section>
    </>}
  </main>;
}
