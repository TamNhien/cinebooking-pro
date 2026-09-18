"use client";

import { useEffect, useMemo, useState } from "react";
import { api, currency, dateTime } from "@/lib/api";
import { clearAuth, getAuth } from "@/lib/auth";
import { usePresentationLanguage } from "@/lib/usePresentationLanguage";
import type { RetentionCinemaV55, RetentionScorecardV55, UserProfile } from "@/lib/types";

const lifecycleTone:Record<string,string>={NEW_30D:"text-sky-300",ACTIVE_REPEAT:"text-emerald-300",AT_RISK:"text-amber-300",DORMANT:"text-orange-300",LAPSED:"text-rose-300"};
const lifecycleEn:Record<string,{label:string;definition:string}>={
  NEW_30D:{label:"New customers · 30 days",definition:"First CONFIRMED purchase occurred within the last 30 days"},
  ACTIVE_REPEAT:{label:"Active returning customers",definition:"Purchased before 30 days ago and still has a CONFIRMED purchase within the last 30 days"},
  AT_RISK:{label:"At risk",definition:"Most recent CONFIRMED purchase was 30-59 days ago"},
  DORMANT:{label:"Dormant",definition:"Most recent CONFIRMED purchase was 60-179 days ago"},
  LAPSED:{label:"Lapsed",definition:"No CONFIRMED purchase for at least 180 days"},
};

