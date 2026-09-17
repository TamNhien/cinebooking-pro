/* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect -- effects intentionally synchronize API/subscription state; dependency lifecycle is intentionally bounded. */
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { clearAuth, getAuth } from "@/lib/auth";
import { localizedLabel } from "@/lib/vi-labels";
import { usePresentationLanguage, type Language } from "@/lib/usePresentationLanguage";
import type { StaffLeaveRequest, StaffTimesheetReport, UserProfile } from "@/lib/types";

type Cinema={id:string;name:string};
const currentMonth=()=>new Date().toISOString().slice(0,7);

function monthOptions(locale:string){
  const base=new Date();
  base.setDate(1);
  return Array.from({length:49},(_,index)=>{
    const offset=index-24;
    const d=new Date(base.getFullYear(),base.getMonth()+offset,1);
    const value=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    return {value,label:new Intl.DateTimeFormat(locale,{month:"long",year:"numeric"}).format(d)};
  });
}
function hours(v:number,locale:string){return `${(v/60).toLocaleString(locale,{maximumFractionDigits:1})}h`;}
function leaveType(v:string,language:Language){
  const vi:Record<string,string>={VACATION:"Nghỉ phép",SICK:"Nghỉ bệnh",PERSONAL:"Việc riêng",OTHER:"Khác"};
  const en:Record<string,string>={VACATION:"Vacation",SICK:"Sick leave",PERSONAL:"Personal leave",OTHER:"Other"};
  return (language==="vi"?vi:en)[v]??v;
}

