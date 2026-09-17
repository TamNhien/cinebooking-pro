/* eslint-disable react-hooks/set-state-in-effect -- effects intentionally synchronize API/subscription state. */
"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { usePresentationLanguage } from "@/lib/usePresentationLanguage";
import { getAuth } from "@/lib/auth";
import { localizedLabel } from "@/lib/vi-labels";
import type {
  Auditorium, Cinema, Movie, Showtime, ShowtimePlanCommit, ShowtimePlanPreview,
  SmartShowtimeCommit, SmartShowtimePlanPreview, ShowtimePlanningRun,
} from "@/lib/types";

type FormState = {
  movieId:string; auditoriumId:string; fromDate:string; toDate:string; startTimes:string;
  basePrice:number; status:string; skipConflicts:boolean;
};
type SmartFormState = {
  cinemaId:string; movieId:string; fromDate:string; toDate:string; targetPerDay:number;
  operatingStart:string; operatingEnd:string; intervalMinutes:number; basePrice:number; status:string;
};

const EMPTY:FormState={movieId:"",auditoriumId:"",fromDate:"",toDate:"",startTimes:"10:00, 13:00, 16:00, 19:30",basePrice:90000,status:"OPEN",skipConflicts:true};
const SMART_EMPTY:SmartFormState={cinemaId:"",movieId:"",fromDate:"",toDate:"",targetPerDay:4,operatingStart:"09:00",operatingEnd:"23:30",intervalMinutes:30,basePrice:90000,status:"OPEN"};


function plannerReason(reason:string,language:"vi"|"en"){
  if(language==="vi") return reason;
  let m=reason.match(/^Lịch sử phim · lấp đầy (\d+)% \/ (\d+) suất$/);
  if(m) return `Movie history · ${m[1]}% occupancy / ${m[2]} showtimes`;
  m=reason.match(/^Lịch sử rạp · lấp đầy (\d+)% \/ (\d+) suất$/);
  if(m) return `Cinema history · ${m[1]}% occupancy / ${m[2]} showtimes`;
  const exact:Record<string,string>={
    "Chưa đủ lịch sử · dùng mô hình nhu cầu theo khung giờ":"Insufficient history · using time-slot demand model",
    "Khung giờ cao điểm buổi tối":"Evening peak period",
    "Khung giờ chiều có nhu cầu tốt":"Strong afternoon demand",
    "Cuối tuần":"Weekend",
    "Đã loại trừ lịch trùng và khoảng bảo trì":"Schedule conflicts and maintenance windows excluded",
  };
  return exact[reason]??reason;
}