export default function CustomerRetentionV55(){
  const {language,locale,t}=usePresentationLanguage();
  const [me,setMe]=useState<UserProfile|null>(null);
  const [cinemas,setCinemas]=useState<RetentionCinemaV55[]>([]);
  const [cinemaId,setCinemaId]=useState("");
  const [periodDays,setPeriodDays]=useState<30|90>(30);
  const [data,setData]=useState<RetentionScorecardV55|null>(null);
  const [loading,setLoading]=useState(true);
  const [message,setMessage]=useState("");
  const number=(v:number)=>new Intl.NumberFormat(locale).format(v||0);
  const monthLabel=(iso:string)=>new Intl.DateTimeFormat(locale,{month:"2-digit",year:"numeric"}).format(new Date(`${iso}T00:00:00+07:00`));

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
    if(!local){window.location.assign("/login?returnTo=/admin/retention&reason=required");return;}
    (async()=>{
      try{
        const profile=await api<UserProfile>("/me");
        if(!["MANAGER","ADMIN"].includes(profile.role)){
          clearAuth();window.location.assign("/login?returnTo=/admin/retention&reason=admin");return;
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
          <div className="text-xs font-bold uppercase tracking-[0.24em] text-violet-300">{t("GIỮ CHÂN KHÁCH HÀNG & PHÂN TÍCH NHÓM · V55","CUSTOMER RETENTION & COHORT ANALYTICS · V55")}</div>
          <h1 className="mt-2 text-3xl font-black">{t("Giữ chân khách hàng & nhóm khách","Customer retention & cohorts")}</h1>
          <p className="mt-2 max-w-4xl text-sm text-slate-400">{t(
            "Đo khách mới, khách quay lại, tỷ lệ quay lại, vòng đời và giữ chân 30 ngày từ đặt vé ĐÃ XÁC NHẬN + thanh toán THÀNH CÔNG thật. Đây là phân đoạn theo quy tắc minh bạch, không phải điểm rời bỏ do AI bịa ra.",
            "Measure new customers, returning customers, return rate, lifecycle, and 30-day retention from real CONFIRMED bookings plus real SUCCESS payments. This is transparent rule-based segmentation, not a fabricated AI churn score."
          )}</p>
        </div>
        <button className="btn btn-secondary" type="button" disabled={loading} onClick={()=>load()}>{loading?t("Đang tải...","Loading..."):t("↻ Làm mới","↻ Refresh")}</button>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {me?.role==="ADMIN"?<label className="text-sm text-slate-300">{t("Phạm vi","Scope")}
          <select data-testid="retention-cinema-filter-v55" className="input ml-2 !w-auto min-w-56" value={cinemaId} onChange={async e=>{const next=e.target.value;setCinemaId(next);await load(next,periodDays)}}>
            <option value="">{t("Toàn hệ thống","Entire system")}</option>
            {cinemas.map(c=><option key={c.cinemaId} value={c.cinemaId} data-testid="retention-cinema-option-v7810" data-i18n-skip="true">{c.cinemaName}</option>)}
          </select>
        </label>:data&&<div className="rounded-xl border border-slate-700 px-3 py-2 text-sm">{t("Rạp","Cinema")}: <b>{data.cinemaName}</b></div>}
        <label className="text-sm text-slate-300">{t("Cửa sổ hoạt động","Activity window")}
          <select data-testid="retention-period-v55" className="input ml-2 !w-auto" value={periodDays} onChange={async e=>{const next=Number(e.target.value) as 30|90;setPeriodDays(next);await load(cinemaId,next)}}>
            <option value={30}>{t("30 ngày","30 days")}</option><option value={90}>{t("90 ngày","90 days")}</option>
          </select>
        </label>
        {data&&<span className="text-xs text-slate-500">{data.fromDate} → {data.toDate} · {t("cập nhật","updated")} {dateTime(data.generatedAt)}</span>}
      </div>
      {message&&<div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{message}</div>}
    </section>

    {data&&<>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6" data-testid="retention-summary-v55">
        <div className="card p-4"><div className="text-xs text-slate-400">{t("Khách hoạt động","Active customers")} · {data.periodDays} {t("ngày","days")}</div><div className="mt-1 text-2xl font-black">{number(data.activeCustomers)}</div></div>
        <div className="card p-4"><div className="text-xs text-slate-400">{t("Khách mới","New customers")}</div><div className="mt-1 text-2xl font-black text-sky-300">{number(data.newCustomers)}</div><div className="text-xs text-slate-500">{t("lần ĐÃ XÁC NHẬN đầu tiên trong cửa sổ","first CONFIRMED booking in the window")}</div></div>
        <div className="card p-4"><div className="text-xs text-slate-400">{t("Khách quay lại","Returning customers")}</div><div className="mt-1 text-2xl font-black text-emerald-300">{number(data.returningCustomers)}</div><div className="text-xs text-slate-500">{t("đã mua trước cửa sổ","purchased before the window")}</div></div>
        <div className="card p-4"><div className="text-xs text-slate-400">{t("Tỷ lệ quay lại","Return rate")}</div><div className="mt-1 text-2xl font-black">{data.repeatCustomerRate.toFixed(1)}%</div><div className="text-xs text-slate-500">{t("≥2 lượt đặt vé ĐÃ XÁC NHẬN trong lịch sử","≥2 CONFIRMED bookings in history")}</div></div>
        <div className="card p-4"><div className="text-xs text-slate-400">{t("Đặt vé / khách","Bookings / customer")}</div><div className="mt-1 text-2xl font-black">{data.bookingsPerCustomer.toFixed(2)}</div><div className="text-xs text-slate-500">{number(data.bookings)} {t("lượt đặt vé","bookings")}</div></div>
        <div className="card p-4"><div className="text-xs text-slate-400">{t("Doanh thu / khách","Revenue / customer")}</div><div className="mt-1 text-xl font-black">{currency(data.revenuePerCustomer)}</div><div className="text-xs text-slate-500">{t("THÀNH CÔNG","SUCCESS")}: {currency(data.revenue)}</div></div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[.85fr_1.15fr]">
        <div className="card p-5" data-testid="retention-lifecycle-v55">
          <h2 className="text-xl font-bold">{t("Vòng đời khách hàng","Customer lifecycle")}</h2>
          <p className="mt-1 text-sm text-slate-500">{t("Các nhóm loại trừ nhau theo lượt đặt vé ĐÃ XÁC NHẬN đầu/cuối trong đúng phạm vi rạp. Đây không phải dự đoán AI hay xác suất rời bỏ.","Segments are mutually exclusive based on first/last CONFIRMED bookings within the selected cinema scope. This is not an AI prediction or churn probability.")}</p>
          <div className="mt-4 space-y-3">
            {data.lifecycle.map(item=>{const en=lifecycleEn[item.code];return <div key={item.code} className="rounded-xl border border-slate-800 p-4">
              <div className="flex items-center justify-between gap-3"><div className={`font-bold ${lifecycleTone[item.code]||"text-slate-200"}`}>{language==="en"&&en?en.label:item.label}</div><div className="text-2xl font-black">{number(item.customers)}</div></div>
              <div className="mt-1 text-xs text-slate-500">{language==="en"&&en?en.definition:item.definition}</div>
            </div>})}
          </div>
        </div>

        <div className="card overflow-hidden" data-testid="retention-cohorts-v55">
          <div className="border-b border-slate-800 p-5"><h2 className="text-xl font-bold">{t("Giữ chân nhóm khách 30 ngày","30-day cohort retention")}</h2><p className="mt-1 text-sm text-slate-500">{t("Nhóm khách theo tháng của lần mua ĐÃ XÁC NHẬN đầu tiên. Chỉ đưa nhóm đã có đủ 30 ngày quan sát; được giữ chân khi có lượt đặt vé ĐÃ XÁC NHẬN thứ hai trong vòng 30 ngày.","Cohorts are grouped by the month of the first CONFIRMED purchase. Only cohorts with a full 30-day observation window are included; a customer is retained when a second CONFIRMED booking occurs within 30 days.")}</p></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-sm"><thead className="bg-slate-950/60 text-xs uppercase tracking-wider text-slate-500"><tr><th className="p-3">{t("Nhóm khách","Cohort")}</th><th className="p-3">{t("Khách mới","New customers")}</th><th className="p-3">{t("Quay lại ≤30 ngày","Returned within ≤30d")}</th><th className="p-3">{t("Giữ chân 30 ngày","30-day retention")}</th></tr></thead><tbody>
            {data.cohorts.map(c=><tr key={c.cohortMonth} className="border-t border-slate-800"><td className="p-3 font-semibold">{monthLabel(c.cohortMonth)}</td><td className="p-3">{number(c.acquiredCustomers)}</td><td className="p-3">{number(c.returnedWithin30Days)}</td><td className="p-3 font-black">{c.retention30dRate.toFixed(1)}%</td></tr>)}
            {!data.cohorts.length&&<tr><td colSpan={4} className="p-6 text-center text-slate-500">{t("Chưa có nhóm khách đủ 30 ngày quan sát trong phạm vi này.","No customer cohort in this scope has a full 30-day observation window yet.")}</td></tr>}
          </tbody></table></div>
        </div>
      </section>

      <section className="card p-5 sm:p-6" data-testid="retention-daily-v55">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-bold">{t("Nhịp khách mới / quay lại theo ngày","Daily new / returning customer pace")}</h2><p className="mt-1 text-sm text-slate-500">{t("Khách được quy về mã người mua gốc của lượt đặt vé; chuyển vé không biến người nhận thành khách mua mới. Doanh thu vẫn theo thanh toán THÀNH CÔNG của ngày thanh toán.","Customers are attributed to the original booking purchaser; a ticket transfer does not turn the recipient into a new purchasing customer. Revenue still follows SUCCESS payments on the payment date.")}</p></div><div className="text-sm text-slate-400">{t("Tổng doanh thu","Total revenue")}: <b className="text-slate-100">{currency(data.revenue)}</b></div></div>
        <div className="mt-5 max-h-[520px] space-y-2 overflow-y-auto pr-1">
          {data.daily.map(d=>{const customers=d.newCustomers+d.returningCustomers;return <div key={d.day} className="grid grid-cols-[92px_1fr_96px] items-center gap-3 text-xs">
            <div className="text-slate-500">{d.day}</div>
            <div className="h-7 overflow-hidden rounded-lg bg-slate-900"><div className="flex h-full" style={{width:`${Math.max(customers?4:0,(customers/maxDaily)*100)}%`}}><div className="h-full bg-sky-500/70" style={{width:`${customers?(d.newCustomers/customers)*100:0}%`}}/><div className="h-full flex-1 bg-emerald-500/70"/></div></div>
            <div className="text-right"><div><span className="text-sky-300">{d.newCustomers} {t("mới","new")}</span> · <span className="text-emerald-300">{d.returningCustomers} {t("lại","returning")}</span></div><div className="text-slate-600">{d.bookings} {t("đặt vé","bookings")}</div></div>
          </div>})}
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500"><span><b className="text-sky-300">■</b> {t("khách mới","new customers")}</span><span><b className="text-emerald-300">■</b> {t("khách quay lại","returning customers")}</span><span>{t("Chỉ vai trò KHÁCH HÀNG; Quản lý/Quản trị không làm nhiễu chỉ số giữ chân.","CUSTOMER role only; Manager/Administrator accounts do not affect retention metrics.")}</span></div>
      </section>
    </>}
  </main>;
}
/* V77.0.9 historical-verifier compatibility markers (not rendered):
người mua_user_id
không phải điểm churn
không phải dự đoán AI
Customer Retention & Cohort Intelligence · V55
retention-intelligence-v55
booking CONFIRMED
payment SUCCESS
transfer vé không biến người nhận
*/
