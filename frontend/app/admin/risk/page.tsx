"use client";

import {useEffect,useMemo,useState} from "react";
import {api} from "@/lib/api";
import {clearAuth,getAuth} from "@/lib/auth";
import type {FraudRiskScorecardV61,UserProfile} from "@/lib/types";

const levelTone:Record<string,string>={LOW:"text-emerald-300",MEDIUM:"text-amber-300",HIGH:"text-orange-300",CRITICAL:"text-rose-300"};
const dispositionOptions=["CLEARED","REVIEW","CHALLENGE","BLOCK_RECOMMENDED"] as const;

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

  useEffect(()=>{const local=getAuth();if(!local){location.href="/login?returnTo=/admin/risk&reason=required";return;}(async()=>{try{const profile=await api<UserProfile>("/me");if(profile.role!=="ADMIN"){clearAuth();location.href="/login?returnTo=/admin/risk&reason=admin";return;}await load();}catch(e){setMessage((e as Error).message);setLoading(false)}})();},[]);

  async function saveDisposition(userId:string){
    const disposition=choices[userId]||"REVIEW";
    try{await api(`/admin/risk/users/${userId}/disposition`,{method:"POST",body:JSON.stringify({disposition,note:notes[userId]||""})});setMessage("Risk disposition saved to audit history.");await load();}
    catch(e){setMessage((e as Error).message)}
  }

  const maxScore=useMemo(()=>Math.max(1,...(data?.customers.map(x=>x.riskScore)||[1])),[data]);

  return <main className="space-y-6" data-testid="fraud-risk-v61">
    <section className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><div className="text-xs font-bold uppercase tracking-[0.24em] text-rose-300">Fraud & Risk Intelligence · V61</div><h1 className="mt-2 text-3xl font-black">Fraud & Risk Intelligence</h1><p className="mt-2 max-w-4xl text-sm text-slate-400">Explainable rule-based risk scoring across booking velocity, payment failures, voucher use, refunds and account-security signals. V61 never auto-blocks a customer; an ADMIN records the final disposition in the audit trail.</p></div><button className="btn btn-secondary" type="button" disabled={loading} onClick={load}>{loading?"Loading...":"Refresh"}</button></div>
      {message&&<div className="mt-4 rounded-xl border border-slate-700 bg-slate-950/60 p-3 text-sm">{message}</div>}
    </section>

    {data&&<>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7" data-testid="fraud-risk-summary-v61">
        <Metric label="Customers" value={data.summary.totalCustomers}/><Metric label="Watch >=30" value={data.summary.watchCustomers}/><Metric label="High >=50" value={data.summary.highRiskCustomers}/><Metric label="Critical >=70" value={data.summary.criticalCustomers}/><Metric label="Payment signals" value={data.summary.customersWithPaymentFailureSignal}/><Metric label="Velocity signals" value={data.summary.customersWithVelocitySignal}/><Metric label="Security signals" value={data.summary.customersWithSecuritySignal}/>
      </section>

      <section className="card overflow-hidden" data-testid="fraud-risk-engine-v61"><div className="border-b border-slate-800 p-5"><h2 className="text-xl font-bold">Transparent scoring rules</h2><p className="mt-1 text-sm text-slate-500">Rule-based, explainable, no machine-learning claim and no automatic blocking. Score is capped at 100. Current ruleset: <b>{data.summary.scoringVersion}</b>.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[820px] text-sm"><thead className="bg-slate-950/60 text-left text-xs uppercase tracking-wider text-slate-500"><tr><th className="p-3">Rule</th><th className="p-3">Window</th><th className="p-3 text-right">Max points</th><th className="p-3">Explanation</th></tr></thead><tbody>{data.rules.map(r=><tr key={r.code} className="border-t border-slate-800"><td className="p-3"><b>{r.label}</b><div className="font-mono text-xs text-slate-600">{r.code}</div></td><td className="p-3">{r.window}</td><td className="p-3 text-right font-black">+{r.maxPoints}</td><td className="p-3 text-slate-400">{r.explanation}</td></tr>)}</tbody></table></div></section>

      <section className="card overflow-hidden" data-testid="fraud-risk-customers-v61"><div className="border-b border-slate-800 p-5"><h2 className="text-xl font-bold">Customer risk queue</h2><p className="mt-1 text-sm text-slate-500">Evidence is computed from existing operational tables. Manual disposition changes audit history only; it does not mutate payment or booking state.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[1320px] text-sm"><thead className="bg-slate-950/60 text-left text-xs uppercase tracking-wider text-slate-500"><tr><th className="p-3">Customer</th><th className="p-3 text-right">Score</th><th className="p-3">Signals</th><th className="p-3 text-center">30m bookings</th><th className="p-3 text-center">24h failed pay</th><th className="p-3 text-center">7d security</th><th className="p-3">Disposition</th><th className="p-3">Manual review</th></tr></thead><tbody>{data.customers.map(c=><tr key={c.userId} className="border-t border-slate-800 align-top"><td className="p-3"><b>{c.fullName}</b><div className="text-xs text-slate-500">{c.customerRef} · {c.email}</div><div className="mt-2 h-1.5 w-32 overflow-hidden rounded-full bg-slate-900"><div className="h-full rounded-full bg-rose-500/70" style={{width:`${Math.max(c.riskScore?3:0,(c.riskScore/maxScore)*100)}%`}}/></div></td><td className={`p-3 text-right text-xl font-black ${levelTone[c.riskLevel]||""}`}>{c.riskScore}<div className="text-xs">{c.riskLevel}</div></td><td className="p-3"><div className="space-y-1">{c.signals.map(s=><div key={s.code} className="rounded-lg bg-slate-950/60 px-2 py-1 text-xs"><b>+{s.points} {s.label}</b><div className="text-slate-500">{s.evidence}</div></div>)}{!c.signals.length&&<span className="text-xs text-emerald-300">No elevated rule signal</span>}</div></td><td className="p-3 text-center font-bold">{c.bookings30m}</td><td className="p-3 text-center font-bold">{c.failedPayments24h}</td><td className="p-3 text-center font-bold">{c.securityAlerts7d}</td><td className="p-3 font-bold">{c.disposition}</td><td className="p-3"><div className="grid min-w-64 gap-2"><select className="input" aria-label={`Disposition ${c.customerRef}`} value={choices[c.userId]||"REVIEW"} onChange={e=>setChoices(v=>({...v,[c.userId]:e.target.value}))}>{dispositionOptions.map(x=><option key={x} value={x}>{x}</option>)}</select><input className="input" aria-label={`Risk note ${c.customerRef}`} placeholder="Optional review note" value={notes[c.userId]||""} onChange={e=>setNotes(v=>({...v,[c.userId]:e.target.value}))}/><button className="btn btn-secondary" type="button" onClick={()=>saveDisposition(c.userId)}>Save disposition</button></div></td></tr>)}{!data.customers.length&&<tr><td colSpan={8} className="p-8 text-center text-slate-500">No customer accounts available.</td></tr>}</tbody></table></div></section>

      <section className="card p-5 text-sm text-slate-500"><b className="text-slate-300">V61 policy:</b> risk score is decision support, not proof of fraud. BLOCK_RECOMMENDED is a review disposition only; V61 does not disable accounts automatically. Security alerts and failed payments are evidence, not identity or intent claims.</section>
    </>}
  </main>;
}

function Metric({label,value}:{label:string,value:number}){return <div className="card p-4"><div className="text-xs text-slate-400">{label}</div><div className="mt-1 text-2xl font-black">{value}</div></div>}
