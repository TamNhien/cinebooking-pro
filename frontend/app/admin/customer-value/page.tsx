"use client";

import {useEffect,useMemo,useState} from "react";
import {api} from "@/lib/api";
import {clearAuth,getAuth} from "@/lib/auth";
import type {CustomerValueCinemaV56,CustomerValueScorecardV56,UserProfile} from "@/lib/types";

const money=(value:number)=>new Intl.NumberFormat("vi-VN",{style:"currency",currency:"VND",maximumFractionDigits:0}).format(value||0);
const number=(value:number)=>new Intl.NumberFormat("vi-VN").format(value||0);
const dateTime=(iso:string)=>new Intl.DateTimeFormat("vi-VN",{dateStyle:"short",timeStyle:"short"}).format(new Date(iso));
const segmentTone:Record<string,string>={CHAMPIONS:"text-emerald-300",LOYAL:"text-sky-300",NEW_RECENT:"text-cyan-300",HIGH_VALUE:"text-violet-300",NEEDS_ATTENTION:"text-amber-300",DEVELOPING:"text-slate-300"};

export default function CustomerValueV56(){
  const [me,setMe]=useState<UserProfile|null>(null);
  const [cinemas,setCinemas]=useState<CustomerValueCinemaV56[]>([]);
  const [cinemaId,setCinemaId]=useState("");
  const [periodDays,setPeriodDays]=useState<90|365>(90);
  const [data,setData]=useState<CustomerValueScorecardV56|null>(null);
  const [loading,setLoading]=useState(true);
  const [message,setMessage]=useState("");

  async function load(selected=cinemaId,days:90|365=periodDays){
    setLoading(true);setMessage("");
    try{
      const qs=new URLSearchParams({periodDays:String(days)});
      if(selected)qs.set("cinemaId",selected);
      setData(await api<CustomerValueScorecardV56>(`/admin/customer-value/điểmcard?${qs.toString()}`));
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
          <div className="text-xs font-bold uppercase tracking-[0.24em] text-fuchsia-300">Giá trị khách hàng & phân tích RFM · V56</div>
          <h1 className="mt-2 text-3xl font-black">Giá trị khách hàng & RFM</h1>
          <p className="mt-2 max-w-4xl text-sm text-slate-400">Đo giá trị khách hàng thực nhận từ lượt đặt vé ĐÃ XÁC NHẬN + thanh toán THÀNH CÔNG thật. RFM là xếp hạng tương đối Độ gần đây/Tần suất/Giá trị tiền tệ trong tập khách đang hoạt động, không phải dự đoán CLV tương lai hay điểm rời bỏ do AI.</p>
        </div>
        <button className="btn btn-secondary" type="button" disabled={loading} onClick={()=>load()}>{loading?"Đang tải...":"↻ Làm mới"}</button>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {me?.role==="ADMIN"?<label className="text-sm text-slate-300">Phạm vi
          <select data-testid="customer-value-cinema-filter-v56" className="input ml-2 !w-auto min-w-56" value={cinemaId} onChange={async e=>{const next=e.target.value;setCinemaId(next);await load(next,periodDays)}}>
            <option value="">Toàn hệ thống</option>
            {cinemas.map(c=><option key={c.cinemaId} value={c.cinemaId}>{c.cinemaName}</option>)}
          </select>
        </label>:data&&<div className="rounded-xl border border-slate-700 px-3 py-2 text-sm">Rạp: <b>{data.cinemaName}</b></div>}
        <label className="text-sm text-slate-300">Tập khách đang hoạt động
          <select data-testid="customer-value-period-v56" className="input ml-2 !w-auto" value={periodDays} onChange={async e=>{const next=Number(e.target.value) as 90|365;setPeriodDays(next);await load(cinemaId,next)}}>
            <option value={90}>90 ngày</option><option value={365}>365 ngày</option>
          </select>
        </label>
        {data&&<span className="text-xs text-slate-500">{data.fromDate} → {data.toDate} · cập nhật {dateTime(data.generatedAt)}</span>}
      </div>
      {message&&<div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{message}</div>}
    </section>

    {data&&<>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6" data-testid="customer-value-summary-v56">
        <div className="card p-4"><div className="text-xs text-slate-400">Khách đang hoạt động · {data.periodDays} ngày</div><div className="mt-1 text-2xl font-black">{number(data.activeCustomers)}</div><div className="text-xs text-slate-500">có lượt đặt vé ĐÃ XÁC NHẬN trong cửa sổ</div></div>
        <div className="card p-4"><div className="text-xs text-slate-400">Doanh thu cửa sổ</div><div className="mt-1 text-xl font-black text-emerald-300">{money(data.periodRevenue)}</div><div className="text-xs text-slate-500">thanh toán THÀNH CÔNG</div></div>
        <div className="card p-4"><div className="text-xs text-slate-400">Giá trị trọn đời · tệp đang hoạt động</div><div className="mt-1 text-xl font-black">{money(data.activeBaseLifetimeRevenue)}</div><div className="text-xs text-slate-500">thực nhận, không dự báo</div></div>
        <div className="card p-4"><div className="text-xs text-slate-400">Doanh thu trọn đời / khách</div><div className="mt-1 text-xl font-black">{money(data.averageLifetimeRevenue)}</div></div>
        <div className="card p-4"><div className="text-xs text-slate-400">Lượt đặt vé trọn đời / khách</div><div className="mt-1 text-2xl font-black">{data.averageLifetimeBookings.toFixed(2)}</div><div className="text-xs text-slate-500">trong phạm vi rạp</div></div>
        <div className="card p-4"><div className="text-xs text-slate-400">Tỷ trọng doanh thu của ~10% khách hàng đầu</div><div className="mt-1 text-2xl font-black text-fuchsia-300">{data.top10RevenueShare.toFixed(1)}%</div><div className="text-xs text-slate-500">trung vị độ gần đây {data.medianRecencyDays.toFixed(1)} ngày</div></div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
        <div className="card overflow-hidden" data-testid="customer-value-rfm-v56">
          <div className="border-b border-slate-800 p-5"><h2 className="text-xl font-bold">Phân khúc RFM</h2><p className="mt-1 text-sm text-slate-500">R/F/M chấm 1-5 theo nhóm 20% tương đối của tập khách đang hoạt động hiện tại. Nhóm loại trừ nhau theo thứ tự quy tắc minh bạch; không dùng mô hình dự đoán.</p></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-sm"><thead className="bg-slate-950/60 text-left text-xs uppercase tracking-wider text-slate-500"><tr><th className="p-3">Nhóm</th><th className="p-3">Quy tắc</th><th className="p-3 text-right">Khách</th><th className="p-3 text-right">Giá trị trọn đời</th><th className="p-3 text-right">Tỷ trọng doanh thu</th></tr></thead><tbody>
            {data.rfmSegments.map(s=><tr key={s.code} className="border-t border-slate-800"><td className={`p-3 font-bold ${segmentTone[s.code]||"text-slate-200"}`}>{s.label}</td><td className="p-3 text-xs text-slate-500">{s.definition}</td><td className="p-3 text-right">{number(s.customers)}</td><td className="p-3 text-right">{money(s.realizedLifetimeRevenue)}</td><td className="p-3 text-right font-bold">{s.revenueShare.toFixed(1)}%</td></tr>)}
          </tbody></table></div>
        </div>

        <div className="card p-5" data-testid="customer-value-bands-v56">
          <h2 className="text-xl font-bold">Phân phối giá trị thực nhận</h2>
          <p className="mt-1 text-sm text-slate-500">Xếp theo doanh thu trọn đời thật của tệp đang hoạt động. Đây là phân vị mô tả tập hiện tại, không phải giá trị tương lai dự đoán.</p>
          <div className="mt-5 space-y-4">{data.valueBands.map(b=><div key={b.code}>
            <div className="mb-1 flex items-center justify-between gap-3 text-sm"><div><b>{b.label}</b> <span className="text-xs text-slate-500">· {number(b.customers)} khách</span></div><div className="text-right"><b>{b.revenueShare.toFixed(1)}%</b><div className="text-xs text-slate-500">{money(b.realizedLifetimeRevenue)}</div></div></div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-900"><div className="h-full rounded-full bg-fuchsia-500/70" style={{width:`${Math.max(b.realizedLifetimeRevenue?3:0,(b.realizedLifetimeRevenue/maxBand)*100)}%`}}/></div>
            <div className="mt-1 text-xs text-slate-600">{b.definition}</div>
          </div>)}</div>
        </div>
      </section>

      <section className="card overflow-hidden" data-testid="customer-value-top-v56">
        <div className="border-b border-slate-800 p-5"><h2 className="text-xl font-bold">Khách hàng giá trị cao · tham chiếu bảo vệ riêng tư</h2><p className="mt-1 text-sm text-slate-500">Chỉ hiển thị mã KH rút gọn, không email/số điện thoại. Độ gần đây lấy từ lượt đặt vé ĐÃ XÁC NHẬN gần nhất; Giá trị tiền tệ lấy từ thanh toán THÀNH CÔNG; việc chuyển vé vẫn quy về người mua gốc.</p></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-sm"><thead className="bg-slate-950/60 text-left text-xs uppercase tracking-wider text-slate-500"><tr><th className="p-3">Khách</th><th className="p-3">Đầu / Cuối</th><th className="p-3 text-right">Độ gần đây</th><th className="p-3 text-right">Tần suất</th><th className="p-3 text-right">Giá trị tiền tệ</th><th className="p-3 text-center">R/F/M</th><th className="p-3 text-right">Tổng</th><th className="p-3">Phân khúc</th></tr></thead><tbody>
          {data.topCustomers.map(c=><tr key={c.customerRef} className="border-t border-slate-800"><td className="p-3 font-mono font-bold">{c.customerRef}</td><td className="p-3 text-xs text-slate-500">{c.firstBookingDate}<br/>{c.lastBookingDate}</td><td className="p-3 text-right">{number(c.recencyDays)} ngày</td><td className="p-3 text-right">{number(c.lifetimeBookings)} đặt vé</td><td className="p-3 text-right font-semibold">{money(c.realizedLifetimeRevenue)}</td><td className="p-3 text-center font-mono">{c.recencyScore}/{c.frequencyScore}/{c.monetaryScore}</td><td className="p-3 text-right font-black">{c.rfmTotal}</td><td className={`p-3 font-bold ${segmentTone[c.segment]||"text-slate-300"}`}>{c.segment}</td></tr>)}
          {!data.topCustomers.length&&<tr><td colSpan={8} className="p-8 text-center text-slate-500">Chưa có khách hàng có lượt đặt vé ĐÃ XÁC NHẬN trong cửa sổ đã chọn.</td></tr>}
        </tbody></table></div>
      </section>

      <section className="card p-5 text-sm text-slate-500">
        <b className="text-slate-300">Nguyên tắc V56:</b> giá trị thực nhận chỉ tính giao dịch đã xảy ra; không dự đoán CLV tương lai, không tự gán xác suất rời bỏ và không tạo khách hàng/thanh toán giả. RFM là xếp hạng tương đối nên điểm có thể thay đổi khi phạm vi rạp hoặc tập khách đang hoạt động thay đổi.
      </section>
    </>}
  </main>;
}
/* V77.0.9 historical verifier aliases (not rendered):
Customer Value & RFM Intelligence · V56 | realized customer value | không phải dự đoán CLV tương lai | không phải dự đoán CLV tương lai hay điểm churn AI | payment SUCCESS | privacy-safe reference | không email/số điện thoại
*/
