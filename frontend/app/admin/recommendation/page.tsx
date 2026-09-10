/* eslint-disable react-hooks/set-state-in-effect -- initial effect loads authenticated recommendation quality snapshots. */
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, currency, dateTime } from "@/lib/api";
import { clearAuth, getAuth } from "@/lib/auth";
import type { RecommendationAdminSummaryV76, UserProfile } from "@/lib/types";

const WINDOWS=[7,30,90,180] as const;

export default function RecommendationV76AdminPage(){
  const [days,setDays]=useState<number>(30);
  const [data,setData]=useState<RecommendationAdminSummaryV76|null>(null);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);

  const load=useCallback(async()=>{
    setBusy(true);
    try{
      const me=await api<UserProfile>("/me");
      if(me.role!=="ADMIN"){
        clearAuth();
        window.location.assign("/login?returnTo=/admin/recommendation&reason=admin");
        return;
      }
      setData(await api<RecommendationAdminSummaryV76>(`/admin/recommendation/summary?days=${days}`));
      setError("");
    }catch(e){setError((e as Error).message)}finally{setBusy(false)}
  },[days]);

  useEffect(()=>{
    if(!getAuth()){window.location.assign("/login?returnTo=/admin/recommendation&reason=required");return;}
    void load();
  },[load]);

  return <div className="space-y-7" data-testid="recommendation-admin-v76">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="mb-2 text-sm text-slate-400"><Link href="/admin" className="hover:text-white">Admin</Link> / Recommendation</div>
        <div className="text-xs font-black tracking-[0.22em] text-violet-300">V76 · RECOMMENDATION 5.0</div>
        <h1 className="mt-2 text-3xl font-bold">Recommendation Quality & Evidence</h1>
        <p className="mt-1 max-w-5xl text-slate-400">Đo coverage, tín hiệu click/view, feedback và assisted booking từ dữ liệu vận hành thật. Assisted booking chỉ là tương quan khi có recommendation event cùng phim trong 7 ngày trước booking CONFIRMED, không được diễn giải là quan hệ nhân quả.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <select className="input min-w-36" value={days} onChange={e=>setDays(Number(e.target.value))} aria-label="Recommendation window">
          {WINDOWS.map(x=><option key={x} value={x}>{x} ngày</option>)}
        </select>
        <button className="btn btn-primary" onClick={()=>void load()} disabled={busy}>{busy?"Đang tải...":"↻ Làm mới"}</button>
        <Link href="/for-you" className="btn btn-secondary">For You V76</Link>
        <Link href="/admin/analytics-bi" className="btn btn-secondary">Analytics & BI V75</Link>
        <Link href="/admin" className="btn btn-secondary">← Dashboard</Link>
      </div>
    </div>

    {error&&<div data-testid="recommendation-admin-error-v76" className="card border border-rose-800/60 p-4 text-sm text-rose-200">{error}</div>}

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6" data-testid="recommendation-summary-v76">
      <Metric label="Strategy" value={data?.strategyVersion??"V76-RECOMMENDATION-5"} compact/>
      <Metric label="Window" value={`${data?.windowDays??days} ngày`}/>
      <Metric label="Active movies" value={num(data?.activeMovies??0)}/>
      <Metric label="Actionable" value={pct(data?.coverage.actionableMoviePercent??0)}/>
      <Metric label="Personalizable users" value={pct(data?.coverage.personalizableUserPercent??0)}/>
      <Metric label="Quality" value={data?.coverage.qualityStatus??"-"}/>
    </section>

    <section className="card p-5" data-testid="recommendation-policy-v76">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h2 className="text-xl font-bold">Evidence policy</h2><p className="mt-1 text-sm text-slate-500">Không sinh movie/user/booking giả để làm đẹp recommendation KPI; bảng Admin không trả raw email hay hồ sơ cá nhân từng người.</p></div>
        {data&&<span className="text-xs text-slate-500">Generated {dateTime(data.generatedAt)}</span>}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">{(data?.evidencePolicy??[]).map(x=><code key={x} className="rounded-lg bg-slate-900 px-2 py-1 text-xs text-cyan-300">{x}</code>)}</div>
    </section>

    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" data-testid="recommendation-activity-v76">
      <Metric label="Recommendation events" value={num(data?.recommendationEvents??0)}/>
      <Metric label="Clicks" value={num(data?.recommendationClicks??0)}/>
      <Metric label="Views" value={num(data?.recommendationViews??0)}/>
      <Metric label="Explicit feedback" value={num(data?.explicitFeedback??0)}/>
    </section>

    <div className="grid gap-6 xl:grid-cols-2">
      <section className="card p-5" data-testid="recommendation-coverage-v76">
        <h2 className="text-xl font-bold">Coverage & readiness</h2>
        <p className="mt-1 text-sm text-slate-500">Actionable = phim active có ít nhất một suất OPEN trong tương lai. Metadata complete = có genre, language và duration.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Mini label="Actionable movies" value={`${num(data?.actionableMovies??0)} / ${num(data?.activeMovies??0)}`} detail={pct(data?.coverage.actionableMoviePercent??0)}/>
          <Mini label="Metadata complete" value={`${num(data?.metadataCompleteMovies??0)} / ${num(data?.activeMovies??0)}`} detail={pct(data?.coverage.metadataCompletePercent??0)}/>
          <Mini label="Users có signal" value={`${num(data?.personalizableUsers??0)} / ${num(data?.registeredUsers??0)}`} detail={pct(data?.coverage.personalizableUserPercent??0)}/>
        </div>
      </section>

      <section className="card p-5" data-testid="recommendation-feedback-v76">
        <h2 className="text-xl font-bold">Explicit feedback</h2>
        <p className="mt-1 text-sm text-slate-500">Feedback durable từ MORE / LESS / HIDE trong cửa sổ đang chọn.</p>
        <div className="mt-5 grid grid-cols-3 gap-3">
          <Mini label="MORE" value={num(data?.moreLikeFeedback??0)}/>
          <Mini label="LESS" value={num(data?.lessLikeFeedback??0)}/>
          <Mini label="HIDE" value={num(data?.hiddenFeedback??0)}/>
        </div>
      </section>
    </div>

    <section className="card overflow-hidden" data-testid="recommendation-assisted-v76">
      <div className="border-b border-slate-800/80 bg-gradient-to-r from-violet-500/10 via-slate-950/20 to-emerald-500/10 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-4xl">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-violet-400/20 bg-violet-400/10 text-base" aria-hidden="true">↗</span>
              <h2 className="text-xl font-bold sm:text-2xl">Assisted confirmed bookings</h2>
            </div>
            <p className="text-sm leading-6 text-slate-400">
              Booking CONFIRMED có cùng user + cùng movie với recommendation CLICK/VIEW trong 7 ngày trước đó. Chỉ dùng để đo mức hỗ trợ của recommendation, không diễn giải là quan hệ nhân quả.
            </p>
          </div>
          <span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1.5 text-xs font-bold tracking-wide text-violet-200">
            7-DAY ASSIST WINDOW
          </span>
        </div>
      </div>

      <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 shadow-inner shadow-black/10">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Assisted bookings</div>
            <span className="rounded-md bg-violet-400/10 px-2 py-1 text-[11px] font-semibold text-violet-200">CONFIRMED</span>
          </div>
          <div className="mt-4 flex items-end gap-3">
            <div className="text-4xl font-black tracking-tight text-white sm:text-5xl">{num(data?.assistedConfirmedBookings??0)}</div>
            <div className="pb-1 text-sm text-slate-500">booking được hỗ trợ</div>
          </div>
          <div className="mt-4 h-1.5 rounded-full bg-gradient-to-r from-violet-400/80 via-violet-400/30 to-transparent" aria-hidden="true" />
        </div>

        <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-5 shadow-inner shadow-black/10">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Realized revenue</div>
            <span className="rounded-md bg-emerald-400/10 px-2 py-1 text-[11px] font-semibold text-emerald-300">SUCCESS</span>
          </div>
          <div className="mt-4 text-3xl font-black tracking-tight text-emerald-300 sm:text-4xl">{currency(data?.assistedRealizedRevenue??0)}</div>
          <div className="mt-2 text-sm text-slate-500">Doanh thu thực nhận từ payment SUCCESS đã dedupe theo booking.</div>
          <div className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-emerald-300/90">
            <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
            Realized SUCCESS revenue
          </div>
        </div>
      </div>

      <div className="border-t border-slate-800/70 bg-slate-950/30 px-5 py-3 text-xs leading-5 text-slate-500 sm:px-6">
        <span className="font-semibold text-slate-400">Evidence note:</span> assisted booking = correlation signal trong cửa sổ 7 ngày, không phải causal attribution.
      </div>
    </section>

    <section className="card overflow-hidden" data-testid="recommendation-top-movies-v76">
      <div className="border-b border-slate-800 p-5"><h2 className="text-xl font-bold">Top movie interaction</h2><p className="mt-1 text-sm text-slate-500">Xếp theo activity thật trong cửa sổ: click, view, feedback và assisted booking.</p></div>
      <Table headers={["Phim","Clicks","Views","Feedback","Assisted bookings"]} rows={data?.topMovies.map(x=>[x.movieTitle,num(x.clicks),num(x.views),num(x.feedback),num(x.assistedBookings)])??[]}/>
    </section>

    <section className="card overflow-hidden" data-testid="recommendation-sources-v76">
      <div className="border-b border-slate-800 p-5"><h2 className="text-xl font-bold">Recommendation event sources</h2><p className="mt-1 text-sm text-slate-500">Nguồn event được ghi trực tiếp bởi các surface recommendation; UNKNOWN nghĩa là event cũ không có source.</p></div>
      <Table headers={["Source","Clicks","Views","Total"]} rows={data?.topSources.map(x=>[x.source,num(x.clicks),num(x.views),num(x.totalEvents)])??[]}/>
    </section>
  </div>;
}

