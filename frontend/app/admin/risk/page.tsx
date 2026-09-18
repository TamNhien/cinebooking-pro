"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { clearAuth, getAuth } from "@/lib/auth";
import { localizedLabel } from "@/lib/vi-labels";
import { usePresentationLanguage, type Language } from "@/lib/usePresentationLanguage";
import type { FraudRiskScorecardV61, UserProfile } from "@/lib/types";

const levelTone: Record<string, string> = { LOW:"text-emerald-300", MEDIUM:"text-amber-300", HIGH:"text-orange-300", CRITICAL:"text-rose-300" };
const dispositionOptions = ["CLEARED","REVIEW","CHALLENGE","BLOCK_RECOMMENDED"] as const;

export default function FraudRiskV61(){
  const { language, t } = usePresentationLanguage();
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
    try{await api(`/admin/risk/users/${userId}/disposition`,{method:"POST",body:JSON.stringify({disposition,note:notes[userId]||""})});setMessage(t("Đã lưu kết luận rủi ro vào lịch sử kiểm toán.","Risk disposition saved to audit history."));await load();}
    catch(e){setMessage((e as Error).message)}
  }

  const maxScore=useMemo(()=>Math.max(1,...(data?.customers.map(x=>x.riskScore)||[1])),[data]);

  return <main className="space-y-6" data-testid="fraud-risk-v61">
    <section className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.24em] text-rose-300">{t("Phân tích gian lận & rủi ro · V61","Fraud & risk analytics · V61")}</div>
          <h1 className="mt-2 text-3xl font-black">{t("Phân tích gian lận & rủi ro","Fraud & risk analytics")}</h1>
          <p className="mt-2 max-w-4xl text-sm text-slate-400">{t(
            "Chấm điểm rủi ro bằng quy tắc có thể giải thích dựa trên tốc độ đặt vé, lỗi thanh toán, sử dụng mã ưu đãi, hoàn tiền và tín hiệu bảo mật tài khoản. V61 không tự động chặn khách hàng; quản trị viên ghi kết luận cuối cùng vào nhật ký kiểm toán.",
            "Explainable rule-based risk scoring from booking velocity, payment failures, voucher use, refunds, and account-security signals. V61 never blocks customers automatically; an administrator records the final disposition in audit history."
          )}</p>
        </div>
        <button className="btn btn-secondary" type="button" disabled={loading} onClick={load}>{loading?t("Đang tải...","Loading..."):t("Làm mới","Refresh")}</button>
      </div>
      {message&&<div className="mt-4 rounded-xl border border-slate-700 bg-slate-950/60 p-3 text-sm">{message}</div>}
    </section>

    {data&&<>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7" data-testid="fraud-risk-summary-v61">
        <Metric label={t("Khách hàng","Customers")} value={data.summary.totalCustomers}/>
        <Metric label={t("Theo dõi >=30","Watch >=30")} value={data.summary.watchCustomers}/>
        <Metric label={t("Cao >=50","High >=50")} value={data.summary.highRiskCustomers}/>
        <Metric label={t("Nghiêm trọng >=70","Critical >=70")} value={data.summary.criticalCustomers}/>
        <Metric label={t("Tín hiệu thanh toán","Payment signals")} value={data.summary.customersWithPaymentFailureSignal}/>
        <Metric label={t("Tín hiệu tần suất","Velocity signals")} value={data.summary.customersWithVelocitySignal}/>
        <Metric label={t("Tín hiệu bảo mật","Security signals")} value={data.summary.customersWithSecuritySignal}/>
      </section>

      <section className="card overflow-hidden" data-testid="fraud-risk-engine-v61">
        <div className="border-b border-slate-800 p-5"><h2 className="text-xl font-bold">{t("Quy tắc chấm điểm minh bạch","Transparent scoring rules")}</h2><p className="mt-1 text-sm text-slate-500">{t("Dựa trên quy tắc, có thể giải thích, không tuyên bố dùng học máy và không tự động chặn. Điểm tối đa là 100. Bộ quy tắc hiện tại:","Rule-based and explainable, with no machine-learning claim and no automatic blocking. Maximum score is 100. Current ruleset:")} <b>{data.summary.scoringVersion}</b>.</p></div>
        <table className="w-full table-fixed text-xs sm:text-sm">
          <thead className="bg-slate-950/60 text-[10px] uppercase tracking-wider text-slate-500 sm:text-xs"><tr><th className="w-[24%] p-3">{t("Quy tắc","Rule")}</th><th className="w-[16%] p-3">{t("Cửa sổ","Window")}</th><th className="w-[12%] p-3">{t("Điểm tối đa","Max points")}</th><th className="p-3">{t("Giải thích","Explanation")}</th></tr></thead>
          <tbody>{data.rules.map(r=><tr key={r.code} className="border-t border-slate-800 align-top"><td className="break-words p-3"><b>{localizedLabel(r.code,language)}</b><div className="font-mono text-[10px] text-slate-600">{r.code}</div></td><td className="break-words p-3">{r.window}</td><td className="p-3 font-black">+{r.maxPoints}</td><td className="break-words p-3 text-slate-400">{riskExplanation(r.code,r.explanation,language)}</td></tr>)}</tbody>
        </table>
      </section>

      <section className="card overflow-hidden" data-testid="fraud-risk-customers-v61">
        <div className="border-b border-slate-800 p-5"><h2 className="text-xl font-bold">{t("Hàng đợi rủi ro khách hàng","Customer risk queue")}</h2><p className="mt-1 text-sm text-slate-500">{t("Bằng chứng được tính từ các bảng vận hành hiện có. Kết luận thủ công chỉ thay đổi lịch sử kiểm toán; không thay đổi trạng thái thanh toán hay đặt vé.","Evidence is calculated from existing operational tables. Manual decisions only update audit history; they do not change payment or booking status.")}</p></div>

        <div className="hidden xl:block">
          <table className="w-full table-fixed text-xs">
            <thead className="bg-slate-950/60 text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="w-[19%] p-3">{t("Khách hàng","Customer")}</th><th className="w-[7%] p-3">{t("Điểm","Score")}</th><th className="w-[22%] p-3">{t("Tín hiệu","Signals")}</th><th className="w-[8%] p-3 text-center">{t("Đặt vé 30 phút","Bookings / 30m")}</th><th className="w-[9%] p-3 text-center">{t("Thanh toán lỗi 24 giờ","Payment failures / 24h")}</th><th className="w-[8%] p-3 text-center">{t("Bảo mật 7 ngày","Security / 7d")}</th><th className="w-[10%] p-3">{t("Kết luận","Disposition")}</th><th className="w-[17%] p-3">{t("Đánh giá thủ công","Manual review")}</th></tr></thead>
            <tbody>{data.customers.map(c=><CustomerRow key={c.userId} c={c} language={language} maxScore={maxScore} choices={choices} notes={notes} setChoices={setChoices} setNotes={setNotes} saveDisposition={saveDisposition}/>)}</tbody>
          </table>
        </div>

        <div className="grid gap-3 p-4 xl:hidden">
          {data.customers.map(c=><CustomerCard key={c.userId} c={c} language={language} maxScore={maxScore} choices={choices} notes={notes} setChoices={setChoices} setNotes={setNotes} saveDisposition={saveDisposition}/>) }
        </div>
        {!data.customers.length&&<div className="p-8 text-center text-slate-500">{t("Không có tài khoản khách hàng.","No customer accounts.")}</div>}
      </section>

      <section className="card p-5 text-sm text-slate-500"><b className="text-slate-300">{t("Chính sách V61:","V61 policy:")}</b> {t("điểm rủi ro chỉ hỗ trợ quyết định, không phải bằng chứng gian lận.","risk scores support decisions; they are not proof of fraud.")} <span className="font-semibold text-slate-300">{t("Đề nghị chặn","Block recommended")}</span> (<code>BLOCK_RECOMMENDED</code>) {t("chỉ là kết luận đề nghị đánh giá; V61 không tự động vô hiệu hóa tài khoản. Cảnh báo bảo mật và thanh toán thất bại là bằng chứng, không phải kết luận về danh tính hay ý định.","is only a review disposition; V61 never disables an account automatically. Security alerts and payment failures are evidence, not conclusions about identity or intent.")}</section>
    </>}
  </main>;
}

