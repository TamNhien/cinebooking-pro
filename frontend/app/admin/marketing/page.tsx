"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { api, currency } from "@/lib/api";
import { clearAuth, getAuth } from "@/lib/auth";
import type {
  MarketingCampaignLaunchV64,
  MarketingCampaignPreviewV64,
  MarketingCampaignRequestV64,
  MarketingOverviewV64,
  MarketingSegmentV64,
  UserProfile,
} from "@/lib/types";

const emptyCampaign:MarketingCampaignRequestV64={
  campaignCode:"",
  segmentCode:"AT_RISK_31_90D",
  title:"Ưu đãi dành riêng cho bạn",
  message:"CineBooking gửi bạn một ưu đãi cá nhân để quay lại rạp trong thời gian tới.",
  discountType:"PERCENT",
  discountValue:15,
  minOrderAmount:100000,
  maxDiscount:50000,
  validityDays:14,
  confirmed:false,
};

export default function MarketingAutomationV64Page(){
  const [overview,setOverview]=useState<MarketingOverviewV64|null>(null);
  const [form,setForm]=useState<MarketingCampaignRequestV64>({...emptyCampaign});
  const [preview,setPreview]=useState<MarketingCampaignPreviewV64|null>(null);
  const [result,setResult]=useState<MarketingCampaignLaunchV64|null>(null);
  const [busy,setBusy]=useState(false);
  const [msg,setMsg]=useState("");

  async function load(){
    const me=await api<UserProfile>("/me");
    if(me.role!=="ADMIN"){
      clearAuth(); location.href="/login?returnTo=/admin/marketing&reason=admin"; return;
    }
    setOverview(await api<MarketingOverviewV64>("/admin/marketing/segments"));
  }

  useEffect(()=>{
    if(!getAuth()){location.href="/login?returnTo=/admin/marketing&reason=required";return;}
    load().catch(e=>setMsg((e as Error).message));
  },[]);

  const selected=useMemo(()=>overview?.segments.find(s=>s.code===form.segmentCode)??null,[overview,form.segmentCode]);

  function chooseSegment(segment:MarketingSegmentV64){
    setForm(v=>({...v,segmentCode:segment.code,discountType:"PERCENT",discountValue:segment.defaultDiscountPercent,confirmed:false}));
    setPreview(null);setResult(null);
    window.scrollTo({top:0,behavior:"smooth"});
  }

  function payload(confirmed:boolean):MarketingCampaignRequestV64{
    return {
      ...form,
      campaignCode:form.campaignCode.trim().toUpperCase(),
      title:form.title.trim(),
      message:form.message.trim(),
      discountValue:Number(form.discountValue),
      minOrderAmount:Number(form.minOrderAmount)||0,
      maxDiscount:form.maxDiscount==null||String(form.maxDiscount)===""?undefined:Number(form.maxDiscount),
      validityDays:Number(form.validityDays),
      confirmed,
    };
  }

  async function runPreview(e?:FormEvent){
    e?.preventDefault();setBusy(true);setMsg("");setResult(null);
    try{
      const data=await api<MarketingCampaignPreviewV64>("/admin/marketing/campaigns/preview",{method:"POST",body:JSON.stringify(payload(false))});
      setPreview(data);setMsg(`Preview ${data.campaignCode}: ${data.matchedCustomers} khách phù hợp.`);
    }catch(e){setMsg((e as Error).message)}finally{setBusy(false)}
  }

  async function launch(){
    if(!preview){setMsg("Hãy chạy Preview trước khi phát hành chiến dịch.");return;}
    if(preview.campaignCode!==form.campaignCode.trim().toUpperCase()||preview.segmentCode!==form.segmentCode){setMsg("Nội dung đã thay đổi sau Preview. Hãy Preview lại trước khi phát hành.");return;}
    if(!confirm(`Phát hành chiến dịch ${preview.campaignCode} cho ${preview.matchedCustomers} khách? Mỗi khách sẽ nhận 1 voucher cá nhân và thông báo theo tùy chọn promotion.`))return;
    setBusy(true);setMsg("");
    try{
      const data=await api<MarketingCampaignLaunchV64>("/admin/marketing/campaigns/launch",{method:"POST",body:JSON.stringify(payload(true))});
      setResult(data);setMsg(`Đã phát hành ${data.campaignCode}: tạo ${data.vouchersCreated} voucher mới, ${data.notificationsCreated} thông báo.`);
      await load();
    }catch(e){setMsg((e as Error).message)}finally{setBusy(false)}
  }

  return <div className="space-y-7" data-testid="marketing-v64">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="mb-2 text-sm text-slate-400"><Link href="/admin" className="hover:text-white">Admin</Link> / CRM & Marketing</div>
        <div className="text-xs font-black tracking-[0.22em] text-rose-300">V64 · CRM & MARKETING AUTOMATION 4.0</div>
        <h1 className="mt-2 text-3xl font-bold">Segment → Campaign → Voucher</h1>
        <p className="mt-1 max-w-4xl text-slate-400">Phân khúc trực tiếp từ tài khoản, booking và payment thật; phát hành voucher cá nhân 1 lần dùng và gửi promotion qua các kênh mà khách đã bật.</p>
      </div>
      <div className="flex gap-2"><Link href="/admin/vouchers" className="btn btn-secondary">🎟 Voucher</Link><Link href="/admin" className="btn btn-secondary">← Dashboard</Link></div>
    </div>

    {msg&&<div className="card p-4 text-sm">{msg}</div>}

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div className="card p-5"><div className="text-xs uppercase tracking-wider text-slate-500">Strategy</div><div className="mt-2 font-bold text-rose-300">{overview?.strategyVersion??"V64-CRM-AUTOMATION-4"}</div></div>
      <div className="card p-5"><div className="text-xs uppercase tracking-wider text-slate-500">Khách đủ điều kiện</div><div className="mt-2 text-3xl font-black">{overview?.eligibleCustomers??0}</div></div>
      <div className="card p-5"><div className="text-xs uppercase tracking-wider text-slate-500">Segment đang chọn</div><div className="mt-2 font-bold">{selected?.label??form.segmentCode}</div></div>
      <div className="card p-5"><div className="text-xs uppercase tracking-wider text-slate-500">Delivery guard</div><div className="mt-2 font-bold text-emerald-300">Promotion opt-out respected</div></div>
    </div>

    <div className="grid gap-6 xl:grid-cols-[430px_1fr]">
      <form onSubmit={runPreview} className="card h-fit space-y-4 p-5" data-testid="campaign-composer-v64">
        <div><h2 className="text-xl font-bold">Tạo chiến dịch V64</h2><p className="mt-1 text-xs text-slate-500">Preview bắt buộc trước Launch. campaignCode là khóa idempotency: chạy lại cùng mã sẽ không phát voucher/thông báo trùng.</p></div>
        <div><label className="mb-1.5 block text-sm text-slate-300">Campaign code</label><input className="input font-bold uppercase" value={form.campaignCode} onChange={e=>{setForm({...form,campaignCode:e.target.value.toUpperCase().replace(/\s/g,"")});setPreview(null)}} placeholder="VD: WINBACK_AUG" maxLength={12} required/><p className="mt-1 text-xs text-slate-500">3-12 ký tự A-Z, 0-9, - hoặc _.</p></div>
        <div><label className="mb-1.5 block text-sm text-slate-300">Segment</label><select className="input" data-testid="segment-select-v64" value={form.segmentCode} onChange={e=>{setForm({...form,segmentCode:e.target.value as MarketingCampaignRequestV64["segmentCode"]});setPreview(null)}}>{overview?.segments.map(s=><option key={s.code} value={s.code}>{s.label} ({s.customers})</option>)}</select>{selected&&<p className="mt-1 text-xs text-slate-500">{selected.definition}</p>}</div>
        <div><label className="mb-1.5 block text-sm text-slate-300">Tiêu đề</label><input className="input" value={form.title} onChange={e=>{setForm({...form,title:e.target.value});setPreview(null)}} maxLength={120} required/></div>
        <div><label className="mb-1.5 block text-sm text-slate-300">Nội dung</label><textarea className="input min-h-28" value={form.message} onChange={e=>{setForm({...form,message:e.target.value});setPreview(null)}} maxLength={500} required/></div>
        <div className="grid grid-cols-2 gap-3"><div><label className="mb-1.5 block text-sm text-slate-300">Loại giảm</label><select className="input" value={form.discountType} onChange={e=>{setForm({...form,discountType:e.target.value as "PERCENT"|"FIXED"});setPreview(null)}}><option value="PERCENT">Phần trăm (%)</option><option value="FIXED">Số tiền (đ)</option></select></div><div><label className="mb-1.5 block text-sm text-slate-300">Mức giảm</label><input className="input" type="number" min={1} max={form.discountType==="PERCENT"?100:undefined} value={form.discountValue} onChange={e=>{setForm({...form,discountValue:Number(e.target.value)});setPreview(null)}}/></div></div>
        <div className="grid grid-cols-2 gap-3"><div><label className="mb-1.5 block text-sm text-slate-300">Đơn tối thiểu</label><input className="input" type="number" min={0} value={form.minOrderAmount} onChange={e=>{setForm({...form,minOrderAmount:Number(e.target.value)});setPreview(null)}}/></div><div><label className="mb-1.5 block text-sm text-slate-300">Giảm tối đa</label><input className="input" type="number" min={0} value={form.maxDiscount??""} onChange={e=>{setForm({...form,maxDiscount:e.target.value===""?undefined:Number(e.target.value)});setPreview(null)}} placeholder="Không giới hạn"/></div></div>
        <div><label className="mb-1.5 block text-sm text-slate-300">Hiệu lực voucher (ngày)</label><input className="input" type="number" min={1} max={90} value={form.validityDays} onChange={e=>{setForm({...form,validityDays:Number(e.target.value)});setPreview(null)}}/></div>
        <div className="grid grid-cols-2 gap-2"><button className="btn btn-secondary" disabled={busy} data-testid="campaign-preview-v64">{busy?"Đang xử lý...":"🔎 Preview"}</button><button type="button" className="btn btn-primary" disabled={busy||!preview} onClick={launch} data-testid="campaign-launch-v64">🚀 Launch</button></div>
      </form>

      <div className="space-y-5">
        <div className="grid gap-3 md:grid-cols-2" data-testid="segments-v64">{overview?.segments.map(s=><button type="button" key={s.code} onClick={()=>chooseSegment(s)} className={`card p-5 text-left transition ${form.segmentCode===s.code?"border-rose-500/60 bg-rose-500/5":"hover:border-slate-500"}`}><div className="flex items-start justify-between gap-3"><div><div className="font-bold">{s.label}</div><div className="mt-1 text-xs text-slate-500">{s.code}</div></div><div className="rounded-full bg-slate-800 px-3 py-1 text-lg font-black">{s.customers}</div></div><p className="mt-3 text-sm text-slate-400">{s.definition}</p><div className="mt-3 text-xs text-emerald-300">Gợi ý: {s.recommendedAction}</div><div className="mt-1 text-xs text-slate-500">Voucher mặc định: {s.defaultDiscountPercent}%</div></button>)}</div>

        {preview&&<div className="card p-5" data-testid="campaign-preview-result-v64">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-xs font-black tracking-widest text-cyan-300">PREVIEW</div><h2 className="mt-1 text-xl font-bold">{preview.campaignCode} · {preview.segmentLabel}</h2></div><div className="rounded-xl bg-cyan-500/10 px-4 py-2 text-2xl font-black text-cyan-300">{preview.matchedCustomers}</div></div>
          <div className="mt-4 grid gap-2 text-xs text-slate-400"><div>🎟 {preview.voucherPolicy}</div><div>🔔 {preview.deliveryPolicy}</div></div>
          <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="pb-2">Khách</th><th className="pb-2">Tier</th><th className="pb-2">Booking</th><th className="pb-2">Doanh thu</th><th className="pb-2">Recency</th></tr></thead><tbody className="divide-y divide-slate-800">{preview.audience.map(a=><tr key={a.customerRef}><td className="py-3"><div className="font-semibold">{a.fullName}</div><div className="text-xs text-slate-500">{a.customerRef} · {a.maskedEmail}</div></td><td className="py-3">{a.membershipTier}</td><td className="py-3">{a.lifetimeBookings}</td><td className="py-3">{currency(a.lifetimeRevenue)}</td><td className="py-3">{a.recencyDays<0?"Chưa booking":`${a.recencyDays} ngày`}</td></tr>)}</tbody></table></div>
          {preview.matchedCustomers>preview.previewLimit&&<div className="mt-3 text-xs text-slate-500">Đang hiển thị {preview.previewLimit}/{preview.matchedCustomers} khách đầu tiên.</div>}
        </div>}

        {result&&<div className="card border border-emerald-700/60 p-5" data-testid="campaign-launch-result-v64"><div className="text-xs font-black tracking-widest text-emerald-300">LAUNCHED · IDEMPOTENT</div><h2 className="mt-1 text-xl font-bold">{result.campaignCode}</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Matched" value={result.matchedCustomers}/><Metric label="Voucher mới" value={result.vouchersCreated}/><Metric label="Voucher tái dùng" value={result.vouchersReused}/><Metric label="Thông báo tạo" value={result.notificationsCreated}/></div><div className="mt-3 text-xs text-slate-500">Thông báo bỏ qua: {result.notificationsSkipped} (opt-out/kênh tắt hoặc dedupe). Voucher cá nhân vẫn thuộc đúng tài khoản.</div></div>}
      </div>
    </div>
  </div>;
}

function Metric({label,value}:{label:string;value:number}){return <div className="rounded-xl bg-slate-900/70 p-3"><div className="text-xs text-slate-500">{label}</div><div className="mt-1 text-2xl font-black">{value}</div></div>}
