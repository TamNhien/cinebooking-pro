"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getAuth } from "@/lib/auth";
import MovieCard from "@/components/MovieCard";
import type { Movie } from "@/lib/types";

export default function FavoritesPage(){
  const [movies,setMovies]=useState<Movie[]>([]); const [error,setError]=useState("");
  useEffect(()=>{ if(!getAuth()){location.href="/login?returnTo=/favorites";return;} api<Movie[]>("/me/favorites").then(setMovies).catch(e=>setError((e as Error).message)); },[]);
  return <div className="space-y-6">
    <div><p className="section-kicker">DANH SÁCH CỦA TÔI</p><h1 className="text-3xl font-bold">Phim yêu thích</h1><p className="text-slate-400">Lưu phim bạn quan tâm để xem lịch chiếu nhanh hơn.</p></div>
    {error&&<div className="card p-4 text-red-300">{error}</div>}
    {movies.length?<div className="movie-grid">{movies.map(m=><MovieCard key={m.id} movie={m}/>)}</div>:!error&&<div className="empty-state">Bạn chưa lưu phim yêu thích nào.</div>}
  </div>;
}
