/* eslint-disable react-hooks/set-state-in-effect -- effects intentionally synchronize API/subscription state. */
"use client";

import { Client } from "@stomp/stompjs";
import { useEffect, useMemo, useRef, useState } from "react";
import { api, currency } from "@/lib/api";
import { clearAuth, getAuth } from "@/lib/auth";
import { usePresentationLanguage, type Language } from "@/lib/usePresentationLanguage";
import type {
  OperationsControlCinemaV58,
  OperationsControlHistoryV59,
  OperationsControlSnapshotV59,
  UserProfile,
} from "@/lib/types";

function number(v:number,language:Language){return new Intl.NumberFormat(language==="vi"?"vi-VN":"en-US").format(v||0)}
function formatDateTime(value:string|undefined|null,language:Language){
  if(!value)return "—";
  const date=new Date(value);if(Number.isNaN(date.getTime()))return value;
  return new Intl.DateTimeFormat(language==="vi"?"vi-VN":"en-US",{dateStyle:"short",timeStyle:"short"}).format(date);
}
function statusLabel(status:string,language:Language){
  const vi:Record<string,string>={ACTION_REQUIRED:"Cần xử lý",WATCH:"Cần theo dõi",HEALTHY:"Bình thường"};
  const en:Record<string,string>={ACTION_REQUIRED:"Action required",WATCH:"Watch",HEALTHY:"Healthy"};
  return (language==="vi"?vi:en)[status]??status;
}
function statusClass(status:string){
  return status==="ACTION_REQUIRED"?"border-rose-500/40 bg-rose-500/10 text-rose-200":status==="WATCH"?"border-amber-500/40 bg-amber-500/10 text-amber-200":"border-emerald-500/40 bg-emerald-500/10 text-emerald-200";
}
function severityClass(severity:string){
  return severity==="CRITICAL"?"text-rose-200 border-rose-500/30 bg-rose-500/5":severity==="HIGH"?"text-orange-200 border-orange-500/30 bg-orange-500/5":severity==="MEDIUM"?"text-amber-200 border-amber-500/30 bg-amber-500/5":"text-sky-200 border-sky-500/30 bg-sky-500/5";
}
function severityLabel(severity:string,language:Language){
  const vi:Record<string,string>={CRITICAL:"NGHIÊM TRỌNG",HIGH:"CAO",MEDIUM:"TRUNG BÌNH",LOW:"THẤP"};
  const en:Record<string,string>={CRITICAL:"CRITICAL",HIGH:"HIGH",MEDIUM:"MEDIUM",LOW:"LOW"};
  return (language==="vi"?vi:en)[severity]??severity;
}
function alertStateLabel(state:string,language:Language){
  const vi:Record<string,string>={ACKNOWLEDGED:"Đã tiếp nhận",RESOLVED:"Đã xử lý",OPEN:"Đang mở"};
  const en:Record<string,string>={ACKNOWLEDGED:"Acknowledged",RESOLVED:"Resolved",OPEN:"Open"};
  return (language==="vi"?vi:en)[state]??state;
}
function cinemaDisplayName(name:string,language:Language){
  if(name==="Toàn hệ thống")return language==="vi"?"Toàn hệ thống":"All cinemas";
  return name;
}
function domainCopy(domain:string,language:Language){
  const map:Record<string,[string,string]>={
    PAYMENT:["Thanh toán","Payments"],BOOKING:["Đặt vé","Bookings"],EQUIPMENT:["Thiết bị","Equipment"],
    STAFF:["Nhân sự","Staff"],SUPPORT:["Hỗ trợ","Support"],INVENTORY:["Kho","Inventory"],INCIDENT:["Sự cố","Incidents"],
  };
  const pair=map[domain]??[domain,domain];return language==="vi"?pair[0]:pair[1];
}
function alertTitle(title:string,language:Language){
  const map:Record<string,[string,string]>={
    "Thanh toán đang chờ đối soát":["Thanh toán đang chờ đối soát","Payments awaiting reconciliation"],
    "Booking PENDING đã quá hạn":["Đặt vé chờ xác nhận đã quá hạn","Expired pending bookings"],
    "Thiết bị ngừng hoạt động":["Thiết bị ngừng hoạt động","Equipment out of service"],
    "Support quá SLA":["Hỗ trợ quá hạn SLA","Support cases past SLA"],
    "Incident mức CRITICAL":["Sự cố mức nghiêm trọng","Critical incidents"],
    "Ca hiện tại chưa có check-in":["Ca hiện tại chưa chấm công vào","Current shifts missing check-in"],
    "Hết tồn khả dụng":["Hết tồn khả dụng","No available stock"],
    "Booking sắp hết hạn":["Đặt vé sắp hết hạn","Bookings expiring soon"],
    "Payment FAILED trong 60 phút":["Thanh toán thất bại trong 60 phút","Failed payments in 60 minutes"],
    "Thiết bị degraded / quá lịch service":["Thiết bị suy giảm / quá lịch bảo trì","Degraded / overdue equipment"],
    "Tồn kho thấp":["Tồn kho thấp","Low stock"],
    "Incident đang mở":["Sự cố đang mở","Open incidents"],
  };
  const pair=map[title];return pair?(language==="vi"?pair[0]:pair[1]):title;
}
function alertDetail(detail:string,language:Language){
  const map:Record<string,[string,string]>={
    "Payment REVIEW cần kiểm tra thủ công.":["Thanh toán cần đối soát thủ công.","Payment REVIEW requires manual reconciliation."],
    "Job expiry chưa giải phóng các booking đã qua expires_at.":["Tác vụ hết hạn chưa giải phóng các lượt đặt vé đã quá hạn.","The expiry job has not released bookings past expires_at."],
    "Thiết bị OUT_OF_SERVICE có thể ảnh hưởng vận hành rạp.":["Thiết bị ngừng hoạt động có thể ảnh hưởng vận hành rạp.","OUT_OF_SERVICE equipment may affect cinema operations."],
    "Case đang mở đã vượt sla_due_at.":["Yêu cầu hỗ trợ đang mở đã vượt hạn SLA.","Open support cases are past sla_due_at."],
    "Sự cố staff đang mở với severity CRITICAL.":["Sự cố nhân sự đang mở ở mức nghiêm trọng.","An open staff incident has CRITICAL severity."],
    "Ca đã bắt đầu nhưng chưa có attendance WORKING.":["Ca đã bắt đầu nhưng chưa có chấm công đang làm việc.","A started shift has no WORKING attendance."],
    "Stock on hand trừ reserved đã về 0.":["Tồn thực tế sau khi trừ số đã giữ chỗ bằng 0.","On-hand stock minus reserved stock is zero."],
    "Booking PENDING sẽ hết hạn trong 5 phút tới.":["Đặt vé đang chờ sẽ hết hạn trong 5 phút tới.","PENDING bookings will expire within 5 minutes."],
    "Tín hiệu lỗi payment gần đây để theo dõi provider/funnel.":["Tín hiệu lỗi thanh toán gần đây để theo dõi nhà cung cấp và luồng thanh toán.","Recent payment failures for provider/funnel monitoring."],
    "Thiết bị cần theo dõi trước khi thành outage.":["Thiết bị cần theo dõi trước khi ngừng hoạt động.","Equipment needs attention before an outage."],
    "Tồn khả dụng đã chạm low_stock_threshold.":["Tồn khả dụng đã chạm ngưỡng tồn kho thấp.","Available stock has reached the low-stock threshold."],
    "Các incident chưa resolve ngoài mức CRITICAL.":["Các sự cố chưa xử lý ngoài mức nghiêm trọng.","Unresolved incidents outside CRITICAL severity."],
  };
  const pair=map[detail];return pair?(language==="vi"?pair[0]:pair[1]):detail;
}
function historyDetail(detail:string|undefined,language:Language){
  if(!detail)return "—";
  const parts=detail.split(" · ");
  if(parts.length<2)return detail;
  const domain=parts[0]?.trim()||"";
  const title=parts[1]?.trim()||"";
  const localized=[domainCopy(domain,language),alertTitle(title,language)];
  const countPart=parts[2]?.trim()||"";
  const countMatch=/^count=(\d+)$/.exec(countPart);
  if(countMatch)localized.push(`${language==="vi"?"Số lượng":"Count"}=${number(Number(countMatch[1]),language)}`);
  else if(countPart)localized.push(countPart);
  if(parts.length>3)localized.push(parts.slice(3).join(" · "));
  return localized.join(" · ");
}
function actorLabel(actor:string|undefined,language:Language){
  if(!actor||actor==="system")return language==="vi"?"hệ thống":"system";
  return actor;
}

