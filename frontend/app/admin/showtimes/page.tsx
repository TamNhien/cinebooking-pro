"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { api, currency, dateTime } from "@/lib/api";
import { getAuth } from "@/lib/auth";
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

export default function ShowtimePlannerPage(){
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
    if(!auth||auth.role!=="ADMIN"){location.href="/login?returnTo=/admin/showtimes&reason=admin";return;}
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
    const question=preview.conflicts>0?`Tạo ${preview.creatable} suất hợp lệ và bỏ qua ${preview.conflicts} suất trùng lịch?`:`Tạo ${preview.creatable} suất chiếu?`;
    if(!confirm(question))return;
    setBusy(true);setError("");setMsg("");
    try{
      const result=await api<ShowtimePlanCommit>("/admin/showtime-planner/commit",{method:"POST",body:JSON.stringify(payload())});
      setMsg(`Đã tạo ${result.created} suất${result.skipped?` · bỏ qua ${result.skipped} suất trùng lịch`:""}.`);
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
    if(!confirm(`Tạo ${smartPreview.suggested} suất được Smart Planner đề xuất?`))return;
    setSmartBusy(true);setError("");setMsg("");
    try{
      const result=await api<SmartShowtimeCommit>("/admin/showtime-planner/smart/commit",{method:"POST",body:JSON.stringify(smartPayload())});
      setMsg(`V49 Smart Planner đã tạo ${result.created} suất · run ${result.planningRunId.slice(0,8)}.`);
      setSmartPreview(result.preview);await load();
    }catch(e){setError((e as Error).message);}finally{setSmartBusy(false);}
  }

  return <div className="mx-auto max-w-7xl space-y-7">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="section-kicker">V49 · SMART SHOWTIME PLANNING 2.0</p><h1 className="text-3xl font-bold">Lập lịch chiếu & chống trùng phòng</h1><p className="mt-2 max-w-4xl text-slate-400">Smart Planner xếp suất theo nhu cầu lịch sử, giờ cao điểm và cuối tuần; đồng thời loại trừ lịch phòng, thời gian dọn phòng và blackout/bảo trì trước khi đề xuất.</p></div>
      <div className="flex gap-2"><Link href="/admin/maintenance" className="btn btn-secondary">🛠 Bảo trì phòng</Link><Link href="/admin" className="btn btn-secondary">← Admin Dashboard</Link></div>
    </div>

    {error&&<div className="rounded-xl border border-red-800/60 bg-red-950/40 p-4 text-sm text-red-200">{error}</div>}
    {msg&&<div className="rounded-xl border border-emerald-800/60 bg-emerald-950/30 p-4 text-sm text-emerald-200">{msg}</div>}

    <section className="card p-5" data-testid="smart-showtime-planner">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-2xl font-bold">✨ Smart Planner</h2><p className="mt-1 text-sm text-slate-500">Demand-balanced · không ghi database khi preview · commit sẽ lưu provenance và planning run.</p></div><span className="rounded-full border border-indigo-800 bg-indigo-950/40 px-3 py-1 text-xs text-indigo-200">V49-DEMAND-BALANCED-2</span></div>
      <form onSubmit={runSmartPreview} className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <label className="text-sm"><span className="mb-1 block text-slate-400">Rạp</span><select data-testid="smart-cinema-select" aria-label="Rạp Smart Planner" className="input" value={smartForm.cinemaId} onChange={e=>{setSmartForm({...smartForm,cinemaId:e.target.value});setSmartPreview(null)}} required><option value="">Chọn rạp</option>{cinemas.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label className="text-sm"><span className="mb-1 block text-slate-400">Phim</span><select data-testid="smart-movie-select" aria-label="Phim Smart Planner" className="input" value={smartForm.movieId} onChange={e=>{setSmartForm({...smartForm,movieId:e.target.value});setSmartPreview(null)}} required><option value="">Chọn phim</option>{movies.filter(m=>m.active).map(m=><option key={m.id} value={m.id}>{m.title} · {m.durationMinutes} phút</option>)}</select></label>
        <label className="text-sm"><span className="mb-1 block text-slate-400">Từ ngày</span><input aria-label="Từ ngày Smart Planner" className="input" type="date" value={smartForm.fromDate} onChange={e=>{setSmartForm({...smartForm,fromDate:e.target.value});setSmartPreview(null)}} required/></label>
        <label className="text-sm"><span className="mb-1 block text-slate-400">Đến ngày</span><input aria-label="Đến ngày Smart Planner" className="input" type="date" value={smartForm.toDate} onChange={e=>{setSmartForm({...smartForm,toDate:e.target.value});setSmartPreview(null)}} required/></label>
        <label className="text-sm"><span className="mb-1 block text-slate-400">Mục tiêu/ngày</span><input aria-label="Mục tiêu suất mỗi ngày" className="input" type="number" min={1} max={12} value={smartForm.targetPerDay} onChange={e=>setSmartForm({...smartForm,targetPerDay:Number(e.target.value)})}/></label>
        <label className="text-sm"><span className="mb-1 block text-slate-400">Mở cửa</span><input aria-label="Giờ mở Smart Planner" className="input" type="time" value={smartForm.operatingStart} onChange={e=>setSmartForm({...smartForm,operatingStart:e.target.value})}/></label>
        <label className="text-sm"><span className="mb-1 block text-slate-400">Đóng cửa</span><input aria-label="Giờ đóng Smart Planner" className="input" type="time" value={smartForm.operatingEnd} onChange={e=>setSmartForm({...smartForm,operatingEnd:e.target.value})}/></label>
        <label className="text-sm"><span className="mb-1 block text-slate-400">Bước quét</span><select aria-label="Bước quét Smart Planner" className="input" value={smartForm.intervalMinutes} onChange={e=>setSmartForm({...smartForm,intervalMinutes:Number(e.target.value)})}><option value={15}>15 phút</option><option value={30}>30 phút</option><option value={45}>45 phút</option><option value={60}>60 phút</option></select></label>
        <label className="text-sm"><span className="mb-1 block text-slate-400">Giá cơ bản</span><input aria-label="Giá Smart Planner" className="input" type="number" min={0} step={1000} value={smartForm.basePrice} onChange={e=>setSmartForm({...smartForm,basePrice:Number(e.target.value)})}/></label>
        <div className="flex items-end"><button data-testid="smart-preview-button" className="btn btn-primary w-full" disabled={smartBusy}>{smartBusy?"Đang tối ưu...":"Gợi ý lịch thông minh"}</button></div>
      </form>
      {smartCinema&&smartMovie&&<p className="mt-3 text-xs text-slate-500">Đang tối ưu <b className="text-slate-300">{smartMovie.title}</b> tại <b className="text-slate-300">{smartCinema.name}</b>. Khoảng cách start cùng phim tối thiểu 45 phút.</p>}

      {smartPreview&&<div className="mt-5 space-y-4">
        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <Metric label="Mục tiêu" value={smartPreview.requested}/><Metric testId="smart-suggested-metric" label="Đề xuất" value={smartPreview.suggested}/><Metric label="Candidate" value={smartPreview.candidateCount}/><Metric label="Bị chặn" value={smartPreview.conflicts}/><Metric label="Mẫu lịch sử" value={smartPreview.historicalSamples}/><Metric label="Dọn phòng" value={`${smartPreview.turnaroundMinutes} phút`}/>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-500">Timezone {smartPreview.zoneId} · điểm 0–100 kết hợp occupancy lịch sử và heuristic nhu cầu.</p><button data-testid="smart-commit-button" className="btn btn-primary" onClick={commitSmart} disabled={smartBusy||smartPreview.suggested===0}>Tạo {smartPreview.suggested} suất gợi ý</button></div>
        <div className="grid gap-4 xl:grid-cols-2">{smartPreview.days.map(day=><article key={day.date} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4"><div className="flex items-center justify-between"><div><b>{day.date}</b><div className="text-xs text-slate-500">{day.suggested}/{day.target} suất · {day.conflicts} candidate xung đột</div></div></div><div className="mt-3 space-y-2">{day.slots.map(slot=><div key={`${slot.auditoriumId}-${slot.startTime}`} className="rounded-lg border border-emerald-900/50 bg-emerald-950/20 p-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><b>{dateTime(slot.startTime)} · {slot.auditoriumName}</b><span className="font-bold text-emerald-300">Score {slot.score}</span></div><div className="mt-1 text-xs text-slate-400">→ {dateTime(slot.endTime)}{slot.historicalSamples>0?` · lịch sử ${slot.historicalOccupancy}% / ${slot.historicalSamples} suất`:" · heuristic demand"}</div><div className="mt-1 text-xs text-slate-500">{slot.reasons.join(" · ")}</div></div>)}{!day.slots.length&&<div className="text-sm text-amber-300">Không đủ khoảng trống phù hợp trong ngày này.</div>}</div></article>)}</div>
      </div>}
    </section>

    <section className="card p-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-bold">Lịch sử Smart Planner</h2><p className="text-sm text-slate-500">20 lần commit gần nhất · dùng để audit provenance của suất SMART.</p></div></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[850px] text-sm"><thead className="text-left text-xs uppercase text-slate-500"><tr><th className="pb-3">Run</th><th>Rạp / phim</th><th>Khoảng ngày</th><th>Mục tiêu</th><th>Tạo</th><th>Conflict</th><th>Người tạo</th></tr></thead><tbody className="divide-y divide-slate-800">{runs.map(r=><tr key={r.id} data-testid="smart-planning-run"><td className="py-3 font-mono text-xs">{r.id.slice(0,8)}</td><td><b>{r.cinemaName}</b><div className="text-xs text-slate-500">{r.movieTitle}</div></td><td>{r.fromDate} → {r.toDate}</td><td>{r.requestedSlots}</td><td className="text-emerald-300">{r.suggestedSlots}</td><td>{r.conflictCount}</td><td>{r.createdBy||"-"}</td></tr>)}{!runs.length&&<tr><td colSpan={7} className="py-8 text-center text-slate-500">Chưa có planning run V49.</td></tr>}</tbody></table></div></section>

    <div className="grid gap-6 xl:grid-cols-[430px_1fr]">
      <form onSubmit={runPreview} className="card space-y-4 p-5">
        <div><p className="section-kicker">MANUAL BATCH · V34 COMPAT</p><h2 className="text-xl font-bold">Kế hoạch hàng loạt thủ công</h2><p className="mt-1 text-sm text-slate-500">Giữ nguyên workflow preview/commit cũ; suất tạo từ đây được đánh dấu BATCH.</p></div>
        <label className="block text-sm"><span className="mb-1 block text-slate-400">Phim</span><select aria-label="Phim lập lịch" className="input" value={form.movieId} onChange={e=>{setForm({...form,movieId:e.target.value});setPreview(null)}} required><option value="">Chọn phim</option>{movies.filter(m=>m.active).map(m=><option key={m.id} value={m.id}>{m.title} · {m.durationMinutes} phút</option>)}</select></label>
        <label className="block text-sm"><span className="mb-1 block text-slate-400">Phòng chiếu</span><select aria-label="Phòng lập lịch" className="input" value={form.auditoriumId} onChange={e=>{setForm({...form,auditoriumId:e.target.value});setPreview(null)}} required><option value="">Chọn phòng</option>{auditoriums.map(a=><option key={a.id} value={a.id}>{a.cinemaName} · {a.name}</option>)}</select></label>
        <div className="grid grid-cols-2 gap-3"><label className="text-sm"><span className="mb-1 block text-slate-400">Từ ngày</span><input aria-label="Từ ngày lập lịch" className="input" type="date" value={form.fromDate} onChange={e=>{setForm({...form,fromDate:e.target.value});setPreview(null)}} required/></label><label className="text-sm"><span className="mb-1 block text-slate-400">Đến ngày</span><input aria-label="Đến ngày lập lịch" className="input" type="date" value={form.toDate} onChange={e=>{setForm({...form,toDate:e.target.value});setPreview(null)}} required/></label></div>
        <label className="block text-sm"><span className="mb-1 block text-slate-400">Khung giờ mỗi ngày</span><input aria-label="Khung giờ mỗi ngày" className="input" value={form.startTimes} onChange={e=>{setForm({...form,startTimes:e.target.value});setPreview(null)}} placeholder="10:00, 13:00, 16:00, 19:30"/><span className="mt-1 block text-xs text-slate-500">Tối đa 12 giờ/ngày. Có thể ngăn cách bằng dấu phẩy hoặc khoảng trắng.</span></label>
        <div className="grid grid-cols-2 gap-3"><label className="text-sm"><span className="mb-1 block text-slate-400">Giá cơ bản</span><input aria-label="Giá cơ bản" className="input" type="number" min={0} step={1000} value={form.basePrice} onChange={e=>{setForm({...form,basePrice:Number(e.target.value)});setPreview(null)}}/></label><label className="text-sm"><span className="mb-1 block text-slate-400">Trạng thái</span><select aria-label="Trạng thái suất mới" className="input" value={form.status} onChange={e=>{setForm({...form,status:e.target.value});setPreview(null)}}><option>OPEN</option><option>CLOSED</option></select></label></div>
        <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={form.skipConflicts} onChange={e=>setForm({...form,skipConflicts:e.target.checked})}/><span>Khi tạo: bỏ qua khung giờ bị trùng</span></label>
        <button className="btn btn-primary w-full" disabled={busy}>{busy?"Đang kiểm tra...":"Preview lịch"}</button>
        {selectedMovie&&selectedRoom&&<div className="rounded-xl bg-slate-950/60 p-3 text-xs text-slate-400">Đang lập: <b className="text-slate-200">{selectedMovie.title}</b> tại <b className="text-slate-200">{selectedRoom.cinemaName} · {selectedRoom.name}</b>.</div>}
      </form>

      <div className="space-y-5">
        <section className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Kết quả preview thủ công</h2><p className="text-sm text-slate-500">Xanh = có thể tạo · Đỏ = xung đột.</p></div>{preview&&<button className="btn btn-primary" onClick={commit} disabled={busy||preview.creatable===0||(!form.skipConflicts&&preview.conflicts>0)}>{!form.skipConflicts&&preview.conflicts>0?"Có xung đột cần xử lý":`Tạo ${preview.creatable} suất hợp lệ`}</button>}</div>
          {!preview?<div className="py-10 text-center text-slate-500">Chọn phim, phòng, ngày và bấm Preview lịch.</div>:<><div className="mt-4 grid gap-3 sm:grid-cols-4"><Metric label="Yêu cầu" value={preview.requested}/><Metric label="Có thể tạo" value={preview.creatable}/><Metric label="Trùng lịch" value={preview.conflicts}/><Metric label="Dọn phòng" value={`${preview.turnaroundMinutes} phút`}/></div><p className="mt-3 text-xs text-slate-500">Timezone: {preview.zoneId}</p><div className="mt-4 max-h-[430px] space-y-2 overflow-auto pr-1">{preview.slots.map(slot=><div key={slot.startTime} className={`rounded-xl border p-3 text-sm ${slot.creatable?"border-emerald-900/60 bg-emerald-950/20":"border-red-900/60 bg-red-950/20"}`}><div className="flex flex-wrap items-center justify-between gap-2"><b>{dateTime(slot.startTime)} → {dateTime(slot.endTime)}</b><span className={slot.creatable?"text-emerald-300":"text-red-300"}>{slot.creatable?"Có thể tạo":"Trùng lịch"}</span></div>{slot.conflictLabel&&<div className="mt-1 text-xs text-red-200">Xung đột: {slot.conflictLabel}</div>}</div>)}</div></>}
        </section>
        <section className="card p-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-bold">Lịch hiện có trong phòng</h2><p className="text-sm text-slate-500">{roomSchedule.length} suất trong bộ lọc hiện tại.</p></div><span className="text-xs text-slate-500">MANUAL / BATCH / SMART provenance</span></div><div className="mt-4 max-h-[420px] space-y-2 overflow-auto">{roomSchedule.map(s=><div key={s.id} className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><b>{s.movieTitle}</b><span className="text-slate-400">{s.status} · {s.planningSource||"MANUAL"}{s.planningScore!=null?` · ${s.planningScore}`:""}</span></div><div className="mt-1 text-slate-400">{dateTime(s.startTime)} · {s.cinemaName}/{s.auditoriumName} · {currency(s.basePrice)}</div></div>)}{!roomSchedule.length&&<div className="py-8 text-center text-slate-500">Chưa có suất phù hợp bộ lọc.</div>}</div></section>
      </div>
    </div>
  </div>;
}

function Metric({label,value,testId}:{label:string;value:string|number;testId?:string}){return <div data-testid={testId} aria-label={`${label}: ${value}`} className="rounded-xl bg-slate-950/60 p-3"><div className="text-xs uppercase tracking-wide text-slate-500">{label}</div><div className="mt-1 text-xl font-black">{value}</div></div>}
function localDate(iso:string){const d=new Date(iso);const y=d.getFullYear();const m=String(d.getMonth()+1).padStart(2,"0");const day=String(d.getDate()).padStart(2,"0");return `${y}-${m}-${day}`;}