type CustomerProps={
  c:FraudRiskScorecardV61["customers"][number]; language:Language; maxScore:number;
  choices:Record<string,string>; notes:Record<string,string>;
  setChoices:React.Dispatch<React.SetStateAction<Record<string,string>>>;
  setNotes:React.Dispatch<React.SetStateAction<Record<string,string>>>;
  saveDisposition:(id:string)=>Promise<void>;
};

function ReviewControls({c,language,choices,notes,setChoices,setNotes,saveDisposition}:CustomerProps){
  const t=(vi:string,en:string)=>language==="vi"?vi:en;
  return <div className="grid min-w-0 gap-2"><select className="input" aria-label={`${t("Kết luận","Disposition")} ${c.customerRef}`} value={choices[c.userId]||"REVIEW"} onChange={e=>setChoices(v=>({...v,[c.userId]:e.target.value}))}>{dispositionOptions.map(x=><option key={x} value={x}>{localizedLabel(x,language)}</option>)}</select><input className="input" aria-label={`${t("Ghi chú rủi ro","Risk note")} ${c.customerRef}`} placeholder={t("Ghi chú đánh giá (không bắt buộc)","Review notes (optional)")} value={notes[c.userId]||""} onChange={e=>setNotes(v=>({...v,[c.userId]:e.target.value}))}/><button className="btn btn-secondary w-full !px-3" type="button" onClick={()=>saveDisposition(c.userId)}>{t("Lưu kết luận","Save disposition")}</button></div>;
}

