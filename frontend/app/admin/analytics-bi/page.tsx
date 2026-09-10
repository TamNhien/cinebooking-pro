/* eslint-disable react-hooks/set-state-in-effect -- initial effect loads authenticated BI snapshots from external APIs. */
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, currency, dateTime } from "@/lib/api";
import { clearAuth, getAuth } from "@/lib/auth";
import type { AnalyticsBiSummaryV75, UserProfile } from "@/lib/types";

const WINDOWS=[30,90,180,365] as const;

export default function AnalyticsBiV75Page(){
  const [days,setDays]=useState<number>(90);
  const [data,setData]=useState<AnalyticsBiSummaryV75|null>(null);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);

  const load=useCallback(async()=>{
    setBusy(true);
    try{
      const me=await api<UserProfile>("/me");
      if(me.role!=="ADMIN"){
        clearAuth();
        window.location.assign("/login?returnTo=/admin/analytics-bi&reason=admin");
        return;
      }
      setData(await api<AnalyticsBiSummaryV75>(`/admin/analytics-bi/summary?days=${days}`));
      setError("");
    }catch(e){setError((e as Error).message)}finally{setBusy(false)}
  },[days]);

  useEffect(()=>{
    if(!getAuth()){window.location.assign("/login?returnTo=/admin/analytics-bi&reason=required");return;}
    void load();
  },[load]);

  const startCount=data?.funnel.stages[0]?.count??0;
  const paidStage=data?.funnel.stages.find(x=>x.code==="PAID");
  const checkedStage=data?.funnel.stages.find(x=>x.code==="CHECKED_IN");
  const totalRevenue=useMemo(()=>data?.paymentConversion.reduce((sum,x)=>sum+x.successfulAmount,0)??0,[data]);

  return <div className="space-y-7" data-testid="analytics-bi-v75">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="mb-2 text-sm text-slate-400"><Link href="/admin" className="hover:text-white">Admin</Link> / Analytics & BI</div>
        <div className="text-xs font-black tracking-[0.22em] text-fuchsia-300">V75 · ANALYTICS & BI 5.0</div>
        <h1 className="mt-2 text-3xl font-bold">Funnel · Cohort · LTV · Conversion · Hiệu suất phim/rạp</h1>
        <p className="mt-1 max-w-5xl text-slate-400">Business Intelligence đọc trực tiếp dữ liệu vận hành thật. Không tạo page-view giả, không suy diễn visitor funnel và không đưa email thô vào bảng LTV.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <select className="input min-w-36" value={days} onChange={e=>setDays(Number(e.target.value))} aria-label="BI window">
          {WINDOWS.map(x=><option key={x} value={x}>{x} ngày</option>)}
        </select>
        <button className="btn btn-primary" onClick={()=>void load()} disabled={busy}>{busy?"Đang tải...":"↻ Làm mới"}</button>
        <Link href="/admin/analytics" className="btn btn-secondary">Analytics V51</Link>
        <Link href="/admin" className="btn btn-secondary">← Dashboard</Link>
      </div>
    </div>

    {error&&<div data-testid="analytics-bi-error-v75" className="card border border-rose-800/60 p-4 text-sm text-rose-200">{error}</div>}

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6" data-testid="analytics-bi-summary-v75">
      <Metric label="Strategy" value={data?.strategyVersion??"V75-ANALYTICS-BI-5"} compact/>
      <Metric label="Window" value={`${data?.windowDays??days} ngày`}/>
      <Metric label="Booking attempts" value={number(startCount)}/>
      <Metric label="Paid conversion" value={pct(paidStage?.conversionFromStartPercent??0)}/>
      <Metric label="Check-in conversion" value={pct(checkedStage?.conversionFromStartPercent??0)}/>
      <Metric label="Successful amount" value={currency(totalRevenue)}/>
    </section>

    <section className="card p-5" data-testid="analytics-bi-policy-v75">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-xl font-bold">Evidence policy</h2><p className="mt-1 text-sm text-slate-500">Funnel bắt đầu từ booking thật vì hệ thống hiện không có durable page-view/visitor event. Payment revenue chỉ dùng payment SUCCESS.</p></div>{data&&<span className="text-xs text-slate-500">Generated {dateTime(data.generatedAt)}</span>}</div>
      <div className="mt-4 flex flex-wrap gap-2">{data?.evidencePolicy.map(x=><code key={x} className="rounded-lg bg-slate-900 px-2 py-1 text-xs text-cyan-300">{x}</code>)}</div>
    </section>

    <section className="card p-5" data-testid="booking-funnel-v75">
      <h2 className="text-xl font-bold">Booking → Payment → Check-in funnel</h2>
      <p className="mt-1 text-sm text-slate-500">{data?.funnel.definition??"Loading funnel definition..."}</p>
      <div className="mt-5 grid gap-3 md:grid-cols-5">{data?.funnel.stages.map((stage,index)=><div key={stage.code} className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"><div className="text-xs font-black text-slate-500">{index+1}. {stage.code}</div><div className="mt-2 text-sm font-semibold">{stage.label}</div><div className="mt-3 text-3xl font-black">{number(stage.count)}</div><div className="mt-2 text-xs text-slate-500">Từ bước trước: <b className="text-slate-200">{pct(stage.conversionFromPreviousPercent)}</b></div><div className="text-xs text-slate-500">Từ đầu funnel: <b className="text-cyan-300">{pct(stage.conversionFromStartPercent)}</b></div></div>)}</div>
    </section>

    <section className="card overflow-hidden" data-testid="cohort-retention-v75">
      <div className="border-b border-slate-800 p-5"><h2 className="text-xl font-bold">Cohort activation & 30-day repeat</h2><p className="mt-1 text-sm text-slate-500">Cohort theo tháng đăng ký USER. Repeat 30d = có ít nhất 2 booking CONFIRMED trong 30 ngày đầu; cohort chưa đủ tuổi được đánh dấu PARTIAL.</p></div>
      <Table headers={["Cohort","Registered","Activated","Activation","Repeat 30d","Repeat rate","Maturity"]} rows={data?.cohorts.map(x=>[month(x.cohortMonth),number(x.registeredUsers),number(x.activatedUsers),pct(x.activationRatePercent),number(x.repeat30dUsers),pct(x.repeat30dRatePercent),x.matured30d?"MATURED":"PARTIAL"])??[]}/>
    </section>

    <div className="grid gap-6 xl:grid-cols-2">
      <section className="card overflow-hidden" data-testid="payment-conversion-v75">
        <div className="border-b border-slate-800 p-5"><h2 className="text-xl font-bold">Payment conversion</h2><p className="mt-1 text-sm text-slate-500">Theo payment attempt/provider trong cửa sổ đã chọn.</p></div>
        <Table headers={["Provider","Attempts","Success","Failed","Other","Success rate","Success amount"]} rows={data?.paymentConversion.map(x=>[x.provider,number(x.attempts),number(x.successfulAttempts),number(x.failedAttempts),number(x.otherAttempts),pct(x.successRatePercent),currency(x.successfulAmount)])??[]}/>
      </section>

      <section className="card overflow-hidden" data-testid="ltv-v75">
        <div className="border-b border-slate-800 p-5"><h2 className="text-xl font-bold">Realized customer LTV</h2><p className="mt-1 text-sm text-slate-500">Lifetime SUCCESS payment theo USER; email được mask trước khi trả về UI.</p></div>
        <Table headers={["Customer","Email","Paid bookings","Realized LTV","AOV"]} rows={data?.topCustomersByRealizedLtv.map(x=>[x.customerRef,x.maskedEmail,number(x.paidBookings),currency(x.realizedRevenue),currency(x.averageOrderValue)])??[]}/>
      </section>
    </div>

    <section className="card overflow-hidden" data-testid="movie-efficiency-v75">
      <div className="border-b border-slate-800 p-5"><h2 className="text-xl font-bold">Hiệu suất phim</h2><p className="mt-1 text-sm text-slate-500">Chỉ tính suất đã bắt đầu trong cửa sổ; occupancy = vé active / tổng ghế được chào bán qua các suất.</p></div>
      <Table headers={["Phim","Suất","Vé","Capacity","Occupancy","Revenue","Revenue/show","Revenue/seat"]} rows={data?.movieEfficiency.map(x=>[x.movieTitle,number(x.completedShowtimes),number(x.ticketsSold),number(x.seatCapacity),pct(x.occupancyRatePercent),currency(x.realizedRevenue),currency(x.revenuePerShowtime),currency(x.revenuePerSeatOffered)])??[]}/>
    </section>

    <section className="card overflow-hidden" data-testid="cinema-efficiency-v75">
      <div className="border-b border-slate-800 p-5"><h2 className="text-xl font-bold">Hiệu suất rạp</h2><p className="mt-1 text-sm text-slate-500">So sánh occupancy và revenue efficiency trên cùng cửa sổ thời gian.</p></div>
      <Table headers={["Rạp","Suất","Vé","Capacity","Occupancy","Revenue","Revenue/show","Revenue/seat"]} rows={data?.cinemaEfficiency.map(x=>[x.cinemaName,number(x.completedShowtimes),number(x.ticketsSold),number(x.seatCapacity),pct(x.occupancyRatePercent),currency(x.realizedRevenue),currency(x.revenuePerShowtime),currency(x.revenuePerSeatOffered)])??[]}/>
    </section>
  </div>;
}

function Metric({label,value,compact=false}:{label:string;value:string;compact?:boolean}){return <div className="card p-5"><div className="text-xs uppercase tracking-wider text-slate-500">{label}</div><div className={`mt-2 font-black ${compact?"break-all text-sm":"text-2xl"}`}>{value}</div></div>}
function Table({headers,rows}:{headers:string[];rows:(string|number)[][]}){return <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-900/70 text-xs uppercase text-slate-500"><tr>{headers.map(x=><th key={x} className="p-3">{x}</th>)}</tr></thead><tbody className="divide-y divide-slate-800">{rows.map((row,i)=><tr key={i}>{row.map((cell,j)=><td key={j} className="p-3">{cell}</td>)}</tr>)}{rows.length===0&&<tr><td colSpan={headers.length} className="p-4 text-slate-500">Chưa có dữ liệu phù hợp.</td></tr>}</tbody></table></div>}
function pct(value:number){return `${Number(value||0).toFixed(2)}%`}
function number(value:number){return new Intl.NumberFormat("vi-VN").format(Number(value||0))}
function month(value:string){return new Intl.DateTimeFormat("vi-VN",{month:"2-digit",year:"numeric",timeZone:"Asia/Ho_Chi_Minh"}).format(new Date(`${value}T00:00:00+07:00`))}
