"use client";

import { useEffect, useMemo, useState } from "react";
import MovieCard from "@/components/MovieCard";
import { api } from "@/lib/api";
import type { Movie } from "@/lib/types";

export default function MoviesPage(){
  const [movies,setMovies]=useState<Movie[]>([]); const [q,setQ]=useState(""); const [tab,setTab]=useState<"now"|"soon"|"all">("now"); const [error,setError]=useState("");
  useEffect(()=>{api<Movie[]>("/movies").then(setMovies).catch(e=>setError((e as Error).message));},[]);
  const d=new Date(); const today=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const filtered=useMemo(()=>movies.filter(m=>{
    const match=!q||`${m.title} ${m.genre||""} ${m.description||""}`.toLocaleLowerCase("vi").includes(q.toLocaleLowerCase("vi"));
    const status=tab==="all"||tab==="now"&&(!m.releaseDate||m.releaseDate<=today)||tab==="soon"&&!!m.releaseDate&&m.releaseDate>today;
    return match&&status;
  }),[movies,q,tab,today]);
  return <div className="space-y-6">
    <div className="section-heading"><div><p className="section-kicker">DANH SÁCH PHIM</p><h1>Khám phá phim</h1></div></div>
    <div className="toolbar"><div className="flex flex-wrap gap-2"><button className={`tab-pill ${tab==="now"?"active":""}`} onClick={()=>setTab("now")}>Đang chiếu</button><button className={`tab-pill ${tab==="soon"?"active":""}`} onClick={()=>setTab("soon")}>Sắp chiếu</button><button className={`tab-pill ${tab==="all"?"active":""}`} onClick={()=>setTab("all")}>Tất cả</button></div><input className="input max-w-md" value={q} onChange={e=>setQ(e.target.value)} placeholder="Tìm tên phim, thể loại..."/></div>
    {error&&<div className="rounded-xl bg-red-950/50 p-4 text-red-300">{error}</div>}
    <div className="movie-grid">{filtered.map(m=><MovieCard key={m.id} movie={m}/>)}</div>
    {!error&&!filtered.length&&<div className="empty-state">Không tìm thấy phim phù hợp.</div>}
  </div>;
}