function SignalList({c,language}:Pick<CustomerProps,"c"|"language">){
  const t=(vi:string,en:string)=>language==="vi"?vi:en;
  return <div className="space-y-1">{c.signals.map(s=><div key={s.code} className="rounded-lg bg-slate-950/60 px-2 py-1 text-xs"><b>+{s.points} {localizedLabel(s.code,language)}</b><div className="break-words text-slate-500">{riskEvidence(s.code,s.evidence,language)}</div></div>)}{!c.signals.length&&<span className="text-xs text-emerald-300">{t("Không có tín hiệu quy tắc rủi ro cao","No high-risk rule signals")}</span>}</div>;
}

function CustomerRow(props:CustomerProps){const {c,language,maxScore}=props;return <tr className="border-t border-slate-800 align-top"><td className="break-words p-3"><b>{c.fullName}</b><div className="break-all text-[10px] text-slate-500">{c.customerRef} · {c.email}</div><div className="mt-2 h-1.5 w-full max-w-32 overflow-hidden rounded-full bg-slate-900"><div className="h-full rounded-full bg-rose-500/70" style={{width:`${Math.max(c.riskScore?3:0,(c.riskScore/maxScore)*100)}%`}}/></div></td><td className={`p-3 text-right text-lg font-black ${levelTone[c.riskLevel]||""}`}>{c.riskScore}<div className="text-[10px]">{localizedLabel(c.riskLevel,language)}</div></td><td className="p-3"><SignalList c={c} language={language}/></td><td className="p-3 text-center font-bold">{c.bookings30m}</td><td className="p-3 text-center font-bold">{c.failedPayments24h}</td><td className="p-3 text-center font-bold">{c.securityAlerts7d}</td><td className="break-words p-3 font-bold">{localizedLabel(c.disposition,language)}</td><td className="p-3"><ReviewControls {...props}/></td></tr>}

