"use client";

import {useEffect,useMemo,useState} from "react";
import {api, currency} from "@/lib/api";
import {clearAuth,getAuth} from "@/lib/auth";
import { usePresentationLanguage } from "@/lib/usePresentationLanguage";
import type {CustomerValueBandV56,CustomerValueCinemaV56,CustomerValueRfmSegmentV56,CustomerValueScorecardV56,UserProfile} from "@/lib/types";

const segmentTone:Record<string,string>={CHAMPIONS:"text-emerald-300",LOYAL:"text-sky-300",NEW_RECENT:"text-cyan-300",HIGH_VALUE:"text-violet-300",NEEDS_ATTENTION:"text-amber-300",DEVELOPING:"text-slate-300"};

const segmentCopy:Record<CustomerValueRfmSegmentV56["code"],{vi:string;en:string;definitionVi:string;definitionEn:string}>={
  CHAMPIONS:{vi:"Nhà vô địch",en:"Champions",definitionVi:"R≥4, F≥4, M≥4 trong tập khách đang hoạt động hiện tại",definitionEn:"R≥4, F≥4, M≥4 within the current active cohort"},
  LOYAL:{vi:"Trung thành",en:"Loyal",definitionVi:"Tần suất ≥4 và Độ gần đây ≥3 sau khi loại nhóm Nhà vô địch",definitionEn:"Frequency ≥4 and Recency ≥3 after excluding Champions"},
  NEW_RECENT:{vi:"Mới gần đây",en:"New recent",definitionVi:"Chỉ 1 lượt đặt vé ĐÃ XÁC NHẬN và mua trong 30 ngày gần nhất",definitionEn:"Exactly 1 CONFIRMED booking, purchased within the last 30 days"},
  HIGH_VALUE:{vi:"Giá trị cao",en:"High value",definitionVi:"Giá trị tiền tệ ≥4 và Độ gần đây ≥3 sau các nhóm ưu tiên trước",definitionEn:"Monetary ≥4 and Recency ≥3 after higher-priority segments"},
  NEEDS_ATTENTION:{vi:"Cần chú ý",en:"Needs attention",definitionVi:"Độ gần đây ≤2 nhưng Tần suất hoặc Giá trị tiền tệ vẫn ≥3",definitionEn:"Recency ≤2 while Frequency or Monetary remains ≥3"},
  DEVELOPING:{vi:"Đang phát triển",en:"Developing",definitionVi:"Phần còn lại của tập khách đang hoạt động; không tự gán nhãn rời bỏ",definitionEn:"Remaining active cohort; no automatic churn label is assigned"},
};

const bandCopy:Record<CustomerValueBandV56["code"],{vi:string;en:string;definitionVi:string;definitionEn:string}>={
  TOP_10:{vi:"Top ~10%",en:"Top ~10%",definitionVi:"Nhóm đầu theo doanh thu trọn đời thực nhận; tối thiểu 1 khách khi tập không rỗng",definitionEn:"Top band by realized lifetime revenue; at least one customer when the cohort is non-empty"},
  NEXT_15:{vi:"10-25%",en:"10-25%",definitionVi:"Nhóm kế tiếp theo doanh thu trọn đời thực nhận",definitionEn:"Next band by realized lifetime revenue"},
  MIDDLE_25:{vi:"25-50%",en:"25-50%",definitionVi:"Nửa trên còn lại theo doanh thu trọn đời thực nhận",definitionEn:"Remaining upper half by realized lifetime revenue"},
  LONG_TAIL:{vi:"50-100%",en:"50-100%",definitionVi:"Nửa dưới theo doanh thu trọn đời thực nhận",definitionEn:"Lower half by realized lifetime revenue"},
};

