"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { api, dateTime } from "@/lib/api";
import { getAuth } from "@/lib/auth";
import type { Auditorium, AuditoriumBlackout } from "@/lib/types";

const EMPTY={auditoriumId:"",startTime:"",endTime:"",reason:""};

function toIso(local:string){return local?new Date(local).toISOString():"";}

export default function MaintenancePage(){
  const [auditoriums,setAuditoriums]=useState<Auditorium[]>([]);
  const [items,setItems]=useState<AuditoriumBlackout[]>([]);
  const [form,setForm]=useState(EMPTY);
  const [filter,setFilter]=useState("");
  const [busy,setBusy]=useState(false);
  const [msg,setMsg]=useState("");
  const [error,setError]=useState("");

  async function load(){
    const [rooms,blocks]=await Promise.all([
      api<Auditorium[]>("/admin/auditoriums"),
      api<AuditoriumBlackout[]>("/admin/auditorium-blackouts"),
    ]);
    setAuditoriums(rooms);setItems(blocks);
  }

  useEffect(()=>{
    const auth=getAuth();
    if(!auth||auth.role!=="ADMIN"){location.href="/login?returnTo=/admin/maintenance&reason=admin";return;}
    load().catch(e=>setError((e as Error).message));
  },[]);

  const visible=useMemo(()=>items.filter(x=>!filter||x.auditoriumId===filter).sort((a,b)=>a.startTime.localeCompare(b.startTime)),[items,filter]);

  async function create(e:FormEvent){
    e.preventDefault();setBusy(true);setError("");setMsg("");
    try{
      await api<AuditoriumBlackout>("/admin/auditorium-blackouts",{method:"POST",body:JSON.stringify({
        auditoriumId:form.auditoriumId,
        startTime:toIso(form.startTime),
        endTime:toIso(form.endTime),
        reason:form.reason,
      })});
      setMsg("Đã khóa phòng trong khoảng bảo trì. Showtime planner sẽ chặn mọi suất trùng khoảng này.");
      setForm(EMPTY);await load();
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }

  async function remove(item:AuditoriumBlackout){
    if(!confirm(`Mở lại ${item.cinemaName} · ${item.auditoriumName} cho khoảng ${dateTime(item.startTime)}?`))return;
    setBusy(true);setError("");setMsg("");
    try{await api(`/admin/auditorium-blackouts/${item.id}`,{method:"DELETE"});setMsg("Đã mở lại phòng.");await load();}
    catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }

  return <div className="mx-auto max-w-6xl space-y-7">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="section-kicker">V34 · CINEMA OPERATIONS</p><h1 className="text-3xl font-bold">Bảo trì & khóa phòng chiếu</h1><p className="mt-2 max-w-3xl text-slate-400">Khóa phòng cho bảo trì máy chiếu, vệ sinh sâu, sự kiện riêng hoặc sự cố kỹ thuật. Hệ thống không cho tạo khoảng khóa trùng suất đang hoạt động và Showtime Planner tự nhận các khoảng này là xung đột.</p></div>
      <div className="flex gap-2"><Link href="/admin/showtimes" className="btn btn-secondary">Lập lịch chiếu</Link><Link href="/admin" className="btn btn-secondary">← Admin</Link></div>
    </div>

    {error&&<div className="rounded-xl border border-red-800/60 bg-red-950/40 p-4 text-sm text-red-200">{error}</div>}
    {msg&&<div className="rounded-xl border border-emerald-800/60 bg-emerald-950/30 p-4 text-sm text-emerald-200">{msg}</div>}

    <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
      <form onSubmit={create} className="card space-y-4 p-5">
        <div><h2 className="text-xl font-bold">Tạo khoảng khóa phòng</h2><p className="mt-1 text-sm text-slate-500">Tối đa 14 ngày cho mỗi khoảng.</p></div>
        <label className="block text-sm"><span className="mb-1 block text-slate-400">Phòng chiếu</span><select aria-label="Phòng bảo trì" className="input" value={form.auditoriumId} onChange={e=>setForm({...form,auditoriumId:e.target.value})} required><option value="">Chọn phòng</option>{auditoriums.map(a=><option key={a.id} value={a.id}>{a.cinemaName} · {a.name}</option>)}</select></label>
        <label className="block text-sm"><span className="mb-1 block text-slate-400">Bắt đầu</span><input aria-label="Bắt đầu bảo trì" className="input" type="datetime-local" value={form.startTime} onChange={e=>setForm({...form,startTime:e.target.value})} required/></label>
        <label className="block text-sm"><span className="mb-1 block text-slate-400">Kết thúc</span><input aria-label="Kết thúc bảo trì" className="input" type="datetime-local" value={form.endTime} onChange={e=>setForm({...form,endTime:e.target.value})} required/></label>
        <label className="block text-sm"><span className="mb-1 block text-slate-400">Lý do</span><textarea aria-label="Lý do bảo trì" className="input min-h-24" maxLength={300} value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})} placeholder="Bảo trì máy chiếu / vệ sinh sâu / sự kiện riêng..." required/></label>
        <button className="btn btn-primary w-full" disabled={busy}>{busy?"Đang lưu...":"Khóa phòng"}</button>
      </form>

      <section className="card p-5">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-bold">Lịch khóa phòng</h2><p className="text-sm text-slate-500">{visible.length} khoảng trong bộ lọc.</p></div><select aria-label="Lọc phòng bảo trì" className="input max-w-xs" value={filter} onChange={e=>setFilter(e.target.value)}><option value="">Tất cả phòng</option>{auditoriums.map(a=><option key={a.id} value={a.id}>{a.cinemaName} · {a.name}</option>)}</select></div>
        <div className="mt-4 max-h-[620px] space-y-3 overflow-auto pr-1">{visible.map(x=><div key={x.id} aria-label={`Khoảng bảo trì: ${x.reason}`} className="rounded-xl border border-amber-900/60 bg-amber-950/20 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><b>{x.cinemaName} · {x.auditoriumName}</b><div className="mt-1 text-sm text-amber-200">{x.reason}</div><div className="mt-1 text-xs text-slate-400">{dateTime(x.startTime)} → {dateTime(x.endTime)}</div></div><button className="btn btn-secondary" onClick={()=>remove(x)} disabled={busy}>Mở lại phòng</button></div></div>)}{!visible.length&&<div className="py-12 text-center text-slate-500">Chưa có khoảng bảo trì/khóa phòng.</div>}</div>
      </section>
    </div>
  </div>;
}