function Metric({label,value,compact=false}:{label:string;value:string;compact?:boolean}){return <div className="card p-5"><div className="text-xs uppercase tracking-wider text-slate-500">{label}</div><div className={`mt-2 font-black ${compact?"break-all text-sm":"text-2xl"}`}>{value}</div></div>}
function Mini({label,value,detail}:{label:string;value:string;detail?:string}){return <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"><div className="text-xs text-slate-500">{label}</div><div className="mt-1 text-lg font-black">{value}</div>{detail&&<div className="mt-1 text-xs text-cyan-300">{detail}</div>}</div>}
function Table({headers,rows}:{headers:string[];rows:string[][]}){return <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-900/70 text-xs uppercase text-slate-500"><tr>{headers.map(x=><th key={x} className="p-3">{x}</th>)}</tr></thead><tbody className="divide-y divide-slate-800">{rows.map((row,i)=><tr key={i}>{row.map((cell,j)=><td key={j} className="p-3">{cell}</td>)}</tr>)}{rows.length===0&&<tr><td colSpan={headers.length} className="p-4 text-slate-500">Chưa có dữ liệu recommendation trong cửa sổ này.</td></tr>}</tbody></table></div>}
function pct(value:number){return `${Number(value||0).toFixed(2)}%`}
function num(value:number){return new Intl.NumberFormat("vi-VN").format(Number(value||0))}