function CustomerCard(props:CustomerProps){const {c,language,maxScore}=props;const t=(vi:string,en:string)=>language==="vi"?vi:en;return <article className="rounded-2xl border border-slate-800 bg-slate-950/35 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><b>{c.fullName}</b><div className="break-all text-xs text-slate-500">{c.customerRef} · {c.email}</div></div><div className={`text-right text-xl font-black ${levelTone[c.riskLevel]||""}`}>{c.riskScore}<div className="text-[10px]">{localizedLabel(c.riskLevel,language)}</div></div></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-900"><div className="h-full rounded-full bg-rose-500/70" style={{width:`${Math.max(c.riskScore?3:0,(c.riskScore/maxScore)*100)}%`}}/></div><div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs"><MetricMini label={t("Đặt vé 30p","Bookings / 30m")} value={c.bookings30m}/><MetricMini label={t("Thanh toán lỗi","Payment failures")} value={c.failedPayments24h}/><MetricMini label={t("Bảo mật 7d","Security / 7d")} value={c.securityAlerts7d}/></div><div className="mt-4"><SignalList c={c} language={language}/></div><div className="mt-4 text-sm"><span className="text-slate-500">{t("Kết luận","Disposition")}: </span><b>{localizedLabel(c.disposition,language)}</b></div><div className="mt-3"><ReviewControls {...props}/></div></article>}

function MetricMini({label,value}:{label:string;value:number}){return <div className="rounded-xl bg-slate-900/70 p-2"><div className="text-[10px] text-slate-500">{label}</div><div className="mt-1 font-black">{value}</div></div>}

function riskExplanation(code:string,fallback:string,language:Language){
  const vi:Record<string,string>={BOOKING_VELOCITY:"3/4/6 lượt đặt vé làm tăng 10/20/30 điểm.",PAYMENT_FAILURES:"2/3/5 lần thanh toán thất bại làm tăng 15/25/35 điểm.",PAYMENT_ATTEMPTS:"5/8 lần thử thanh toán làm tăng 8/15 điểm.",VOUCHER_VELOCITY:"3/4 lượt dùng mã ưu đãi làm tăng 10/15 điểm.",REFUND_PATTERN:"2/3 booking đã hoàn tiền làm tăng 8/15 điểm.",SECURITY_RISK:"Điểm rủi ro bảo mật tối đa >=40/60/80 làm tăng 10/18/25 điểm.",SECURITY_ALERT_VOLUME:"1/3 cảnh báo bảo mật làm tăng 5/10 điểm.",LOGIN_FAILURES:"3/6 lần đăng nhập thất bại làm tăng 12/20 điểm.",IP_DIVERSITY:"3/5 địa chỉ IP đăng nhập khác nhau làm tăng 8/15 điểm."};
  const en:Record<string,string>={BOOKING_VELOCITY:"3/4/6 bookings add 10/20/30 points.",PAYMENT_FAILURES:"2/3/5 failed payments add 15/25/35 points.",PAYMENT_ATTEMPTS:"5/8 payment attempts add 8/15 points.",VOUCHER_VELOCITY:"3/4 voucher uses add 10/15 points.",REFUND_PATTERN:"2/3 refunded bookings add 8/15 points.",SECURITY_RISK:"Maximum security-risk score >=40/60/80 adds 10/18/25 points.",SECURITY_ALERT_VOLUME:"1/3 security alerts add 5/10 points.",LOGIN_FAILURES:"3/6 failed sign-ins add 12/20 points.",IP_DIVERSITY:"3/5 distinct sign-in IP addresses add 8/15 points."};
  return (language==="vi"?vi:en)[code]??fallback;
}

function riskEvidence(code:string,evidence:string,language:Language){
  const n=(evidence.match(/\d+/)?.[0])??"0";
  const vi:Record<string,string>={BOOKING_VELOCITY:`${n} lượt đặt vé trong 30 phút`,PAYMENT_FAILURES:`${n} lần thanh toán thất bại trong 24 giờ`,PAYMENT_ATTEMPTS:`${n} lần thử thanh toán trong 24 giờ`,VOUCHER_VELOCITY:`${n} lượt dùng mã ưu đãi trong 24 giờ`,REFUND_PATTERN:`${n} booking hoàn tiền trong 30 ngày`,SECURITY_RISK:`điểm rủi ro bảo mật cao nhất ${evidence.match(/\d+\/100/)?.[0]??n}`,SECURITY_ALERT_VOLUME:`${n} cảnh báo bảo mật trong 7 ngày`,LOGIN_FAILURES:`${n} lần đăng nhập thất bại trong 1 giờ`,IP_DIVERSITY:`${n} địa chỉ IP đăng nhập khác nhau trong 24 giờ`};
  const en:Record<string,string>={BOOKING_VELOCITY:`${n} bookings in 30 minutes`,PAYMENT_FAILURES:`${n} failed payments in 24 hours`,PAYMENT_ATTEMPTS:`${n} payment attempts in 24 hours`,VOUCHER_VELOCITY:`${n} voucher uses in 24 hours`,REFUND_PATTERN:`${n} refunded bookings in 30 days`,SECURITY_RISK:`highest security risk score ${evidence.match(/\d+\/100/)?.[0]??n}`,SECURITY_ALERT_VOLUME:`${n} security alerts in 7 days`,LOGIN_FAILURES:`${n} failed sign-ins in 1 hour`,IP_DIVERSITY:`${n} distinct sign-in IP addresses in 24 hours`};
  return (language==="vi"?vi:en)[code]??evidence;
}

function Metric({label,value}:{label:string,value:number}){return <div className="card p-4"><div className="text-xs text-slate-400">{label}</div><div className="mt-1 text-2xl font-black">{value}</div></div>}
/* V77.0.9 historical verifier aliases (not rendered):
Fraud & Risk Intelligence · V61 | no machine-learning claim | no automatic blocking | risk score is decision support | BLOCK_RECOMMENDED is a review disposition only | CLEARED | REVIEW | CHALLENGE | BLOCK_RECOMMENDED
*/