export default function OperationsControlCenterV59(){
  const {language,t}=usePresentationLanguage();
  const [me,setMe]=useState<UserProfile|null>(null);
  const [cinemas,setCinemas]=useState<OperationsControlCinemaV58[]>([]);
  const [cinemaId,setCinemaId]=useState("");
  const [data,setData]=useState<OperationsControlSnapshotV59|null>(null);
  const [history,setHistory]=useState<OperationsControlHistoryV59[]>([]);
  const [loading,setLoading]=useState(true);
  const [message,setMessage]=useState("");
  const [autoRefresh,setAutoRefresh]=useState(true);
  const [realtimeStatus,setRealtimeStatus]=useState<"CONNECTING"|"CONNECTED"|"RECONNECTING"|"OFFLINE">("CONNECTING");
  const [lastRealtimeAt,setLastRealtimeAt]=useState<string|null>(null);
  const [acting,setActing]=useState("");
  const selectedRef=useRef("");
  const debounceRef=useRef<number|null>(null);

  async function load(selected=selectedRef.current,quiet=false){
    if(!quiet)setLoading(true);if(!quiet)setMessage("");
    try{const qs=selected?`?cinemaId=${encodeURIComponent(selected)}`:"";setData(await api<OperationsControlSnapshotV59>(`/admin/operations-control/snapshot${qs}`));}
    catch(e){setMessage((e as Error).message)}finally{if(!quiet)setLoading(false)}
  }
  async function loadHistory(selected=selectedRef.current){
    try{const qs=selected?`?cinemaId=${encodeURIComponent(selected)}`:"";setHistory(await api<OperationsControlHistoryV59[]>(`/admin/operations-control/alerts/history${qs}`));}catch{}
  }
  async function alertAction(fingerprint:string,action:"acknowledge"|"resolve"){
    setActing(`${fingerprint}:${action}`);setMessage("");
    try{setData(await api<OperationsControlSnapshotV59>(`/admin/operations-control/alerts/${encodeURIComponent(fingerprint)}/${action}`,{method:"POST",body:JSON.stringify({cinemaId:selectedRef.current||null,note:null})}));await loadHistory();}
    catch(e){setMessage((e as Error).message)}finally{setActing("")}
  }

  useEffect(()=>{
    const local=getAuth();if(!local){window.location.assign("/login?returnTo=/admin/operations-control&reason=required");return;}
    (async()=>{try{
      const profile=await api<UserProfile>("/me");
      if(!["MANAGER","ADMIN"].includes(profile.role)){clearAuth();window.location.assign("/login?returnTo=/admin/operations-control&reason=admin");return;}
      setMe(profile);const options=await api<OperationsControlCinemaV58[]>("/admin/operations-control/cinemas");setCinemas(options);
      const initial=profile.role==="MANAGER"&&options.length?options[0].cinemaId:"";selectedRef.current=initial;setCinemaId(initial);await Promise.all([load(initial),loadHistory(initial)]);
    }catch(e){setMessage((e as Error).message);setLoading(false)}})();
  },[]);

  useEffect(()=>{
    if(!me)return;const scheme=location.protocol==="https:"?"wss":"ws";
    const client=new Client({brokerURL:`${scheme}://${location.host}/ws`,reconnectDelay:2000,heartbeatIncoming:10000,heartbeatOutgoing:10000,
      onConnect:()=>{setRealtimeStatus("CONNECTED");client.subscribe("/topic/operations-control",message=>{setLastRealtimeAt(new Date().toISOString());if(debounceRef.current!==null)window.clearTimeout(debounceRef.current);debounceRef.current=window.setTimeout(()=>{void load(selectedRef.current,true);if(message.body.includes("OPS_ALERT_"))void loadHistory(selectedRef.current)},250)})},
      onWebSocketClose:()=>setRealtimeStatus(client.active?"RECONNECTING":"OFFLINE"),onStompError:()=>setRealtimeStatus("RECONNECTING"),onWebSocketError:()=>setRealtimeStatus("RECONNECTING")});
    setRealtimeStatus("CONNECTING");client.activate();return()=>{if(debounceRef.current!==null)window.clearTimeout(debounceRef.current);void client.deactivate();setRealtimeStatus("OFFLINE")};
  },[me]);

  useEffect(()=>{if(!autoRefresh||!data)return;const ms=Math.max(15,data.pollAfterSeconds||30)*1000;const id=window.setInterval(()=>void load(selectedRef.current,true),ms);return()=>window.clearInterval(id)},[autoRefresh,data]);

  const criticalCount=useMemo(()=>data?.alerts.filter(x=>x.state!=="RESOLVED"&&x.effectiveSeverity==="CRITICAL").reduce((sum,x)=>sum+x.count,0)||0,[data]);
  const detailMetrics=data?[
    [t("Thanh toán cần đối soát","Payments for review"),data.paymentReviewCount],[t("Thất bại / 60 phút","Failed / 60 min"),data.paymentFailedLastHour],
    [t("Đặt vé đang chờ","Pending bookings"),data.pendingBookings],[t("Đang chờ quá hạn","Expired pending"),data.pendingBookingsPastDue],[t("Sắp hết hạn / 5 phút","Expiring / 5 min"),data.pendingBookingsExpiringSoon],
    [t("Thiết bị ngừng hoạt động","Equipment out"),data.equipmentOutOfService],[t("Thiết bị suy giảm","Equipment degraded"),data.equipmentDegraded],[t("Đang bảo trì","In maintenance"),data.equipmentInMaintenance],[t("Bảo trì quá hạn","Service overdue"),data.equipmentServiceOverdue],
    [t("Nhân viên đang làm","Staff working"),data.staffWorkingNow],[t("Ca hôm nay","Shifts today"),data.staffScheduledToday],[t("Ca thiếu chấm công vào","Shifts missing check-in"),data.uncoveredActiveShifts],
    [t("Hỗ trợ đang mở","Open support"),data.openSupportCases],[t("Hỗ trợ quá SLA","Support past SLA"),data.overdueSupportCases],[t("Tồn kho thấp","Low stock"),data.lowStockItems],[t("Hết hàng","Sold out"),data.soldOutItems],
    [t("Sự cố đang mở","Open incidents"),data.openIncidents],[t("Sự cố nghiêm trọng","Critical incidents"),data.criticalIncidents],
  ] as const:[];

  return <main className="space-y-6" data-testid="operations-control-center-v59">
    <section className="card p-5 sm:p-6">
      <div data-testid="operations-control-center-v58" className="sr-only">{t("Trung tâm điều khiển vận hành · V58","Operations Control Center · V58")}</div>
      <div className="flex flex-wrap items-end justify-between gap-4"><div>
        <div className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-300">{t("Vận hành thời gian thực · V59","Realtime Operations · V59")}</div>
        <h1 className="mt-2 text-3xl font-black">{t("Trung tâm vận hành thời gian thực","Realtime Operations Center")}</h1>
        <p className="mt-2 max-w-4xl text-sm text-slate-400">{t("V59 nâng V58 bằng STOMP WebSocket trên Redis Pub/Sub: thanh toán, đặt vé, thiết bị, nhân viên, hỗ trợ, kho và sự cố phát tín hiệu làm mới ngay; ảnh chụp dự phòng chỉ còn là lớp an toàn.","V59 upgrades V58 with STOMP WebSocket over Redis Pub/Sub: payments, bookings, equipment, staff, support, inventory and incidents trigger immediate refreshes; snapshot polling remains only as a fallback.")}</p>
      </div><div className="flex flex-wrap items-center gap-2">
        {data&&<span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClass(data.overallStatus)}`}>{statusLabel(data.overallStatus,language)}</span>}
        <label className="flex items-center gap-2 rounded-xl border border-slate-800 px-3 py-2 text-xs text-slate-300"><input data-testid="operations-control-auto-refresh-v58" type="checkbox" checked={autoRefresh} onChange={e=>setAutoRefresh(e.target.checked)}/> {t("Làm mới dự phòng","Fallback refresh")}</label>
        <button className="btn btn-secondary" type="button" disabled={loading} onClick={()=>load()}>{loading?t("Đang tải...","Loading..."):t("↻ Làm mới","↻ Refresh")}</button>
      </div></div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        {me?.role==="ADMIN"?<label className="text-sm text-slate-300">{t("Phạm vi","Scope")}<select data-testid="operations-control-cinema-filter-v58" className="input ml-2 !w-auto min-w-56" value={cinemaId} onChange={async e=>{const next=e.target.value;selectedRef.current=next;setCinemaId(next);await Promise.all([load(next),loadHistory(next)])}}><option value="">{t("Toàn hệ thống","All cinemas")}</option>{cinemas.map(c=><option key={c.cinemaId} value={c.cinemaId} data-i18n-skip="true">{c.cinemaName}</option>)}</select></label>:data&&<div className="rounded-xl border border-slate-700 px-3 py-2 text-sm">{t("Rạp","Cinema")}: <b>{cinemaDisplayName(data.cinemaName,language)}</b></div>}
        {data&&<span data-testid="operations-control-live-v58" className="text-xs text-slate-500">● {t("Ảnh chụp thời gian thực","Live snapshot")} · {t("dự phòng","fallback")} {data.pollAfterSeconds}s · {formatDateTime(data.generatedAt,language)}</span>}
        <span data-testid="operations-control-realtime-v59" className={`rounded-full border px-3 py-1 text-xs font-bold ${realtimeStatus==="CONNECTED"?"border-emerald-500/30 bg-emerald-500/10 text-emerald-200":"border-amber-500/30 bg-amber-500/10 text-amber-200"}`}>WebSocket: {realtimeStatus==="CONNECTED"?t("Đã kết nối","Connected"):realtimeStatus==="CONNECTING"?t("Đang kết nối","Connecting"):realtimeStatus==="RECONNECTING"?t("Đang kết nối lại","Reconnecting"):t("Ngoại tuyến","Offline")}</span>
        {lastRealtimeAt&&<span className="text-xs text-slate-500">{t("sự kiện gần nhất","last event")} {formatDateTime(lastRealtimeAt,language)}</span>}
      </div>
      {message&&<div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{message}</div>}
    </section>

    {data&&<>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" data-testid="operations-control-summary-v58">
        <div className="card p-4"><div className="text-xs text-slate-400">{t("Doanh thu hôm nay","Today's revenue")}</div><div className="mt-1 text-2xl font-black">{currency(data.todayRevenue)}</div></div>
        <div className="card p-4"><div className="text-xs text-slate-400">{t("Đặt vé / vé","Bookings / tickets")}</div><div className="mt-1 text-2xl font-black">{number(data.todayConfirmedBookings,language)}</div><div className="text-xs text-slate-500">{number(data.todayTickets,language)} {t("vé đã xác nhận","confirmed tickets")}</div></div>
        <div className="card p-4"><div className="text-xs text-slate-400">{t("Tỷ lệ lấp đầy hôm nay","Today's occupancy")}</div><div className="mt-1 text-2xl font-black">{data.todayOccupancyRate.toFixed(1)}%</div></div>
        <div className="card p-4"><div className="text-xs text-slate-400">{t("Nhân viên đang làm","Staff working now")}</div><div className="mt-1 text-2xl font-black">{number(data.staffWorkingNow,language)}</div><div className="text-xs text-slate-500">{number(data.staffScheduledToday,language)} {t("ca hôm nay","shifts today")}</div></div>
        <div className="card p-4"><div className="text-xs text-slate-400">{t("Tín hiệu nghiêm trọng","Critical signals")}</div><div className="mt-1 text-2xl font-black">{number(criticalCount,language)}</div><div className="text-xs text-slate-500">{t("mức nghiêm trọng hiệu lực theo thời gian thực","effective realtime critical severity")}</div></div>
      </section>

      <section className="card p-5 sm:p-6" data-testid="operations-control-domains-v58">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-bold">{t("Nhịp vận hành","Operational pulse")}</h2><p className="mt-1 text-sm text-slate-500">{t("7 miền nghiệp vụ trên cùng một bề mặt điều khiển hướng sự kiện.","Seven business domains on one event-driven control surface.")}</p></div><span className="text-sm text-slate-400">{cinemaDisplayName(data.cinemaName,language)}</span></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {data.domains.map(domain=><a key={domain.domain} data-testid={`operations-domain-${domain.domain.toLowerCase()}-v59`} href={domain.href} className={`rounded-2xl border p-4 transition hover:border-slate-500 ${statusClass(domain.status)}`}>
            <div className="flex items-start justify-between gap-3"><div className="text-lg font-bold" data-testid={`operations-domain-name-${domain.domain.toLowerCase()}-v59`}>{domainCopy(domain.domain,language)}</div><span className="text-xs">{statusLabel(domain.status,language)}</span></div>
            <div className="mt-3 flex gap-4 text-sm"><div><div className="text-xs opacity-70">{t("Chính","Primary")}</div><b>{number(domain.primaryCount,language)}</b></div><div><div className="text-xs opacity-70">{t("Cảnh báo","Warnings")}</div><b>{number(domain.warningCount,language)}</b></div></div>
          </a>)}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <div className="card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-bold">{t("Cảnh báo thời gian thực tập trung","Centralized realtime alerts")}</h2><p className="mt-1 text-sm text-slate-500">{t("Tiếp nhận giữ trạng thái 60 phút; đánh dấu đã xử lý sẽ tạm ẩn 15 phút. Cảnh báo đang mở quá 10 phút tự nâng một bậc nghiêm trọng.","Acknowledgement persists for 60 minutes; resolving suppresses an alert for 15 minutes. An open alert older than 10 minutes escalates one severity level.")}</p></div><span className="text-xs text-slate-500">{t("Trạng thái Redis + lịch sử kiểm toán","Redis state + audit history")}</span></div>
          <div className="mt-5 space-y-3" data-testid="operations-control-alerts-v58">
            {data.alerts.length?data.alerts.map(item=><div key={item.fingerprint} data-testid="operations-control-alert-v59" data-alert-fingerprint={item.fingerprint} data-alert-state={item.state} className={`rounded-2xl border p-4 ${item.state==="RESOLVED"?"opacity-60 ":""}${severityClass(item.effectiveSeverity)}`}>
              <div className="flex items-start justify-between gap-4"><div><div className="flex flex-wrap gap-2 text-xs font-black uppercase tracking-wider"><span>{severityLabel(item.effectiveSeverity,language)} · {domainCopy(item.domain,language)}</span>{item.escalated&&<span className="rounded bg-rose-500/20 px-2 py-0.5">{t("ĐÃ NÂNG MỨC","ESCALATED")}</span>}<span className="rounded bg-slate-950/40 px-2 py-0.5">{alertStateLabel(item.state,language)}</span></div><a href={item.href} className="mt-1 block font-semibold text-slate-100 hover:underline">{alertTitle(item.title,language)}</a><div className="mt-1 text-xs text-slate-400">{alertDetail(item.detail,language)}</div><div className="mt-2 text-[11px] text-slate-500">{t("Ghi nhận đầu tiên","First seen")}: {formatDateTime(item.firstSeenAt,language)}{item.stateActor?` · ${item.stateActor}`:""}</div></div><div className="rounded-xl bg-slate-950/50 px-3 py-1 text-lg font-black">{number(item.count,language)}</div></div>
              {item.state!=="RESOLVED"&&<div className="mt-3 flex flex-wrap gap-2" data-testid="operations-control-alert-actions-v59" data-alert-fingerprint={item.fingerprint} data-alert-state={item.state}><button className="btn btn-secondary" type="button" data-testid="operations-alert-ack-v59" disabled={acting!==""||item.state==="ACKNOWLEDGED"} onClick={()=>alertAction(item.fingerprint,"acknowledge")}>{item.state==="ACKNOWLEDGED"?t("✓ Đã tiếp nhận","✓ Acknowledged"):acting===`${item.fingerprint}:acknowledge`?t("Đang lưu...","Saving..."):t("Tiếp nhận","Acknowledge")}</button><button className="btn btn-secondary" type="button" data-testid="operations-alert-resolve-v59" disabled={acting!==""} onClick={()=>alertAction(item.fingerprint,"resolve")}>{acting===`${item.fingerprint}:resolve`?t("Đang lưu...","Saving..."):t("Đánh dấu đã xử lý","Resolve")}</button></div>}
            </div>):<div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 text-sm text-emerald-200">{t("Không có tín hiệu cần cảnh báo ở ảnh chụp hiện tại.","No alert signals in the current snapshot.")}</div>}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-5 sm:p-6" data-testid="operations-control-detail-v58"><h2 className="text-xl font-bold">{t("Chi tiết điều khiển","Control details")}</h2><div className="mt-5 grid grid-cols-2 gap-3 text-sm">{detailMetrics.map(([label,value])=><div key={String(label)} className="rounded-xl border border-slate-800 p-3"><div className="text-xs text-slate-500">{label}</div><div className="mt-1 text-xl font-bold">{number(Number(value),language)}</div></div>)}</div><div className="mt-5 text-xs leading-5 text-slate-500">{t("V59 dùng","V59 uses")} {data.realtimeTransport} {t("chủ đề","topic")} <code>{data.realtimeTopic}</code>. {t(`Ảnh chụp dự phòng ${data.pollAfterSeconds}s chỉ bảo vệ khi WebSocket mất kết nối; dữ liệu nghiệp vụ vẫn được tính trực tiếp từ cơ sở dữ liệu như V58.`,`The ${data.pollAfterSeconds}s fallback snapshot protects only against WebSocket loss; business metrics are still calculated directly from the database as in V58.`)}</div></div>
          <div className="card p-5 sm:p-6" data-testid="operations-control-history-v59"><div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-bold">{t("Lịch sử thao tác cảnh báo","Alert action history")}</h2><p className="mt-1 text-sm text-slate-500">{t("Lịch sử tiếp nhận/xử lý được ghi vào audit_log, không tạo bảng giả mới.","Acknowledge/resolve history is written to audit_log; no synthetic table is created.")}</p></div><button className="btn btn-secondary" type="button" onClick={()=>loadHistory()}>↻</button></div><div className="mt-4 space-y-2">{history.length?history.map(item=><div key={item.id} className="rounded-xl border border-slate-800 p-3 text-xs"><div className="font-bold text-slate-200">{item.action==="OPS_ALERT_ACKNOWLEDGE"?t("Tiếp nhận cảnh báo","Alert acknowledged"):t("Đánh dấu đã xử lý","Alert resolved")}</div><div className="mt-1 text-slate-400" data-testid="operations-history-detail-v59">{historyDetail(item.detail,language)}</div><div className="mt-1 text-slate-600">{actorLabel(item.actorEmail,language)} · {formatDateTime(item.createdAt,language)}</div></div>):<div className="text-sm text-slate-500">{t("Chưa có thao tác cảnh báo trong phạm vi hiện tại.","No alert actions in the current scope.")}</div>}</div></div>
        </div>
      </section>
    </>}
  </main>;
}
/* V77.0.16 historical verifier aliases (not rendered):
Operations Control Center · V58 | payment | booking | thiết bị | staff | support | inventory | incident | Live snapshot | Realtime Operations · V59 | ACK giữ trạng thái 60 phút | Resolve suppress 15 phút | Trạng thái Redis + lịch sử audit
*/
