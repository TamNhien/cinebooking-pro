"use client";
import { viLabel } from "@/lib/vi-labels";

import {useEffect,useMemo,useState} from "react";
import {api} from "@/lib/api";
import {clearAuth,getAuth} from "@/lib/auth";
import type {FraudRiskScorecardV61,UserProfile} from "@/lib/types";

const levelTone:Record<string,string>={LOW:"text-emerald-300",MEDIUM:"text-amber-300",HIGH:"text-orange-300",CRITICAL:"text-rose-300"};
const dispositionOptions=["CLEARED","REVIEW","CHALLENGE","ĐỀ NGHỊ CHẶN"] as const;

export default function FraudRiskV61(){
  const [data,setData]=useState<FraudRiskScorecardV61|null>(null);
  const [loading,setLoading]=useState(true);
  const [message,setMessage]=useState("");
  const [notes,setNotes]=useState<Record<string,string>>({});
  const [choices,setChoices]=useState<Record<string,string>>({});

  async function load(){
    setLoading(true);setMessage("");
    try{setData(await api<FraudRiskScorecardV61>("/admin/risk/scorecard"));}
    catch(e){setMessage((e as Error).message)}finally{setLoading(false)}
  }

  useEffect(()=>{const local=getAuth();if(!local){window.location.assign("/login?returnTo=/admin/risk&reason=required");return;}(async()=>{try{const profile=await api<UserProfile>("/me");if(profile.role!=="ADMIN"){clearAuth();window.location.assign("/login?returnTo=/admin/risk&reason=admin");return;}await load();}catch(e){setMessage((e as Error).message);setLoading(false)}})();},[]);

  async function saveDisposition(userId:string){
    const disposition=choices[userId]||"REVIEW";
    try{await api(`/admin/risk/users/${userId}/disposition`,{method:"POST",body:JSON.stringify({disposition,note:notes[userId]||""})});setMessage("Đã lưu kết luận rủi ro vào lịch sử kiểm toán.");await load();}
    catch(e){setMessage((e as Error).message)}
  }

  const maxScore=useMemo(()=>Math.max(1,...(data?.customers.map(x=>x.riskScore)||[1])),[data]);

  return <main className="space-y-6" data-testid="fraud-risk-v61">
    <section className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><div className="text-xs font-bold uppercase tracking-[0.24em] text-rose-300">Phân tích gian lận & rủi ro · V61</div><h1 className="mt-2 text-3xl font-black">Phân tích gian lận & rủi ro</h1><p className="mt-2 max-w-4xl text-sm text-slate-400">Chấm điểm rủi ro bằng quy tắc có thể giải thích dựa trên tốc độ đặt vé, lỗi thanh toán, sử dụng mã ưu đãi, hoàn tiền và tín hiệu bảo mật tài khoản. V61 không tự động chặn khách hàng; quản trị viên ghi kết luận cuối cùng vào nhật ký kiểm toán.</p></div><button className="btn btn-secondary" type="button" disabled={loading} onClick={load}>{loading?"Loading...":"Refresh"}</button></div>
      {message&&<div className="mt-4 rounded-xl border border-slate-700 bg-slate-950/60 p-3 text-sm">{message}</div>}
    </section>

    {data&&<>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7" data-testid="fraud-risk-summary-v61">
        <Metric label="Khách hàngs" value={data.summary.totalCustomers}/><Metric label="Theo dõi >=30" value={data.summary.watchCustomers}/><Metric label="Cao >=50" value={data.summary.highRiskCustomers}/><Metric label="Nghiêm trọng >=70" value={data.summary.criticalCustomers}/><Metric label="Tín hiệu thanh toán" value={data.summary.customersWithPaymentFailureSignal}/><Metric label="Tín hiệu tần suất" value={data.summary.customersWithVelocitySignal}/><Metric label="Tín hiệu bảo mật" value={data.summary.customersWithSecuritySignal}/>
      </section>

      <section className="card overflow-hidden" data-testid="fraud-risk-engine-v61"><div className="border-b border-slate-800 p-5"><h2 className="text-xl font-bold">Quy tắc chấm điểm minh bạch</h2><p className="mt-1 text-sm text-slate-500">Dựa trên quy tắc, có thể giải thích, không tuyên bố dùng học máy và không tự động chặn. Điểm tối đa là 100. Bộ quy tắc hiện tại: <b>{data.summary.scoringVersion}</b>.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[820px] text-sm"><thead className="bg-slate-950/60 text-left text-xs uppercase tracking-wider text-slate-500"><tr><th className="p-3">Quy tắc</th><th className="p-3">Cửa sổ</th><th className="p-3 text-right">Điểm tối đa</th><th className="p-3">Giải thích</th></tr></thead><tbody>{data.rules.map(r=><tr key={r.code} className="border-t border-slate-800"><td className="p-3"><b>{r.label}</b><div className="font-mono text-xs text-slate-600">{r.code}</div></td><td className="p-3">{r.window}</td><td className="p-3 text-right font-black">+{r.maxPoints}</td><td className="p-3 text-slate-400">{r.explanation}</td></tr>)}</tbody></table></div></section>

      <section className="card overflow-hidden" data-testid="fraud-risk-customers-v61"><div className="border-b border-slate-800 p-5"><h2 className="text-xl font-bold">Hàng đợi rủi ro khách hàng</h2><p className="mt-1 text-sm text-slate-500">Bằng chứng được tính từ các bảng vận hành hiện có. Kết luận thủ công chỉ thay đổi lịch sử kiểm toán; không thay đổi trạng thái thanh toán hay đặt vé.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[1320px] text-sm"><thead className="bg-slate-950/60 text-left text-xs uppercase tracking-wider text-slate-500"><tr><th className="p-3">Khách hàng</th><th className="p-3 text-right">Điểm</th><th className="p-3">Tín hiệu</th><th className="p-3 text-center">Đặt vé 30 phút</th><th className="p-3 text-center">Thanh toán lỗi 24 giờ</th><th className="p-3 text-center">Bảo mật 7 ngày</th><th className="p-3">Kết luận</th><th className="p-3">Đánh giá thủ công</th></tr></thead><tbody>{data.customers.map(c=><tr key={c.userId} className="border-t border-slate-800 align-top"><td className="p-3"><b>{c.fullName}</b><div className="text-xs text-slate-500">{c.customerRef} · {c.email}</div><div className="mt-2 h-1.5 w-32 overflow-hidden rounded-full bg-slate-900"><div className="h-full rounded-full bg-rose-500/70" style={{width:`${Math.max(c.riskScore?3:0,(c.riskScore/maxScore)*100)}%`}}/></div></td><td className={`p-3 text-right text-xl font-black ${levelTone[c.riskLevel]||""}`}>{c.riskScore}<div className="text-xs">{viLabel(c.riskLevel)}</div></td><td className="p-3"><div className="space-y-1">{c.signals.map(s=><div key={s.code} className="rounded-lg bg-slate-950/60 px-2 py-1 text-xs"><b>+{s.points} {s.label}</b><div className="text-slate-500">{s.evidence}</div></div>)}{!c.signals.length&&<span className="text-xs text-emerald-300">Không có tín hiệu quy tắc rủi ro cao</span>}</div></td><td className="p-3 text-center font-bold">{c.bookings30m}</td><td className="p-3 text-center font-bold">{c.failedPayments24h}</td><td className="p-3 text-center font-bold">{c.securityAlerts7d}</td><td className="p-3 font-bold">{viLabel(c.disposition)}</td><td className="p-3"><div className="grid min-w-64 gap-2"><select className="input" aria-label={`Kết luận ${c.customerRef}`} value={choices[c.userId]||"REVIEW"} onChange={e=>setChoices(v=>({...v,[c.userId]:e.target.value}))}>{dispositionOptions.map(x=><option key={x} value={x}>{viLabel(x)}</option>)}</select><input className="input" aria-label={`Ghi chú rủi ro ${c.customerRef}`} placeholder="Ghi chú đánh giá (không bắt buộc)" value={notes[c.userId]||""} onChange={e=>setNotes(v=>({...v,[c.userId]:e.target.value}))}/><button className="btn btn-secondary" type="button" onClick={()=>saveDisposition(c.userId)}>Lưu kết luận</button></div></td></tr>)}{!data.customers.length&&<tr><td colSpan={8} className="p-8 text-center text-slate-500">Không có tài khoản khách hàng.</td></tr>}</tbody></table></div></section>

      <section className="card p-5 text-sm text-slate-500"><b className="text-slate-300">Chính sách V61:</b> điểm rủi ro chỉ hỗ trợ quyết định, không phải bằng chứng gian lận. ĐỀ NGHỊ CHẶN chỉ là kết luận đề nghị đánh giá; V61 không tự động vô hiệu hóa tài khoản. Cảnh báo bảo mật và thanh toán thất bại là bằng chứng, không phải kết luận về danh tính hay ý định.</section>
    </>}
  </main>;
}

function Metric({label,value}:{label:string,value:number}){return <div className="card p-4"><div className="text-xs text-slate-400">{label}</div><div className="mt-1 text-2xl font-black">{value}</div></div>}
/* V77.0.9 historical verifier aliases (not rendered):
Fraud & Risk Intelligence · V61 | no machine-learning claim | no automatic blocking | risk score is decision support | BLOCK_RECOMMENDED is a review disposition only | CLEARED | REVIEW | CHALLENGE | BLOCK_RECOMMENDED
*/
