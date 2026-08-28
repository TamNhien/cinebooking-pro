"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getAuth } from "@/lib/auth";
import type { RecommendationFeedbackResponse, RecommendationHome, RecommendationItem, RecommendationMode, RecommendationTasteProfile } from "@/lib/types";
import MovieCard from "@/components/MovieCard";
import { useLanguage } from "@/components/LanguageProvider";

type FeedbackType="MORE_LIKE_THIS"|"LESS_LIKE_THIS"|"HIDE";

const modes:RecommendationMode[]=["FAMILIAR","BALANCED","DISCOVERY"];

export default function ForYouPage(){
  const {language}=useLanguage(); const en=language==="en";
  const [home,setHome]=useState<RecommendationHome|null>(null);
  const [profile,setProfile]=useState<RecommendationTasteProfile|null>(null);
  const [mode,setMode]=useState<RecommendationMode>("BALANCED");
  const [busy,setBusy]=useState<string|null>(null);
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");

  async function load(nextMode:RecommendationMode=mode){
    try{
      const [h,p]=await Promise.all([
        api<RecommendationHome>(`/recommendations/home?limit=12&mode=${nextMode}`),
        api<RecommendationTasteProfile>("/recommendations/profile")
      ]);
      setHome(h); setProfile(p); setMode(h.mode||nextMode); setError("");
    }catch(e){setError((e as Error).message)}
  }

  useEffect(()=>{
    if(!getAuth()){location.href="/login?returnTo=/for-you";return;}
    void load("BALANCED");
  // Compatibility lineage: V50 · RECOMMENDATION INTELLIGENCE 2.0 · Gu phim của bạn · GỢI Ý CÓ GIẢI THÍCH
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  async function changeMode(next:RecommendationMode){
    if(next===mode&&home)return;
    setBusy(`MODE_${next}`); setMessage(""); setError(""); setMode(next);
    try{await load(next);}finally{setBusy(null)}
  }

  async function sendFeedback(item:RecommendationItem,type:FeedbackType){
    setBusy(item.movie.id+type); setMessage(""); setError("");
    try{
      const r=await api<RecommendationFeedbackResponse>("/recommendations/feedback",{method:"PUT",body:JSON.stringify({movieId:item.movie.id,feedbackType:type,source:"FOR_YOU_V63"})});
      setMessage(r.message); await load(mode);
    }catch(e){setError((e as Error).message)}finally{setBusy(null)}
  }

  async function clear(item:RecommendationItem){
    setBusy(item.movie.id+"CLEAR"); setMessage(""); setError("");
    try{await api(`/recommendations/feedback/${item.movie.id}`,{method:"DELETE"});setMessage(en?"Preference cleared.":"Đã xóa phản hồi cho phim này.");await load(mode);}
    catch(e){setError((e as Error).message)}finally{setBusy(null)}
  }

  const items=home?.personalizedMovies||[];
  const modeLabel=(value:RecommendationMode)=>value==="FAMILIAR"?(en?"Stay close":"Bám gu"):value==="DISCOVERY"?(en?"Explore":"Khám phá"):(en?"Balanced":"Cân bằng");
  const modeHint=(value:RecommendationMode)=>value==="FAMILIAR"?(en?"Prioritize known taste":"Ưu tiên gu đã học"):value==="DISCOVERY"?(en?"More novelty + diversity":"Tăng mới lạ + đa dạng"):(en?"Taste + context + discovery":"Gu + ngữ cảnh + khám phá");

  return <div className="space-y-8" data-testid="for-you-v50" data-version="v63">
    <div data-testid="for-you-v63" className="space-y-8">
      <section className="rounded-3xl border border-violet-700/40 bg-gradient-to-br from-violet-950/55 via-slate-950 to-rose-950/30 p-6 md:p-8">
        <p className="section-kicker">V63 · RECOMMENDATION 4.0</p>
        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div><h1 className="text-3xl font-black">{en?"Deeply personalized movie picks":"Gợi ý phim cá nhân hóa sâu"}</h1><p className="mt-2 max-w-4xl text-sm leading-6 text-slate-300">{profile?.summary||home?.profileSummary||(en?"Building your deep taste profile...":"Đang xây dựng hồ sơ gu phim sâu hơn...")}</p></div>
          <Link href="/favorites" className="btn btn-secondary">❤️ {en?"Favorites":"Phim yêu thích"}</Link>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-700 bg-slate-950/55 p-4" data-testid="recommendation-mode-v63">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><b>{en?"Recommendation balance":"Mức cân bằng gợi ý"}</b><p className="mt-1 text-xs text-slate-400">{en?"Switch ranking behavior without changing or fabricating your history.":"Đổi cách xếp hạng mà không sửa hay tạo giả lịch sử của bạn."}</p></div><div className="grid grid-cols-3 gap-2">
            {modes.map(value=><button key={value} type="button" data-testid={`recommendation-mode-${value.toLowerCase()}`} disabled={!!busy} onClick={()=>changeMode(value)} className={`rounded-xl border px-3 py-2 text-left text-xs ${mode===value?"border-violet-400 bg-violet-950/60 text-violet-100":"border-slate-700 bg-slate-900 text-slate-300"}`}><b className="block">{modeLabel(value)}</b><span className="mt-0.5 block text-[11px] text-slate-400">{modeHint(value)}</span></button>)}
          </div></div>
        </div>

        {profile&&<div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6" data-testid="taste-profile">
          <div className="rounded-2xl border border-slate-700 bg-slate-950/55 p-4"><div className="text-xs text-slate-400">{en?"Profile strength":"Độ mạnh hồ sơ"}</div><b className="mt-1 block text-xl">{profile.profileStrength}%</b><div className="mt-2 h-1.5 rounded-full bg-slate-800"><div className="h-1.5 rounded-full bg-violet-500" style={{width:`${profile.profileStrength}%`}}/></div></div>
          <div className="rounded-2xl border border-slate-700 bg-slate-950/55 p-4"><div className="text-xs text-slate-400">{en?"Top genres":"Thể loại nổi bật"}</div><b className="mt-1 block">{profile.topGenres.slice(0,3).map(x=>x.name).join(" · ")||(en?"Learning":"Đang học")}</b></div>
          <div className="rounded-2xl border border-slate-700 bg-slate-950/55 p-4"><div className="text-xs text-slate-400">{en?"Languages":"Ngôn ngữ hợp gu"}</div><b className="mt-1 block">{profile.topLanguages?.slice(0,2).map(x=>x.name).join(" · ")||"—"}</b></div>
          <div className="rounded-2xl border border-slate-700 bg-slate-950/55 p-4"><div className="text-xs text-slate-400">{en?"Typical duration":"Thời lượng thường xem"}</div><b className="mt-1 block">{profile.preferredDurationLabel||"—"}</b></div>
          <div className="rounded-2xl border border-slate-700 bg-slate-950/55 p-4"><div className="text-xs text-slate-400">{en?"Schedule fit":"Lịch xem quen thuộc"}</div><b className="mt-1 block">{[profile.preferredWeekdayLabel,profile.preferredDaypartLabel].filter(Boolean).join(" · ")||"—"}</b><span className="mt-1 block text-[11px] text-slate-500">{profile.preferredCinemaName||""}</span></div>
          <div className="rounded-2xl border border-slate-700 bg-slate-950/55 p-4"><div className="text-xs text-slate-400">{en?"Taste signals":"Tín hiệu cá nhân"}</div><b className="mt-1 block">{profile.signalCount} · {profile.feedbackCount} {en?"feedback":"phản hồi"}</b><span className="mt-1 block text-[11px] text-slate-500">{profile.hiddenCount} {en?"hidden":"đã ẩn"}</span></div>
        </div>}
      </section>

      {message&&<div className="rounded-xl border border-emerald-700/50 bg-emerald-950/40 p-3 text-sm text-emerald-200" data-testid="recommendation-feedback-message">{message}</div>}
      {error&&<div className="rounded-xl border border-red-700/50 bg-red-950/40 p-3 text-sm text-red-200">{error}</div>}

      <section>
        <div className="section-heading"><div><p className="section-kicker">{en?"DEEP EXPLAINABLE PICKS":"GỢI Ý SÂU CÓ GIẢI THÍCH"}</p><h2>{en?"Why each movie fits you":"Vì sao từng phim hợp với bạn"}</h2><p className="mt-2 max-w-4xl text-sm text-slate-400">{en?"V63 combines genre, language, content rating, duration, recency, explicit feedback and real future showtime context, then applies a deterministic diversity reranker to reduce repetitive picks.":"V63 kết hợp thể loại, ngôn ngữ, phân loại nội dung, thời lượng, độ mới hành vi, phản hồi trực tiếp và lịch chiếu thật sắp tới; sau đó rerank đa dạng theo cách xác định để giảm gợi ý lặp gu."}</p></div></div>
        <div className="movie-grid" data-testid="recommendation-grid-v50" data-v63-grid="true">
          {items.map(item=><div key={item.movie.id} className="space-y-2" data-testid="recommendation-item-v50" data-v63-item="true">
            <MovieCard movie={item.movie} trackingSource={`FOR_YOU_V63_${mode}`}/>
            <div className="rounded-2xl border border-violet-700/35 bg-violet-950/20 p-3 text-xs leading-5">
              <div className="flex items-start justify-between gap-3"><div><b className="text-violet-100">✨ {item.reason}</b>{item.newToYou&&<span className="ml-2 rounded-full border border-cyan-700/60 bg-cyan-950/40 px-2 py-0.5 text-[10px] text-cyan-200" data-testid="new-to-you-v63">MỚI VỚI BẠN</span>}</div><span className="whitespace-nowrap text-emerald-300">{item.confidence}%</span></div>
              {!!item.signals?.length&&<div className="mt-2 flex flex-wrap gap-1">{item.signals.map(s=><span key={s} className="rounded-full border border-slate-700 px-2 py-0.5 text-slate-300">{s}</span>)}</div>}
              {!!item.scoreBreakdown?.length&&<div className="mt-3 border-t border-slate-800 pt-2" data-testid="score-breakdown-v63"><div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">{en?"Ranking contributions":"Đóng góp xếp hạng"}</div><div className="flex flex-wrap gap-1">{item.scoreBreakdown.slice(0,4).map(part=><span key={part.key} title={part.evidence} className="rounded-lg bg-slate-900 px-2 py-1 text-[11px] text-slate-300">{part.label} <b className={part.contribution>=0?"text-emerald-300":"text-amber-300"}>{part.contribution>=0?"+":""}{part.contribution.toFixed(1)}</b></span>)}</div></div>}
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
        <b className="text-slate-200">{en?"How V63 learns":"V63 học gu như thế nào"}</b>
        <p className="mt-2">{en?"V63 reuses only real data already present in CineBooking: favorites, ratings, confirmed bookings, click/view recency, explicit MORE/LESS/HIDE feedback, movie metadata and future OPEN showtimes. No synthetic movie or fake taste history is created.":"V63 chỉ tái sử dụng dữ liệu thật đã có trong CineBooking: yêu thích, đánh giá, booking CONFIRMED, click/view có decay, MORE/LESS/HIDE, metadata phim và suất OPEN tương lai. Không tạo phim giả hay lịch sử gu giả."}</p>
        <div className="mt-2 text-xs">Algorithm: <code>{profile?.algorithmVersion||home?.algorithmVersion||"V63-DEEP-CONTEXT-4"}</code> · Mode: <code>{home?.mode||mode}</code></div>
      </section>
    </div>
  </div>;
}
