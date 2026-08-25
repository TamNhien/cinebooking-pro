"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { api, currency, dateTime } from "@/lib/api";
import { clearAuth, getAuth } from "@/lib/auth";
import type { OperationsControlCinemaV58, OperationsControlSnapshotV58, UserProfile } from "@/lib/types";

const number=(v:number)=>new Intl.NumberFormat("vi-VN").format(v||0);

function statusLabel(status:OperationsControlSnapshotV58["overallStatus"]){
  return status==="ACTION_REQUIRED"?"Cần xử lý":status==="WATCH"?"Theo dõi":"Ổn định";
}
function statusClass(status:string){
  return status==="ACTION_REQUIRED"?"border-rose-500/40 bg-rose-500/10 text-rose-200":status==="WATCH"?"border-amber-500/40 bg-amber-500/10 text-amber-200":"border-emerald-500/40 bg-emerald-500/10 text-emerald-200";
}
function severityClass(severity:string){
  return severity==="CRITICAL"?"text-rose-200 border-rose-500/30 bg-rose-500/5":severity==="HIGH"?"text-orange-200 border-orange-500/30 bg-orange-500/5":severity==="MEDIUM"?"text-amber-200 border-amber-500/30 bg-amber-500/5":"text-sky-200 border-sky-500/30 bg-sky-500/5";
}

