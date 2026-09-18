"use client";

import { useEffect, useMemo, useState } from "react";
import MovieCard from "@/components/MovieCard";
import { api } from "@/lib/api";
import type { Movie } from "@/lib/types";
import { usePresentationLanguage } from "@/lib/usePresentationLanguage";
import { movieGenreLabel, movieLanguageLabel } from "@/lib/movie-presentation";

type MovieTab = "now"|"soon"|"all";
type SortMode = "featured"|"rating"|"release"|"duration"|"title";

const genreTokens=(value?:string)=>value?.split(/[,/|]/).map(x=>x.trim()).filter(Boolean)??[];

export default function MoviesPage(){
  const {t,language:uiLanguage}=usePresentationLanguage();
  const [movies,setMovies]=useState<Movie[]>([]);
  const [q,setQ]=useState("");
  const [tab,setTab]=useState<MovieTab>("now");
  const [genre,setGenre]=useState("all");
  const [language,setLanguage]=useState("all");
  const [rating,setRating]=useState("all");
  const [sort,setSort]=useState<SortMode>("featured");
  const [error,setError]=useState("");

  useEffect(()=>{api<Movie[]>("/movies").then(setMovies).catch(e=>setError((e as Error).message));},[]);

  const d=new Date();
  const today=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const genres=useMemo(()=>[...new Set(movies.flatMap(m=>genreTokens(m.genre)))].sort((a,b)=>a.localeCompare(b,"vi")),[movies]);
  const languages=useMemo(()=>[...new Set(movies.map(m=>m.language).filter((v):v is string=>!!v))].sort((a,b)=>a.localeCompare(b,"vi")),[movies]);
  const ratings=useMemo(()=>[...new Set(movies.map(m=>m.rating).filter((v):v is string=>!!v))].sort((a,b)=>a.localeCompare(b,"vi")),[movies]);

  const filtered=useMemo(()=>{
    const rows=movies.filter(m=>{
      const match=!q||`${m.title} ${m.genre||""} ${m.description||""} ${m.language||""}`.toLocaleLowerCase("vi").includes(q.toLocaleLowerCase("vi"));
      const status=tab==="all"||tab==="now"&&(!m.releaseDate||m.releaseDate<=today)||tab==="soon"&&!!m.releaseDate&&m.releaseDate>today;
      const genreMatch=genre==="all"||genreTokens(m.genre).includes(genre);
      const languageMatch=language==="all"||m.language===language;
      const ratingMatch=rating==="all"||m.rating===rating;
      return match&&status&&genreMatch&&languageMatch&&ratingMatch;
    });
    return rows.sort((a,b)=>{
      if(sort==="rating") return b.averageRating-a.averageRating||b.reviewCount-a.reviewCount||a.title.localeCompare(b.title,"vi");
      if(sort==="release") return (b.releaseDate||"").localeCompare(a.releaseDate||"")||a.title.localeCompare(b.title,"vi");
      if(sort==="duration") return a.durationMinutes-b.durationMinutes||a.title.localeCompare(b.title,"vi");
      if(sort==="title") return a.title.localeCompare(b.title,"vi");
      return Number(b.active)-Number(a.active)||(b.releaseDate||"").localeCompare(a.releaseDate||"")||a.title.localeCompare(b.title,"vi");
    });
  },[movies,q,tab,today,genre,language,rating,sort]);

  const hasFilters=q||tab!=="now"||genre!=="all"||language!=="all"||rating!=="all"||sort!=="featured";
  function resetFilters(){setQ("");setTab("now");setGenre("all");setLanguage("all");setRating("all");setSort("featured");}

  return <div className="space-y-6">
    <div className="section-heading"><div><p className="section-kicker">{t("DANH SÁCH PHIM","MOVIE LIST")}</p><h1>{t("Khám phá phim","Explore movies")}</h1><p className="mt-2 text-sm text-slate-400">{t("Tìm nhanh theo thể loại, ngôn ngữ, phân loại độ tuổi và sắp xếp theo nhu cầu.","Quickly filter by genre, language and age rating, then sort to match your needs.")}</p></div></div>

    <div className="card space-y-4 p-4">
      <div className="flex flex-wrap gap-2">
        <button className={`tab-pill ${tab==="now"?"active":""}`} onClick={()=>setTab("now")}>{t("Đang chiếu","Now showing")}</button>
        <button className={`tab-pill ${tab==="soon"?"active":""}`} onClick={()=>setTab("soon")}>{t("Sắp chiếu","Coming soon")}</button>
        <button className={`tab-pill ${tab==="all"?"active":""}`} onClick={()=>setTab("all")}>{t("Tất cả","All")}</button>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <label className="xl:col-span-2"><span data-testid="movies-search-label" className="mb-1 block text-xs font-semibold text-slate-400">{t("Tìm phim","Search movies")}</span><input className="input" value={q} onChange={e=>setQ(e.target.value)} placeholder={t("Tên phim, mô tả, thể loại...","Movie title, description, genre...")}/></label>
        <label><span data-testid="movies-genre-label" className="mb-1 block text-xs font-semibold text-slate-400">{t("Thể loại","Genre")}</span><select className="input" value={genre} onChange={e=>setGenre(e.target.value)}><option value="all">{t("Tất cả thể loại","All genres")}</option>{genres.map(x=><option key={x} value={x}>{movieGenreLabel(x,uiLanguage)}</option>)}</select></label>
        <label><span data-testid="movies-language-label" className="mb-1 block text-xs font-semibold text-slate-400">{t("Ngôn ngữ","Language")}</span><select className="input" value={language} onChange={e=>setLanguage(e.target.value)}><option value="all">{t("Tất cả ngôn ngữ","All languages")}</option>{languages.map(x=><option key={x} value={x}>{movieLanguageLabel(x,uiLanguage)}</option>)}</select></label>
        <label><span data-testid="movies-rating-label" className="mb-1 block text-xs font-semibold text-slate-400">{t("Phân loại","Rating")}</span><select className="input" value={rating} onChange={e=>setRating(e.target.value)}><option value="all">{t("Tất cả phân loại","All ratings")}</option>{ratings.map(x=><option key={x} value={x} data-i18n-skip="true">{x}</option>)}</select></label>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-3 border-t border-slate-800 pt-4">
        <div className="text-sm text-slate-400"><b className="text-white">{filtered.length}</b> {t("phim phù hợp","matching movies")}</div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="min-w-52"><span className="mb-1 block text-xs font-semibold text-slate-400">{t("Sắp xếp","Sort")}</span><select className="input" value={sort} onChange={e=>setSort(e.target.value as SortMode)}><option value="featured">{t("Nổi bật","Featured")}</option><option value="rating">{t("Đánh giá cao","Highest rated")}</option><option value="release">{t("Ngày khởi chiếu mới nhất","Newest release date")}</option><option value="duration">{t("Thời lượng ngắn trước","Shortest duration first")}</option><option value="title">{t("Tên A → Z","Title A → Z")}</option></select></label>
          {hasFilters&&<button type="button" className="btn btn-secondary" onClick={resetFilters}>{t("Đặt lại","Reset")}</button>}
        </div>
      </div>
    </div>

    {error&&<div className="rounded-xl bg-red-950/50 p-4 text-red-300">{error}</div>}
    <div className="movie-grid">{filtered.map(m=><MovieCard key={m.id} movie={m}/>)}</div>
    {!error&&!filtered.length&&<div className="empty-state">{t("Không tìm thấy phim phù hợp. Hãy thử bỏ bớt bộ lọc.","No matching movies found. Try clearing some filters.")}</div>}
  </div>;
}
