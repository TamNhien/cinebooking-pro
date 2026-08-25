"use client";

import { useEffect, useMemo, useState } from "react";
import { api, currency, dateTime } from "@/lib/api";
import { clearAuth, getAuth } from "@/lib/auth";
import type { RetentionCinemaV55, RetentionScorecardV55, UserProfile } from "@/lib/types";

const number=(v:number)=>new Intl.NumberFormat("vi-VN").format(v||0);
const monthLabel=(iso:string)=>new Intl.DateTimeFormat("vi-VN",{month:"2-digit",year:"numeric"}).format(new Date(`${iso}T00:00:00+07:00`));
const lifecycleTone:Record<string,string>={NEW_30D:"text-sky-300",ACTIVE_REPEAT:"text-emerald-300",AT_RISK:"text-amber-300",DORMANT:"text-orange-300",LAPSED:"text-rose-300"};

export default function CustomerRetentionV55(){
  const [me,setMe]=useState<UserProfile|null>(null);
  const [cinemas,setCinemas]=useState<RetentionCinemaV55[]>([]);
  const [cinemaId,setCinemaId]=useState("");
  const [periodDays,setPeriodDays]=useState<30|90>(30);
  const [data,setData]=useState<RetentionScorecardV55|null>(null);
  const [loading,setLoading]=useState(true);
  const [message,setMessage]=useState("");

  async function load(selected=cinemaId,days:30|90=periodDays){
    setLoading(true);setMessage("");
    try{
      const qs=new URLSearchParams({periodDays:String(days)});
      if(selected)qs.set("cinemaId",selected);
      setData(await api<RetentionScorecardV55>(`/admin/retention/scorecard?${qs.toString()}`));
    }catch(e){setMessage((e as Error).message)}finally{setLoading(false)}
  }

  useEffect(()=>{
    const local=getAuth();
    if(!local){location.href="/login?returnTo=/admin/retention&reason=required";return;}
    (async()=>{
      try{
        const profile=await api<UserProfile>("/me");
        if(!["MANAGER","ADMIN"].includes(profile.role)){
          clearAuth();location.href="/login?returnTo=/admin/retention&reason=admin";return;
        }
        setMe(profile);
        const options=await api<RetentionCinemaV55[]>("/admin/retention/cinemas");
        setCinemas(options);
        const initial=profile.role==="MANAGER"&&options.length?options[0].cinemaId:"";
        setCinemaId(initial);
        await load(initial,30);
      }catch(e){setMessage((e as Error).message);setLoading(false)}
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  const maxDaily=useMemo(()=>Math.max(1,...(data?.daily.map(x=>x.newCustomers+x.returningCustomers)||[1])),[data]);

  return <main className="space-y-6" data-testid="retention-intelligence-v55">
    <section className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.24em] text-violet-300">Customer Retention & Cohort Intelligence · V55</div>
          <h1 className="mt-2 text-3xl font-black">Giữ chân khách hàng & cohort</h1>
          <p className="mt-2 max-w-4xl text-sm text-slate-400">Đo khách mới, khách quay lại, repeat rate, vòng đời và retention 30 ngày từ booking CONFIRMED + payment SUCCESS thật. Đây là phân đoạn theo quy tắc minh bạch, không phải điểm churn do AI bịa ra.</p>
        </div>
        <button className="btn btn-secondary" type="button" disabled={loading} onClick={()=>load()}>{loading?"Đang tải...":"↻ Làm mới"}</button>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {me?.role==="ADMIN"?<label className="text-sm text-slate-300">Phạm vi
          <select data-testid="retention-cinema-filter-v55" className="input ml-2 !w-auto min-w-56" value={cinemaId} onChange={async e=>{const next=e.target.value;setCinemaId(next);await load(next,periodDays)}}>
            <option value="">Toàn hệ thống</option>
            {cinemas.map(c=><option key={c.cinemaId} value={c.cinemaId}>{c.cinemaName}</option>)}
          </select>
        </label>:data&&<div className="rounded-xl border border-slate-700 px-3 py-2 text-sm">Rạp: <b>{data.cinemaName}</b></div>}
        <label className="text-sm text-slate-300">Cửa sổ hoạt động
          <select data-testid="retention-period-v55" className="input ml-2 !w-auto" value={periodDays} onChange={async e=>{const next=Number(e.target.value) as 30|90;setPeriodDays(next);await load(cinemaId,next)}}>
            <option value={30}>30 ngày</option><option value={90}>90 ngày</option>
          </select>
        </label>
        {data&&<span className="text-xs text-slate-500">{data.fromDate} → {data.toDate} · cập nhật {dateTime(data.generatedAt)}</span>}
      </div>
      {message&&<div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{message}</div>}
    </section>

    {data&&<>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6" data-testid="retention-summary-v55">
        <div className="card p-4"><div className="text-xs text-slate-400">Khách hoạt động · {data.periodDays} ngày</div><div className="mt-1 text-2xl font-black">{number(data.activeCustomers)}</div></div>
        <div className="card p-4"><div className="text-xs text-slate-400">Khách mới</div><div className="mt-1 text-2xl font-black text-sky-300">{number(data.newCustomers)}</div><div className="text-xs text-slate-500">first CONFIRMED trong cửa sổ</div></div>
        <div className="card p-4"><div className="text-xs text-slate-400">Khách quay lại</div><div className="mt-1 text-2xl font-black text-emerald-300">{number(data.returningCustomers)}</div><div className="text-xs text-slate-500">đã mua trước cửa sổ</div></div>
        <div className="card p-4"><div className="text-xs text-slate-400">Repeat rate</div><div className="mt-1 text-2xl font-black">{data.repeatCustomerRate.toFixed(1)}%</div><div className="text-xs text-slate-500">≥2 booking CONFIRMED lịch sử</div></div>
        <div className="card p-4"><div className="text-xs text-slate-400">Booking / khách</div><div className="mt-1 text-2xl font-black">{data.bookingsPerCustomer.toFixed(2)}</div><div className="text-xs text-slate-500">{number(data.bookings)} booking</div></div>
        <div className="card p-4"><div className="text-xs text-slate-400">Doanh thu / khách</div><div className="mt-1 text-xl font-black">{currency(data.revenuePerCustomer)}</div><div className="text-xs text-slate-500">SUCCESS: {currency(data.revenue)}</div></div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[.85fr_1.15fr]">
        <div className="card p-5" data-testid="retention-lifecycle-v55">
          <h2 className="text-xl font-bold">Vòng đời khách hàng</h2>
          <p className="mt-1 text-sm text-slate-500">Các nhóm loại trừ nhau theo first/last booking CONFIRMED trong đúng phạm vi rạp. Đây không phải dự đoán AI hay xác suất churn.</p>
          <div className="mt-4 space-y-3">
            {data.lifecycle.map(item=><div key={item.code} className="rounded-xl border border-slate-800 p-4">
              <div className="flex items-center justify-between gap-3"><div className={`font-bold ${lifecycleTone[item.code]||"text-slate-200"}`}>{item.label}</div><div className="text-2xl font-black">{number(item.customers)}</div></div>
              <div className="mt-1 text-xs text-slate-500">{item.definition}</div>
            </div>)}
          </div>
        </div>

        <div className="card overflow-hidden" data-testid="retention-cohorts-v55">
          <div className="border-b border-slate-800 p-5"><h2 className="text-xl font-bold">Cohort retention 30 ngày</h2><p className="mt-1 text-sm text-slate-500">Cohort theo tháng của lần mua CONFIRMED đầu tiên. Chỉ đưa cohort đã có đủ 30 ngày quan sát; retained khi có booking CONFIRMED thứ hai trong vòng 30 ngày.</p></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-sm"><thead className="bg-slate-950/60 text-left text-xs uppercase tracking-wider text-slate-500"><tr><th className="p-3">Cohort</th><th className="p-3 text-right">Khách mới</th><th className="p-3 text-right">Quay lại ≤30d</th><th className="p-3 text-right">Retention 30d</th></tr></thead><tbody>
            {data.cohorts.map(c=><tr key={c.cohortMonth} className="border-t border-slate-800"><td className="p-3 font-semibold">{monthLabel(c.cohortMonth)}</td><td className="p-3 text-right">{number(c.acquiredCustomers)}</td><td className="p-3 text-right">{number(c.returnedWithin30Days)}</td><td className="p-3 text-right font-black">{c.retention30dRate.toFixed(1)}%</td></tr>)}
            {!data.cohorts.length&&<tr><td colSpan={4} className="p-6 text-center text-slate-500">Chưa có cohort đủ 30 ngày quan sát trong phạm vi này.</td></tr>}
          </tbody></table></div>
        </div>
      </section>

      <section className="card p-5 sm:p-6" data-testid="retention-daily-v55">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-bold">Nhịp khách mới / quay lại theo ngày</h2><p className="mt-1 text-sm text-slate-500">Khách được quy về booking.purchaser_user_id (purchaser gốc); transfer vé không biến người nhận thành khách mua mới. Revenue vẫn theo payment SUCCESS của ngày thanh toán.</p></div><div className="text-sm text-slate-400">Tổng revenue: <b className="text-slate-100">{currency(data.revenue)}</b></div></div>
        <div className="mt-5 max-h-[520px] space-y-2 overflow-y-auto pr-1">
          {data.daily.map(d=>{const customers=d.newCustomers+d.returningCustomers;return <div key={d.day} className="grid grid-cols-[92px_1fr_96px] items-center gap-3 text-xs">
            <div className="text-slate-500">{d.day}</div>
            <div className="h-7 overflow-hidden rounded-lg bg-slate-900"><div className="flex h-full" style={{width:`${Math.max(customers?4:0,(customers/maxDaily)*100)}%`}}><div className="h-full bg-sky-500/70" style={{width:`${customers?(d.newCustomers/customers)*100:0}%`}}/><div className="h-full flex-1 bg-emerald-500/70"/></div></div>
            <div className="text-right"><div><span className="text-sky-300">{d.newCustomers} mới</span> · <span className="text-emerald-300">{d.returningCustomers} lại</span></div><div className="text-slate-600">{d.bookings} booking</div></div>
          </div>})}
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500"><span><b className="text-sky-300">■</b> khách mới</span><span><b className="text-emerald-300">■</b> khách quay lại</span><span>Chỉ role USER; Manager/Admin không làm nhiễu retention.</span></div>
      </section>
    </>}
  </main>;
}
