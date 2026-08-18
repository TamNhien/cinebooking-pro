"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { api, currency, dateTime } from "@/lib/api";
import { getAuth } from "@/lib/auth";
import type { Auditorium, Movie, Showtime, ShowtimePlanCommit, ShowtimePlanPreview } from "@/lib/types";

type FormState = {
  movieId:string;
  auditoriumId:string;
  fromDate:string;
  toDate:string;
  startTimes:string;
  basePrice:number;
  status:string;
  skipConflicts:boolean;
};

const EMPTY:FormState={movieId:"",auditoriumId:"",fromDate:"",toDate:"",startTimes:"10:00, 13:00, 16:00, 19:30",basePrice:90000,status:"OPEN",skipConflicts:true};

export default function ShowtimePlannerPage(){
  const [movies,setMovies]=useState<Movie[]>([]);
  const [auditoriums,setAuditoriums]=useState<Auditorium[]>([]);
  const [showtimes,setShowtimes]=useState<Showtime[]>([]);
  const [form,setForm]=useState<FormState>(EMPTY);
  const [preview,setPreview]=useState<ShowtimePlanPreview|null>(null);
  const [busy,setBusy]=useState(false);
  const [msg,setMsg]=useState("");
  const [error,setError]=useState("");

  async function load(){
    const [m,a,s]=await Promise.all([
      api<Movie[]>("/admin/movies"),
      api<Auditorium[]>("/admin/auditoriums"),
      api<Showtime[]>("/admin/showtimes"),
    ]);
    setMovies(m);setAuditoriums(a);setShowtimes(s);
  }

  useEffect(()=>{
    const auth=getAuth();
    if(!auth||auth.role!=="ADMIN"){location.href="/login?returnTo=/admin/showtimes&reason=admin";return;}
    load().catch(e=>setError((e as Error).message));
  },[]);

  const selectedRoom=auditoriums.find(a=>a.id===form.auditoriumId);
  const selectedMovie=movies.find(m=>m.id===form.movieId);
  const roomSchedule=useMemo(()=>showtimes
    .filter(s=>!form.auditoriumId||s.auditoriumId===form.auditoriumId)
    .filter(s=>!form.fromDate||s.startTime.slice(0,10)>=form.fromDate)
    .filter(s=>!form.toDate||s.startTime.slice(0,10)<=form.toDate)
    .sort((a,b)=>a.startTime.localeCompare(b.startTime))
    .slice(0,160),[showtimes,form.auditoriumId,form.fromDate,form.toDate]);

  function payload(){
    const startTimes=form.startTimes.split(/[;,\s]+/).map(x=>x.trim()).filter(Boolean);
    return {...form,startTimes,basePrice:Number(form.basePrice)};
  }

  async function runPreview(e?:FormEvent){
    e?.preventDefault();setBusy(true);setError("");setMsg("");
    try{setPreview(await api<ShowtimePlanPreview>("/admin/showtime-planner/preview",{method:"POST",body:JSON.stringify(payload())}));}
    catch(e){setPreview(null);setError((e as Error).message);}finally{setBusy(false);}
  }

  async function commit(){
    if(!preview)return;
    const question=preview.conflicts>0
      ?`Tạo ${preview.creatable} suất hợp lệ và bỏ qua ${preview.conflicts} suất trùng lịch?`
      :`Tạo ${preview.creatable} suất chiếu?`;
    if(!confirm(question))return;
    setBusy(true);setError("");setMsg("");
    try{
      const result=await api<ShowtimePlanCommit>("/admin/showtime-planner/commit",{method:"POST",body:JSON.stringify(payload())});
      setMsg(`Đã tạo ${result.created} suất${result.skipped?` · bỏ qua ${result.skipped} suất trùng lịch`:""}.`);
      setPreview(result.preview);await load();
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }

  return <div className="mx-auto max-w-7xl space-y-7">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="section-kicker">V33 · SHOWTIME OPERATIONS</p><h1 className="text-3xl font-bold">Lập lịch chiếu & chống trùng phòng</h1><p className="mt-2 max-w-3xl text-slate-400">Tạo nhiều suất theo dải ngày, preview xung đột trước khi ghi dữ liệu. Hệ thống tính cả thời lượng phim và thời gian dọn phòng.</p></div>
      <Link href="/admin" className="btn btn-secondary">← Admin Dashboard</Link>
    </div>

    {error&&<div className="rounded-xl border border-red-800/60 bg-red-950/40 p-4 text-sm text-red-200">{error}</div>}
    {msg&&<div className="rounded-xl border border-emerald-800/60 bg-emerald-950/30 p-4 text-sm text-emerald-200">{msg}</div>}

    <div className="grid gap-6 xl:grid-cols-[430px_1fr]">
      <form onSubmit={runPreview} className="card space-y-4 p-5">
        <div><h2 className="text-xl font-bold">Kế hoạch hàng loạt</h2><p className="mt-1 text-sm text-slate-500">Preview không ghi database.</p></div>
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
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Kết quả preview</h2><p className="text-sm text-slate-500">Xanh = có thể tạo · Đỏ = xung đột.</p></div>{preview&&<button className="btn btn-primary" onClick={commit} disabled={busy||preview.creatable===0||(!form.skipConflicts&&preview.conflicts>0)}>{!form.skipConflicts&&preview.conflicts>0?"Có xung đột cần xử lý":`Tạo ${preview.creatable} suất hợp lệ`}</button>}</div>
          {!preview?<div className="py-10 text-center text-slate-500">Chọn phim, phòng, ngày và bấm Preview lịch.</div>:<>
            <div className="mt-4 grid gap-3 sm:grid-cols-4"><Metric label="Yêu cầu" value={preview.requested}/><Metric label="Có thể tạo" value={preview.creatable}/><Metric label="Trùng lịch" value={preview.conflicts}/><Metric label="Dọn phòng" value={`${preview.turnaroundMinutes} phút`}/></div>
            <p className="mt-3 text-xs text-slate-500">Timezone: {preview.zoneId}</p>
            <div className="mt-4 max-h-[430px] space-y-2 overflow-auto pr-1">{preview.slots.map(slot=><div key={slot.startTime} className={`rounded-xl border p-3 text-sm ${slot.creatable?"border-emerald-900/60 bg-emerald-950/20":"border-red-900/60 bg-red-950/20"}`}><div className="flex flex-wrap items-center justify-between gap-2"><b>{dateTime(slot.startTime)} → {dateTime(slot.endTime)}</b><span className={slot.creatable?"text-emerald-300":"text-red-300"}>{slot.creatable?"Có thể tạo":"Trùng lịch"}</span></div>{slot.conflictLabel&&<div className="mt-1 text-xs text-red-200">Xung đột: {slot.conflictLabel}</div>}</div>)}</div>
          </>}
        </section>

        <section className="card p-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-bold">Lịch hiện có trong phòng</h2><p className="text-sm text-slate-500">{roomSchedule.length} suất trong bộ lọc hiện tại.</p></div><span className="text-xs text-slate-500">Giá hiển thị là base price</span></div><div className="mt-4 max-h-[420px] space-y-2 overflow-auto">{roomSchedule.map(s=><div key={s.id} className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><b>{s.movieTitle}</b><span className="text-slate-400">{s.status}</span></div><div className="mt-1 text-slate-400">{dateTime(s.startTime)} · {s.cinemaName}/{s.auditoriumName} · {currency(s.basePrice)}</div></div>)}{!roomSchedule.length&&<div className="py-8 text-center text-slate-500">Chưa có suất phù hợp bộ lọc.</div>}</div></section>
      </div>
    </div>
  </div>;
}

function Metric({label,value}:{label:string;value:string|number}){return <div aria-label={`${label}: ${value}`} className="rounded-xl bg-slate-950/60 p-3"><div className="text-xs uppercase tracking-wide text-slate-500">{label}</div><div className="mt-1 text-xl font-black">{value}</div></div>}
