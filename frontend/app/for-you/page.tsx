"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getAuth } from "@/lib/auth";
import type { RecommendationFeedbackResponse, RecommendationHome, RecommendationItem, RecommendationTasteProfile } from "@/lib/types";
import MovieCard from "@/components/MovieCard";
import { useLanguage } from "@/components/LanguageProvider";

type FeedbackType="MORE_LIKE_THIS"|"LESS_LIKE_THIS"|"HIDE";

export default function ForYouPage(){
  const {language}=useLanguage(); const en=language==="en";
  const [home,setHome]=useState<RecommendationHome|null>(null);
  const [profile,setProfile]=useState<RecommendationTasteProfile|null>(null);
  const [busy,setBusy]=useState<string|null>(null);
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");

  async function load(){
    try{
      const [h,p]=await Promise.all([
        api<RecommendationHome>("/recommendations/home?limit=12"),
        api<RecommendationTasteProfile>("/recommendations/profile")
      ]);
      setHome(h); setProfile(p); setError("");
    }catch(e){setError((e as Error).message)}
  }

  useEffect(()=>{
    if(!getAuth()){location.href="/login?returnTo=/for-you";return;}
    void load();
  },[]);

  async function sendFeedback(item:RecommendationItem,type:FeedbackType){
    setBusy(item.movie.id+type); setMessage(""); setError("");
    try{
      const r=await api<RecommendationFeedbackResponse>("/recommendations/feedback",{method:"PUT",body:JSON.stringify({movieId:item.movie.id,feedbackType:type,source:"FOR_YOU_V50"})});
      setMessage(r.message); await load();
    }catch(e){setError((e as Error).message)}finally{setBusy(null)}
  }

  async function clear(item:RecommendationItem){
    setBusy(item.movie.id+"CLEAR"); setMessage(""); setError("");
    try{await api(`/recommendations/feedback/${item.movie.id}`,{method:"DELETE"});setMessage(en?"Preference cleared.":"Đã xóa phản hồi cho phim này.");await load();}
    catch(e){setError((e as Error).message)}finally{setBusy(null)}
  }

  const items=home?.personalizedMovies||[];

  return <div className="space-y-8" data-testid="for-you-v50">
    <section className="rounded-3xl border border-violet-700/40 bg-gradient-to-br from-violet-950/55 via-slate-950 to-rose-950/30 p-6 md:p-8">
      <p className="section-kicker">V50 · RECOMMENDATION INTELLIGENCE 2.0</p>
      <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div><h1 className="text-3xl font-black">{en?"Your movie taste":"Gu phim của bạn"}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">{profile?.summary||home?.profileSummary||(en?"Building your taste profile...":"Đang xây dựng hồ sơ gu phim...")}</p></div>
        <Link href="/favorites" className="btn btn-secondary">❤️ {en?"Favorites":"Phim yêu thích"}</Link>
      </div>

      {profile&&<div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-testid="taste-profile">
        <div className="rounded-2xl border border-slate-700 bg-slate-950/55 p-4"><div className="text-xs text-slate-400">{en?"Top genres":"Thể loại nổi bật"}</div><b className="mt-1 block">{profile.topGenres.slice(0,3).map(x=>x.name).join(" · ")||(en?"Learning":"Đang học")}</b></div>
        <div className="rounded-2xl border border-slate-700 bg-slate-950/55 p-4"><div className="text-xs text-slate-400">{en?"Preferred cinema":"Rạp thường xem"}</div><b className="mt-1 block">{profile.preferredCinemaName||"—"}</b></div>
        <div className="rounded-2xl border border-slate-700 bg-slate-950/55 p-4"><div className="text-xs text-slate-400">{en?"Preferred time":"Khung giờ thường xem"}</div><b className="mt-1 block">{profile.preferredDaypartLabel||"—"}</b></div>
        <div className="rounded-2xl border border-slate-700 bg-slate-950/55 p-4"><div className="text-xs text-slate-400">{en?"Taste signals":"Tín hiệu gu phim"}</div><b className="mt-1 block">{profile.signalCount} · {profile.feedbackCount} {en?"feedback":"phản hồi"}</b></div>
      </div>}
    </section>

    {message&&<div className="rounded-xl border border-emerald-700/50 bg-emerald-950/40 p-3 text-sm text-emerald-200" data-testid="recommendation-feedback-message">{message}</div>}
    {error&&<div className="rounded-xl border border-red-700/50 bg-red-950/40 p-3 text-sm text-red-200">{error}</div>}

    <section>
      <div className="section-heading"><div><p className="section-kicker">{en?"EXPLAINABLE PICKS":"GỢI Ý CÓ GIẢI THÍCH"}</p><h2>{en?"Tune recommendations with one tap":"Tinh chỉnh gợi ý bằng một chạm"}</h2><p className="mt-2 max-w-3xl text-sm text-slate-400">{en?"CineBooking combines favorites, ratings, bookings, recency, preferred cinema/time and your explicit feedback. Hidden movies are removed from your personal list.":"CineBooking kết hợp yêu thích, đánh giá, lịch sử đặt vé, độ mới của hành vi, rạp/khung giờ thường xem và phản hồi trực tiếp của bạn. Phim đã ẩn sẽ bị loại khỏi danh sách cá nhân."}</p></div></div>
      <div className="movie-grid" data-testid="recommendation-grid-v50">
        {items.map(item=><div key={item.movie.id} className="space-y-2" data-testid="recommendation-item-v50">
          <MovieCard movie={item.movie} trackingSource="FOR_YOU_V50"/>
          <div className="rounded-2xl border border-violet-700/35 bg-violet-950/20 p-3 text-xs leading-5">
            <div className="flex items-center justify-between gap-3"><b className="text-violet-100">✨ {item.reason}</b><span className="whitespace-nowrap text-emerald-300">{item.confidence}%</span></div>
            {!!item.signals?.length&&<div className="mt-2 flex flex-wrap gap-1">{item.signals.map(s=><span key={s} className="rounded-full border border-slate-700 px-2 py-0.5 text-slate-300">{s}</span>)}</div>}
            <div className="mt-3 grid grid-cols-3 gap-1.5">
              <button type="button" data-testid="more-like-this" className={`rounded-lg border px-2 py-2 ${item.feedback==="MORE_LIKE_THIS"?"border-emerald-500 bg-emerald-950/50 text-emerald-200":"border-slate-700 bg-slate-900"}`} disabled={!!busy} onClick={()=>sendFeedback(item,"MORE_LIKE_THIS")}>👍 {en?"More like this":"Thêm tương tự"}</button>
              <button type="button" data-testid="less-like-this" className={`rounded-lg border px-2 py-2 ${item.feedback==="LESS_LIKE_THIS"?"border-amber-500 bg-amber-950/40 text-amber-200":"border-slate-700 bg-slate-900"}`} disabled={!!busy} onClick={()=>sendFeedback(item,"LESS_LIKE_THIS")}>👎 {en?"Less like this":"Ít tương tự"}</button>
              <button type="button" data-testid="hide-recommendation" className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-2" disabled={!!busy} onClick={()=>sendFeedback(item,"HIDE")}>🙈 {en?"Hide":"Ẩn"}</button>
            </div>
            {item.feedback&&item.feedback!=="HIDE"&&<button type="button" data-testid="clear-recommendation-feedback" className="mt-2 text-slate-400 underline hover:text-slate-200" disabled={!!busy} onClick={()=>clear(item)}>{en?"Clear feedback":"Xóa phản hồi"}</button>}
          </div>
        </div>)}
      </div>
      {!items.length&&<div className="empty-state">{en?"No recommendation candidates are available yet.":"Chưa có phim phù hợp để gợi ý."}</div>}
    </section>

    <section className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5 text-sm text-slate-400">
      <b className="text-slate-200">{en?"How V50 learns":"V50 học gu như thế nào"}</b>
      <p className="mt-2">{en?"Positive ratings/favorites/bookings increase genre affinity; low ratings and “less like this” reduce it; “more like this” creates a strong anchor; “hide” removes the movie. Recent clicks/views decay over time so old browsing does not dominate forever.":"Đánh giá tích cực/yêu thích/đặt vé tăng độ hợp thể loại; đánh giá thấp và “ít tương tự” làm giảm; “thêm tương tự” tạo neo gu mạnh; “ẩn” loại phim. Click/view gần đây có trọng số giảm dần theo thời gian để hành vi cũ không chi phối mãi."}</p>
      <div className="mt-2 text-xs">Algorithm: <code>{profile?.algorithmVersion||home?.algorithmVersion||"V50-HYBRID-TASTE-2"}</code></div>
    </section>
  </div>;
}
