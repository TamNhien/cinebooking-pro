"use client";
import Link from "next/link";
import { FormEvent, use, useEffect, useMemo, useState } from "react";
import { api, currency, dateTime } from "@/lib/api";
import { getAuth } from "@/lib/auth";
import StarRating from "@/components/StarRating";
import MovieCard from "@/components/MovieCard";
import type { Movie, MovieReview, RecommendationItem, Showtime } from "@/lib/types";

const dateLabel=(v:string)=>new Intl.DateTimeFormat("vi-VN",{weekday:"long",day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(v));
const localDateKey=(v:string)=>{const d=new Date(v);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`};
const timeLabel=(v:string)=>new Intl.DateTimeFormat("vi-VN",{hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(v));

export default function MoviePage({params}:{params:Promise<{id:string}>}){
  const {id}=use(params); const [movie,setMovie]=useState<Movie|null>(null); const [showtimes,setShowtimes]=useState<Showtime[]>([]); const [reviews,setReviews]=useState<MovieReview[]>([]); const [similar,setSimilar]=useState<RecommendationItem[]>([]); const [favorite,setFavorite]=useState(false); const [error,setError]=useState("");
  const [stars,setStars]=useState(5); const [comment,setComment]=useState(""); const [saving,setSaving]=useState(false); const [selectedDate,setSelectedDate]=useState(""); const auth=getAuth();
  async function load(){
    try{
      const [m,s,r,sim]=await Promise.all([api<Movie>(`/movies/${id}`),api<Showtime[]>(`/showtimes?movieId=${id}`),api<MovieReview[]>(`/movies/${id}/reviews`),api<RecommendationItem[]>(`/recommendations/similar/${id}?limit=4`)]);
      setMovie(m);setShowtimes(s);setReviews(r);setSimilar(sim);
      const mine=r.find(x=>x.mine); if(mine){setStars(mine.rating);setComment(mine.comment||"");}
      if(getAuth()){try{const f=await api<{favorite:boolean}>(`/me/favorites/${id}`);setFavorite(f.favorite);}catch{}}
    }catch(e){setError((e as Error).message)}
  }
  useEffect(()=>{void load();},[id]);
  const showtimeDates=useMemo(()=>[...new Set(showtimes.map(s=>localDateKey(s.startTime)))].sort(),[showtimes]);
  useEffect(()=>{if(showtimeDates.length&&!showtimeDates.includes(selectedDate))setSelectedDate(showtimeDates[0]);if(!showtimeDates.length&&selectedDate)setSelectedDate("");},[showtimeDates,selectedDate]);
  const selectedShows=useMemo(()=>showtimes.filter(s=>!selectedDate||localDateKey(s.startTime)===selectedDate),[showtimes,selectedDate]);
  const grouped=useMemo(()=>{const m=new Map<string,Showtime[]>();selectedShows.forEach(s=>{const a=m.get(s.cinemaId)||[];a.push(s);m.set(s.cinemaId,a)});return [...m.values()];},[selectedShows]);
  async function toggleFavorite(){ if(!getAuth()){location.href=`/login?returnTo=/movies/${id}`;return;} try{const r=await api<{favorite:boolean}>(`/me/favorites/${id}`,{method:"PUT",body:JSON.stringify({favorite:!favorite})});setFavorite(r.favorite);}catch(e){setError((e as Error).message)} }
  async function saveReview(e:FormEvent){e.preventDefault();if(!getAuth()){location.href=`/login?returnTo=/movies/${id}`;return;}setSaving(true);try{await api(`/movies/${id}/reviews/me`,{method:"PUT",body:JSON.stringify({rating:stars,comment})});await load();}catch(e){setError((e as Error).message)}finally{setSaving(false)}}
  async function removeReview(){if(!confirm("Xoá đánh giá của bạn?"))return;try{await api(`/movies/${id}/reviews/me`,{method:"DELETE"});setStars(5);setComment("");await load();}catch(e){setError((e as Error).message)}}
  if(error&&!movie) return <div className="card p-6 text-red-300">{error}</div>;
  if(!movie) return <div className="text-slate-400">Đang tải...</div>;
  const myReview=reviews.find(r=>r.mine);
  return <div className="space-y-8">
    {error&&<div className="card p-4 text-red-300">{error}</div>}
    <section className="movie-detail-hero">
      <img src={movie.posterUrl || "/icon.svg"} alt={movie.title} className="movie-detail-poster"/>
      <div className="min-w-0">
        <div className="flex flex-wrap gap-2"><span className="rating-badge static">{movie.rating||"P"}</span>{movie.genre&&<span className="meta-badge">{movie.genre}</span>}{movie.language&&<span className="meta-badge">{movie.language}</span>}</div>
        <h1 className="mt-4 text-3xl font-bold md:text-5xl">{movie.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-slate-400"><span>⏱ {movie.durationMinutes} phút</span>{movie.releaseDate&&<span>📅 Khởi chiếu {new Intl.DateTimeFormat("vi-VN").format(new Date(`${movie.releaseDate}T00:00:00`))}</span>}<span className="flex items-center gap-2"><span className="text-amber-400">★</span><b className="text-white">{movie.averageRating.toFixed(1)}</b> / 5 · {movie.reviewCount} đánh giá</span></div>
        <p className="mt-6 max-w-3xl leading-7 text-slate-300">{movie.description||"Thông tin phim đang được cập nhật."}</p>
        <div className="mt-6 flex flex-wrap gap-3">{movie.trailerUrl&&<a href={movie.trailerUrl} target="_blank" rel="noreferrer" className="btn btn-secondary">▶ Xem trailer</a>}<button onClick={toggleFavorite} className={favorite?"btn btn-primary":"btn btn-secondary"}>{favorite?"♥ Đã yêu thích":"♡ Thêm vào yêu thích"}</button></div>
      </div>
    </section>

    <section><div className="section-heading"><div><p className="section-kicker">LỊCH CHIẾU</p><h2>Chọn ngày, rạp và suất chiếu</h2><p className="mt-2 text-sm text-slate-400">Lịch được gom theo ngày để bạn không phải cuộn qua hàng chục ngày suất chiếu.</p></div></div>
      {showtimeDates.length>0&&<div className="card mb-5 space-y-4 p-4"><div className="flex flex-wrap items-end justify-between gap-3"><div className="text-sm text-slate-400">{selectedDate&&<>Đang xem <b className="capitalize text-white">{dateLabel(`${selectedDate}T00:00:00`)}</b> · <b className="text-white">{selectedShows.length}</b> suất</>}</div><label className="w-full sm:w-auto sm:min-w-52"><span className="mb-1 block text-xs font-semibold text-slate-400">Chọn ngày</span><input type="date" className="input" min={showtimeDates[0]} max={showtimeDates[showtimeDates.length-1]} value={selectedDate} onChange={e=>showtimeDates.includes(e.target.value)&&setSelectedDate(e.target.value)}/></label></div><div className="flex gap-2 overflow-x-auto pb-2">{showtimeDates.map(d=><button key={d} type="button" onClick={()=>setSelectedDate(d)} className={`date-chip shrink-0 ${selectedDate===d?"active":""}`}>{new Intl.DateTimeFormat("vi-VN",{weekday:"short",day:"2-digit",month:"2-digit"}).format(new Date(`${d}T00:00:00`))}</button>)}</div></div>}
      <div className="space-y-4">{grouped.map(items=>{const first=items[0];return <div className="card p-5" key={first.cinemaId}><div><h3 className="text-lg font-bold">{first.cinemaName}</h3><p className="text-sm text-slate-400">{first.cinemaAddress}</p></div><div className="mt-4 flex flex-wrap gap-3">{items.sort((a,b)=>a.startTime.localeCompare(b.startTime)).map(s=><Link href={`/booking/${s.id}`} key={s.id} className="showtime-chip"><b>{timeLabel(s.startTime)}</b><small>{s.auditoriumName}</small><small>{currency(s.basePrice)}</small></Link>)}</div></div>})}</div>
      {!showtimes.length&&<div className="empty-state">Chưa có suất chiếu sắp tới.</div>}
      {showtimes.length>0&&!grouped.length&&<div className="empty-state">Chưa có suất chiếu cho ngày đã chọn.</div>}
    </section>

    {similar.length>0&&<section><div className="section-heading"><div><p className="section-kicker">GỢI Ý LIÊN QUAN</p><h2>Có thể bạn cũng thích</h2></div></div><div className="movie-grid">{similar.map(x=><div key={x.movie.id} className="space-y-2"><MovieCard movie={x.movie} trackingSource="MOVIE_SIMILAR"/><div className="rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs text-slate-300">✨ {x.reason}</div></div>)}</div></section>}

    <section className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <form onSubmit={saveReview} className="card p-5 space-y-4 h-fit">
        <div><p className="section-kicker">THÀNH VIÊN</p><h2 className="text-xl font-bold">{myReview?"Cập nhật đánh giá":"Đánh giá phim"}</h2></div>
        <div><div className="mb-2 text-sm text-slate-400">Số sao</div><StarRating value={stars} onChange={setStars} size="lg"/></div>
        <textarea className="input min-h-32" value={comment} onChange={e=>setComment(e.target.value)} maxLength={1500} placeholder="Chia sẻ cảm nhận của bạn về bộ phim..."/>
        <button disabled={saving} className="btn btn-primary w-full">{saving?"Đang lưu...":myReview?"Cập nhật đánh giá":"Gửi đánh giá"}</button>
        {myReview&&<button type="button" onClick={removeReview} className="btn btn-secondary w-full">Xoá đánh giá</button>}
        {!auth&&<p className="text-xs text-slate-400">Bạn cần đăng nhập để gửi đánh giá.</p>}
      </form>
      <div className="space-y-3">
        <div className="section-heading"><div><p className="section-kicker">CỘNG ĐỒNG</p><h2>{reviews.length} đánh giá</h2></div></div>
        {reviews.length?reviews.map(r=><article key={r.id} className="card p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><b>{r.userName}</b><div className="mt-1"><StarRating value={r.rating} readonly size="sm"/></div></div><time className="text-xs text-slate-500">{dateTime(r.updatedAt)}</time></div>{r.comment&&<p className="mt-3 whitespace-pre-wrap leading-6 text-slate-300">{r.comment}</p>}</article>):<div className="empty-state">Chưa có đánh giá. Hãy là người đầu tiên chia sẻ cảm nhận.</div>}
      </div>
    </section>
  </div>;
}
