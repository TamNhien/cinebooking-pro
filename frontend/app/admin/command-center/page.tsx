"use client";

import { useEffect, useMemo, useState } from "react";
import { api, currency, dateTime } from "@/lib/api";
import { clearAuth, getAuth } from "@/lib/auth";
import type { CommandCenterCinemaV53, CommandCenterSummaryV53, UserProfile } from "@/lib/types";

const number=(v:number)=>new Intl.NumberFormat("vi-VN").format(v||0);

function StatusBadge({status}:{status:CommandCenterSummaryV53["status"]}){
  const label=status==="ACTION_REQUIRED"?"Cần xử lý":status==="WATCH"?"Theo dõi":"Ổn định";
  const cls=status==="ACTION_REQUIRED"?"border-rose-500/40 bg-rose-500/10 text-rose-200":status==="WATCH"?"border-amber-500/40 bg-amber-500/10 text-amber-200":"border-emerald-500/40 bg-emerald-500/10 text-emerald-200";
  return <span className={`rounded-full border px-3 py-1 text-xs font-bold ${cls}`}>{label}</span>;
}

export default function OperationsCommandCenterV53(){
  const [me,setMe]=useState<UserProfile|null>(null);
  const [cinemas,setCinemas]=useState<CommandCenterCinemaV53[]>([]);
  const [cinemaId,setCinemaId]=useState("");
  const [data,setData]=useState<CommandCenterSummaryV53|null>(null);
  const [loading,setLoading]=useState(true);
  const [message,setMessage]=useState("");

  async function load(selected=cinemaId){
    setLoading(true);setMessage("");
    try{
      const qs=selected?`?cinemaId=${encodeURIComponent(selected)}`:"";
      const summary=await api<CommandCenterSummaryV53>(`/admin/command-center/summary${qs}`);
      setData(summary);
    }catch(e){setMessage((e as Error).message)}finally{setLoading(false)}
  }

  useEffect(()=>{
    const local=getAuth();
    if(!local){location.href="/login?returnTo=/admin/command-center&reason=required";return;}
    (async()=>{
      try{
        const profile=await api<UserProfile>("/me");
        if(!["MANAGER","ADMIN"].includes(profile.role)){
          clearAuth();location.href="/login?returnTo=/admin/command-center&reason=admin";return;
        }
        setMe(profile);
        const options=await api<CommandCenterCinemaV53[]>("/admin/command-center/cinemas");
        setCinemas(options);
        const initial=profile.role==="MANAGER"&&options.length?options[0].cinemaId:"";
        setCinemaId(initial);
        await load(initial);
      }catch(e){setMessage((e as Error).message);setLoading(false)}
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  const criticalCount=useMemo(()=>data?.attention.filter(x=>x.severity==="CRITICAL").reduce((a,b)=>a+b.count,0)||0,[data]);

  return <main className="space-y-6" data-testid="operations-command-center-v53">
    <section className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.24em] text-rose-300">Operations Command Center · V53</div>
          <h1 className="mt-2 text-3xl font-black">Trung tâm điều hành hợp nhất</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">Một màn hình để nhìn doanh thu hôm nay, forecast 7 ngày, payment review, SLA support, bảo trì, sự cố vận hành và tồn kho theo đúng dữ liệu đang có.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {data&&<StatusBadge status={data.status}/>}<button className="btn btn-secondary" type="button" disabled={loading} onClick={()=>load()}>{loading?"Đang tải...":"↻ Làm mới"}</button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {me?.role==="ADMIN"?<label className="text-sm text-slate-300">Phạm vi
          <select data-testid="command-center-cinema-filter" className="input ml-2 !w-auto min-w-56" value={cinemaId} onChange={async e=>{const next=e.target.value;setCinemaId(next);await load(next)}}>
            <option value="">Toàn hệ thống</option>
            {cinemas.map(c=><option key={c.cinemaId} value={c.cinemaId}>{c.cinemaName}</option>)}
          </select>
        </label>:data&&<div className="rounded-xl border border-slate-700 px-3 py-2 text-sm">Rạp: <b>{data.cinemaName}</b></div>}
        {data&&<span className="text-xs text-slate-500">Cập nhật {dateTime(data.generatedAt)}</span>}
      </div>
      {message&&<div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{message}</div>}
    </section>

    {data&&<>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" data-testid="command-center-summary-v53">
        <div className="card p-4"><div className="text-xs text-slate-400">Doanh thu hôm nay</div><div className="mt-1 text-2xl font-black">{currency(data.todayRevenue)}</div></div>
        <div className="card p-4"><div className="text-xs text-slate-400">Booking xác nhận</div><div className="mt-1 text-2xl font-black">{number(data.todayConfirmedBookings)}</div><div className="text-xs text-slate-500">{number(data.todayTickets)} vé</div></div>
        <div className="card p-4"><div className="text-xs text-slate-400">Occupancy hôm nay</div><div className="mt-1 text-2xl font-black">{data.todayOccupancyRate.toFixed(1)}%</div></div>
        <div className="card p-4"><div className="text-xs text-slate-400">Forecast 7 ngày</div><div className="mt-1 text-2xl font-black">{currency(data.forecastNext7d)}</div><div className="text-xs text-slate-500">V51 weighted weekday MA</div></div>
        <div className="card p-4"><div className="text-xs text-slate-400">Điểm critical</div><div className="mt-1 text-2xl font-black">{number(criticalCount)}</div><div className="text-xs text-slate-500">payment / SLA / maintenance</div></div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <div className="card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Cần chú ý</h2><p className="mt-1 text-sm text-slate-500">Chỉ hiển thị tín hiệu có count &gt; 0; không tạo cảnh báo giả.</p></div><span className="text-sm text-slate-400">{data.cinemaName}</span></div>
          <div className="mt-5 space-y-3" data-testid="command-center-attention-v53">
            {data.attention.length?data.attention.map(item=><a key={`${item.domain}-${item.title}`} href={item.href} className="block rounded-2xl border border-slate-800 bg-slate-950/40 p-4 transition hover:border-slate-600">
              <div className="flex items-start justify-between gap-4"><div><div className="text-xs font-bold uppercase tracking-wider text-slate-500">{item.severity} · {item.domain}</div><div className="mt-1 font-semibold">{item.title}</div></div><div className="rounded-xl bg-slate-800 px-3 py-1 text-lg font-black">{number(item.count)}</div></div>
            </a>):<div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 text-sm text-emerald-200">Không có tín hiệu cần xử lý trong các domain V53 đang tổng hợp.</div>}
          </div>
        </div>

        <div className="card p-5 sm:p-6">
          <h2 className="text-xl font-bold">Operational pulse</h2>
          <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
            {[
              ["Payment REVIEW",data.paymentReviewCount],["Support đang mở",data.openSupportCases],["Support quá SLA",data.overdueSupportCases],["Maintenance đang mở",data.openMaintenanceOrders],["Maintenance quá hạn",data.overdueMaintenanceOrders],["Sự cố staff",data.openStaffIncidents],["Tồn thấp",data.lowStockItems],["Hết hàng",data.soldOutItems]
            ].map(([label,value])=><div key={String(label)} className="rounded-xl border border-slate-800 p-3"><div className="text-xs text-slate-500">{label}</div><div className="mt-1 text-xl font-bold">{number(Number(value))}</div></div>)}
          </div>
          <div className="mt-5 text-xs leading-5 text-slate-500">V53 chỉ đọc dữ liệu nghiệp vụ hiện có từ Payment V47, Inventory V48, Staff Ops V43, Maintenance V44, Support V45 và Forecast V51. Không thêm bảng, không seed cảnh báo và không tự động thay đổi trạng thái nghiệp vụ.</div>
        </div>
      </section>
    </>}
  </main>;
}
