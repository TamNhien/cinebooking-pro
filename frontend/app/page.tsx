"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { getAuth } from "@/lib/auth";
import type { Movie, RecommendationHome, RecommendationItem } from "@/lib/types";
import MovieCard from "@/components/MovieCard";
import QuickBooking from "@/components/QuickBooking";
import { useLanguage } from "@/components/LanguageProvider";

const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`};

function RecommendationGrid({items,source}:{items:RecommendationItem[];source:string}){
  return <div className="movie-grid">{items.map(item=><div key={item.movie.id} className="space-y-2"><MovieCard movie={item.movie} trackingSource={source}/><div className="rounded-xl border border-rose-500/20 bg-rose-950/20 px-3 py-2 text-xs leading-5 text-rose-100"><b>✨ {item.reason}</b>{item.matchedGenres.length>0&&<div className="mt-1 text-slate-400">{item.matchedGenres.join(" · ")}</div>}</div></div>)}</div>;
}

export default function Home(){
  const {language}=useLanguage();
  const en=language==="en";
  const [movies,setMovies]=useState<Movie[]>([]);
  const [recommendations,setRecommendations]=useState<RecommendationHome|null>(null);
  const [tab,setTab]=useState<"now"|"soon">("now");
  const [error,setError]=useState("");
  useEffect(()=>{
    api<Movie[]>("/movies").then(setMovies).catch(e=>setError((e as Error).message));
    api<RecommendationHome>("/recommendations/home?limit=4").then(setRecommendations).catch(()=>{});
  },[]);

  const currentDay=today();
  const now=useMemo(()=>movies.filter(m=>!m.releaseDate||m.releaseDate<=currentDay),[movies,currentDay]);
  const soon=useMemo(()=>movies.filter(m=>!!m.releaseDate&&m.releaseDate>currentDay),[movies,currentDay]);
  const shown=(tab==="now"?now:soon).slice(0,8);
  const loggedIn=!!getAuth();

  return <div className="space-y-10">
    <QuickBooking/>

    {loggedIn&&recommendations?.personalizedMovies.length ? <section>
      <div className="section-heading"><div><p className="section-kicker">{en?"PERSONALIZED":"DÀNH CHO BẠN"}</p><h2>{en?"Picked for your taste":"Phim hợp gu của bạn"}</h2><p className="mt-2 max-w-2xl text-sm text-slate-400">{recommendations.profileSummary}</p></div></div>
      <RecommendationGrid items={recommendations.personalizedMovies} source="HOME_PERSONALIZED"/>
    </section>:null}

    {recommendations?.trendingMovies.length ? <section>
      <div className="section-heading"><div><p className="section-kicker">{en?"TRENDING":"XU HƯỚNG"}</p><h2>{en?"Popular at CineBooking":"Đang được quan tâm"}</h2></div></div>
      <RecommendationGrid items={recommendations.trendingMovies} source="HOME_TRENDING"/>
    </section>:null}

    <section>
      <div className="section-heading">
        <div><p className="section-kicker">{en?"CINEMA":"ĐIỆN ẢNH"}</p><h2>{en?"Movies at CineBooking":"Phim tại CineBooking"}</h2></div>
        <Link href="/movies" className="text-sm font-semibold text-rose-400 hover:text-rose-300">{en?"View all →":"Xem tất cả →"}</Link>
      </div>
      <div className="mb-6 flex gap-2"><button className={`tab-pill ${tab==="now"?"active":""}`} onClick={()=>setTab("now")}>{en?"Now showing":"Đang chiếu"}</button><button className={`tab-pill ${tab==="soon"?"active":""}`} onClick={()=>setTab("soon")}>{en?"Coming soon":"Sắp chiếu"}</button></div>
      {error&&<p className="rounded-xl bg-red-950/50 p-4 text-red-300">{error}</p>}
      <div className="movie-grid">{shown.map(m=><MovieCard key={m.id} movie={m}/>)}</div>
      {!error&&!shown.length&&<div className="empty-state">{en?"No movies in this category yet.":"Chưa có phim trong danh mục này."}</div>}
    </section>

    <section className="feature-strip">
      <div><span>🎟️</span><div><b>{en?"Online booking":"Đặt vé trực tuyến"}</b><p>{en?"Choose a movie, cinema, date and showtime in one simple flow.":"Chọn phim, rạp, ngày và suất chiếu trong một luồng."}</p></div></div>
      <div><span>💺</span><div><b>{en?"Realtime seats":"Ghế realtime"}</b><p>{en?"Seat availability updates instantly to reduce duplicate bookings.":"Trạng thái ghế cập nhật tức thời, hạn chế đặt trùng."}</p></div></div>
      <div><span>🎯</span><div><b>{en?"Smart recommendations":"Gợi ý thông minh"}</b><p>{en?"Recommendations improve from favorites, ratings and booking history.":"Gợi ý học từ yêu thích, đánh giá và lịch sử đặt vé."}</p></div></div>
    </section>

    <section>
      <div className="section-heading"><div><p className="section-kicker">{en?"BENEFITS":"ƯU ĐÃI"}</p><h2>{en?"Promotions & services":"Ưu đãi & tiện ích"}</h2></div><Link href="/promotions" className="text-sm font-semibold text-rose-400">{en?"View more →":"Xem thêm →"}</Link></div>
      <div className="promo-grid">
        <Link href="/promotions" className="promo-card promo-one"><small>{en?"MEMBERS":"THÀNH VIÊN"}</small><h3>{en?"Earn points with every booking":"Tích điểm mỗi lần đặt vé"}</h3><p>{en?"Track ticket history and membership benefits.":"Theo dõi lịch sử vé và quyền lợi hạng thành viên."}</p></Link>
        <Link href="/promotions" className="promo-card promo-two"><small>{en?"ONLINE BOOKING":"ĐẶT VÉ ONLINE"}</small><h3>{en?"Choose seats before arriving":"Chọn ghế trước khi đến rạp"}</h3><p>{en?"Hold seats for a limited time and pay online.":"Giữ ghế trong thời gian giới hạn và thanh toán trực tuyến."}</p></Link>
        <Link href="/cinemas" className="promo-card promo-three"><small>{en?"SHOWTIMES":"LỊCH CHIẾU"}</small><h3>{en?"Find cinemas and showtimes":"Tìm rạp và suất chiếu"}</h3><p>{en?"Browse schedules by cinema and choose a convenient time.":"Xem lịch theo từng cụm rạp và chọn giờ phù hợp."}</p></Link>
      </div>
    </section>
  </div>;
}
