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
        <div className="mb-2 text-sm text-slate-400"><Link href="/admin" className="hover:text-white">Quản trị viên</Link> / Gợi ý phim</div>
        <div className="text-xs font-black tracking-[0.22em] text-violet-300">V76 · GỢI Ý PHIM 5.0</div>
        <h1 className="mt-2 text-3xl font-bold">Chất lượng gợi ý & bằng chứng</h1>
        <p className="mt-1 max-w-5xl text-slate-400">Đo độ phủ, tín hiệu nhấp/xem, phản hồi và lượt đặt vé được hỗ trợ từ dữ liệu vận hành thật. Lượt đặt vé được hỗ trợ chỉ là tương quan khi có sự kiện gợi ý cùng phim trong 7 ngày trước lượt đặt vé ĐÃ XÁC NHẬN, không được diễn giải là quan hệ nhân quả.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <select className="input min-w-36" value={days} onChange={e=>setDays(Number(e.target.value))} aria-label="Khoảng thời gian gợi ý phim">
          {WINDOWS.map(x=><option key={x} value={x}>{x} ngày</option>)}
        </select>
        <button className="btn btn-primary" onClick={()=>void load()} disabled={busy}>{busy?"Đang tải...":"↻ Làm mới"}</button>
        <Link href="/for-you" className="btn btn-secondary">Dành cho bạn V76</Link>
        <Link href="/admin/analytics-bi" className="btn btn-secondary">Phân tích dữ liệu & BI V75</Link>
        <Link href="/admin" className="btn btn-secondary">← Bảng điều khiển</Link>
      </div>
    </div>

    {error&&<div data-testid="recommendation-admin-error-v76" className="card border border-rose-800/60 p-4 text-sm text-rose-200">{error}</div>}

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6" data-testid="recommendation-summary-v76">
      <Metric label="Chiến lược" value={data?.strategyVersion??"V76-RECOMMENDATION-5"} compact/>
      <Metric label="Cửa sổ" value={`${data?.windowDays??days} ngày`}/>
      <Metric label="Phim đang hoạt động" value={num(data?.activeMovies??0)}/>
      <Metric label="Có thể gợi ý" value={pct(data?.coverage.actionableMoviePercent??0)}/>
      <Metric label="Người dùng có thể cá nhân hóa" value={pct(data?.coverage.personalizableUserPercent??0)}/>
      <Metric label="Chất lượng" value={data?.coverage.qualityStatus??"-"}/>
    </section>

    <section className="card p-5" data-testid="recommendation-policy-v76">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h2 className="text-xl font-bold">Chính sách bằng chứng</h2><p className="mt-1 text-sm text-slate-500">Không sinh phim/người dùng/lượt đặt vé giả để làm đẹp KPI gợi ý; bảng quản trị không trả email thô hay hồ sơ cá nhân từng người.</p></div>
        {data&&<span className="text-xs text-slate-500">Tạo lúc {dateTime(data.generatedAt)}</span>}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">{(data?.evidencePolicy??[]).map(x=><code key={x} className="rounded-lg bg-slate-900 px-2 py-1 text-xs text-cyan-300">{x}</code>)}</div>
    </section>

    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" data-testid="recommendation-activity-v76">
      <Metric label="Gợi ý phim sự kiện" value={num(data?.recommendationEvents??0)}/>
      <Metric label="Lượt nhấp" value={num(data?.recommendationClicks??0)}/>
      <Metric label="Lượt xem" value={num(data?.recommendationViews??0)}/>
      <Metric label="Phản hồi trực tiếp" value={num(data?.explicitFeedback??0)}/>
    </section>

    <div className="grid gap-6 xl:grid-cols-2">
      <section className="card p-5" data-testid="recommendation-coverage-v76">
        <h2 className="text-xl font-bold">Độ phủ & mức sẵn sàng</h2>
        <p className="mt-1 text-sm text-slate-500">Có thể hành động = phim đang hoạt động có ít nhất một suất ĐANG MỞ trong tương lai. Siêu dữ liệu đầy đủ = có thể loại, ngôn ngữ và thời lượng.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Mini label="Phim có thể gợi ý" value={`${num(data?.actionableMovies??0)} / ${num(data?.activeMovies??0)}`} detail={pct(data?.coverage.actionableMoviePercent??0)}/>
          <Mini label="Đủ siêu dữ liệu" value={`${num(data?.metadataCompleteMovies??0)} / ${num(data?.activeMovies??0)}`} detail={pct(data?.coverage.metadataCompletePercent??0)}/>
          <Mini label="Users có signal" value={`${num(data?.personalizableUsers??0)} / ${num(data?.registeredUsers??0)}`} detail={pct(data?.coverage.personalizableUserPercent??0)}/>
        </div>
      </section>

      <section className="card p-5" data-testid="recommendation-feedback-v76">
        <h2 className="text-xl font-bold">Phản hồi trực tiếp</h2>
        <p className="mt-1 text-sm text-slate-500">Feedback durable từ MORE / LESS / HIDE trong cửa sổ đang chọn.</p>
        <div className="mt-5 grid grid-cols-3 gap-3">
          <Mini label="Thêm" value={num(data?.moreLikeFeedback??0)}/>
          <Mini label="Bớt" value={num(data?.lessLikeFeedback??0)}/>
          <Mini label="Ẩn" value={num(data?.hiddenFeedback??0)}/>
        </div>
      </section>
    </div>

    <section className="card overflow-hidden" data-testid="recommendation-assisted-v76">
      <div className="border-b border-slate-800/80 bg-gradient-to-r from-violet-500/10 via-slate-950/20 to-emerald-500/10 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-4xl">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-violet-400/20 bg-violet-400/10 text-base" aria-hidden="true">↗</span>
              <h2 className="text-xl font-bold sm:text-2xl">Assisted confirmed đặt vés</h2>
            </div>
            <p className="text-sm leading-6 text-slate-400">
              Lượt đặt vé ĐÃ XÁC NHẬN có cùng khách hàng + cùng phim với lượt nhấp/xem gợi ý trong 7 ngày trước đó. Chỉ dùng để đo mức hỗ trợ của gợi ý, không diễn giải là quan hệ nhân quả.
            </p>
          </div>
          <span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1.5 text-xs font-bold tracking-wide text-violet-200">
            CỬA SỔ HỖ TRỢ 7 NGÀY
          </span>
        </div>
      </div>

      <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 shadow-inner shadow-black/10">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Assisted đặt vés</div>
            <span className="rounded-md bg-violet-400/10 px-2 py-1 text-[11px] font-semibold text-violet-200">ĐÃ XÁC NHẬN</span>
          </div>
          <div className="mt-4 flex items-end gap-3">
            <div className="text-4xl font-black tracking-tight text-white sm:text-5xl">{num(data?.assistedConfirmedBookings??0)}</div>
            <div className="pb-1 text-sm text-slate-500">lượt đặt vé được hỗ trợ</div>
          </div>
          <div className="mt-4 h-1.5 rounded-full bg-gradient-to-r from-violet-400/80 via-violet-400/30 to-transparent" aria-hidden="true" />
        </div>

        <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-5 shadow-inner shadow-black/10">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Doanh thu thực nhận</div>
            <span className="rounded-md bg-emerald-400/10 px-2 py-1 text-[11px] font-semibold text-emerald-300">THÀNH CÔNG</span>
          </div>
          <div className="mt-4 text-3xl font-black tracking-tight text-emerald-300 sm:text-4xl">{currency(data?.assistedRealizedRevenue??0)}</div>
          <div className="mt-2 text-sm text-slate-500">Doanh thu thực nhận từ thanh toán THÀNH CÔNG đã loại trùng theo lượt đặt vé.</div>
          <div className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-emerald-300/90">
            <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
            Doanh thu THÀNH CÔNG thực nhận
          </div>
        </div>
      </div>

      <div className="border-t border-slate-800/70 bg-slate-950/30 px-5 py-3 text-xs leading-5 text-slate-500 sm:px-6">
        <span className="font-semibold text-slate-400">Ghi chú bằng chứng:</span> đặt vé có hỗ trợ = tín hiệu tương quan trong cửa sổ 7 ngày, không phải quy kết nhân quả.
      </div>
    </section>

    <section className="card overflow-hidden" data-testid="recommendation-top-movies-v76">
      <div className="border-b border-slate-800 p-5"><h2 className="text-xl font-bold">Tương tác phim hàng đầu</h2><p className="mt-1 text-sm text-slate-500">Xếp theo hoạt động thật trong cửa sổ: nhấp, xem, phản hồi và lượt đặt vé được hỗ trợ.</p></div>
      <Table headers={["Phim","Clicks","Views","Feedback","Assisted bookings"]} rows={data?.topMovies.map(x=>[x.movieTitle,num(x.clicks),num(x.views),num(x.feedback),num(x.assistedBookings)])??[]}/>
    </section>

    <section className="card overflow-hidden" data-testid="recommendation-sources-v76">
      <div className="border-b border-slate-800 p-5"><h2 className="text-xl font-bold">Nguồn sự kiện gợi ý phim</h2><p className="mt-1 text-sm text-slate-500">Nguồn sự kiện được ghi trực tiếp bởi các bề mặt gợi ý; KHÔNG XÁC ĐỊNH nghĩa là sự kiện cũ không có nguồn.</p></div>
      <Table headers={["Source","Clicks","Views","Total"]} rows={data?.topSources.map(x=>[x.source,num(x.clicks),num(x.views),num(x.totalEvents)])??[]}/>
    </section>
  </div>;
}

