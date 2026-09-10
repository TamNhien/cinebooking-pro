/* eslint-disable react-hooks/set-state-in-effect -- initial effect loads authenticated CRM automation data. */
"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { api, currency, dateTime } from "@/lib/api";
import { clearAuth, getAuth } from "@/lib/auth";
import type {
  CrmAutomationExecutionV77,
  CrmAutomationPreviewV77,
  CrmAutomationRequestV77,
  CrmAutomationSummaryV77,
  CrmPlaybookV77,
  UserProfile,
} from "@/lib/types";

const WINDOWS=[7,30,90,180] as const;
const emptyCampaign:CrmAutomationRequestV77={
  campaignCode:"",
  playbookCode:"AT_RISK_WINBACK",
  title:"Ưu đãi dành riêng cho bạn",
  message:"CineBooking gửi bạn một ưu đãi cá nhân phù hợp với giai đoạn hiện tại của bạn.",
  discountType:"PERCENT",
  discountValue:15,
  minOrderAmount:100000,
  maxDiscount:50000,
  validityDays:14,
  maxRecipients:100,
  confirmed:false,
};

export default function CrmAutomationV77Page(){
  const [days,setDays]=useState<number>(30);
  const [summary,setSummary]=useState<CrmAutomationSummaryV77|null>(null);
  const [form,setForm]=useState<CrmAutomationRequestV77>({...emptyCampaign});
  const [preview,setPreview]=useState<CrmAutomationPreviewV77|null>(null);
  const [result,setResult]=useState<CrmAutomationExecutionV77|null>(null);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");

  const load=useCallback(async()=>{
    setBusy(true);
    try{
      const me=await api<UserProfile>("/me");
      if(me.role!=="ADMIN"){
        clearAuth();
        window.location.assign("/login?returnTo=/admin/crm-automation&reason=admin");
        return;
      }
      setSummary(await api<CrmAutomationSummaryV77>(`/admin/crm-automation/summary?days=${days}`));
      setError("");
    }catch(e){setError((e as Error).message)}finally{setBusy(false)}
  },[days]);

  useEffect(()=>{
    if(!getAuth()){window.location.assign("/login?returnTo=/admin/crm-automation&reason=required");return;}
    void load();
  },[load]);

  const selected=useMemo(()=>summary?.playbooks.find(x=>x.code===form.playbookCode)??null,[summary,form.playbookCode]);

  function dirty(next:CrmAutomationRequestV77){
    setForm(next);
    setPreview(null);
    setResult(null);
  }

  function choosePlaybook(playbook:CrmPlaybookV77){
    dirty({
      ...form,
      playbookCode:playbook.code,
      discountType:"PERCENT",
      discountValue:playbook.defaultDiscountPercent,
      maxRecipients:Math.max(1,Math.min(5000,Math.max(playbook.contactableCustomers,100))),
      confirmed:false,
    });
    window.scrollTo({top:0,behavior:"smooth"});
  }

  function payload(confirmed:boolean):CrmAutomationRequestV77{
    return {
      ...form,
      campaignCode:form.campaignCode.trim().toUpperCase(),
      title:form.title.trim(),
      message:form.message.trim(),
      discountValue:Number(form.discountValue),
      minOrderAmount:Number(form.minOrderAmount)||0,
      maxDiscount:form.maxDiscount==null||String(form.maxDiscount)===""?undefined:Number(form.maxDiscount),
      validityDays:Number(form.validityDays),
      maxRecipients:Number(form.maxRecipients),
      confirmed,
    };
  }

  async function runPreview(e?:FormEvent){
    e?.preventDefault();
    setBusy(true);setMessage("");setError("");setResult(null);
    try{
      const data=await api<CrmAutomationPreviewV77>("/admin/crm-automation/preview",{method:"POST",body:JSON.stringify(payload(false))});
      setPreview(data);
      setMessage(`Preview ${data.campaignCode}: ${data.contactableCustomers}/${data.eligibleCustomers} khách có thể nhận chiến dịch.`);
    }catch(e){setError((e as Error).message)}finally{setBusy(false)}
  }

  async function execute(){
    if(!preview){setError("Hãy chạy Preview trước khi Execute.");return;}
    const current=payload(false);
    if(preview.campaignCode!==current.campaignCode||preview.playbookCode!==current.playbookCode){setError("Campaign đã thay đổi sau Preview. Hãy Preview lại.");return;}
    if(!preview.executable){setError("Preview chưa đạt blast-radius guard. Hãy điều chỉnh maxRecipients hoặc playbook.");return;}
    if(!confirm(`Execute CRM ${preview.campaignCode} cho ${preview.contactableCustomers} khách contactable? ${preview.suppressedCustomers} khách đang bị suppression sẽ không nhận chiến dịch.`))return;
    setBusy(true);setMessage("");setError("");
    try{
      const data=await api<CrmAutomationExecutionV77>("/admin/crm-automation/execute",{method:"POST",body:JSON.stringify(payload(true))});
      setResult(data);
      setMessage(`Đã execute ${data.campaignCode}: ${data.notificationsCreated} notification mới, ${data.suppressedCustomers} khách được suppression bảo vệ.`);
      await load();
    }catch(e){setError((e as Error).message)}finally{setBusy(false)}
  }

  return <div className="space-y-7" data-testid="crm-automation-v77">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="mb-2 text-sm text-slate-400"><Link href="/admin" className="hover:text-white">Admin</Link> / CRM Automation</div>
        <div className="text-xs font-black tracking-[0.22em] text-fuchsia-300">V77 · CRM AUTOMATION 5.0</div>
        <h1 className="mt-2 text-3xl font-bold">Lifecycle Playbooks & Contact Safety</h1>
        <p className="mt-1 max-w-5xl text-slate-400">Tự động hóa CRM trên dữ liệu user, booking, payment, notification preference và promotion history thật. V77 thêm contactability, frequency cap, cooldown, blast-radius guard và outcome correlation để không biến CRM thành hệ thống spam.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <select className="input min-w-36" value={days} onChange={e=>setDays(Number(e.target.value))} aria-label="CRM outcome window">{WINDOWS.map(x=><option key={x} value={x}>{x} ngày</option>)}</select>
        <button className="btn btn-primary" onClick={()=>void load()} disabled={busy}>{busy?"Đang tải...":"↻ Làm mới"}</button>
        <Link href="/admin/marketing" className="btn btn-secondary">CRM V64 legacy</Link>
        <Link href="/admin/recommendation" className="btn btn-secondary">Recommendation V76</Link>
        <Link href="/admin" className="btn btn-secondary">← Dashboard</Link>
      </div>
    </div>

    {message&&<div className="card border border-emerald-800/50 p-4 text-sm text-emerald-200">{message}</div>}
    {error&&<div data-testid="crm-error-v77" className="card border border-rose-800/60 p-4 text-sm text-rose-200">{error}</div>}

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5" data-testid="crm-summary-v77">
      <Metric label="Strategy" value={summary?.strategyVersion??"V77-CRM-AUTOMATION-5"} compact/>
      <Metric label="Eligible USER" value={num(summary?.eligibleCustomers??0)}/>
      <Metric label="Contactable" value={num(summary?.contactableCustomers??0)} tone="good"/>
      <Metric label="Suppressed" value={num(summary?.suppressedCustomers??0)} tone="warn"/>
      <Metric label="Contact guard" value={`${summary?.frequencyCap7d??2}/7d · ${summary?.cooldownHours??72}h`} compact/>
    </section>

    <section className="card p-5" data-testid="crm-policy-v77">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h2 className="text-xl font-bold">CRM evidence & safety policy</h2><p className="mt-1 text-sm text-slate-500">Không tạo customer/booking giả để làm đẹp KPI; execute chỉ dùng khách contactable sau suppression và giới hạn maxRecipients do Admin xác nhận.</p></div>
        {summary&&<span className="text-xs text-slate-500">Generated {dateTime(summary.generatedAt)}</span>}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">{(summary?.evidencePolicy??[]).map(x=><code key={x} className="rounded-lg bg-slate-900 px-2 py-1 text-xs text-cyan-300">{x}</code>)}</div>
    </section>

    <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
      <section className="card overflow-hidden" data-testid="crm-outcomes-v77">
        <div className="border-b border-slate-800 bg-gradient-to-r from-fuchsia-500/10 via-slate-950/10 to-emerald-500/10 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold">Observed CRM outcomes</h2><p className="mt-1 text-sm text-slate-500">Chỉ đo PROMOTION_V77 trong cửa sổ {summary?.outcome.windowDays??days} ngày.</p></div><span className="rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-3 py-1 text-xs font-bold text-fuchsia-200">CORRELATION ONLY</span></div>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4">
          <Mini label="Promotion messages" value={num(summary?.outcome.promotionMessages??0)} detail={`${num(summary?.outcome.inAppVisibleMessages??0)} in-app visible`}/>
          <Mini label="Read rate" value={pct(summary?.outcome.readRatePercent??0)} detail={`${num(summary?.outcome.readMessages??0)} đã đọc`}/>
          <Mini label="Assisted bookings" value={num(summary?.outcome.assistedConfirmedBookings??0)} detail="CONFIRMED ≤7d sau CRM"/>
          <Mini label="Assisted revenue" value={currency(summary?.outcome.assistedRealizedRevenue??0)} detail="SUCCESS payment deduped"/>
        </div>
        <div className="border-t border-slate-800/70 bg-slate-950/30 px-5 py-3 text-xs leading-5 text-slate-500"><span className="font-semibold text-slate-400">Evidence note:</span> CRM-assisted booking là signal tương quan khi khách nhận PROMOTION_V77 trong 7 ngày trước booking CONFIRMED; không phải causal attribution.</div>
      </section>

      <section className="card p-5" data-testid="crm-suppressions-v77">
        <h2 className="text-xl font-bold">Suppression guard</h2>
        <p className="mt-1 text-sm text-slate-500">Các lý do được áp dụng theo thứ tự ưu tiên; một khách chỉ được tính vào suppression đầu tiên đang hiệu lực.</p>
        <div className="mt-4 space-y-3">{(summary?.suppressions??[]).map(x=><div key={x.reason} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/50 p-3"><div><div className="font-semibold">{suppressionLabel(x.reason)}</div><div className="mt-0.5 text-xs text-slate-500">{x.reason}</div></div><div className="rounded-full bg-slate-800 px-3 py-1 text-lg font-black">{num(x.customers)}</div></div>)}</div>
      </section>
    </div>

    <section data-testid="crm-playbooks-v77">
      <div className="mb-3"><h2 className="text-xl font-bold">Lifecycle playbooks</h2><p className="mt-1 text-sm text-slate-500">Eligible là khách khớp lifecycle rule; Contactable là phần còn lại sau opt-out/channel/frequency/cooldown suppression.</p></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">{summary?.playbooks.map(p=><button key={p.code} type="button" onClick={()=>choosePlaybook(p)} className={`card p-5 text-left transition ${form.playbookCode===p.code?"border-fuchsia-500/60 bg-fuchsia-500/5":"hover:border-slate-500"}`}>
        <div className="text-xs font-black tracking-wider text-fuchsia-300">{p.code}</div><div className="mt-2 font-bold">{p.label}</div><p className="mt-2 min-h-16 text-sm text-slate-500">{p.definition}</p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center"><Tiny label="Eligible" value={p.eligibleCustomers}/><Tiny label="Ready" value={p.contactableCustomers}/><Tiny label="Supp." value={p.suppressedCustomers}/></div>
        <div className="mt-3 text-xs text-emerald-300">Gợi ý: {p.recommendedAction}</div><div className="mt-1 text-xs text-slate-500">Discount mặc định: {p.defaultDiscountPercent}%</div>
      </button>)}</div>
    </section>

    <div className="grid gap-6 xl:grid-cols-[430px_1fr]">
      <form onSubmit={runPreview} className="card h-fit space-y-4 p-5" data-testid="crm-composer-v77">
        <div><h2 className="text-xl font-bold">CRM automation composer</h2><p className="mt-1 text-xs text-slate-500">Preview bắt buộc trước Execute. campaignCode + user là idempotency key; chạy lại không tạo notification trùng.</p></div>
        <div><label className="mb-1.5 block text-sm text-slate-300">Campaign code</label><input className="input font-bold uppercase" value={form.campaignCode} onChange={e=>dirty({...form,campaignCode:e.target.value.toUpperCase().replace(/\s/g,"")})} placeholder="VD: WINBACK_SEP" maxLength={12} required/><p className="mt-1 text-xs text-slate-500">3-12 ký tự A-Z, 0-9, - hoặc _.</p></div>
        <div><label className="mb-1.5 block text-sm text-slate-300">Lifecycle playbook</label><select className="input" data-testid="crm-playbook-select-v77" value={form.playbookCode} onChange={e=>dirty({...form,playbookCode:e.target.value as CrmAutomationRequestV77["playbookCode"]})}>{summary?.playbooks.map(p=><option key={p.code} value={p.code}>{p.label} ({p.contactableCustomers} ready)</option>)}</select>{selected&&<p className="mt-1 text-xs text-slate-500">{selected.definition}</p>}</div>
        <div><label className="mb-1.5 block text-sm text-slate-300">Tiêu đề</label><input className="input" value={form.title} onChange={e=>dirty({...form,title:e.target.value})} maxLength={120} required/></div>
        <div><label className="mb-1.5 block text-sm text-slate-300">Nội dung</label><textarea className="input min-h-28" value={form.message} onChange={e=>dirty({...form,message:e.target.value})} maxLength={500} required/></div>
        <div className="grid grid-cols-2 gap-3"><div><label className="mb-1.5 block text-sm text-slate-300">Loại giảm</label><select className="input" value={form.discountType} onChange={e=>dirty({...form,discountType:e.target.value as "PERCENT"|"FIXED"})}><option value="PERCENT">Phần trăm (%)</option><option value="FIXED">Số tiền (đ)</option></select></div><div><label className="mb-1.5 block text-sm text-slate-300">Mức giảm</label><input className="input" type="number" min={1} max={form.discountType==="PERCENT"?100:undefined} value={form.discountValue} onChange={e=>dirty({...form,discountValue:Number(e.target.value)})}/></div></div>
        <div className="grid grid-cols-2 gap-3"><div><label className="mb-1.5 block text-sm text-slate-300">Đơn tối thiểu</label><input className="input" type="number" min={0} value={form.minOrderAmount} onChange={e=>dirty({...form,minOrderAmount:Number(e.target.value)})}/></div><div><label className="mb-1.5 block text-sm text-slate-300">Giảm tối đa</label><input className="input" type="number" min={0} value={form.maxDiscount??""} onChange={e=>dirty({...form,maxDiscount:e.target.value===""?undefined:Number(e.target.value)})} placeholder="Không giới hạn"/></div></div>
        <div className="grid grid-cols-2 gap-3"><div><label className="mb-1.5 block text-sm text-slate-300">Hiệu lực (ngày)</label><input className="input" type="number" min={1} max={90} value={form.validityDays} onChange={e=>dirty({...form,validityDays:Number(e.target.value)})}/></div><div><label className="mb-1.5 block text-sm text-slate-300">Max recipients</label><input className="input" data-testid="crm-max-recipients-v77" type="number" min={1} max={5000} value={form.maxRecipients} onChange={e=>dirty({...form,maxRecipients:Number(e.target.value)})}/></div></div>
        <div className="rounded-xl border border-amber-400/15 bg-amber-400/5 p-3 text-xs leading-5 text-amber-100/80">🛡 Execute bị chặn nếu số contactable vượt <strong>maxRecipients</strong>. Suppressed users không tính vào blast radius và không nhận voucher/notification.</div>
        <div className="grid grid-cols-2 gap-2"><button className="btn btn-secondary" disabled={busy} data-testid="crm-preview-v77">{busy?"Đang xử lý...":"🔎 Preview"}</button><button type="button" className="btn btn-primary" disabled={busy||!preview||!preview.executable} onClick={execute} data-testid="crm-execute-v77">🚀 Execute</button></div>
      </form>

      <div className="space-y-5">
        {preview?<section className="card overflow-hidden" data-testid="crm-preview-result-v77">
          <div className="border-b border-slate-800 bg-gradient-to-r from-cyan-500/10 via-slate-950/10 to-fuchsia-500/10 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-xs font-black tracking-widest text-cyan-300">PREVIEW · {preview.executable?"READY":"BLOCKED"}</div><h2 className="mt-1 text-xl font-bold">{preview.campaignCode} · {preview.playbookLabel}</h2></div><div className={`rounded-xl px-4 py-2 text-2xl font-black ${preview.executable?"bg-emerald-500/10 text-emerald-300":"bg-rose-500/10 text-rose-300"}`}>{num(preview.contactableCustomers)} ready</div></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3"><Mini label="Eligible" value={num(preview.eligibleCustomers)}/><Mini label="Contactable" value={num(preview.contactableCustomers)}/><Mini label="Suppressed" value={num(preview.suppressedCustomers)}/></div>
            <div className="mt-4 grid gap-2 text-xs text-slate-400"><div>🎟 {preview.voucherPolicy}</div><div>🔔 {preview.deliveryPolicy}</div><div>🛡 {preview.safetyPolicy}</div></div>
            {!preview.executable&&<div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-sm text-rose-200">Execute đang bị chặn: cần ít nhất 1 contactable user và contactable ≤ maxRecipients ({preview.maxRecipients}).</div>}
          </div>
          <div className="overflow-x-auto"><table className="w-full min-w-[920px] text-left text-sm"><thead className="bg-slate-900/70 text-xs uppercase text-slate-500"><tr><th className="p-3">Khách</th><th className="p-3">Tier</th><th className="p-3">Booking</th><th className="p-3">Revenue</th><th className="p-3">Recency</th><th className="p-3">Promo 7d</th><th className="p-3">Contactability</th></tr></thead><tbody className="divide-y divide-slate-800">{preview.audience.map(a=><tr key={a.customerRef}><td className="p-3"><div className="font-semibold">{a.customerRef}</div><div className="text-xs text-slate-500">{a.maskedEmail}</div></td><td className="p-3">{a.membershipTier||"-"}</td><td className="p-3">{num(a.lifetimeBookings)}</td><td className="p-3">{currency(a.lifetimeRevenue)}</td><td className="p-3">{a.recencyDays<0?"Chưa booking":`${a.recencyDays} ngày`}</td><td className="p-3">{a.promotionNotifications7d}</td><td className="p-3">{a.contactable?<span className="rounded-md bg-emerald-400/10 px-2 py-1 text-xs font-bold text-emerald-300">READY</span>:<span className="rounded-md bg-amber-400/10 px-2 py-1 text-xs font-bold text-amber-200">{a.suppressionReason}</span>}</td></tr>)}</tbody></table></div>
          {preview.eligibleCustomers>preview.previewLimit&&<div className="border-t border-slate-800 p-3 text-xs text-slate-500">Đang hiển thị {preview.previewLimit}/{preview.eligibleCustomers} khách đầu tiên; contactable được ưu tiên lên đầu preview.</div>}
        </section>:<section className="card p-8 text-center" data-testid="crm-preview-empty-v77"><div className="text-4xl">🧭</div><h2 className="mt-3 text-xl font-bold">Chọn playbook và chạy Preview</h2><p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">V77 sẽ tính lifecycle eligibility, contactability và suppression trước khi cho phép Execute. Không có chiến dịch nào được gửi từ màn hình này nếu chưa Preview.</p></section>}

        {result&&<section className="card border border-emerald-700/60 p-5" data-testid="crm-execution-result-v77"><div className="text-xs font-black tracking-widest text-emerald-300">EXECUTED · IDEMPOTENT</div><h2 className="mt-1 text-xl font-bold">{result.campaignCode}</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><Mini label="Contactable" value={num(result.contactableCustomers)}/><Mini label="Suppressed" value={num(result.suppressedCustomers)}/><Mini label="Voucher mới" value={num(result.vouchersCreated)}/><Mini label="Voucher reused" value={num(result.vouchersReused)}/><Mini label="Notification mới" value={num(result.notificationsCreated)}/></div><div className="mt-3 text-xs text-slate-500">Notification skipped: {result.notificationsSkipped}. Re-run cùng campaignCode không tạo delivery trùng nhờ dedupe key CRM77.</div></section>}
      </div>
    </div>
  </div>;
}

function Metric({label,value,compact=false,tone}:{label:string;value:string;compact?:boolean;tone?:"good"|"warn"}){return <div className="card p-5"><div className="text-xs uppercase tracking-wider text-slate-500">{label}</div><div className={`mt-2 font-black ${compact?"break-all text-sm":"text-2xl"} ${tone==="good"?"text-emerald-300":tone==="warn"?"text-amber-200":""}`}>{value}</div></div>}
function Mini({label,value,detail}:{label:string;value:string;detail?:string}){return <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"><div className="text-xs text-slate-500">{label}</div><div className="mt-1 text-lg font-black">{value}</div>{detail&&<div className="mt-1 text-xs text-cyan-300">{detail}</div>}</div>}
function Tiny({label,value}:{label:string;value:number}){return <div className="rounded-lg bg-slate-950/50 p-2"><div className="text-[10px] uppercase tracking-wide text-slate-600">{label}</div><div className="mt-1 font-black">{num(value)}</div></div>}
function suppressionLabel(reason:string){return ({PROMOTION_OPT_OUT:"Promotion opt-out",NO_ENABLED_CHANNEL:"Không có delivery channel",FREQUENCY_CAP_7D:"Frequency cap 7 ngày",COOLDOWN_72H:"Promotion cooldown 72 giờ"} as Record<string,string>)[reason]??reason}
function pct(value:number){return `${Number(value||0).toFixed(2)}%`}
function num(value:number){return new Intl.NumberFormat("vi-VN").format(Number(value||0))}
