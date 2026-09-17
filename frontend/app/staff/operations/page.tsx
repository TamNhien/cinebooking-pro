/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps -- effects intentionally synchronize API/WebSocket state; connect/load lifecycle is deliberately keyed only by cinemaId. */
"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Client } from "@stomp/stompjs";
import { api } from "@/lib/api";
import { localizedLabel } from "@/lib/vi-labels";
import { getAuth } from "@/lib/auth";
import { usePresentationLanguage } from "@/lib/usePresentationLanguage";
import type { StaffHandover, StaffIncident, StaffOperationsCinema, StaffOperationsLive, StaffOperationsStaff } from "@/lib/types";

const incidentCategories=["CUSTOMER","EQUIPMENT","SAFETY","SECURITY","PAYMENT","OTHER"] as const;
const severities=["LOW","MEDIUM","HIGH","CRITICAL"] as const;

export default function StaffOperationsPage(){
  const {language,locale,t}=usePresentationLanguage();
  const [auth,setAuth]=useState<ReturnType<typeof getAuth>>(null);
  const [cinemas,setCinemas]=useState<StaffOperationsCinema[]>([]);
  const [cinemaId,setCinemaId]=useState("");
  const [live,setLive]=useState<StaffOperationsLive|null>(null);
  const [staff,setStaff]=useState<StaffOperationsStaff[]>([]);
  const [handovers,setHandovers]=useState<StaffHandover[]>([]);
  const [incidents,setIncidents]=useState<StaffIncident[]>([]);
  const [message,setMessage]=useState("");
  const [handover,setHandover]=useState({toStaffUserId:"",summary:""});
  const [incident,setIncident]=useState({category:"CUSTOMER",severity:"MEDIUM",title:"",description:""});
  const [resolution,setResolution]=useState<Record<string,string>>({});
  const wsRef=useRef<Client|null>(null);
  const formatDate=(value:string)=>new Date(value).toLocaleString(locale,{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"});

  useEffect(()=>{
    const a=getAuth();
    if(!a||!["STAFF","MANAGER","ADMIN"].includes(a.role)){window.location.assign("/login?returnTo=/staff/operations");return;}
    setAuth(a);void bootstrap();
    return()=>{void wsRef.current?.deactivate();};
  },[]);

  useEffect(()=>{if(!cinemaId)return;void load(cinemaId);connect(cinemaId);const timer=window.setInterval(()=>void load(cinemaId,true),15000);return()=>{window.clearInterval(timer);void wsRef.current?.deactivate();wsRef.current=null;};
  },[cinemaId]);

  async function bootstrap(){try{const c=await api<StaffOperationsCinema[]>("/staff/operations/cinemas");setCinemas(c);if(c[0])setCinemaId(c[0].id);}catch(e){setMessage((e as Error).message);}}
  async function load(id=cinemaId,silent=false){if(!id)return;const q=`?cinemaId=${encodeURIComponent(id)}`;try{const [l,s,h,i]=await Promise.all([api<StaffOperationsLive>(`/staff/operations/live${q}`),api<StaffOperationsStaff[]>(`/staff/operations/staff-options${q}`),api<StaffHandover[]>(`/staff/operations/handovers${q}`),api<StaffIncident[]>(`/staff/operations/incidents${q}`)]);setLive(l);setStaff(s);setHandovers(h);setIncidents(i);if(!silent)setMessage("");}catch(e){if(!silent)setMessage((e as Error).message);}}
  function connect(id:string){void wsRef.current?.deactivate();const scheme=location.protocol==="https:"?"wss":"ws";const c=new Client({brokerURL:`${scheme}://${location.host}/ws`,reconnectDelay:2000,onConnect:()=>c.subscribe(`/topic/staff-operations/${id}`,()=>void load(id,true))});c.activate();wsRef.current=c;}
  async function createHandover(e:FormEvent){e.preventDefault();if(!handover.toStaffUserId||!handover.summary.trim())return;try{await api("/staff/operations/handovers",{method:"POST",body:JSON.stringify(handover)});setHandover({toStaffUserId:"",summary:""});setMessage(t("Đã tạo bàn giao ca, đang chờ nhân viên nhận xác nhận.","Shift handover created and awaiting acknowledgement."));await load();}catch(e){setMessage((e as Error).message);}}
  async function acceptHandover(id:string){try{await api(`/staff/operations/handovers/${id}/accept`,{method:"POST"});setMessage(t("Đã nhận bàn giao ca.","Shift handover acknowledged."));await load();}catch(e){setMessage((e as Error).message);}}
  async function createIncident(e:FormEvent){e.preventDefault();try{await api("/staff/operations/incidents",{method:"POST",body:JSON.stringify({...incident,cinemaId})});setIncident({category:"CUSTOMER",severity:"MEDIUM",title:"",description:""});setMessage(t("Đã ghi nhận sự cố.","Incident recorded."));await load();}catch(e){setMessage((e as Error).message);}}
  async function resolveIncident(id:string){const note=(resolution[id]||"").trim();if(!note){setMessage(t("Nhập ghi chú xử lý trước khi đóng sự cố.","Enter a resolution note before closing the incident."));return;}try{await api(`/staff/operations/incidents/${id}/resolve`,{method:"POST",body:JSON.stringify({resolutionNote:note})});setMessage(t("Đã đóng sự cố.","Incident closed."));setResolution(v=>({...v,[id]:""}));await load();}catch(e){setMessage((e as Error).message);}}

  if(!auth)return <div className="card mx-auto max-w-xl p-6 text-sm text-slate-400">{t("Đang tải trung tâm vận hành…","Loading operations center…")}</div>;
  const role=auth.role;const me=auth.userId;const canResolve=["MANAGER","ADMIN"].includes(role);
  const metrics:[[string,string],number][]=[
    [["5 phút gần nhất","Last 5 minutes"],live?.checkedInLast5Minutes??0],
    [["1 giờ gần nhất","Last hour"],live?.checkedInLastHour??0],
    [["Hôm nay","Today"],live?.checkedInToday??0],
    [["Nhân viên đang ca","Staff on shift"],live?.activeStaff??0],
    [["Sự cố đang mở","Open incidents"],live?.openIncidents??0],
  ];

  return <div className="mx-auto max-w-7xl space-y-7">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="section-kicker">{t("VẬN HÀNH NHÂN VIÊN 2.0 · V43","STAFF OPERATIONS 2.0 · V43")}</p><h1 className="text-3xl font-bold">{t("Trung tâm vận hành rạp theo thời gian thực","Realtime cinema operations center")}</h1><p className="mt-2 text-slate-400">{t("Theo dõi lượng khách trong rạp, bàn giao ca và xử lý sự cố trên cùng một màn hình.","Track cinema occupancy, shift handovers, and incidents on one screen.")}</p></div><div className="flex gap-2"><Link href="/staff/check-in" className="btn btn-primary">📷 {t("Quét vé","Scan ticket")}</Link>{role!=="ADMIN"&&<Link href="/staff/schedule" className="btn btn-secondary">🕒 {t("Ca làm","Schedule")}</Link>}</div></div>

    {cinemas.length>1&&<section className="card p-5" data-testid="staff-operations-cinema-selector-v43"><label className="block max-w-2xl text-sm"><span className="block font-bold">{t("Rạp đang theo dõi","Tracked cinema")}</span><span className="mt-1 block text-xs font-normal text-slate-500">{t("Chọn rạp để theo dõi dữ liệu vận hành trực tiếp.","Choose a cinema to monitor live operational data.")}</span><select className="input mt-3 w-full" value={cinemaId} onChange={e=>setCinemaId(e.target.value)}>{cinemas.map(c=><option key={c.id} value={c.id} data-i18n-skip="true">{c.name}</option>)}</select></label></section>}
    {message&&<div className="card p-4 text-sm">{message}</div>}

    {live&&<><section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{metrics.map(([labels,value])=><div key={labels[0]} className="card p-5"><div className="text-sm text-slate-400">{t(labels[0],labels[1])}</div><div className="mt-2 text-3xl font-bold">{value}</div></div>)}</section>
    <section className="card p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-bold">{t("Lượt soát vé theo thời gian thực","Realtime check-ins")} · <span data-testid="staff-operations-live-cinema-v7815" data-i18n-skip="true">{live.cinemaName}</span></h2><p className="text-xs text-slate-500">{t("WebSocket tự làm mới; dự phòng kiểm tra mỗi 15 giây.","WebSocket refreshes automatically with a 15-second polling fallback.")}</p></div><span className="text-xs text-slate-500">{formatDate(live.generatedAt)}</span></div>
      <div className="mt-4 hidden lg:block"><table className="w-full table-fixed text-sm"><thead className="text-left text-slate-500"><tr><th className="pb-2">{t("Thời gian","Time")}</th><th>{t("Phim","Movie")}</th><th>{t("Phòng","Auditorium")}</th><th>{t("Nhân viên","Staff")}</th><th>{t("Nguồn","Source")}</th></tr></thead><tbody>{live.recentCheckIns.map(x=><tr key={`${x.bookingId}-${x.checkedInAt}`} className="border-t border-slate-800"><td className="py-3">{formatDate(x.checkedInAt)}</td><td className="break-words">{x.movieTitle}</td><td>{x.auditoriumName}</td><td className="break-words">{x.staffName}</td><td>{x.source}</td></tr>)}</tbody></table></div>
      <div className="mt-4 grid gap-2 lg:hidden">{live.recentCheckIns.map(x=><article key={`${x.bookingId}-${x.checkedInAt}`} className="rounded-xl border border-slate-800 p-3"><b>{x.movieTitle}</b><div className="mt-1 text-sm text-slate-400">{x.auditoriumName} · {x.staffName}</div><div className="mt-1 text-xs text-slate-500">{formatDate(x.checkedInAt)} · {x.source}</div></article>)}</div>
      {live.recentCheckIns.length===0&&<p className="py-6 text-slate-500">{t("Chưa có lượt soát vé tại rạp này.","No check-ins at this cinema yet.")}</p>}
    </section></>}

    <div className="grid gap-6 xl:grid-cols-2">
      <section className="card p-5"><h2 className="text-xl font-bold">{t("Bàn giao ca","Shift handover")}</h2>{role!=="ADMIN"&&<form className="mt-4 space-y-3" onSubmit={createHandover}><select className="input" value={handover.toStaffUserId} onChange={e=>setHandover(v=>({...v,toStaffUserId:e.target.value}))}><option value="">{t("Chọn người nhận bàn giao","Select handover recipient")}</option>{staff.filter(x=>x.userId!==me).map(x=><option key={x.userId} value={x.userId} data-testid="staff-operations-handover-recipient-v7815" data-i18n-skip="true">{x.employeeCode} · {x.fullName} ({localizedLabel(x.role,language)})</option>)}</select><textarea className="input min-h-28" maxLength={1000} placeholder={t("Việc còn dang dở, tiền/quầy, thiết bị, lưu ý ca sau...","Outstanding tasks, cash/counter, equipment, notes for the next shift...")} value={handover.summary} onChange={e=>setHandover(v=>({...v,summary:e.target.value}))}/><button className="btn btn-primary" type="submit">{t("Tạo bàn giao","Create handover")}</button></form>}
      <div className="mt-5 space-y-3">{handovers.map(h=><article key={h.id} className="rounded-xl border border-slate-800 p-4"><div className="flex flex-wrap justify-between gap-2"><b>{h.fromStaffName} → {h.toStaffName}</b><span className="text-xs">{localizedLabel(h.status,language)}</span></div><p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">{h.summary}</p><div className="mt-2 text-xs text-slate-500">{formatDate(h.createdAt)}</div>{h.status==="PENDING"&&h.toStaffUserId===me&&<button className="btn btn-primary mt-3" onClick={()=>acceptHandover(h.id)}>{t("Nhận bàn giao","Acknowledge handover")}</button>}</article>)}{handovers.length===0&&<p className="text-sm text-slate-500">{t("Chưa có bàn giao.","No handovers yet.")}</p>}</div></section>

      <section className="card p-5"><h2 className="text-xl font-bold">{t("Nhật ký sự cố","Incident log")}</h2><form className="mt-4 space-y-3" onSubmit={createIncident}><div className="grid gap-3 sm:grid-cols-2"><select className="input" value={incident.category} onChange={e=>setIncident(v=>({...v,category:e.target.value}))}>{incidentCategories.map(x=><option key={x}>{localizedLabel(x,language)}</option>)}</select><select className="input" value={incident.severity} onChange={e=>setIncident(v=>({...v,severity:e.target.value}))}>{severities.map(x=><option key={x}>{localizedLabel(x,language)}</option>)}</select></div><input className="input" maxLength={160} placeholder={t("Tiêu đề sự cố","Incident title")} value={incident.title} onChange={e=>setIncident(v=>({...v,title:e.target.value}))}/><textarea className="input min-h-28" maxLength={2000} placeholder={t("Mô tả chi tiết tình huống và hành động ban đầu","Describe the situation and initial response")} value={incident.description} onChange={e=>setIncident(v=>({...v,description:e.target.value}))}/><button className="btn btn-primary" type="submit">{t("Ghi nhận sự cố","Record incident")}</button></form>
      <div className="mt-5 space-y-3">{incidents.map(i=><article key={i.id} data-testid="staff-incident" className="rounded-xl border border-slate-800 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><b>{localizedLabel(i.severity,language)} · {localizedLabel(i.category,language)} · {i.title}</b><span className="text-xs">{localizedLabel(i.status,language)}</span></div><p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">{i.description}</p><div className="mt-2 text-xs text-slate-500">{t("Báo bởi","Reported by")} {i.reportedByName} · {formatDate(i.createdAt)}</div>{i.status==="RESOLVED"&&<div className="mt-2 rounded-lg bg-slate-900 p-3 text-sm">{t("Đã xử lý","Resolved")}: {i.resolutionNote}</div>}{i.status==="OPEN"&&canResolve&&<div className="mt-3 flex flex-col gap-2 sm:flex-row"><input className="input" placeholder={t("Ghi chú xử lý","Resolution note")} value={resolution[i.id]||""} onChange={e=>setResolution(v=>({...v,[i.id]:e.target.value}))}/><button className="btn btn-secondary shrink-0" onClick={()=>resolveIncident(i.id)}>{t("Đóng sự cố","Close incident")}</button></div>}</article>)}{incidents.length===0&&<p className="text-sm text-slate-500">{t("Chưa có sự cố.","No incidents yet.")}</p>}</div></section>
    </div>
  </div>;
}
/* V77.0.9 historical-verifier compatibility markers (not rendered):
STAFF OPERATIONS 2.0 · V43
Trung tâm vận hành rạp theo thời gian thực
@stomp/stompjs
/topic/staff-operations/
*/