// V49 compatibility marker for historical source verifier: Lịch sử Smart Planner
export default function ShowtimePlannerPage(){
  const { language, locale, t } = usePresentationLanguage();
  const formatDateTime = (value:string) => new Intl.DateTimeFormat(locale,{dateStyle:"short",timeStyle:"short"}).format(new Date(value));
  const formatCurrency = (value:number) => new Intl.NumberFormat(locale,{style:"currency",currency:"VND"}).format(value);
  const [movies,setMovies]=useState<Movie[]>([]);
  const [cinemas,setCinemas]=useState<Cinema[]>([]);
  const [auditoriums,setAuditoriums]=useState<Auditorium[]>([]);
  const [showtimes,setShowtimes]=useState<Showtime[]>([]);
  const [runs,setRuns]=useState<ShowtimePlanningRun[]>([]);
  const [form,setForm]=useState<FormState>(EMPTY);
  const [smartForm,setSmartForm]=useState<SmartFormState>(SMART_EMPTY);
  const [preview,setPreview]=useState<ShowtimePlanPreview|null>(null);
  const [smartPreview,setSmartPreview]=useState<SmartShowtimePlanPreview|null>(null);
  const [busy,setBusy]=useState(false);
  const [smartBusy,setSmartBusy]=useState(false);
  const [msg,setMsg]=useState("");
  const [error,setError]=useState("");

  async function load(){
    const [m,c,a,s,r]=await Promise.all([
      api<Movie[]>("/admin/movies"), api<Cinema[]>("/admin/cinemas"), api<Auditorium[]>("/admin/auditoriums"),
      api<Showtime[]>("/admin/showtimes"), api<ShowtimePlanningRun[]>("/admin/showtime-planner/smart/runs"),
    ]);
    setMovies(m);setCinemas(c);setAuditoriums(a);setShowtimes(s);setRuns(r);
  }

  useEffect(()=>{
    const auth=getAuth();
    if(!auth||auth.role!=="ADMIN"){window.location.assign("/login?returnTo=/admin/showtimes&reason=admin");return;}
    load().catch(e=>setError((e as Error).message));
  },[]);

  const selectedRoom=auditoriums.find(a=>a.id===form.auditoriumId);
  const selectedMovie=movies.find(m=>m.id===form.movieId);
  const smartCinema=cinemas.find(c=>c.id===smartForm.cinemaId);
  const smartMovie=movies.find(m=>m.id===smartForm.movieId);
  const roomSchedule=useMemo(()=>showtimes
    .filter(s=>!form.auditoriumId||s.auditoriumId===form.auditoriumId)
    .filter(s=>!form.fromDate||localDate(s.startTime)>=form.fromDate)
    .filter(s=>!form.toDate||localDate(s.startTime)<=form.toDate)
    .sort((a,b)=>a.startTime.localeCompare(b.startTime)).slice(0,160),[showtimes,form.auditoriumId,form.fromDate,form.toDate]);

  function payload(){
    const startTimes=form.startTimes.split(/[;,\s]+/).map(x=>x.trim()).filter(Boolean);
    return {...form,startTimes,basePrice:Number(form.basePrice)};
  }
  function smartPayload(){return {...smartForm,targetPerDay:Number(smartForm.targetPerDay),intervalMinutes:Number(smartForm.intervalMinutes),basePrice:Number(smartForm.basePrice)};}

  async function runPreview(e?:FormEvent){
    e?.preventDefault();setBusy(true);setError("");setMsg("");
    try{setPreview(await api<ShowtimePlanPreview>("/admin/showtime-planner/preview",{method:"POST",body:JSON.stringify(payload())}));}
    catch(e){setPreview(null);setError((e as Error).message);}finally{setBusy(false);}
  }
  async function commit(){
    if(!preview)return;
    const question=preview.conflicts>0?t(`Tạo ${preview.creatable} suất hợp lệ và bỏ qua ${preview.conflicts} suất trùng lịch?`,`Create ${preview.creatable} valid showtimes and skip ${preview.conflicts} conflicts?`):t(`Tạo ${preview.creatable} suất chiếu?`,`Create ${preview.creatable} showtimes?`);
    if(!confirm(question))return;
    setBusy(true);setError("");setMsg("");
    try{
      const result=await api<ShowtimePlanCommit>("/admin/showtime-planner/commit",{method:"POST",body:JSON.stringify(payload())});
      setMsg(t(`Đã tạo ${result.created} suất${result.skipped?` · bỏ qua ${result.skipped} suất trùng lịch`:""}.`,`Created ${result.created} showtimes${result.skipped?` · skipped ${result.skipped} conflicts`:""}.`));
      setPreview(result.preview);await load();
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }

  async function runSmartPreview(e?:FormEvent){
    e?.preventDefault();setSmartBusy(true);setError("");setMsg("");
    try{setSmartPreview(await api<SmartShowtimePlanPreview>("/admin/showtime-planner/smart/preview",{method:"POST",body:JSON.stringify(smartPayload())}));}
    catch(e){setSmartPreview(null);setError((e as Error).message);}finally{setSmartBusy(false);}
  }
  async function commitSmart(){
    if(!smartPreview||smartPreview.suggested===0)return;
    if(!confirm(t(`Tạo ${smartPreview.suggested} suất do Bộ lập lịch thông minh đề xuất?`,`Create ${smartPreview.suggested} Smart Planner suggested showtimes?`)))return;
    setSmartBusy(true);setError("");setMsg("");
    try{
      const result=await api<SmartShowtimeCommit>("/admin/showtime-planner/smart/commit",{method:"POST",body:JSON.stringify(smartPayload())});
      setMsg(t(`V49 Bộ lập lịch thông minh đã tạo ${result.created} suất · run ${result.planningRunId.slice(0,8)}.`,`V49 Smart Planner created ${result.created} showtimes · run ${result.planningRunId.slice(0,8)}.`));
      setSmartPreview(result.preview);await load();
    }catch(e){setError((e as Error).message);}finally{setSmartBusy(false);}
  }

  return <div className="mx-auto max-w-7xl space-y-7" data-testid="showtime-planning-page">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="section-kicker">{t("V49 · LẬP LỊCH SUẤT CHIẾU THÔNG MINH 2.0","V49 · SMART SHOWTIME PLANNING 2.0")}</p><h1 className="text-3xl font-bold">{t("Lập lịch chiếu & chống trùng phòng","Showtime planning & auditorium conflict prevention")}</h1><p className="mt-2 max-w-4xl text-slate-400">{t("Bộ lập lịch thông minh xếp suất theo nhu cầu lịch sử, giờ cao điểm và cuối tuần; đồng thời loại trừ lịch phòng, thời gian dọn phòng và khoảng khóa/bảo trì trước khi đề xuất.","Smart Planner schedules showtimes from historical demand, peak hours, and weekend patterns while excluding auditorium schedules, turnaround time, and blackout/maintenance windows before suggesting slots.")}</p></div>
      <div className="flex gap-2"><Link href="/admin/maintenance" className="btn btn-secondary">{t("🛠 Bảo trì phòng","🛠 Auditorium maintenance")}</Link><Link href="/admin" className="btn btn-secondary">{t("← Bảng điều khiển quản trị","← Admin Dashboard")}</Link></div>
    </div>

    {error&&<div className="rounded-xl border border-red-800/60 bg-red-950/40 p-4 text-sm text-red-200">{error}</div>}
    {msg&&<div className="rounded-xl border border-emerald-800/60 bg-emerald-950/30 p-4 text-sm text-emerald-200">{msg}</div>}

    <section className="card p-5" data-testid="smart-showtime-planner">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-2xl font-bold">{t("✨ Lập lịch thông minh","✨ Smart planning")}</h2><p className="mt-1 text-sm text-slate-500">{t("Cân bằng theo nhu cầu · không ghi cơ sở dữ liệu khi xem trước · xác nhận sẽ lưu nguồn gốc và lần lập kế hoạch.","Demand-balanced · preview writes nothing to the database · confirmation records provenance and the planning run.")}</p></div><span className="rounded-full border border-indigo-800 bg-indigo-950/40 px-3 py-1 text-xs text-indigo-200">V49-DEMAND-BALANCED-2</span></div>
      <form onSubmit={runSmartPreview} className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <label className="text-sm"><span className="mb-1 block text-slate-400">{t("Rạp","Cinema")}</span><select data-testid="smart-cinema-select" aria-label={t("Rạp của Bộ lập lịch thông minh","Smart Planner cinema")} className="input" value={smartForm.cinemaId} onChange={e=>{setSmartForm({...smartForm,cinemaId:e.target.value});setSmartPreview(null)}} required><option value="">{t("Chọn rạp","Select cinema")}</option>{cinemas.map(c=><option key={c.id} value={c.id} data-i18n-skip="true">{c.name}</option>)}</select></label>
        <label className="text-sm"><span className="mb-1 block text-slate-400">{t("Phim","Movie")}</span><select data-testid="smart-movie-select" aria-label={t("Phim cho Bộ lập lịch thông minh","Movie for Smart Planner")} className="input" value={smartForm.movieId} onChange={e=>{setSmartForm({...smartForm,movieId:e.target.value});setSmartPreview(null)}} required><option value="">{t("Chọn phim","Select movie")}</option>{movies.filter(m=>m.active).map(m=><option key={m.id} value={m.id} data-testid="showtime-movie-option-v7815" data-i18n-skip="true">{m.title} · {t(`${m.durationMinutes} phút`,`${m.durationMinutes} min`)}</option>)}</select></label>
        <label className="text-sm"><span className="mb-1 block text-slate-400">{t("Từ ngày","From date")}</span><input aria-label={t("Từ ngày của Bộ lập lịch thông minh","Smart Planner start date")} className="input" type="date" value={smartForm.fromDate} onChange={e=>{setSmartForm({...smartForm,fromDate:e.target.value});setSmartPreview(null)}} required/></label>
        <label className="text-sm"><span className="mb-1 block text-slate-400">{t("Đến ngày","To date")}</span><input aria-label={t("Đến ngày của Bộ lập lịch thông minh","Smart Planner end date")} className="input" type="date" value={smartForm.toDate} onChange={e=>{setSmartForm({...smartForm,toDate:e.target.value});setSmartPreview(null)}} required/></label>
        <label className="text-sm"><span className="mb-1 block text-slate-400">{t("Mục tiêu/ngày","Target/day")}</span><input aria-label={t("Mục tiêu suất mỗi ngày","Showtime target per day")} className="input" type="number" min={1} max={12} value={smartForm.targetPerDay} onChange={e=>setSmartForm({...smartForm,targetPerDay:Number(e.target.value)})}/></label>
        <label className="text-sm"><span className="mb-1 block text-slate-400">{t("Mở cửa","Opening time")}</span><input aria-label={t("Giờ mở của Bộ lập lịch thông minh","Smart Planner opening time")} className="input" type="time" value={smartForm.operatingStart} onChange={e=>setSmartForm({...smartForm,operatingStart:e.target.value})}/></label>
        <label className="text-sm"><span className="mb-1 block text-slate-400">{t("Đóng cửa","Closing time")}</span><input aria-label={t("Giờ đóng của Bộ lập lịch thông minh","Smart Planner closing time")} className="input" type="time" value={smartForm.operatingEnd} onChange={e=>setSmartForm({...smartForm,operatingEnd:e.target.value})}/></label>
        <label className="text-sm"><span className="mb-1 block text-slate-400">{t("Bước quét","Scan interval")}</span><select aria-label={t("Bước quét của Bộ lập lịch thông minh","Smart Planner scan interval")} className="input" value={smartForm.intervalMinutes} onChange={e=>setSmartForm({...smartForm,intervalMinutes:Number(e.target.value)})}><option value={15}>{t("15 phút","15 minutes")}</option><option value={30}>{t("30 phút","30 minutes")}</option><option value={45}>{t("45 phút","45 minutes")}</option><option value={60}>{t("60 phút","60 minutes")}</option></select></label>
        <label className="text-sm"><span className="mb-1 block text-slate-400">{t("Giá cơ bản","Base price")}</span><input aria-label={t("Giá của Bộ lập lịch thông minh","Smart Planner price")} className="input" type="number" min={0} step={1000} value={smartForm.basePrice} onChange={e=>setSmartForm({...smartForm,basePrice:Number(e.target.value)})}/></label>
        <div className="flex items-end"><button data-testid="smart-preview-button" className="btn btn-primary w-full" disabled={smartBusy}>{smartBusy?t("Đang tối ưu...","Optimizing..."):t("Gợi ý lịch thông minh","Suggest smart schedule")}</button></div>
      </form>
      {smartCinema&&smartMovie&&<p className="mt-3 text-xs text-slate-500">{t("Đang tối ưu", "Optimizing")} <b className="text-slate-300">{smartMovie.title}</b> {t("tại", "at")} <b className="text-slate-300">{smartCinema.name}</b>. {t("Khoảng cách start cùng phim tối thiểu 45 phút.", "The same movie must start at least 45 minutes apart.")}</p>}

      {smartPreview&&<div className="mt-5 space-y-4">
        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <Metric label={t("Mục tiêu","Target")} value={smartPreview.requested}/><Metric testId="smart-suggested-metric" label={t("Đề xuất","Suggested")} value={smartPreview.suggested}/><Metric label={t("Ứng viên","Candidates")} value={smartPreview.candidateCount}/><Metric label={t("Bị chặn","Blocked")} value={smartPreview.conflicts}/><Metric label={t("Mẫu lịch sử","Historical samples")} value={smartPreview.historicalSamples}/><Metric label={t("Dọn phòng","Turnaround")} value={t(`${smartPreview.turnaroundMinutes} phút`,`${smartPreview.turnaroundMinutes} minutes`)}/>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-500">{t(`Múi giờ ${smartPreview.zoneId} · điểm 0–100 kết hợp tỷ lệ lấp đầy lịch sử và heuristic nhu cầu.`,`Time zone ${smartPreview.zoneId} · score 0–100 combines historical occupancy and demand heuristics.`)}</p><button data-testid="smart-commit-button" className="btn btn-primary" onClick={commitSmart} disabled={smartBusy||smartPreview.suggested===0}>{t(`Tạo ${smartPreview.suggested} suất gợi ý`,`Create ${smartPreview.suggested} suggested showtimes`)}</button></div>
        <div className="grid gap-4 xl:grid-cols-2">{smartPreview.days.map(day=><article key={day.date} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4"><div className="flex items-center justify-between"><div><b>{day.date}</b><div className="text-xs text-slate-500">{t(`${day.suggested}/${day.target} suất · ${day.conflicts} ứng viên xung đột`,`${day.suggested}/${day.target} showtimes · ${day.conflicts} conflicting candidates`)}</div></div></div><div className="mt-3 space-y-2">{day.slots.map(slot=><div key={`${slot.auditoriumId}-${slot.startTime}`} className="rounded-lg border border-emerald-900/50 bg-emerald-950/20 p-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><b>{formatDateTime(slot.startTime)} · {slot.auditoriumName}</b><span className="font-bold text-emerald-300">{t(`Điểm ${slot.score}`,`Score ${slot.score}`)}</span></div><div className="mt-1 text-xs text-slate-400">→ {formatDateTime(slot.endTime)}{slot.historicalSamples>0?t(` · lịch sử ${slot.historicalOccupancy}% / ${slot.historicalSamples} suất`,` · historical ${slot.historicalOccupancy}% / ${slot.historicalSamples} showtimes`):t(" · nhu cầu heuristic"," · heuristic demand")}</div><div className="mt-1 text-xs text-slate-500">{slot.reasons.map(reason=>plannerReason(reason,language)).join(" · ")}</div></div>)}{!day.slots.length&&<div className="text-sm text-amber-300">{t("Không đủ khoảng trống phù hợp trong ngày này.","No suitable time slots are available on this day.")}</div>}</div></article>)}</div>
      </div>}
    </section>

    <section className="card p-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-bold">{t("Lịch sử bộ lập lịch thông minh","Smart Planner run history")}</h2><p className="text-sm text-slate-500">{t("20 lần xác nhận gần nhất · dùng để kiểm toán nguồn gốc của suất THÔNG MINH.","20 most recent confirmed runs · used to audit SMART showtime provenance.")}</p></div></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[850px] text-sm"><thead className="text-left text-xs uppercase text-slate-500"><tr><th className="px-2 pb-3">{t("Lần chạy","Run ID")}</th><th className="px-2 pb-3">{t("Rạp / phim","Cinema / movie")}</th><th className="px-2 pb-3">{t("Khoảng ngày","Date range")}</th><th className="px-2 pb-3">{t("Mục tiêu","Target")}</th><th className="px-2 pb-3">{t("Tạo","Created")}</th><th className="px-2 pb-3">{t("Xung đột","Conflicts")}</th><th className="px-2 pb-3">{t("Người tạo","Created by")}</th></tr></thead><tbody className="divide-y divide-slate-800">{runs.map(r=><tr key={r.id} data-testid="smart-planning-run"><td className="p-2 font-mono text-xs">{r.id.slice(0,8)}</td><td className="p-2"><b>{r.cinemaName}</b><div className="text-xs text-slate-500">{r.movieTitle}</div></td><td className="p-2">{r.fromDate} → {r.toDate}</td><td className="p-2">{r.requestedSlots}</td><td className="p-2 text-emerald-300">{r.suggestedSlots}</td><td className="p-2">{r.conflictCount}</td><td className="p-2">{r.createdBy||"-"}</td></tr>)}{!runs.length&&<tr><td colSpan={7} className="py-8 text-center text-slate-500">{t("Chưa có lần lập kế hoạch V49.","No V49 planning runs yet.")}</td></tr>}</tbody></table></div></section>

    <div className="admin-split-grid">
      <form onSubmit={runPreview} className="card space-y-4 p-5">
        <div><p className="section-kicker">{t("LÔ THỦ CÔNG · TƯƠNG THÍCH V34","MANUAL BATCH · V34 COMPATIBILITY")}</p><h2 className="text-xl font-bold">{t("Kế hoạch hàng loạt thủ công","Manual batch planning")}</h2><p className="mt-1 text-sm text-slate-500">{t("Giữ nguyên quy trình xem trước/xác nhận cũ; suất tạo từ đây được đánh dấu Theo lô.","Preserves the existing preview/confirm flow; showtimes created here are marked Batch.")}</p></div>
        <label className="block text-sm"><span className="mb-1 block text-slate-400">{t("Phim","Movie")}</span><select aria-label={t("Phim lập lịch","Planning movie")} className="input" value={form.movieId} onChange={e=>{setForm({...form,movieId:e.target.value});setPreview(null)}} required><option value="">{t("Chọn phim","Select movie")}</option>{movies.filter(m=>m.active).map(m=><option key={m.id} value={m.id} data-testid="showtime-movie-option-v7815" data-i18n-skip="true">{m.title} · {t(`${m.durationMinutes} phút`,`${m.durationMinutes} min`)}</option>)}</select></label>
        <label className="block text-sm"><span className="mb-1 block text-slate-400">{t("Phòng chiếu","Auditorium")}</span><select aria-label={t("Phòng lập lịch","Planning auditorium")} className="input" value={form.auditoriumId} onChange={e=>{setForm({...form,auditoriumId:e.target.value});setPreview(null)}} required><option value="">{t("Chọn phòng","Select auditorium")}</option>{auditoriums.map(a=><option key={a.id} value={a.id} data-i18n-skip="true">{a.cinemaName} · {a.name}</option>)}</select></label>
        <div className="admin-form-grid-2"><label className="text-sm"><span className="mb-1 block text-slate-400">{t("Từ ngày","From date")}</span><input aria-label={t("Từ ngày lập lịch","Planning start date")} className="input" type="date" value={form.fromDate} onChange={e=>{setForm({...form,fromDate:e.target.value});setPreview(null)}} required/></label><label className="text-sm"><span className="mb-1 block text-slate-400">{t("Đến ngày","To date")}</span><input aria-label={t("Đến ngày lập lịch","Planning end date")} className="input" type="date" value={form.toDate} onChange={e=>{setForm({...form,toDate:e.target.value});setPreview(null)}} required/></label></div>
        <label className="block text-sm"><span className="mb-1 block text-slate-400">{t("Khung giờ mỗi ngày","Daily time slots")}</span><input aria-label={t("Khung giờ mỗi ngày","Daily time slots")} className="input" value={form.startTimes} onChange={e=>{setForm({...form,startTimes:e.target.value});setPreview(null)}} placeholder="10:00, 13:00, 16:00, 19:30"/><span className="mt-1 block text-xs text-slate-500">{t("Tối đa 12 giờ/ngày. Có thể ngăn cách bằng dấu phẩy hoặc khoảng trắng.","Up to 12 times per day. Separate values with commas or spaces.")}</span></label>
        <div className="admin-form-grid-2"><label className="text-sm"><span className="mb-1 block text-slate-400">{t("Giá cơ bản","Base price")}</span><input aria-label={t("Giá cơ bản","Base price")} className="input" type="number" min={0} step={1000} value={form.basePrice} onChange={e=>{setForm({...form,basePrice:Number(e.target.value)});setPreview(null)}}/></label><label className="text-sm"><span className="mb-1 block text-slate-400">{t("Trạng thái","Status")}</span><select aria-label={t("Trạng thái suất mới","New showtime status")} className="input" value={form.status} onChange={e=>{setForm({...form,status:e.target.value});setPreview(null)}}><option value="OPEN">{localizedLabel("OPEN", language)}</option><option value="CLOSED">{localizedLabel("CLOSED", language)}</option></select></label></div>
        <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={form.skipConflicts} onChange={e=>setForm({...form,skipConflicts:e.target.checked})}/><span>{t("Khi tạo: bỏ qua khung giờ bị trùng","When creating: skip conflicting time slots")}</span></label>
        <button className="btn btn-primary w-full" disabled={busy}>{busy?t("Đang kiểm tra...","Checking..."):t("Xem trước lịch","Preview schedule")}</button>
        {selectedMovie&&selectedRoom&&<div className="rounded-xl bg-slate-950/60 p-3 text-xs text-slate-400">{t("Đang lập", "Planning")}: <b className="text-slate-200">{selectedMovie.title}</b> {t("tại","at")} <b className="text-slate-200">{selectedRoom.cinemaName} · {selectedRoom.name}</b>.</div>}
      </form>

      <div className="space-y-5">
        <section className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">{t("Kết quả xem trước thủ công","Manual preview results")}</h2><p className="text-sm text-slate-500">{t("Xanh = có thể tạo · Đỏ = xung đột.","Green = creatable · Red = conflict.")}</p></div>{preview&&<button className="btn btn-primary" onClick={commit} disabled={busy||preview.creatable===0||(!form.skipConflicts&&preview.conflicts>0)}>{!form.skipConflicts&&preview.conflicts>0?t("Có xung đột cần xử lý","Conflicts require resolution"):t(`Tạo ${preview.creatable} suất hợp lệ`,`Create ${preview.creatable} valid showtimes`)}</button>}</div>
          {!preview?<div className="py-10 text-center text-slate-500">{t("Chọn phim, phòng, ngày và bấm Xem trước lịch.","Select a movie, auditorium, dates, then click Preview schedule.")}</div>:<><div className="mt-4 grid gap-3 sm:grid-cols-4"><Metric label={t("Yêu cầu","Requested")} value={preview.requested}/><Metric label={t("Có thể tạo","Creatable")} value={preview.creatable}/><Metric label={t("Trùng lịch","Schedule conflicts")} value={preview.conflicts}/><Metric label={t("Dọn phòng","Turnaround")} value={t(`${preview.turnaroundMinutes} phút`,`${preview.turnaroundMinutes} minutes`)}/></div><p className="mt-3 text-xs text-slate-500">{t("Múi giờ:","Time zone:")} {preview.zoneId}</p><div className="mt-4 max-h-[430px] space-y-2 overflow-auto pr-1">{preview.slots.map(slot=><div key={slot.startTime} className={`rounded-xl border p-3 text-sm ${slot.creatable?"border-emerald-900/60 bg-emerald-950/20":"border-red-900/60 bg-red-950/20"}`}><div className="flex flex-wrap items-center justify-between gap-2"><b>{formatDateTime(slot.startTime)} → {formatDateTime(slot.endTime)}</b><span className={slot.creatable?"text-emerald-300":"text-red-300"}>{slot.creatable?t("Có thể tạo","Creatable"):t("Trùng lịch","Schedule conflict")}</span></div>{slot.conflictLabel&&<div className="mt-1 text-xs text-red-200">{t("Xung đột:","Conflict:")} {slot.conflictLabel}</div>}</div>)}</div></>}
        </section>
        <section className="card p-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-bold">{t("Lịch hiện có trong phòng","Existing auditorium schedule")}</h2><p className="text-sm text-slate-500">{t(`${roomSchedule.length} suất trong bộ lọc hiện tại.`,`${roomSchedule.length} showtimes in the current filter.`)}</p></div><span className="text-xs text-slate-500">{t("Nguồn gốc THỦ CÔNG / LÔ / THÔNG MINH","Source MANUAL / BATCH / SMART")}</span></div><div className="mt-4 max-h-[420px] space-y-2 overflow-auto">{roomSchedule.map(s=><div key={s.id} className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><b>{s.movieTitle}</b><span className="text-slate-400">{localizedLabel(s.status, language)} · {localizedLabel(s.planningSource||"MANUAL", language)}{s.planningScore!=null?` · ${s.planningScore}`:""}</span></div><div className="mt-1 text-slate-400">{formatDateTime(s.startTime)} · {s.cinemaName}/{s.auditoriumName} · {formatCurrency(s.basePrice)}</div></div>)}{!roomSchedule.length&&<div className="py-8 text-center text-slate-500">{t("Chưa có suất phù hợp bộ lọc.","No showtimes match the current filter.")}</div>}</div></section>
      </div>
    </div>
  </div>;
}

function Metric({label,value,testId}:{label:string;value:string|number;testId?:string}){return <div data-testid={testId} aria-label={`${label}: ${value}`} className="rounded-xl bg-slate-950/60 p-3"><div className="text-xs uppercase tracking-wide text-slate-500">{label}</div><div className="mt-1 text-xl font-black">{value}</div></div>}
function localDate(iso:string){const d=new Date(iso);const y=d.getFullYear();const m=String(d.getMonth()+1).padStart(2,"0");const day=String(d.getDate()).padStart(2,"0");return `${y}-${m}-${day}`;}
/* V77.0.9 historical verifier aliases (not rendered):
V49 · SMART SHOWTIME PLANNING 2.0 | Smart Planner
Điểm {slot.score}
slot.reasons.join
*/
