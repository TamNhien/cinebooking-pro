"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, currency } from "@/lib/api";
import type { Movie, Showtime } from "@/lib/types";
import { useLanguage } from "@/components/LanguageProvider";

const dateKey=(value:string)=>{
  const d=new Date(value);
  const y=d.getFullYear();
  const m=String(d.getMonth()+1).padStart(2,"0");
  const day=String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
};
const dateLabel=(value:string,locale:string)=>new Intl.DateTimeFormat(locale,{weekday:"short",day:"2-digit",month:"2-digit"}).format(new Date(`${value}T00:00:00`));
const timeLabel=(value:string,locale:string)=>new Intl.DateTimeFormat(locale,{hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(value));

export default function QuickBooking(){
  const router=useRouter();
  const {language}=useLanguage();
  const en=language==="en";
  const locale=en?"en-US":"vi-VN";
  const [movies,setMovies]=useState<Movie[]>([]);
  const [showtimes,setShowtimes]=useState<Showtime[]>([]);
  const [movieId,setMovieId]=useState("");
  const [cinemaId,setCinemaId]=useState("");
  const [date,setDate]=useState("");
  const [showtimeId,setShowtimeId]=useState("");
  const [error,setError]=useState("");

  useEffect(()=>{
    Promise.all([api<Movie[]>("/movies"),api<Showtime[]>("/showtimes")])
      .then(([m,s])=>{setMovies(m);setShowtimes(s);})
      .catch(e=>setError((e as Error).message));
  },[]);

  const movieShows=useMemo(()=>showtimes.filter(s=>!movieId||s.movieId===movieId),[showtimes,movieId]);
  const cinemas=useMemo(()=>{
    const map=new Map<string,{id:string;name:string}>();
    movieShows.forEach(s=>map.set(s.cinemaId,{id:s.cinemaId,name:s.cinemaName}));
    return [...map.values()].sort((a,b)=>a.name.localeCompare(b.name,en?"en":"vi"));
  },[movieShows,en]);
  const cinemaShows=useMemo(()=>movieShows.filter(s=>!cinemaId||s.cinemaId===cinemaId),[movieShows,cinemaId]);
  const dates=useMemo(()=>[...new Set(cinemaShows.map(s=>dateKey(s.startTime)))].sort().slice(0,14),[cinemaShows]);
  const times=useMemo(()=>cinemaShows.filter(s=>!date||dateKey(s.startTime)===date).sort((a,b)=>a.startTime.localeCompare(b.startTime)),[cinemaShows,date]);

  useEffect(()=>{ setCinemaId(""); setDate(""); setShowtimeId(""); },[movieId]);
  useEffect(()=>{ setDate(""); setShowtimeId(""); },[cinemaId]);
  useEffect(()=>{ setShowtimeId(""); },[date]);

  return <section className="quick-booking" aria-label={en?"Quick booking":"Đặt vé nhanh"}>
    <div className="quick-booking-head">
      <div>
        <p className="section-kicker">{en?"BOOK TICKETS":"ĐẶT VÉ"}</p>
        <h1 className="text-2xl font-bold md:text-3xl">{en?"Choose your preferred showtime":"Chọn suất chiếu phù hợp"}</h1>
      </div>
      <div className="hidden text-sm text-slate-400 md:block">{en?"4 steps: Movie → Cinema → Date → Showtime":"4 bước: Phim → Rạp → Ngày → Suất"}</div>
    </div>
    {error && <div className="mb-4 rounded-xl bg-red-950/50 p-3 text-sm text-red-300">{error}</div>}
    <div className="quick-booking-grid">
      <label><span>{en?"1. Movie":"1. Phim"}</span><select className="input" value={movieId} onChange={e=>setMovieId(e.target.value)}><option value="">{en?"Select movie":"Chọn phim"}</option>{movies.map(m=><option value={m.id} key={m.id}>{m.title}</option>)}</select></label>
      <label><span>{en?"2. Cinema":"2. Rạp"}</span><select className="input" value={cinemaId} onChange={e=>setCinemaId(e.target.value)} disabled={!movieId}><option value="">{en?"Select cinema":"Chọn rạp"}</option>{cinemas.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></label>
      <label><span>{en?"3. Date":"3. Ngày"}</span><select className="input" value={date} onChange={e=>setDate(e.target.value)} disabled={!cinemaId}><option value="">{en?"Select date":"Chọn ngày"}</option>{dates.map(d=><option value={d} key={d}>{dateLabel(d,locale)}</option>)}</select></label>
      <label><span>{en?"4. Showtime":"4. Suất"}</span><select className="input" value={showtimeId} onChange={e=>setShowtimeId(e.target.value)} disabled={!date}><option value="">{en?"Select time":"Chọn giờ"}</option>{times.map(s=><option value={s.id} key={s.id}>{timeLabel(s.startTime,locale)} · {currency(s.basePrice)}</option>)}</select></label>
      <button className="btn btn-primary quick-booking-submit" disabled={!showtimeId} onClick={()=>router.push(`/booking/${showtimeId}`)}>{en?"Choose seats":"Chọn ghế"}</button>
    </div>
  </section>
}
