"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Client } from "@stomp/stompjs";
import { api, dateTime } from "@/lib/api";
import { getAuth } from "@/lib/auth";
import type { StaffHandover, StaffIncident, StaffOperationsCinema, StaffOperationsLive, StaffOperationsStaff } from "@/lib/types";

const incidentCategories=["CUSTOMER","EQUIPMENT","SAFETY","SECURITY","PAYMENT","OTHER"] as const;
const severities=["LOW","MEDIUM","HIGH","CRITICAL"] as const;

export default function StaffOperationsPage(){
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

  useEffect(()=>{
    const a=getAuth();
    if(!a||!["STAFF","MANAGER","ADMIN"].includes(a.role)){location.href="/login?returnTo=/staff/operations";return;}
    setAuth(a);void bootstrap();
    return()=>{void wsRef.current?.deactivate();};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  useEffect(()=>{if(!cinemaId)return;void load(cinemaId);connect(cinemaId);const timer=window.setInterval(()=>void load(cinemaId,true),15000);return()=>{window.clearInterval(timer);void wsRef.current?.deactivate();wsRef.current=null;};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[cinemaId]);

  async function bootstrap(){
    try{const c=await api<StaffOperationsCinema[]>("/staff/operations/cinemas");setCinemas(c);if(c[0])setCinemaId(c[0].id);}catch(e){setMessage((e as Error).message);}
  }
  async function load(id=cinemaId,silent=false){
    if(!id)return;const q=`?cinemaId=${encodeURIComponent(id)}`;
    try{const [l,s,h,i]=await Promise.all([api<StaffOperationsLive>(`/staff/operations/live${q}`),api<StaffOperationsStaff[]>(`/staff/operations/staff-options${q}`),api<StaffHandover[]>(`/staff/operations/handovers${q}`),api<StaffIncident[]>(`/staff/operations/incidents${q}`)]);setLive(l);setStaff(s);setHandovers(h);setIncidents(i);if(!silent)setMessage("");}catch(e){if(!silent)setMessage((e as Error).message);}
  }
  function connect(id:string){
    void wsRef.current?.deactivate();
    const scheme=location.protocol==="https:"?"wss":"ws";
    const c=new Client({brokerURL:`${scheme}://${location.host}/ws`,reconnectDelay:2000,onConnect:()=>c.subscribe(`/topic/staff-operations/${id}`,()=>void load(id,true))});
    c.activate();wsRef.current=c;
  }
  async function createHandover(e:FormEvent){e.preventDefault();if(!handover.toStaffUserId||!handover.summary.trim())return;try{await api("/staff/operations/handovers",{method:"POST",body:JSON.stringify(handover)});setHandover({toStaffUserId:"",summary:""});setMessage("Đã tạo bàn giao ca, đang chờ nhân viên nhận xác nhận.");await load();}catch(e){setMessage((e as Error).message);}}
  async function acceptHandover(id:string){try{await api(`/staff/operations/handovers/${id}/accept`,{method:"POST"});setMessage("Đã nhận bàn giao ca.");await load();}catch(e){setMessage((e as Error).message);}}
  async function createIncident(e:FormEvent){e.preventDefault();try{await api("/staff/operations/incidents",{method:"POST",body:JSON.stringify({...incident,cinemaId})});setIncident({category:"CUSTOMER",severity:"MEDIUM",title:"",description:""});setMessage("Đã ghi nhận sự cố.");await load();}catch(e){setMessage((e as Error).message);}}
  async function resolveIncident(id:string){const note=(resolution[id]||"").trim();if(!note){setMessage("Nhập ghi chú xử lý trước khi đóng sự cố.");return;}try{await api(`/staff/operations/incidents/${id}/resolve`,{method:"POST",body:JSON.stringify({resolutionNote:note})});setMessage("Đã đóng sự cố.");setResolution(v=>({...v,[id]:""}));await load();}catch(e){setMessage((e as Error).message);}}

  if(!auth)return <div className="card mx-auto max-w-xl p-6 text-sm text-slate-400">Đang tải trung tâm vận hành…</div>;
  const role=auth.role;const me=auth.userId;const canResolve=["MANAGER","ADMIN"].includes(role);
  return <div className="mx-auto max-w-7xl space-y-7">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="section-kicker">STAFF OPERATIONS 2.0 · V43</p><h1 className="text-3xl font-bold">Trung tâm vận hành rạp realtime</h1><p className="mt-2 text-slate-400">Theo dõi lượt khách vào rạp, bàn giao ca và xử lý sự cố trên cùng một màn hình.</p></div><div className="flex gap-2"><Link href="/staff/check-in" className="btn btn-primary">📷 Quét vé</Link>{role!=="ADMIN"&&<Link href="/staff/schedule" className="btn btn-secondary">🕒 Ca làm</Link>}</div></div>

    {cinemas.length>1&&<section className="card p-4"><label className="text-sm font-bold">Rạp đang theo dõi</label><select className="input mt-2 max-w-md" value={cinemaId} onChange={e=>setCinemaId(e.target.value)}>{cinemas.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></section>}
    {message&&<div className="card p-4 text-sm">{message}</div>}

    {live&&<><section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{[
      ["5 phút gần nhất",live.checkedInLast5Minutes],["1 giờ gần nhất",live.checkedInLastHour],["Hôm nay",live.checkedInToday],["Nhân viên đang ca",live.activeStaff],["Sự cố đang mở",live.openIncidents]
    ].map(([label,value])=><div key={String(label)} className="card p-5"><div className="text-sm text-slate-400">{label}</div><div className="mt-2 text-3xl font-bold">{value}</div></div>)}</section>
    <section className="card p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Lượt check-in realtime · {live.cinemaName}</h2><p className="text-xs text-slate-500">WebSocket tự làm mới; dự phòng polling mỗi 15 giây.</p></div><span className="text-xs text-slate-500">{dateTime(live.generatedAt)}</span></div><div className="mt-4 overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-slate-500"><tr><th className="pb-2">Thời gian</th><th>Phim</th><th>Phòng</th><th>Nhân viên</th><th>Nguồn</th></tr></thead><tbody>{live.recentCheckIns.map(x=><tr key={`${x.bookingId}-${x.checkedInAt}`} className="border-t border-slate-800"><td className="py-3">{dateTime(x.checkedInAt)}</td><td>{x.movieTitle}</td><td>{x.auditoriumName}</td><td>{x.staffName}</td><td>{x.source}</td></tr>)}</tbody></table>{live.recentCheckIns.length===0&&<p className="py-6 text-slate-500">Chưa có lượt check-in tại rạp này.</p>}</div></section></>}

    <div className="grid gap-6 xl:grid-cols-2">
      <section className="card p-5"><h2 className="text-xl font-bold">Bàn giao ca</h2>{role!=="ADMIN"&&<form className="mt-4 space-y-3" onSubmit={createHandover}><select className="input" value={handover.toStaffUserId} onChange={e=>setHandover(v=>({...v,toStaffUserId:e.target.value}))}><option value="">Chọn người nhận bàn giao</option>{staff.filter(x=>x.userId!==me).map(x=><option key={x.userId} value={x.userId}>{x.employeeCode} · {x.fullName} ({x.role})</option>)}</select><textarea className="input min-h-28" maxLength={1000} placeholder="Việc còn dang dở, tiền/quầy, thiết bị, lưu ý ca sau..." value={handover.summary} onChange={e=>setHandover(v=>({...v,summary:e.target.value}))}/><button className="btn btn-primary" type="submit">Tạo bàn giao</button></form>}
      <div className="mt-5 space-y-3">{handovers.map(h=><article key={h.id} className="rounded-xl border border-slate-800 p-4"><div className="flex flex-wrap justify-between gap-2"><b>{h.fromStaffName} → {h.toStaffName}</b><span className="text-xs">{h.status}</span></div><p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">{h.summary}</p><div className="mt-2 text-xs text-slate-500">{dateTime(h.createdAt)}</div>{h.status==="PENDING"&&h.toStaffUserId===me&&<button className="btn btn-primary mt-3" onClick={()=>acceptHandover(h.id)}>Nhận bàn giao</button>}</article>)}{handovers.length===0&&<p className="text-sm text-slate-500">Chưa có bàn giao.</p>}</div></section>

      <section className="card p-5"><h2 className="text-xl font-bold">Nhật ký sự cố</h2><form className="mt-4 space-y-3" onSubmit={createIncident}><div className="grid gap-3 sm:grid-cols-2"><select className="input" value={incident.category} onChange={e=>setIncident(v=>({...v,category:e.target.value}))}>{incidentCategories.map(x=><option key={x}>{x}</option>)}</select><select className="input" value={incident.severity} onChange={e=>setIncident(v=>({...v,severity:e.target.value}))}>{severities.map(x=><option key={x}>{x}</option>)}</select></div><input className="input" maxLength={160} placeholder="Tiêu đề sự cố" value={incident.title} onChange={e=>setIncident(v=>({...v,title:e.target.value}))}/><textarea className="input min-h-28" maxLength={2000} placeholder="Mô tả chi tiết tình huống và hành động ban đầu" value={incident.description} onChange={e=>setIncident(v=>({...v,description:e.target.value}))}/><button className="btn btn-primary" type="submit">Ghi nhận sự cố</button></form>
      <div className="mt-5 space-y-3">{incidents.map(i=><article key={i.id} data-testid="staff-incident" className="rounded-xl border border-slate-800 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><b>{i.severity} · {i.category} · {i.title}</b><span className="text-xs">{i.status}</span></div><p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">{i.description}</p><div className="mt-2 text-xs text-slate-500">Báo bởi {i.reportedByName} · {dateTime(i.createdAt)}</div>{i.status==="RESOLVED"&&<div className="mt-2 rounded-lg bg-slate-900 p-3 text-sm">Đã xử lý: {i.resolutionNote}</div>}{i.status==="OPEN"&&canResolve&&<div className="mt-3 flex gap-2"><input className="input" placeholder="Ghi chú xử lý" value={resolution[i.id]||""} onChange={e=>setResolution(v=>({...v,[i.id]:e.target.value}))}/><button className="btn btn-secondary shrink-0" onClick={()=>resolveIncident(i.id)}>Đóng sự cố</button></div>}</article>)}{incidents.length===0&&<p className="text-sm text-slate-500">Chưa có sự cố.</p>}</div></section>
    </div>
  </div>;
}
