/* eslint-disable @next/next/no-img-element -- native img is required for QR/data/user-provided image sources. */
"use client";

import Link from "next/link";
import type { Movie } from "@/lib/types";
import { api } from "@/lib/api";
import { getAuth } from "@/lib/auth";
import { usePresentationLanguage } from "@/lib/usePresentationLanguage";

const formatDate=(value:string|undefined, locale:string)=> value ? new Intl.DateTimeFormat(locale,{day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(`${value}T00:00:00`)) : "";

export default function MovieCard({movie,showBuy=true,trackingSource}:{movie:Movie;showBuy?:boolean;trackingSource?:string}){
  const { t, locale } = usePresentationLanguage();
  const track=()=>{if(!trackingSource||!getAuth())return;void api("/recommendations/events",{method:"POST",body:JSON.stringify({movieId:movie.id,eventType:"CLICK",source:trackingSource})}).catch(()=>{});};
  return <article className="movie-card group">
    <Link href={`/movies/${movie.id}`} onClick={track} className="movie-poster-wrap" data-i18n-skip="true" aria-label={`${t("Xem chi tiết","View details")} ${movie.title}`}>
      <img src={movie.posterUrl || "/icon.svg"} alt={movie.title} className="movie-poster"/>
      <div className="movie-poster-overlay"/>
      <span className="rating-badge">{movie.rating || "P"}</span>
      <div className="movie-hover-actions">
        <span className="btn btn-secondary">{t("Chi tiết","Details")}</span>
        {showBuy && <span className="btn btn-primary">{t("Mua vé","Buy tickets")}</span>}
      </div>
    </Link>
    <div className="p-4">
      <Link href={`/movies/${movie.id}`} onClick={track} className="block text-lg font-bold leading-snug hover:text-rose-400" data-testid="movie-card-title-v7808" data-i18n-skip="true">{movie.title}</Link>
      <div className="mt-2 flex items-center gap-2 text-xs text-slate-300">
        <span className="text-amber-400">★</span><b>{movie.averageRating?.toFixed(1) || "0.0"}</b><span className="text-slate-500">({movie.reviewCount||0} {t("đánh giá","reviews")})</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
        {movie.genre && <span data-testid="movie-card-genre-v7808" data-i18n-skip="true">{movie.genre}</span>}
        <span>{movie.durationMinutes} {t("phút","min")}</span>
        {movie.releaseDate && <span>{formatDate(movie.releaseDate,locale)}</span>}
      </div>
    </div>
  </article>
}