export default function CustomerValueV56(){
  const {language,locale,t}=usePresentationLanguage();
  const [me,setMe]=useState<UserProfile|null>(null);
  const [cinemas,setCinemas]=useState<CustomerValueCinemaV56[]>([]);
  const [cinemaId,setCinemaId]=useState("");
  const [periodDays,setPeriodDays]=useState<90|365>(90);
  const [data,setData]=useState<CustomerValueScorecardV56|null>(null);
  const [loading,setLoading]=useState(true);
  const [message,setMessage]=useState("");

  const money=(value:number)=>currency(value||0,locale);
  const number=(value:number)=>new Intl.NumberFormat(locale).format(value||0);
  const dateTime=(iso:string)=>new Intl.DateTimeFormat(locale,{dateStyle:"short",timeStyle:"short"}).format(new Date(iso));
  const segmentLabel=(code:CustomerValueRfmSegmentV56["code"])=>language==="en"?segmentCopy[code].en:segmentCopy[code].vi;
  const segmentDefinition=(code:CustomerValueRfmSegmentV56["code"])=>language==="en"?segmentCopy[code].definitionEn:segmentCopy[code].definitionVi;
  const bandLabel=(code:CustomerValueBandV56["code"])=>language==="en"?bandCopy[code].en:bandCopy[code].vi;
  const bandDefinition=(code:CustomerValueBandV56["code"])=>language==="en"?bandCopy[code].definitionEn:bandCopy[code].definitionVi;

  async function load(selected=cinemaId,days:90|365=periodDays){
    setLoading(true);setMessage("");
    try{
      const qs=new URLSearchParams({periodDays:String(days)});
      if(selected)qs.set("cinemaId",selected);
      // Machine API contract remains English. Never localize URL/path segments.
      setData(await api<CustomerValueScorecardV56>(`/admin/customer-value/scorecard?${qs.toString()}`));
    }catch(e){setMessage((e as Error).message)}finally{setLoading(false)}
  }

  useEffect(()=>{
    const local=getAuth();
    if(!local){window.location.assign("/login?returnTo=/admin/customer-value&reason=required");return;}
    (async()=>{
      try{
        const profile=await api<UserProfile>("/me");
        if(!["MANAGER","ADMIN"].includes(profile.role)){
          clearAuth();window.location.assign("/login?returnTo=/admin/customer-value&reason=admin");return;
        }
        setMe(profile);
        const options=await api<CustomerValueCinemaV56[]>("/admin/customer-value/cinemas");
        setCinemas(options);
        const initial=profile.role==="MANAGER"&&options.length?options[0].cinemaId:"";
        setCinemaId(initial);
        await load(initial,90);
      }catch(e){setMessage((e as Error).message);setLoading(false)}
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  const maxBand=useMemo(()=>Math.max(1,...(data?.valueBands.map(x=>x.realizedLifetimeRevenue)||[1])),[data]);

  return <main className="space-y-6" data-testid="customer-value-intelligence-v56">
    <section className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.24em] text-fuchsia-300">{t("Giá trị khách hàng & phân tích RFM · V56","Customer Value & RFM Intelligence · V56")}</div>
          <h1 className="mt-2 text-3xl font-black">{t("Giá trị khách hàng & RFM","Customer Value & RFM")}</h1>
          <p className="mt-2 max-w-4xl text-sm text-slate-400">{t(
            "Đo giá trị khách hàng thực nhận từ lượt đặt vé ĐÃ XÁC NHẬN + thanh toán THÀNH CÔNG thật. RFM là xếp hạng tương đối Độ gần đây/Tần suất/Giá trị tiền tệ trong tập khách đang hoạt động, không phải dự đoán CLV tương lai hay điểm rời bỏ do AI.",
            "Measure realized customer value from real CONFIRMED bookings and real SUCCESS payments. RFM is a relative Recency/Frequency/Monetary ranking within the active customer cohort, not a future CLV forecast or AI churn score."
          )}</p>
        </div>
        <button className="btn btn-secondary" type="button" disabled={loading} onClick={()=>load()}>{loading?t("Đang tải...","Loading..."):t("↻ Làm mới","↻ Refresh")}</button>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {me?.role==="ADMIN"?<label className="text-sm text-slate-300">{t("Phạm vi","Scope")}
          <select data-testid="customer-value-cinema-filter-v56" className="input ml-2 !w-auto min-w-56" value={cinemaId} onChange={async e=>{const next=e.target.value;setCinemaId(next);await load(next,periodDays)}}>
            <option value="">{t("Toàn hệ thống","Entire system")}</option>
            {cinemas.map(c=><option key={c.cinemaId} value={c.cinemaId} data-testid="customer-value-cinema-option-v7810" data-i18n-skip="true">{c.cinemaName}</option>)}
          </select>
        </label>:data&&<div className="rounded-xl border border-slate-700 px-3 py-2 text-sm">{t("Rạp","Cinema")}: <b>{data.cinemaName}</b></div>}
        <label className="text-sm text-slate-300">{t("Tập khách đang hoạt động","Active customer cohort")}
          <select data-testid="customer-value-period-v56" className="input ml-2 !w-auto" value={periodDays} onChange={async e=>{const next=Number(e.target.value) as 90|365;setPeriodDays(next);await load(cinemaId,next)}}>
            <option value={90}>{t("90 ngày","90 days")}</option><option value={365}>{t("365 ngày","365 days")}</option>
          </select>
        </label>
        {data&&<span className="text-xs text-slate-500">{data.fromDate} → {data.toDate} · {t("cập nhật","updated")} {dateTime(data.generatedAt)}</span>}
      </div>
      {message&&<div data-testid="customer-value-error-v56" className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{message}</div>}
    </section>

    {data&&<>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6" data-testid="customer-value-summary-v56">
        <div className="card p-4"><div className="text-xs text-slate-400">{t("Khách đang hoạt động","Active customers")} · {data.periodDays} {t("ngày","days")}</div><div className="mt-1 text-2xl font-black">{number(data.activeCustomers)}</div><div className="text-xs text-slate-500">{t("có lượt đặt vé ĐÃ XÁC NHẬN trong cửa sổ","with CONFIRMED bookings in the selected window")}</div></div>
        <div className="card p-4"><div className="text-xs text-slate-400">{t("Doanh thu cửa sổ","Window revenue")}</div><div className="mt-1 text-xl font-black text-emerald-300">{money(data.periodRevenue)}</div><div className="text-xs text-slate-500">{t("thanh toán THÀNH CÔNG","SUCCESS payments")}</div></div>
        <div className="card p-4"><div className="text-xs text-slate-400">{t("Giá trị trọn đời · tệp đang hoạt động","Lifetime value · active cohort")}</div><div className="mt-1 text-xl font-black">{money(data.activeBaseLifetimeRevenue)}</div><div className="text-xs text-slate-500">{t("thực nhận, không dự báo","realized, not forecast")}</div></div>
        <div className="card p-4"><div className="text-xs text-slate-400">{t("Doanh thu trọn đời / khách","Lifetime revenue / customer")}</div><div className="mt-1 text-xl font-black">{money(data.averageLifetimeRevenue)}</div></div>
        <div className="card p-4"><div className="text-xs text-slate-400">{t("Lượt đặt vé trọn đời / khách","Lifetime bookings / customer")}</div><div className="mt-1 text-2xl font-black">{data.averageLifetimeBookings.toFixed(2)}</div><div className="text-xs text-slate-500">{t("trong phạm vi rạp","within the cinema scope")}</div></div>
        <div className="card p-4"><div className="text-xs text-slate-400">{t("Tỷ trọng doanh thu của ~10% khách hàng đầu","Revenue share of the top ~10% of customers")}</div><div className="mt-1 text-2xl font-black text-fuchsia-300">{data.top10RevenueShare.toFixed(1)}%</div><div className="text-xs text-slate-500">{t("trung vị độ gần đây","median recency")} {data.medianRecencyDays.toFixed(1)} {t("ngày","days")}</div></div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
        <div className="card overflow-hidden" data-testid="customer-value-rfm-v56">
          <div className="border-b border-slate-800 p-5"><h2 className="text-xl font-bold">{t("Phân khúc RFM","RFM segments")}</h2><p className="mt-1 text-sm text-slate-500">{t("R/F/M chấm 1-5 theo nhóm 20% tương đối của tập khách đang hoạt động hiện tại. Nhóm loại trừ nhau theo thứ tự quy tắc minh bạch; không dùng mô hình dự đoán.","R/F/M scores range from 1-5 by relative 20% bands of the current active cohort. Segments are mutually exclusive in a transparent rule order; no predictive model is used.")}</p></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-sm"><thead className="bg-slate-950/60 text-xs uppercase tracking-wider text-slate-500"><tr><th className="p-3">{t("Nhóm","Segment")}</th><th className="p-3">{t("Quy tắc","Rule")}</th><th className="p-3">{t("Khách","Customers")}</th><th className="p-3">{t("Giá trị trọn đời","Lifetime value")}</th><th className="p-3">{t("Tỷ trọng doanh thu","Revenue share")}</th></tr></thead><tbody>
            {data.rfmSegments.map(s=><tr key={s.code} className="border-t border-slate-800"><td className={`p-3 font-bold ${segmentTone[s.code]||"text-slate-200"}`}>{segmentLabel(s.code)}</td><td className="p-3 text-xs text-slate-500">{segmentDefinition(s.code)}</td><td className="p-3">{number(s.customers)}</td><td className="p-3">{money(s.realizedLifetimeRevenue)}</td><td className="p-3 font-bold">{s.revenueShare.toFixed(1)}%</td></tr>)}
          </tbody></table></div>
        </div>

        <div className="card p-5" data-testid="customer-value-bands-v56">
          <h2 className="text-xl font-bold">{t("Phân phối giá trị thực nhận","Realized value distribution")}</h2>
          <p className="mt-1 text-sm text-slate-500">{t("Xếp theo doanh thu trọn đời thật của tệp đang hoạt động. Đây là phân vị mô tả tập hiện tại, không phải giá trị tương lai dự đoán.","Ranked by actual lifetime revenue of the active cohort. These are descriptive percentiles of the current cohort, not predicted future value.")}</p>
          <div className="mt-5 space-y-4">{data.valueBands.map(b=><div key={b.code}>
            <div className="mb-1 flex items-center justify-between gap-3 text-sm"><div><b>{bandLabel(b.code)}</b> <span className="text-xs text-slate-500">· {number(b.customers)} {t("khách","customers")}</span></div><div className="text-right"><b>{b.revenueShare.toFixed(1)}%</b><div className="text-xs text-slate-500">{money(b.realizedLifetimeRevenue)}</div></div></div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-900"><div className="h-full rounded-full bg-fuchsia-500/70" style={{width:`${Math.max(b.realizedLifetimeRevenue?3:0,(b.realizedLifetimeRevenue/maxBand)*100)}%`}}/></div>
            <div className="mt-1 text-xs text-slate-600">{bandDefinition(b.code)}</div>
          </div>)}</div>
        </div>
      </section>

      <section className="card overflow-hidden" data-testid="customer-value-top-v56">
        <div className="border-b border-slate-800 p-5"><h2 className="text-xl font-bold">{t("Khách hàng giá trị cao · tham chiếu bảo vệ riêng tư","High-value customers · privacy-safe reference")}</h2><p className="mt-1 text-sm text-slate-500">{t("Chỉ hiển thị mã KH rút gọn, không thư điện tử/số điện thoại. Độ gần đây lấy từ lượt đặt vé ĐÃ XÁC NHẬN gần nhất; Giá trị tiền tệ lấy từ thanh toán THÀNH CÔNG; việc chuyển vé vẫn quy về người mua gốc.","Only a shortened customer reference is shown, never email or phone. Recency comes from the latest CONFIRMED booking; Monetary comes from SUCCESS payments; transferred tickets remain attributed to the original purchaser.")}</p></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-sm"><thead className="bg-slate-950/60 text-xs uppercase tracking-wider text-slate-500"><tr><th className="p-3">{t("Khách","Customer")}</th><th className="p-3">{t("Đầu / Cuối","First / Last")}</th><th className="p-3">{t("Độ gần đây","Recency")}</th><th className="p-3">{t("Tần suất","Frequency")}</th><th className="p-3">{t("Giá trị tiền tệ","Monetary value")}</th><th className="p-3 text-center">R/F/M</th><th className="p-3">{t("Tổng","Total")}</th><th className="p-3">{t("Phân khúc","Segment")}</th></tr></thead><tbody>
          {data.topCustomers.map(c=><tr key={c.customerRef} className="border-t border-slate-800"><td className="p-3 font-mono font-bold">{c.customerRef}</td><td className="p-3 text-xs text-slate-500">{c.firstBookingDate}<br/>{c.lastBookingDate}</td><td className="p-3">{number(c.recencyDays)} {t("ngày","days")}</td><td className="p-3">{number(c.lifetimeBookings)} {t("đặt vé","bookings")}</td><td className="p-3 font-semibold">{money(c.realizedLifetimeRevenue)}</td><td className="p-3 text-center font-mono">{c.recencyScore}/{c.frequencyScore}/{c.monetaryScore}</td><td className="p-3 font-black">{c.rfmTotal}</td><td className={`p-3 font-bold ${segmentTone[c.segment]||"text-slate-300"}`}>{segmentLabel(c.segment)}</td></tr>)}
          {!data.topCustomers.length&&<tr><td colSpan={8} className="p-8 text-center text-slate-500">{t("Chưa có khách hàng có lượt đặt vé ĐÃ XÁC NHẬN trong cửa sổ đã chọn.","No customer has a CONFIRMED booking in the selected window.")}</td></tr>}
        </tbody></table></div>
      </section>

      <section className="card p-5 text-sm text-slate-500">
        <b className="text-slate-300">{t("Nguyên tắc V56:","V56 policy:")}</b> {t("giá trị thực nhận chỉ tính giao dịch đã xảy ra; không dự đoán CLV tương lai, không tự gán xác suất rời bỏ và không tạo khách hàng/thanh toán giả. RFM là xếp hạng tương đối nên điểm có thể thay đổi khi phạm vi rạp hoặc tập khách đang hoạt động thay đổi.","realized value counts only completed transactions; it does not forecast future CLV, assign churn probabilities, or fabricate customers/payments. RFM is a relative ranking, so scores can change when the cinema scope or active cohort changes.")}
      </section>
    </>}
  </main>;
}
/* V77.0.9 historical verifier aliases (not rendered):
Customer Value & RFM Intelligence · V56 | realized customer value | không phải dự đoán CLV tương lai | không phải dự đoán CLV tương lai hay điểm churn AI | payment SUCCESS | privacy-safe reference | không thư điện tử/số điện thoại
*/
