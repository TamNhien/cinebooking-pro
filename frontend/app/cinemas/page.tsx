"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api, currency } from "@/lib/api";
import type { Cinema, Showtime } from "@/lib/types";

const dayKey=(v:string)=>{const d=new Date(v);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`};
const time=(v:string)=>new Intl.DateTimeFormat("vi-VN",{hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(v));
const day=(v:string)=>new Intl.DateTimeFormat("vi-VN",{weekday:"short",day:"2-digit",month:"2-digit"}).format(new Date(`${v}T00:00:00`));
const monthLabel=(v:string)=>new Intl.DateTimeFormat("vi-VN",{month:"long",year:"numeric"}).format(new Date(`${v}-01T00:00:00`));

export default function CinemasPage(){
  const [cinemas,setCinemas]=useState<Cinema[]>([]);
  const [shows,setShows]=useState<Showtime[]>([]);
  const [cinemaId,setCinemaId]=useState("");
  const [date,setDate]=useState("");
  const [month,setMonth]=useState("");
  const [error,setError]=useState("");

  useEffect(()=>{Promise.all([api<Cinema[]>("/cinemas"),api<Showtime[]>("/showtimes")]).then(([c,s])=>{setCinemas(c);setShows(s);if(c[0])setCinemaId(c[0].id)}).catch(e=>setError((e as Error).message));},[]);
  const selected=cinemas.find(c=>c.id===cinemaId);
  const cinemaShows=useMemo(()=>shows.filter(s=>s.cinemaId===cinemaId),[shows,cinemaId]);
  const dates=useMemo(()=>[...new Set(cinemaShows.map(s=>dayKey(s.startTime)))].sort(),[cinemaShows]);
  const months=useMemo(()=>[...new Set(dates.map(d=>d.slice(0,7)))],[dates]);

  useEffect(()=>{
    if(!dates.length){setDate("");setMonth("");return;}
    if(!dates.includes(date)){setDate(dates[0]);setMonth(dates[0].slice(0,7));return;}
    if(!month||!months.includes(month))setMonth(date.slice(0,7));
  },[dates,date,month,months]);

  const monthDates=useMemo(()=>dates.filter(d=>!month||d.startsWith(month)),[dates,month]);
  const grouped=useMemo(()=>{
    const map=new Map<string,Showtime[]>();
    cinemaShows.filter(s=>!date||dayKey(s.startTime)===date).forEach(s=>{const arr=map.get(s.movieTitle)||[];arr.push(s);map.set(s.movieTitle,arr)});
    return [...map.entries()].sort(([a],[b])=>a.localeCompare(b,"vi"));
  },[cinemaShows,date]);
  const selectedCount=grouped.reduce((n,[,items])=>n+items.length,0);

  function chooseMonth(value:string){setMonth(value);const first=dates.find(d=>d.startsWith(value));if(first)setDate(first);}
  function chooseDate(value:string){if(dates.includes(value)){setDate(value);setMonth(value.slice(0,7));}}

  return <div className="space-y-7">
    <div className="section-heading"><div><p className="section-kicker">HỆ THỐNG RẠP</p><h1>Rạp & lịch chiếu</h1><p className="mt-2 text-sm text-slate-400">Duyệt toàn bộ lịch theo tháng và chọn chính xác ngày muốn xem.</p></div></div>
    {error&&<div className="rounded-xl bg-red-950/50 p-4 text-red-300">{error}</div>}
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <aside className="card h-fit p-3">{cinemas.map(c=><button key={c.id} className={`cinema-option ${cinemaId===c.id?"active":""}`} onClick={()=>setCinemaId(c.id)}><b>{c.name}</b><span>{c.address}</span></button>)}</aside>
      <section>
        {selected&&<div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-2xl font-bold">{selected.name}</h2><p className="mt-1 text-sm text-slate-400">{selected.address}</p></div>{dates.length>0&&<div className="text-sm text-slate-400">Lịch từ <b className="text-white">{day(dates[0])}</b> đến <b className="text-white">{day(dates[dates.length-1])}</b></div>}</div>}

        {dates.length>0&&<div className="card mb-5 space-y-4 p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap gap-2">{months.map(m=><button key={m} type="button" className={`tab-pill ${month===m?"active":""}`} onClick={()=>chooseMonth(m)}>{monthLabel(m)}</button>)}</div>
            <label className="w-full sm:w-auto sm:min-w-52"><span className="mb-1 block text-xs font-semibold text-slate-400">Chọn ngày</span><input type="date" className="input" min={dates[0]} max={dates[dates.length-1]} value={date} onChange={e=>chooseDate(e.target.value)}/></label>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">{monthDates.map(d=><button key={d} onClick={()=>chooseDate(d)} className={`date-chip shrink-0 ${date===d?"active":""}`}>{day(d)}</button>)}</div>
          <div className="text-xs text-slate-400">{date?<>Ngày đã chọn có <b className="text-white">{selectedCount}</b> suất của <b className="text-white">{grouped.length}</b> phim.</>:"Chọn một ngày để xem suất chiếu."}</div>
        </div>}

        <div className="space-y-4">{grouped.map(([movie,items])=><div className="card p-5" key={movie}><h3 className="text-lg font-bold">{movie}</h3><div className="mt-4 flex flex-wrap gap-3">{items.sort((a,b)=>a.startTime.localeCompare(b.startTime)).map(s=><Link key={s.id} href={`/booking/${s.id}`} className="showtime-chip"><b>{time(s.startTime)}</b><small>{s.auditoriumName}</small><small>{currency(s.basePrice)}</small></Link>)}</div></div>)}</div>
        {!grouped.length&&!error&&<div className="empty-state">Chưa có suất chiếu cho ngày đã chọn.</div>}
      </section>
    </div>
  </div>;
}