export default function AdminAttendancePage(){
 const {language,locale,t}=usePresentationLanguage();
 const [month,setMonth]=useState(currentMonth()),[cinemaId,setCinemaId]=useState(""),[cinemas,setCinemas]=useState<Cinema[]>([]),[report,setReport]=useState<StaffTimesheetReport|null>(null),[leaves,setLeaves]=useState<StaffLeaveRequest[]>([]),[status,setStatus]=useState("PENDING"),[msg,setMsg]=useState(""),[role,setRole]=useState("");
 const months=useMemo(()=>monthOptions(locale),[locale]);
 async function load(){const me=await api<UserProfile>("/me");if(!["ADMIN","MANAGER"].includes(me.role)){clearAuth();window.location.assign("/login?returnTo=/admin/attendance");return;}setRole(me.role);const query=cinemaId?`&cinemaId=${encodeURIComponent(cinemaId)}`:"";const [r,l,c]=await Promise.all([api<StaffTimesheetReport>(`/admin/attendance/timesheet?month=${month}${query}`),api<StaffLeaveRequest[]>(`/admin/attendance/leaves?status=${status}`),api<Cinema[]>("/admin/shifts/cinema-options")]);setReport(r);setLeaves(l);setCinemas(c);if(me.role==="MANAGER"&&c.length===1)setCinemaId(c[0].id);}
 useEffect(()=>{if(!getAuth()){window.location.assign("/login?returnTo=/admin/attendance");return;}void load().catch(e=>setMsg((e as Error).message));},[month,cinemaId,status]);
 async function review(id:string,decision:"APPROVED"|"REJECTED"){const note=prompt(decision==="APPROVED"?t("Ghi chú duyệt (có thể bỏ trống):","Approval note (optional):"):t("Lý do từ chối:","Rejection reason:"),"");if(note===null)return;try{await api(`/admin/attendance/leaves/${id}/review`,{method:"POST",body:JSON.stringify({decision,note:note||null})});setMsg(decision==="APPROVED"?t("Đã duyệt đơn nghỉ.","Leave request approved."):t("Đã từ chối đơn nghỉ.","Leave request rejected."));await load()}catch(e){setMsg((e as Error).message)}}
 const kpis=useMemo(()=>report?[{label:t("Giờ được xếp","Scheduled hours"),value:hours(report.totalScheduledMinutes,locale)},{label:t("Giờ thực làm","Worked hours"),value:hours(report.totalWorkedMinutes,locale)},{label:t("Đi trễ","Late"),value:`${report.totalLateMinutes} ${t("phút","minutes")}`},{label:t("Về sớm","Early leave"),value:`${report.totalEarlyLeaveMinutes} ${t("phút","minutes")}`},{label:t("Vắng ca","Absent shifts"),value:String(report.totalAbsentShifts)}]:[],[report,language,locale]);
 return <div className="space-y-7">
   <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="section-kicker">{t("NHÂN SỰ & CHẤM CÔNG · V23","STAFF ATTENDANCE · V23")}</p><h1 className="text-3xl font-bold">{t("Bảng công & nghỉ phép","Attendance & leave")}</h1><p className="mt-1 text-slate-400">{t("Theo dõi giờ làm, đi trễ/về sớm, vắng ca và phê duyệt nghỉ phép.","Track worked hours, late arrivals/early departures, absences, and leave approvals.")}</p></div><Link className="btn btn-secondary" href="/admin/shifts">{t("← Xếp ca","← Shift planning")}</Link></div>
   {msg&&<div className="card p-4 text-sm">{msg}</div>}
   <section className="card grid gap-4 p-4 lg:grid-cols-[minmax(220px,1fr)_minmax(260px,1fr)_minmax(220px,auto)] lg:items-end"><div><label className="mb-1 block text-xs text-slate-400">{t("Tháng","Month")}</label><select className="input" value={month} onChange={e=>setMonth(e.target.value)}>{months.map(m=><option key={m.value} value={m.value}>{m.label}</option>)}</select></div><div><label className="mb-1 block text-xs text-slate-400">{t("Rạp","Cinema")}</label><select className="input" value={cinemaId} onChange={e=>setCinemaId(e.target.value)} disabled={role==="MANAGER"}><option value="">{t("Tất cả rạp","All cinemas")}</option>{cinemas.map(c=><option key={c.id} value={c.id} data-i18n-skip="true">{c.name}</option>)}</select></div><div className="flex items-end"><div className="text-sm text-slate-400">{t("Bảng công","Timesheet")}: <b className="text-white">{report?.cinemaName||"—"}</b></div></div></section>
   <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">{kpis.map(k=><div className="card p-4" key={k.label}><div className="text-xs text-slate-400">{k.label}</div><div className="mt-1 text-2xl font-bold">{k.value}</div></div>)}</section>

   <section className="space-y-3"><h2 className="text-xl font-bold">{t("Bảng công tháng","Monthly timesheet")}</h2>
     <div className="grid gap-3 xl:grid-cols-2 2xl:grid-cols-3">
       {report?.rows.map(r=><article className="card p-4" key={r.staffUserId}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><b>{r.employeeCode}</b><div className="truncate text-sm text-slate-300">{r.staffName}</div><div className="truncate text-xs text-slate-500">{r.cinemaName}</div></div><div className="text-right text-xs text-slate-500">{t("Ngày nghỉ","Leave days")}<div className="text-lg font-black text-white">{r.approvedLeaveDays}</div></div></div><div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4"><SmallMetric label={t("Ca xếp","Scheduled")} value={r.scheduledShifts}/><SmallMetric label={t("Hoàn tất","Completed")} value={r.completedShifts} tone="text-emerald-300"/><SmallMetric label={t("Vắng","Absent")} value={r.absentShifts} tone={r.absentShifts?"text-rose-300":""}/><SmallMetric label={t("Giờ xếp","Scheduled hours")} value={hours(r.scheduledMinutes,locale)}/><SmallMetric label={t("Giờ làm","Worked hours")} value={hours(r.workedMinutes,locale)}/><SmallMetric label={t("Đi trễ","Late")} value={`${r.lateMinutes}m`} tone={r.lateMinutes?"text-amber-300":""}/><SmallMetric label={t("Về sớm","Early leave")} value={`${r.earlyLeaveMinutes}m`} tone={r.earlyLeaveMinutes?"text-amber-300":""}/></div></article>)}
       {report&&report.rows.length===0&&<div className="card p-6 text-center text-slate-400 lg:col-span-2 2xl:col-span-3">{t("Chưa có nhân viên/dữ liệu trong tháng.","No staff/timesheet data for this month.")}</div>}
     </div>
   </section>

   <section className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">{t("Đơn nghỉ phép","Leave requests")}</h2><select className="input !w-auto" value={status} onChange={e=>setStatus(e.target.value)}><option value="PENDING">{t("Đang chờ","Pending")}</option><option value="APPROVED">{t("Đã duyệt","Approved")}</option><option value="REJECTED">{t("Từ chối","Rejected")}</option><option value="CANCELLED">{t("Đã huỷ","Cancelled")}</option><option value="ALL">{t("Tất cả","All")}</option></select></div>{leaves.length===0&&<div className="card p-6 text-slate-400">{t("Không có đơn nghỉ theo bộ lọc.","No leave requests match the filter.")}</div>}{leaves.map(l=><div className="card p-4" key={l.id}><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="font-bold">{l.employeeCode} · {l.staffName}</div><div className="mt-1 text-sm text-slate-400">{l.cinemaName} · {leaveType(l.leaveType,language)} · {l.fromDate}{l.toDate!==l.fromDate?` → ${l.toDate}`:""}</div><div className="mt-2 text-sm">{l.reason}</div><div className="mt-2 text-xs text-slate-500">{t("Trạng thái","Status")}: {localizedLabel(l.status,language)}{l.reviewedByEmail?` · ${t("xử lý bởi","reviewed by")} ${l.reviewedByEmail}`:""}</div>{l.reviewNote&&<div className="mt-1 text-xs text-slate-400">{t("Ghi chú","Note")}: {l.reviewNote}</div>}</div>{l.status==="PENDING"&&<div className="flex gap-2"><button className="btn btn-primary" onClick={()=>review(l.id,"APPROVED")}>{t("Duyệt","Approve")}</button><button className="btn btn-secondary" onClick={()=>review(l.id,"REJECTED")}>{t("Từ chối","Reject")}</button></div>}</div></div>)}</section>
 </div>;
}

function SmallMetric({label,value,tone=""}:{label:string;value:string|number;tone?:string}){return <div className="rounded-xl bg-slate-950/40 p-2"><div className="text-[11px] text-slate-500">{label}</div><div className={`mt-1 font-bold ${tone}`}>{value}</div></div>}
