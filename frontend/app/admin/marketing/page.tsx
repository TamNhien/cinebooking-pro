/* eslint-disable react-hooks/set-state-in-effect -- effects intentionally synchronize API/subscription state. */
"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, api, currency } from "@/lib/api";
import { clearAuth, getAuth } from "@/lib/auth";
import { getStepUp } from "@/lib/step-up";
import { usePresentationLanguage, type Language } from "@/lib/usePresentationLanguage";
import type {
  MarketingCampaignLaunchV64,
  MarketingCampaignPreviewV64,
  MarketingCampaignRequestV64,
  MarketingOverviewV64,
  MarketingSegmentV64,
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

type FeedbackKind="info"|"success"|"warning"|"error";

const SEGMENT_CODES:MarketingCampaignRequestV64["segmentCode"][]=[
  "ALL_ELIGIBLE","NEW_30D","ENGAGED_30D","VIP","AT_RISK_31_90D","LAPSED_90D_PLUS","PROSPECT_NO_BOOKING",
];
const SEGMENT_FALLBACK_LABELS:Record<MarketingCampaignRequestV64["segmentCode"],[string,string]>={
  ALL_ELIGIBLE:["Toàn bộ khách đủ điều kiện","All eligible customers"],
  NEW_30D:["Khách mới 30 ngày","New customers · 30 days"],
  ENGAGED_30D:["Đang tương tác 30 ngày","Engaged · 30 days"],
  VIP:["VIP giá trị cao","High-value VIP"],
  AT_RISK_31_90D:["Có nguy cơ rời bỏ","At risk of churn"],
  LAPSED_90D_PLUS:["Ngủ đông >90 ngày","Lapsed · over 90 days"],
  PROSPECT_NO_BOOKING:["Đã đăng ký, chưa mua","Registered, no purchase"],
};

export default function MarketingAutomationV64Page(){
  const { language, t } = usePresentationLanguage();
  const [overview,setOverview]=useState<MarketingOverviewV64|null>(null);
  const [form,setForm]=useState<MarketingCampaignRequestV64>({...emptyCampaign});
  const [preview,setPreview]=useState<MarketingCampaignPreviewV64|null>(null);
  const [result,setResult]=useState<MarketingCampaignLaunchV64|null>(null);
  const [busy,setBusy]=useState(false);
  const [msg,setMsg]=useState("");
  const [feedbackKind,setFeedbackKind]=useState<FeedbackKind>("info");
  const [stepUpReady,setStepUpReady]=useState(false);
  const [overviewLoading,setOverviewLoading]=useState(true);

  const refreshStepUp=useCallback(()=>{setStepUpReady(Boolean(getStepUp()));},[]);

  const load=useCallback(async()=>{
    const auth=getAuth();
    if(!auth){window.location.assign("/login?returnTo=/admin/marketing&reason=required");return;}
    if(auth.role!=="ADMIN"){
      clearAuth(); window.location.assign("/login?returnTo=/admin/marketing&reason=admin"); return;
    }

    // V77.0.24: the ADMIN API remains the authorization source of truth. Docker
    // reports a container as Up before Spring has necessarily finished accepting
    // requests, so keep the real loading surface and retry only transient runtime
    // failures across a bounded 12-second convergence window. Authorization
    // failures still fail closed immediately and are never retried.
    setOverviewLoading(true);
    const deadline=Date.now()+12_000;
    let lastError:unknown=null;
    let attempt=0;
    try{
      while(Date.now()<deadline){
        try{
          const next=await api<MarketingOverviewV64>("/admin/marketing/segments");
          setOverview(next);
          setMsg("");
          setFeedbackKind("info");
          refreshStepUp();
          return;
        }catch(error){
          lastError=error;
          if(error instanceof ApiError&&(error.status===401||error.status===403))throw error;
          attempt+=1;
          const remaining=deadline-Date.now();
          if(remaining<=0)break;
          await new Promise(resolve=>window.setTimeout(resolve,Math.min(1500,250*attempt,remaining)));
        }
      }
      throw lastError instanceof Error?lastError:new Error("Không tải được dữ liệu CRM V64.");
    }finally{
      setOverviewLoading(false);
    }
  },[refreshStepUp]);

  const reportLoadError=useCallback((error:unknown)=>{setFeedbackKind("error");setMsg((error as Error).message)},[]);

  useEffect(()=>{
    load().catch(reportLoadError);
  },[load,reportLoadError]);

  useEffect(()=>{
    const onStepUp=()=>refreshStepUp();
    const retryIfNeeded=()=>{refreshStepUp();if(!overview)load().catch(reportLoadError);};
    window.addEventListener("step-up-changed",onStepUp);
    window.addEventListener("focus",retryIfNeeded);
    window.addEventListener("online",retryIfNeeded);
    return()=>{window.removeEventListener("step-up-changed",onStepUp);window.removeEventListener("focus",retryIfNeeded);window.removeEventListener("online",retryIfNeeded)};
  },[load,overview,refreshStepUp,reportLoadError]);

  const selected=useMemo(()=>overview?.segments.find(s=>s.code===form.segmentCode)??null,[overview,form.segmentCode]);

  function invalidatePreview(next:MarketingCampaignRequestV64){
    setForm(next);setPreview(null);setResult(null);setMsg("");setFeedbackKind("info");
  }

  function chooseSegment(segment:MarketingSegmentV64){
    invalidatePreview({...form,segmentCode:segment.code,discountType:"PERCENT",discountValue:segment.defaultDiscountPercent,confirmed:false});
    document.querySelector('[data-testid="campaign-composer-v64"]')?.scrollIntoView({behavior:"smooth",block:"start"});
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
    e?.preventDefault();setBusy(true);setMsg("");setResult(null);setFeedbackKind("info");
    try{
      const data=await api<MarketingCampaignPreviewV64>("/admin/marketing/campaigns/preview",{method:"POST",body:JSON.stringify(payload(false))});
      setPreview(data);
      setFeedbackKind("success");
      setMsg(`${t("Xem trước sẵn sàng","Preview ready")} · ${data.campaignCode}: ${data.matchedCustomers} ${t("khách phù hợp","matching customers")}. ${t("Kiểm tra danh sách ngay bên dưới rồi phát hành.","Review the audience below, then publish.")}`);
    }catch(e){setFeedbackKind("error");setMsg((e as Error).message)}finally{setBusy(false)}
  }

  async function launch(){
    refreshStepUp();
    if(!preview){setFeedbackKind("warning");setMsg(t("Hãy chạy Xem trước trước khi phát hành chiến dịch.","Run Preview before publishing the campaign."));return;}
    if(preview.campaignCode!==form.campaignCode.trim().toUpperCase()||preview.segmentCode!==form.segmentCode){setFeedbackKind("warning");setMsg(t("Nội dung đã thay đổi sau Xem trước. Hãy Xem trước lại trước khi phát hành.","The campaign changed after Preview. Preview again before publishing."));return;}
    if(!getStepUp()){
      setStepUpReady(false);setFeedbackKind("warning");
      setMsg(t("Phát hành là thao tác nhạy cảm V68. Hãy mở khóa xác thực tăng cường ở trang Bảo mật, sau đó quay lại và bấm Phát hành.","Publishing is protected by V68 step-up authentication. Unlock sensitive actions on the Security page, then return and publish."));
      return;
    }
    const ok=confirm(t(
      `Phát hành chiến dịch ${preview.campaignCode} cho ${preview.matchedCustomers} khách? Mỗi khách sẽ nhận 1 voucher cá nhân và thông báo theo tùy chọn promotion.`,
      `Publish campaign ${preview.campaignCode} to ${preview.matchedCustomers} customers? Each customer receives one personal voucher and promotion notifications according to their preferences.`
    ));
    if(!ok)return;
    setBusy(true);setMsg("");setFeedbackKind("info");
    try{
      const data=await api<MarketingCampaignLaunchV64>("/admin/marketing/campaigns/launch",{method:"POST",body:JSON.stringify(payload(true))});
      const publishedMessage=`${t("Đã phát hành","Published")} ${data.campaignCode}: ${data.vouchersCreated} ${t("mã ưu đãi mới","new vouchers")}, ${data.vouchersReused} ${t("mã tái sử dụng","reused vouchers")}, ${data.notificationsCreated} ${t("thông báo mới","new notifications")}.`;
      setResult(data);
      // Refresh the real segment overview after launch, but never let that
      // bookkeeping refresh overwrite the authoritative publish-success feedback.
      // The launch response is already committed and idempotent at this point.
      try{await load();}catch{/* Preserve the successful launch result; focus/online can retry overview refresh later. */}
      setFeedbackKind("success");
      setMsg(publishedMessage);
    }catch(e){
      if(e instanceof ApiError&&e.status===428){
        setStepUpReady(false);setFeedbackKind("warning");
        setMsg(t("Quyền V68 đã hết hạn hoặc chưa được mở khóa. Mở trang Bảo mật, xác thực lại rồi phát hành lần nữa.","The V68 grant is missing or expired. Open Security, authenticate again, then publish once more."));
      }else{setFeedbackKind("error");setMsg((e as Error).message)}
    }finally{setBusy(false)}
  }

  const copy={
    admin:t("Quản trị viên","Admin"), crm:t("CRM & tiếp thị","CRM & Marketing"),
    version:t("V64 · CRM & TỰ ĐỘNG HÓA TIẾP THỊ 4.0","V64 · CRM & MARKETING AUTOMATION 4.0"),
    title:t("Phân khúc → Chiến dịch → Mã ưu đãi","Segment → Campaign → Voucher"),
    description:t("Phân khúc trực tiếp từ tài khoản, lượt đặt vé và thanh toán thật; phát hành mã ưu đãi cá nhân dùng một lần và gửi khuyến mãi qua các kênh mà khách đã bật.","Segment real accounts, bookings and successful payments; issue one-time personal vouchers and send promotions only through enabled channels."),
  };

  return <div className="space-y-7" data-testid="marketing-v64">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="mb-2 text-sm text-slate-400"><Link href="/admin" className="hover:text-white">{copy.admin}</Link> / {copy.crm}</div>
        <div className="text-xs font-black tracking-[0.22em] text-rose-300">{copy.version}</div>
        <h1 className="mt-2 text-3xl font-bold">{copy.title}</h1>
        <p className="mt-1 max-w-4xl text-slate-400">{copy.description}</p>
      </div>
      <div className="flex gap-2"><Link href="/admin/vouchers" className="btn btn-secondary">🎟 {t("Mã ưu đãi","Vouchers")}</Link><Link href="/admin" className="btn btn-secondary">← {t("Bảng điều khiển","Dashboard")}</Link></div>
    </div>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div className="card p-5"><div className="text-xs uppercase tracking-wider text-slate-500">{t("Chiến lược","Strategy")}</div><div className="mt-2 font-bold text-rose-300">{overview?.strategyVersion??"V64-CRM-AUTOMATION-4"}</div></div>
      <div className="card p-5"><div className="text-xs uppercase tracking-wider text-slate-500">{t("Khách đủ điều kiện","Eligible customers")}</div><div className="mt-2 text-3xl font-black">{overview?.eligibleCustomers??0}</div></div>
      <div className="card p-5"><div className="text-xs uppercase tracking-wider text-slate-500">{t("Phân khúc đang chọn","Selected segment")}</div><div className="mt-2 font-bold">{selected?segmentCopy(selected,language).label:form.segmentCode}</div></div>
      <div className="card p-5"><div className="text-xs uppercase tracking-wider text-slate-500">{t("Điều kiện gửi","Delivery guard")}</div><div className="mt-2 font-bold text-emerald-300">{t("Tôn trọng từ chối nhận khuyến mãi","Promotion opt-out respected")}</div></div>
    </div>

    <div className="grid gap-6 xl:grid-cols-[430px_1fr]">
      <form onSubmit={runPreview} className="card h-fit space-y-4 p-5" data-testid="campaign-composer-v64">
        <div><h2 className="text-xl font-bold">{t("Tạo chiến dịch V64","Create V64 campaign")}</h2><p className="mt-1 text-xs text-slate-500">{t("Bắt buộc xem trước trước khi phát hành. Mã chiến dịch là khóa chống lặp: chạy lại cùng mã sẽ không phát mã ưu đãi/thông báo trùng.","Preview is required before publishing. Campaign code is the idempotency key: rerunning the same code does not issue duplicate vouchers or notifications.")}</p></div>
        <div><label className="mb-1.5 block text-sm text-slate-300">{t("Mã chiến dịch","Campaign code")}</label><input className="input font-bold uppercase" value={form.campaignCode} onChange={e=>invalidatePreview({...form,campaignCode:e.target.value.toUpperCase().replace(/\s/g,"")})} placeholder="VD: WINBACK_AUG" maxLength={12} required/><p className="mt-1 text-xs text-slate-500">{t("3-12 ký tự A-Z, 0-9, - hoặc _.","3-12 characters: A-Z, 0-9, - or _.")}</p></div>
        <div><label className="mb-1.5 block text-sm text-slate-300">{t("Phân khúc","Segment")}</label><select className="input" data-testid="segment-select-v64" value={form.segmentCode} onChange={e=>invalidatePreview({...form,segmentCode:e.target.value as MarketingCampaignRequestV64["segmentCode"]})}>{SEGMENT_CODES.map(code=>{const live=overview?.segments.find(s=>s.code===code);const pair=SEGMENT_FALLBACK_LABELS[code];const label=live?segmentCopy(live,language).label:(language==="vi"?pair[0]:pair[1]);return <option key={code} value={code}>{label} ({live?.customers??0})</option>})}</select>{selected&&<p className="mt-1 text-xs text-slate-500">{segmentCopy(selected,language).definition}</p>}</div>
        <div><label className="mb-1.5 block text-sm text-slate-300">{t("Tiêu đề","Title")}</label><input className="input" value={form.title} onChange={e=>invalidatePreview({...form,title:e.target.value})} maxLength={120} required/></div>
        <div><label className="mb-1.5 block text-sm text-slate-300">{t("Nội dung","Message")}</label><textarea className="input min-h-28" value={form.message} onChange={e=>invalidatePreview({...form,message:e.target.value})} maxLength={500} required/></div>
        <div className="grid grid-cols-2 gap-3"><div><label className="mb-1.5 block text-sm text-slate-300">{t("Loại giảm","Discount type")}</label><select className="input" value={form.discountType} onChange={e=>invalidatePreview({...form,discountType:e.target.value as "PERCENT"|"FIXED"})}><option value="PERCENT">{t("Phần trăm (%)","Percent (%)")}</option><option value="FIXED">{t("Số tiền (đ)","Fixed amount (VND)")}</option></select></div><div><label className="mb-1.5 block text-sm text-slate-300">{t("Mức giảm","Discount value")}</label><input className="input" type="number" min={1} max={form.discountType==="PERCENT"?100:undefined} value={form.discountValue} onChange={e=>invalidatePreview({...form,discountValue:Number(e.target.value)})}/></div></div>
        <div className="grid grid-cols-2 gap-3"><div><label className="mb-1.5 block text-sm text-slate-300">{t("Đơn tối thiểu","Minimum order")}</label><input className="input" type="number" min={0} value={form.minOrderAmount} onChange={e=>invalidatePreview({...form,minOrderAmount:Number(e.target.value)})}/></div><div><label className="mb-1.5 block text-sm text-slate-300">{t("Giảm tối đa","Maximum discount")}</label><input className="input" type="number" min={0} value={form.maxDiscount??""} onChange={e=>invalidatePreview({...form,maxDiscount:e.target.value===""?undefined:Number(e.target.value)})} placeholder={t("Không giới hạn","Unlimited")}/></div></div>
        <div><label className="mb-1.5 block text-sm text-slate-300">{t("Hiệu lực mã ưu đãi (ngày)","Voucher validity (days)")}</label><input className="input" type="number" min={1} max={90} value={form.validityDays} onChange={e=>invalidatePreview({...form,validityDays:Number(e.target.value)})}/></div>
        <div className="grid grid-cols-2 gap-2"><button className="btn btn-secondary" disabled={busy||!overview} data-testid="campaign-preview-v64">{busy?t("Đang xử lý...","Working..."):t("🔎 Xem trước","🔎 Preview")}</button><button type="button" className="btn btn-primary" disabled={busy||!preview} onClick={launch} data-testid="campaign-launch-v64">{t("🚀 Phát hành","🚀 Publish")}</button></div>

        {(msg||preview||result)&&<div data-testid="campaign-feedback-v64" aria-live="polite" className={`rounded-2xl border p-4 text-sm ${feedbackClass(feedbackKind)}`}>
          <div className="font-bold">{feedbackKind==="success"?"✓ ":feedbackKind==="warning"?"⚠ ":feedbackKind==="error"?"✕ ":"ℹ "}{msg||t("Sẵn sàng.","Ready.")}</div>
          {preview&&!result&&<div className="mt-2 text-xs opacity-90">{t("Đã xem trước","Previewed")}: <b>{preview.campaignCode}</b> · {preview.matchedCustomers} {t("khách","customers")}. {stepUpReady?t("V68 đã mở khóa; có thể phát hành.","V68 is unlocked; publishing is available."):t("Cần mở khóa V68 trước khi phát hành.","V68 must be unlocked before publishing.")}</div>}
          {result&&<div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4"><span>{t("Khớp","Matched")}: <b>{result.matchedCustomers}</b></span><span>{t("Mới","Created")}: <b>{result.vouchersCreated}</b></span><span>{t("Tái sử dụng","Reused")}: <b>{result.vouchersReused}</b></span><span>{t("Thông báo","Notifications")}: <b>{result.notificationsCreated}</b></span></div>}
          {!stepUpReady&&preview&&<Link data-testid="campaign-step-up-link-v64" href="/admin/security" className="mt-3 inline-flex font-bold underline underline-offset-4">🔐 {t("Mở khóa V68 tại Bảo mật","Unlock V68 in Security")}</Link>}
        </div>}
      </form>

      <div className="space-y-5">
        {preview&&<div className="card border border-cyan-700/60 p-5" data-testid="campaign-preview-result-v64">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-xs font-black tracking-widest text-cyan-300">{t("XEM TRƯỚC","PREVIEW")}</div><h2 className="mt-1 text-xl font-bold">{preview.campaignCode} · {segmentLabel(preview.segmentCode,language,preview.segmentLabel)}</h2></div><div className="rounded-xl bg-cyan-500/10 px-4 py-2 text-2xl font-black text-cyan-300">{preview.matchedCustomers}</div></div>
          <div className="mt-4 grid gap-2 text-xs text-slate-400"><div>🎟 {preview.voucherPolicy}</div><div>🔔 {preview.deliveryPolicy}</div></div>
          <div className="mt-5 hidden md:block"><table className="w-full table-fixed text-left text-xs lg:text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="w-[28%] pb-2">{t("Khách","Customer")}</th><th className="pb-2">{t("Hạng","Tier")}</th><th className="pb-2">{t("Đặt vé","Bookings")}</th><th className="pb-2">{t("Doanh thu","Revenue")}</th><th className="pb-2">{t("Độ gần đây","Recency")}</th></tr></thead><tbody className="divide-y divide-slate-800">{preview.audience.map(a=><tr key={a.customerRef}><td className="py-3"><div className="break-words font-semibold">{a.customerRef}</div><div className="break-all text-xs text-slate-500">{a.maskedEmail}</div></td><td className="py-3">{a.membershipTier}</td><td className="py-3">{a.lifetimeBookings}</td><td className="py-3">{currency(a.lifetimeRevenue)}</td><td className="py-3">{a.recencyDays<0?t("Chưa đặt vé","No booking yet"):`${a.recencyDays} ${t("ngày","days")}`}</td></tr>)}</tbody></table></div><div className="mt-5 grid gap-2 md:hidden">{preview.audience.map(a=><article className="rounded-xl border border-slate-800 p-3" key={a.customerRef}><div className="font-semibold">{a.customerRef}</div><div className="break-all text-xs text-slate-500">{a.maskedEmail}</div><div className="mt-2 grid grid-cols-2 gap-2 text-xs"><span>{t("Hạng","Tier")}: <b>{a.membershipTier}</b></span><span>{t("Đặt vé","Bookings")}: <b>{a.lifetimeBookings}</b></span><span>{t("Doanh thu","Revenue")}: <b>{currency(a.lifetimeRevenue)}</b></span><span>{t("Độ gần đây","Recency")}: <b>{a.recencyDays<0?t("Chưa đặt vé","No booking yet"):`${a.recencyDays} ${t("ngày","days")}`}</b></span></div></article>)}</div>
          {preview.matchedCustomers>preview.previewLimit&&<div className="mt-3 text-xs text-slate-500">{t("Đang hiển thị","Showing")} {preview.previewLimit}/{preview.matchedCustomers} {t("khách đầu tiên.","customers.")}</div>}
        </div>}

        {result&&<div className="card border border-emerald-700/60 p-5" data-testid="campaign-launch-result-v64"><div className="text-xs font-black tracking-widest text-emerald-300">{t("ĐÃ PHÁT HÀNH · AN TOÀN KHI LẶP","PUBLISHED · IDEMPOTENT")}</div><h2 className="mt-1 text-xl font-bold">{result.campaignCode}</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label={t("Khớp","Matched")} value={result.matchedCustomers}/><Metric label={t("Mã ưu đãi mới","New vouchers")} value={result.vouchersCreated}/><Metric label={t("Mã ưu đãi tái sử dụng","Reused vouchers")} value={result.vouchersReused}/><Metric label={t("Thông báo tạo","Notifications created")} value={result.notificationsCreated}/></div><div className="mt-3 text-xs text-slate-500">{t("Thông báo bỏ qua","Notifications skipped")}: {result.notificationsSkipped}. {t("Mã ưu đãi cá nhân vẫn thuộc đúng tài khoản.","Personal vouchers remain bound to the correct account.")}</div></div>}

        <div className="grid gap-3 md:grid-cols-2" data-testid="segments-v64">
          {!overview&&overviewLoading&&<div className="card col-span-full p-5 text-sm text-slate-400" data-testid="segments-loading-v64">{t("Đang tải phân khúc khách hàng thật...","Loading real customer segments...")}</div>}
          {!overview&&!overviewLoading&&<button type="button" className="card col-span-full p-5 text-left text-sm text-rose-300" data-testid="segments-retry-v64" onClick={()=>load().catch(e=>{setFeedbackKind("error");setMsg((e as Error).message)})}>{t("Không tải được phân khúc. Bấm để thử lại.","Segments could not be loaded. Click to retry.")}</button>}
          {overview?.segments.map(s=>{const c=segmentCopy(s,language);return <button type="button" key={s.code} onClick={()=>chooseSegment(s)} className={`card p-5 text-left transition ${form.segmentCode===s.code?"border-rose-500/60 bg-rose-500/5":"hover:border-slate-500"}`}><div className="flex items-start justify-between gap-3"><div><div className="font-bold">{c.label}</div><div className="mt-1 text-xs text-slate-500">{s.code}</div></div><div className="rounded-full bg-slate-800 px-3 py-1 text-lg font-black">{s.customers}</div></div><p className="mt-3 text-sm text-slate-400">{c.definition}</p><div className="mt-3 text-xs text-emerald-300">{t("Gợi ý","Recommended")}: {c.action}</div><div className="mt-1 text-xs text-slate-500">{t("Voucher mặc định","Default voucher")}: {s.defaultDiscountPercent}%</div></button>})}
        </div>
      </div>
    </div>
  </div>;
}

function feedbackClass(kind:FeedbackKind){
  return kind==="success"?"border-emerald-500/40 bg-emerald-500/10 text-emerald-100":kind==="warning"?"border-amber-500/40 bg-amber-500/10 text-amber-100":kind==="error"?"border-rose-500/40 bg-rose-500/10 text-rose-100":"border-cyan-500/30 bg-cyan-500/10 text-cyan-100";
}

type SegmentCopy={label:string;definition:string;action:string};
function segmentCopy(segment:MarketingSegmentV64,language:Language):SegmentCopy{
  if(language==="vi")return {label:segment.label,definition:segment.definition,action:segment.recommendedAction};
  const copy:Record<string,SegmentCopy>={
    ALL_ELIGIBLE:{label:"All eligible customers",definition:"Active USER accounts; marketing opt-out is still respected for notifications.",action:"Controlled general campaign messaging."},
    NEW_30D:{label:"New customers · 30 days",definition:"Accounts created within the last 30 days.",action:"Welcome / activate the first purchase."},
    ENGAGED_30D:{label:"Engaged · 30 days",definition:"Has a CONFIRMED booking within the last 30 days.",action:"Cross-sell or encourage an early return."},
    VIP:{label:"High-value VIP",definition:"GOLD/DIAMOND, at least 4 CONFIRMED bookings, or successful-payment revenue of at least 1,000,000 VND.",action:"Personalized appreciation offer with a one-time voucher."},
    AT_RISK_31_90D:{label:"At risk of churn",definition:"Most recent CONFIRMED booking was 31–90 days ago.",action:"Light win-back before the customer becomes lapsed."},
    LAPSED_90D_PLUS:{label:"Lapsed · over 90 days",definition:"Most recent CONFIRMED booking was more than 90 days ago.",action:"Reactivation with a stronger offer and a clear deadline."},
    PROSPECT_NO_BOOKING:{label:"Registered, no purchase",definition:"Active USER account with no CONFIRMED booking yet.",action:"Activate the first booking."},
  };
  return copy[segment.code]??{label:segment.label,definition:segment.definition,action:segment.recommendedAction};
}
function segmentLabel(code:string,language:Language,fallback:string){
  if(language==="vi")return fallback;
  const dummy={code,label:fallback,definition:"",recommendedAction:"",defaultDiscountPercent:0,customers:0} as MarketingSegmentV64;
  return segmentCopy(dummy,language).label;
}

function Metric({label,value}:{label:string;value:number}){return <div className="rounded-xl bg-slate-900/70 p-3"><div className="text-xs text-slate-500">{label}</div><div className="mt-1 text-2xl font-black">{value}</div></div>}
/* V77.0.16 compatibility markers (not rendered):
Segment → Campaign → Voucher
Hãy chạy Xem trước trước khi phát hành chiến dịch
V64 · CRM & MARKETING AUTOMATION 4.0
*/
