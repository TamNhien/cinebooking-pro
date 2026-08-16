"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, dateTime } from "@/lib/api";
import { clearAuth, getAuth } from "@/lib/auth";
import StarRating from "@/components/StarRating";
import type { MovieReview, UserProfile } from "@/lib/types";

export default function AdminReviewsPage(){
  const [reviews,setReviews]=useState<MovieReview[]>([]); const [msg,setMsg]=useState("");
  async function load(){
    try{const me=await api<UserProfile>("/me");if(me.role!=="ADMIN"){clearAuth();location.href="/login?returnTo=/admin/reviews";return;}setReviews(await api<MovieReview[]>("/admin/reviews"));}
    catch(e){setMsg((e as Error).message)}
  }
  useEffect(()=>{if(!getAuth()){location.href="/login?returnTo=/admin/reviews";return;}void load();},[]);
  async function remove(id:string){if(!confirm("Xoá đánh giá này?"))return;try{await api(`/admin/reviews/${id}`,{method:"DELETE"});await load();setMsg("Đã xoá đánh giá.");}catch(e){setMsg((e as Error).message)}}
  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="section-kicker">KIỂM DUYỆT</p><h1 className="text-3xl font-bold">Đánh giá phim</h1><p className="text-slate-400">Admin có thể theo dõi và xoá nội dung đánh giá không phù hợp.</p></div><Link href="/admin" className="btn btn-secondary">← Dashboard</Link></div>
    {msg&&<div className="card p-4 text-sm">{msg}</div>}
    <div className="space-y-3">{reviews.map(r=><article key={r.id} className="card p-5"><div className="flex flex-wrap justify-between gap-4"><div><b>{r.userName}</b><div><StarRating value={r.rating} readonly size="sm"/></div><div className="mt-1 text-xs text-slate-500">Movie ID: {r.movieId} · {dateTime(r.updatedAt)}</div></div><button onClick={()=>remove(r.id)} className="btn btn-secondary">Xoá</button></div>{r.comment&&<p className="mt-3 whitespace-pre-wrap text-slate-300">{r.comment}</p>}</article>)}</div>
    {!reviews.length&&<div className="empty-state">Chưa có đánh giá.</div>}
  </div>;
}