function Metric({label,value,compact=false}:{label:string;value:string;compact?:boolean}){return <div className="card p-5"><div className="text-xs uppercase tracking-wider text-slate-500">{label}</div><div className={`mt-2 font-black ${compact?"break-all text-sm":"text-2xl"}`}>{value}</div></div>}
function Mini({label,value,detail}:{label:string;value:string;detail?:string}){return <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"><div className="text-xs text-slate-500">{label}</div><div className="mt-1 text-lg font-black">{value}</div>{detail&&<div className="mt-1 text-xs text-cyan-300">{detail}</div>}</div>}
function Table({headers,rows}:{headers:string[];rows:string[][]}){return <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-900/70 text-xs uppercase text-slate-500"><tr>{headers.map(x=><th key={x} className="p-3">{x}</th>)}</tr></thead><tbody className="divide-y divide-slate-800">{rows.map((row,i)=><tr key={i}>{row.map((cell,j)=><td key={j} className="p-3">{cell}</td>)}</tr>)}{rows.length===0&&<tr><td colSpan={headers.length} className="p-4 text-slate-500">Chưa có dữ liệu gợi ý trong cửa sổ này.</td></tr>}</tbody></table></div>}
function pct(value:number){return `${Number(value||0).toFixed(2)}%`}
function num(value:number){return new Intl.NumberFormat("vi-VN").format(Number(value||0))}
/* V77.0.9 historical verifier aliases (not rendered):
V76 · RECOMMENDATION 5.0 | V76-RECOMMENDATION-5 | correlation | không phải causal attribution
*/
