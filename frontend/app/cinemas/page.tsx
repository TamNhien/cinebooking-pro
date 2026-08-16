"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api, currency } from "@/lib/api";
import type { Cinema, Showtime } from "@/lib/types";

const dayKey=(v:string)=>{const d=new Date(v);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`};
const time=(v:string)=>new Intl.DateTimeFormat("vi-VN",{hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(v));
const day=(v:string)=>new Intl.DateTimeFormat("vi-VN",{weekday:"short",day:"2-digit",month:"2-digit"}).format(new Date(`${v}T00:00:00`));

export default function CinemasPage(){
  const [cinemas,setCinemas]=useState<Cinema[]>([]); const [shows,setShows]=useState<Showtime[]>([]); const [cinemaId,setCinemaId]=useState(""); const [date,setDate]=useState(""); const [error,setError]=useState("");
  useEffect(()=>{Promise.all([api<Cinema[]>("/cinemas"),api<Showtime[]>("/showtimes")]).then(([c,s])=>{setCinemas(c);setShows(s);if(c[0])setCinemaId(c[0].id)}).catch(e=>setError((e as Error).message));},[]);
  const selected=cinemas.find(c=>c.id===cinemaId);
  const cinemaShows=useMemo(()=>shows.filter(s=>s.cinemaId===cinemaId),[shows,cinemaId]);
  const dates=useMemo(()=>[...new Set(cinemaShows.map(s=>dayKey(s.startTime)))].sort().slice(0,14),[cinemaShows]);
  useEffect(()=>{if(dates.length&&!dates.includes(date))setDate(dates[0]);},[dates,date]);
  const grouped=useMemo(()=>{
    const map=new Map<string,Showtime[]>();
    cinemaShows.filter(s=>!date||dayKey(s.startTime)===date).forEach(s=>{const arr=map.get(s.movieTitle)||[];arr.push(s);map.set(s.movieTitle,arr)});
    return [...map.entries()];
  },[cinemaShows,date]);
  return <div className="space-y-7">
    <div className="section-heading"><div><p className="section-kicker">HỆ THỐNG RẠP</p><h1>Rạp & lịch chiếu</h1></div></div>
    {error&&<div className="rounded-xl bg-red-950/50 p-4 text-red-300">{error}</div>}
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <aside className="card h-fit p-3">{cinemas.map(c=><button key={c.id} className={`cinema-option ${cinemaId===c.id?"active":""}`} onClick={()=>setCinemaId(c.id)}><b>{c.name}</b><span>{c.address}</span></button>)}</aside>
      <section>
        {selected&&<div className="mb-5"><h2 className="text-2xl font-bold">{selected.name}</h2><p className="mt-1 text-sm text-slate-400">{selected.address}</p></div>}
        <div className="mb-5 flex flex-wrap gap-2">{dates.map(d=><button key={d} onClick={()=>setDate(d)} className={`date-chip ${date===d?"active":""}`}>{day(d)}</button>)}</div>
        <div className="space-y-4">{grouped.map(([movie,items])=><div className="card p-5" key={movie}><h3 className="text-lg font-bold">{movie}</h3><div className="mt-4 flex flex-wrap gap-3">{items.sort((a,b)=>a.startTime.localeCompare(b.startTime)).map(s=><Link key={s.id} href={`/booking/${s.id}`} className="showtime-chip"><b>{time(s.startTime)}</b><small>{s.auditoriumName}</small><small>{currency(s.basePrice)}</small></Link>)}</div></div>)}</div>
        {!grouped.length&&!error&&<div className="empty-state">Chưa có suất chiếu cho ngày đã chọn.</div>}
      </section>
    </div>
  </div>;
}