export default function OperationsControlCenterV58(){
  const [me,setMe]=useState<UserProfile|null>(null);
  const [cinemas,setCinemas]=useState<OperationsControlCinemaV58[]>([]);
  const [cinemaId,setCinemaId]=useState("");
  const [data,setData]=useState<OperationsControlSnapshotV58|null>(null);
  const [loading,setLoading]=useState(true);
  const [message,setMessage]=useState("");
  const [autoRefresh,setAutoRefresh]=useState(true);
  const selectedRef=useRef("");

  async function load(selected=selectedRef.current,quiet=false){
    if(!quiet)setLoading(true);
    if(!quiet)setMessage("");
    try{
      const qs=selected?`?cinemaId=${encodeURIComponent(selected)}`:"";
      const snapshot=await api<OperationsControlSnapshotV58>(`/admin/operations-control/snapshot${qs}`);
      setData(snapshot);
    }catch(e){setMessage((e as Error).message)}finally{if(!quiet)setLoading(false)}
  }

  useEffect(()=>{
    const local=getAuth();
    if(!local){location.href="/login?returnTo=/admin/operations-control&reason=required";return;}
    (async()=>{
      try{
        const profile=await api<UserProfile>("/me");
        if(!["MANAGER","ADMIN"].includes(profile.role)){
          clearAuth();location.href="/login?returnTo=/admin/operations-control&reason=admin";return;
        }
        setMe(profile);
        const options=await api<OperationsControlCinemaV58[]>("/admin/operations-control/cinemas");
        setCinemas(options);
        const initial=profile.role==="MANAGER"&&options.length?options[0].cinemaId:"";
        selectedRef.current=initial;
        setCinemaId(initial);
        await load(initial);
      }catch(e){setMessage((e as Error).message);setLoading(false)}
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  useEffect(()=>{
    if(!autoRefresh||!data)return;
    const ms=Math.max(3,data.pollAfterSeconds||5)*1000;
    const id=setInterval(()=>load(selectedRef.current,true),ms);
    return ()=>clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[autoRefresh,data?.pollAfterSeconds]);

  const criticalCount=useMemo(()=>data?.alerts.filter(x=>x.severity==="CRITICAL").reduce((sum,x)=>sum+x.count,0)||0,[data]);

  return <main className="space-y-6" data-testid="operations-control-center-v58">
    <section className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-300">Operations Control Center · V58</div>
          <h1 className="mt-2 text-3xl font-black">Trung tâm kiểm soát vận hành tập trung</h1>
          <p className="mt-2 max-w-4xl text-sm text-slate-400">Dashboard tổng hợp trạng thái payment, booking, thiết bị, staff, support, inventory và incident. Snapshot tự làm mới gần realtime theo dữ liệu thật; V58 không tự đổi trạng thái nghiệp vụ.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {data&&<span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClass(data.overallStatus)}`}>{statusLabel(data.overallStatus)}</span>}
          <label className="flex items-center gap-2 rounded-xl border border-slate-800 px-3 py-2 text-xs text-slate-300"><input data-testid="operations-control-auto-refresh-v58" type="checkbox" checked={autoRefresh} onChange={e=>setAutoRefresh(e.target.checked)}/> Tự làm mới</label>
          <button className="btn btn-secondary" type="button" disabled={loading} onClick={()=>load()}>{loading?"Đang tải...":"↻ Làm mới"}</button>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        {me?.role==="ADMIN"?<label className="text-sm text-slate-300">Phạm vi
          <select data-testid="operations-control-cinema-filter-v58" className="input ml-2 !w-auto min-w-56" value={cinemaId} onChange={async e=>{const next=e.target.value;selectedRef.current=next;setCinemaId(next);await load(next)}}>
            <option value="">Toàn hệ thống</option>
            {cinemas.map(c=><option key={c.cinemaId} value={c.cinemaId}>{c.cinemaName}</option>)}
          </select>
        </label>:data&&<div className="rounded-xl border border-slate-700 px-3 py-2 text-sm">Rạp: <b>{data.cinemaName}</b></div>}
        {data&&<span data-testid="operations-control-live-v58" className="text-xs text-slate-500">● Live snapshot · {data.pollAfterSeconds}s · {dateTime(data.generatedAt)}</span>}
      </div>
      {message&&<div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{message}</div>}
    </section>

    {data&&<>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" data-testid="operations-control-summary-v58">
        <div className="card p-4"><div className="text-xs text-slate-400">Doanh thu hôm nay</div><div className="mt-1 text-2xl font-black">{currency(data.todayRevenue)}</div></div>
        <div className="card p-4"><div className="text-xs text-slate-400">Booking / vé</div><div className="mt-1 text-2xl font-black">{number(data.todayConfirmedBookings)}</div><div className="text-xs text-slate-500">{number(data.todayTickets)} vé confirmed</div></div>
        <div className="card p-4"><div className="text-xs text-slate-400">Occupancy hôm nay</div><div className="mt-1 text-2xl font-black">{data.todayOccupancyRate.toFixed(1)}%</div></div>
        <div className="card p-4"><div className="text-xs text-slate-400">Nhân viên đang làm</div><div className="mt-1 text-2xl font-black">{number(data.staffWorkingNow)}</div><div className="text-xs text-slate-500">{number(data.staffScheduledToday)} ca hôm nay</div></div>
        <div className="card p-4"><div className="text-xs text-slate-400">Critical signal</div><div className="mt-1 text-2xl font-black">{number(criticalCount)}</div><div className="text-xs text-slate-500">từ 7 domain vận hành</div></div>
      </section>

      <section className="card p-5 sm:p-6" data-testid="operations-control-domains-v58">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-bold">Operational pulse</h2><p className="mt-1 text-sm text-slate-500">7 domain trên cùng một control surface.</p></div><span className="text-sm text-slate-400">{data.cinemaName}</span></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {data.domains.map(domain=><a key={domain.domain} href={domain.href} className={`rounded-2xl border p-4 transition hover:border-slate-500 ${statusClass(domain.status)}`}>
            <div className="flex items-center justify-between gap-2"><div className="text-xs font-black tracking-wider">{domain.domain}</div><span className="text-xs">{domain.status==="ACTION_REQUIRED"?"ACTION":domain.status}</span></div>
            <div className="mt-2 text-lg font-bold">{domain.label}</div>
            <div className="mt-3 flex gap-4 text-sm"><div><div className="text-xs opacity-70">Primary</div><b>{number(domain.primaryCount)}</b></div><div><div className="text-xs opacity-70">Warning</div><b>{number(domain.warningCount)}</b></div></div>
          </a>)}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <div className="card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Cảnh báo tập trung</h2><p className="mt-1 text-sm text-slate-500">Chỉ tạo alert khi count thực tế &gt; 0; không seed cảnh báo giả.</p></div><span className="text-xs text-slate-500">severity sorted</span></div>
          <div className="mt-5 space-y-3" data-testid="operations-control-alerts-v58">
            {data.alerts.length?data.alerts.map((item,index)=><a key={`${item.domain}-${item.title}-${index}`} href={item.href} className={`block rounded-2xl border p-4 ${severityClass(item.severity)}`}>
              <div className="flex items-start justify-between gap-4"><div><div className="text-xs font-black uppercase tracking-wider">{item.severity} · {item.domain}</div><div className="mt-1 font-semibold text-slate-100">{item.title}</div><div className="mt-1 text-xs text-slate-400">{item.detail}</div></div><div className="rounded-xl bg-slate-950/50 px-3 py-1 text-lg font-black">{number(item.count)}</div></div>
            </a>):<div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 text-sm text-emerald-200">Không có tín hiệu cần cảnh báo ở snapshot hiện tại.</div>}
          </div>
        </div>

        <div className="card p-5 sm:p-6" data-testid="operations-control-detail-v58">
          <h2 className="text-xl font-bold">Control details</h2>
          <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
            {[
              ["Payment REVIEW",data.paymentReviewCount],["FAILED / 60 phút",data.paymentFailedLastHour],
              ["Booking PENDING",data.pendingBookings],["PENDING quá hạn",data.pendingBookingsPastDue],["Sắp hết hạn / 5 phút",data.pendingBookingsExpiringSoon],
              ["Thiết bị OUT",data.equipmentOutOfService],["Thiết bị DEGRADED",data.equipmentDegraded],["Đang maintenance",data.equipmentInMaintenance],["Service quá hạn",data.equipmentServiceOverdue],
              ["Staff đang làm",data.staffWorkingNow],["Ca hôm nay",data.staffScheduledToday],["Ca đang thiếu check-in",data.uncoveredActiveShifts],
              ["Support mở",data.openSupportCases],["Support quá SLA",data.overdueSupportCases],["Tồn thấp",data.lowStockItems],["Hết hàng",data.soldOutItems],["Incident mở",data.openIncidents],["Incident CRITICAL",data.criticalIncidents]
            ].map(([label,value])=><div key={String(label)} className="rounded-xl border border-slate-800 p-3"><div className="text-xs text-slate-500">{label}</div><div className="mt-1 text-xl font-bold">{number(Number(value))}</div></div>)}
          </div>
          <div className="mt-5 text-xs leading-5 text-slate-500">V58 tổng hợp dữ liệu đang có từ Payment, Booking, Maintenance/Equipment, Staff Operations, Customer Support và Concession Inventory. Cơ chế live là server snapshot polling {data.pollAfterSeconds}s; không gọi đó là websocket nếu backend không phát event cho toàn bộ domain.</div>
        </div>
      </section>
    </>}
  </main>;
}
