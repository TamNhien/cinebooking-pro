/* eslint-disable react-hooks/set-state-in-effect -- initial effect loads authenticated BI snapshots from external APIs. */
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, currency, dateTime } from "@/lib/api";
import { clearAuth, getAuth } from "@/lib/auth";
import { viLabel } from "@/lib/vi-labels";
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
        <div className="mb-2 text-sm text-slate-400"><Link href="/admin" className="hover:text-white">Quản trị viên</Link> / Phân tích dữ liệu & BI</div>
        <div className="text-xs font-black tracking-[0.22em] text-fuchsia-300">V75 · PHÂN TÍCH DỮ LIỆU & BI 5.0</div>
        <h1 className="mt-2 text-3xl font-bold">Phễu · Nhóm khách · LTV · Chuyển đổi · Hiệu suất phim/rạp</h1>
        <p className="mt-1 max-w-5xl text-slate-400">Thông tin kinh doanh (BI) đọc trực tiếp dữ liệu vận hành thật. Không tạo lượt xem trang giả, không suy diễn phễu khách truy cập và không đưa email thô vào bảng LTV.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <select className="input min-w-36" value={days} onChange={e=>setDays(Number(e.target.value))} aria-label="Khoảng thời gian BI">
          {WINDOWS.map(x=><option key={x} value={x}>{x} ngày</option>)}
        </select>
        <button className="btn btn-primary" onClick={()=>void load()} disabled={busy}>{busy?"Đang tải...":"↻ Làm mới"}</button>
        <Link href="/admin/analytics" className="btn btn-secondary">Phân tích V51</Link>
        <Link href="/admin" className="btn btn-secondary">← Bảng điều khiển</Link>
      </div>
    </div>

    {error&&<div data-testid="analytics-bi-error-v75" className="card border border-rose-800/60 p-4 text-sm text-rose-200">{error}</div>}

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6" data-testid="analytics-bi-summary-v75">
      <Metric label="Chiến lược" value={data?.strategyVersion??"V75-ANALYTICS-BI-5"} compact/>
      <Metric label="Cửa sổ" value={`${data?.windowDays??days} ngày`}/>
      <Metric label="Lượt đặt vé" value={number(startCount)}/>
      <Metric label="Tỷ lệ thanh toán thành công" value={pct(paidStage?.conversionFromStartPercent??0)}/>
      <Metric label="Tỷ lệ chuyển đổi soát vé" value={pct(checkedStage?.conversionFromStartPercent??0)}/>
      <Metric label="Số tiền thành công" value={currency(totalRevenue)}/>
    </section>

    <section className="card p-5" data-testid="analytics-bi-policy-v75">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-xl font-bold">Chính sách bằng chứng</h2><p className="mt-1 text-sm text-slate-500">Phễu bắt đầu từ lượt đặt vé thật vì hệ thống hiện không có sự kiện lượt xem/truy cập được lưu bền vững. Doanh thu thanh toán chỉ dùng thanh toán THÀNH CÔNG.</p></div>{data&&<span className="text-xs text-slate-500">Tạo lúc {dateTime(data.generatedAt)}</span>}</div>
      <div className="mt-4 flex flex-wrap gap-2">{data?.evidencePolicy.map(x=><code key={x} className="rounded-lg bg-slate-900 px-2 py-1 text-xs text-cyan-300">{x}</code>)}</div>
    </section>

    <section className="card p-5" data-testid="booking-funnel-v75">
      <h2 className="text-xl font-bold">Phễu đặt vé → thanh toán → soát vé</h2>
      <p className="mt-1 text-sm text-slate-500">{data?.funnel.definition??"Đang tải định nghĩa phễu..."}</p>
      <div className="mt-5 grid gap-3 md:grid-cols-5">{data?.funnel.stages.map((stage,index)=><div key={stage.code} className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"><div className="text-xs font-black text-slate-500">{index+1}. {stage.code}</div><div className="mt-2 text-sm font-semibold">{viLabel(stage.code)}</div><div className="mt-3 text-3xl font-black">{number(stage.count)}</div><div className="mt-2 text-xs text-slate-500">Từ bước trước: <b className="text-slate-200">{pct(stage.conversionFromPreviousPercent)}</b></div><div className="text-xs text-slate-500">Từ đầu phễu: <b className="text-cyan-300">{pct(stage.conversionFromStartPercent)}</b></div></div>)}</div>
    </section>

    <section className="card overflow-hidden" data-testid="cohort-retention-v75">
      <div className="border-b border-slate-800 p-5"><h2 className="text-xl font-bold">Kích hoạt nhóm khách & quay lại trong 30 ngày</h2><p className="mt-1 text-sm text-slate-500">Nhóm khách theo tháng đăng ký KHÁCH HÀNG. Quay lại 30 ngày = có ít nhất 2 lượt đặt vé ĐÃ XÁC NHẬN trong 30 ngày đầu; nhóm chưa đủ thời gian quan sát được đánh dấu MỘT PHẦN.</p></div>
      <Table headers={["Nhóm khách","Đã đăng ký","Đã kích hoạt","Tỷ lệ kích hoạt","Quay lại 30 ngày","Tỷ lệ quay lại","Mức trưởng thành"]} rows={data?.cohorts.map(x=>[month(x.cohortMonth),number(x.registeredUsers),number(x.activatedUsers),pct(x.activationRatePercent),number(x.repeat30dUsers),pct(x.repeat30dRatePercent),viLabel(x.matured30d?"MATURED":"PARTIAL")])??[]}/>
    </section>

    <div className="grid gap-6 xl:grid-cols-2">
      <section className="card overflow-hidden" data-testid="payment-conversion-v75">
        <div className="border-b border-slate-800 p-5"><h2 className="text-xl font-bold">Tỷ lệ chuyển đổi thanh toán</h2><p className="mt-1 text-sm text-slate-500">Theo lần thử thanh toán/nhà cung cấp trong cửa sổ đã chọn.</p></div>
        <Table headers={["Nhà cung cấp","Số lần thử","Thành công","Thất bại","Khác","Tỷ lệ thành công","Số tiền thành công"]} rows={data?.paymentConversion.map(x=>[x.provider,number(x.attempts),number(x.successfulAttempts),number(x.failedAttempts),number(x.otherAttempts),pct(x.successRatePercent),currency(x.successfulAmount)])??[]}/>
      </section>

      <section className="card overflow-hidden" data-testid="ltv-v75">
        <div className="border-b border-slate-800 p-5"><h2 className="text-xl font-bold">Giá trị vòng đời khách hàng thực nhận</h2><p className="mt-1 text-sm text-slate-500">Thanh toán THÀNH CÔNG trọn đời theo KHÁCH HÀNG; email được che bớt trước khi trả về giao diện.</p></div>
        <Table headers={["Khách hàng","Thư điện tử","Lượt đặt vé đã thanh toán","LTV thực nhận","Giá trị đơn trung bình"]} rows={data?.topCustomersByRealizedLtv.map(x=>[x.customerRef,x.maskedEmail,number(x.paidBookings),currency(x.realizedRevenue),currency(x.averageOrderValue)])??[]}/>
      </section>
    </div>

    <section className="card overflow-hidden" data-testid="movie-efficiency-v75">
      <div className="border-b border-slate-800 p-5"><h2 className="text-xl font-bold">Hiệu suất phim</h2><p className="mt-1 text-sm text-slate-500">Chỉ tính suất đã bắt đầu trong cửa sổ; tỷ lệ lấp đầy = vé đang hoạt động / tổng ghế được chào bán qua các suất.</p></div>
      <Table headers={["Phim","Suất","Vé","Sức chứa","Tỷ lệ lấp đầy","Doanh thu","Doanh thu/suất","Doanh thu/ghế"]} rows={data?.movieEfficiency.map(x=>[x.movieTitle,number(x.completedShowtimes),number(x.ticketsSold),number(x.seatCapacity),pct(x.occupancyRatePercent),currency(x.realizedRevenue),currency(x.revenuePerShowtime),currency(x.revenuePerSeatOffered)])??[]}/>
    </section>

    <section className="card overflow-hidden" data-testid="cinema-efficiency-v75">
      <div className="border-b border-slate-800 p-5"><h2 className="text-xl font-bold">Hiệu suất rạp</h2><p className="mt-1 text-sm text-slate-500">So sánh tỷ lệ lấp đầy và hiệu quả doanh thu trên cùng cửa sổ thời gian.</p></div>
      <Table headers={["Rạp","Suất","Vé","Sức chứa","Tỷ lệ lấp đầy","Doanh thu","Doanh thu/suất","Doanh thu/ghế"]} rows={data?.cinemaEfficiency.map(x=>[x.cinemaName,number(x.completedShowtimes),number(x.ticketsSold),number(x.seatCapacity),pct(x.occupancyRatePercent),currency(x.realizedRevenue),currency(x.revenuePerShowtime),currency(x.revenuePerSeatOffered)])??[]}/>
    </section>
  </div>;
}

function Metric({label,value,compact=false}:{label:string;value:string;compact?:boolean}){return <div className="card p-5"><div className="text-xs uppercase tracking-wider text-slate-500">{label}</div><div className={`mt-2 font-black ${compact?"break-all text-sm":"text-2xl"}`}>{value}</div></div>}
function Table({headers,rows}:{headers:string[];rows:(string|number)[][]}){return <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-900/70 text-xs uppercase text-slate-500"><tr>{headers.map(x=><th key={x} className="p-3">{x}</th>)}</tr></thead><tbody className="divide-y divide-slate-800">{rows.map((row,i)=><tr key={i}>{row.map((cell,j)=><td key={j} className="p-3">{cell}</td>)}</tr>)}{rows.length===0&&<tr><td colSpan={headers.length} className="p-4 text-slate-500">Chưa có dữ liệu phù hợp.</td></tr>}</tbody></table></div>}
function pct(value:number){return `${Number(value||0).toFixed(2)}%`}
function number(value:number){return new Intl.NumberFormat("vi-VN").format(Number(value||0))}
function month(value:string){return new Intl.DateTimeFormat("vi-VN",{month:"2-digit",year:"numeric",timeZone:"Asia/Ho_Chi_Minh"}).format(new Date(`${value}T00:00:00+07:00`))}
/* V77.0.9 historical verifier aliases (not rendered):
/admin/analytics | Analytics V51
không có durable page-view/visitor event
email được mask
*/
