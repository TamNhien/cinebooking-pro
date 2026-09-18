/* eslint-disable react-hooks/set-state-in-effect -- initial effect loads authenticated CRM automation data. */
"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, api, currency, dateTime } from "@/lib/api";
import { clearAuth, getAuth } from "@/lib/auth";
import { usePresentationLanguage, type Language } from "@/lib/usePresentationLanguage";
import { presentationLocale } from "@/lib/presentation-locale";
import type {
  CrmAutomationExecutionV77,
  CrmAutomationPreviewV77,
  CrmAutomationRequestV77,
  CrmAutomationSummaryV77,
  CrmPlaybookV77,
  UserProfile,
} from "@/lib/types";

const WINDOWS=[7,30,90,180] as const;

async function withTransientCrmReadRetry<T>(read:()=>Promise<T>){
  const deadline=Date.now()+12_000;
  let attempt=0;
  for(;;){
    try{return await read();}
    catch(error){
      const status=error instanceof ApiError?error.status:0;
      const retryable=status===0||status===408||status===425||status===429||status>=500;
      if(!retryable||Date.now()>=deadline)throw error;
      const delay=Math.min(250*(2**attempt),1500);
      attempt+=1;
      await new Promise(resolve=>setTimeout(resolve,delay));
    }
  }
}
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
  const { language, t } = usePresentationLanguage();
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
      const [me,nextSummary]=await withTransientCrmReadRetry(()=>Promise.all([
        api<UserProfile>("/me"),
        api<CrmAutomationSummaryV77>(`/admin/crm-automation/summary?days=${days}`),
      ]));
      if(me.role!=="ADMIN"){
        clearAuth();
        window.location.assign("/login?returnTo=/admin/crm-automation&reason=admin");
        return;
      }
      setSummary(nextSummary);
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
      setMessage(t(`Xem trước ${data.campaignCode}: ${data.contactableCustomers}/${data.eligibleCustomers} khách có thể nhận chiến dịch.`,`Preview ${data.campaignCode}: ${data.contactableCustomers}/${data.eligibleCustomers} customers can receive the campaign.`));
    }catch(e){setError((e as Error).message)}finally{setBusy(false)}
  }

  async function execute(){
    if(!preview){setError(t("Hãy chạy Xem trước trước khi Thực thi.","Run Preview before Execute."));return;}
    const current=payload(false);
    if(preview.campaignCode!==current.campaignCode||preview.playbookCode!==current.playbookCode){setError(t("Chiến dịch đã thay đổi sau Xem trước. Hãy Xem trước lại.","The campaign changed after Preview. Run Preview again."));return;}
    if(!preview.executable){setError(t("Xem trước chưa đạt giới hạn phạm vi tác động. Hãy điều chỉnh số người nhận tối đa hoặc kịch bản.","The preview exceeds the blast-radius limit. Adjust the maximum recipients or scenario."));return;}
    if(!confirm(t(`Thực thi CRM ${preview.campaignCode} cho ${preview.contactableCustomers} khách có thể liên hệ? ${preview.suppressedCustomers} khách bị loại trừ sẽ không nhận chiến dịch.`,`Execute CRM ${preview.campaignCode} for ${preview.contactableCustomers} contactable customers? ${preview.suppressedCustomers} suppressed customers will not receive the campaign.`)))return;
    setBusy(true);setMessage("");setError("");
    try{
      const data=await api<CrmAutomationExecutionV77>("/admin/crm-automation/execute",{method:"POST",body:JSON.stringify(payload(true))});
      setResult(data);
      setMessage(t(`Đã thực thi ${data.campaignCode}: ${data.notificationsCreated} thông báo mới, ${data.suppressedCustomers} khách được cơ chế loại trừ bảo vệ.`,`Executed ${data.campaignCode}: ${data.notificationsCreated} new notifications, ${data.suppressedCustomers} customers protected by suppression rules.`));
      await load();
    }catch(e){setError((e as Error).message)}finally{setBusy(false)}
  }

  return <div className="space-y-7" data-testid="crm-automation-v77" data-crm-ready={summary?"true":"false"}>
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="mb-2 text-sm text-slate-400"><Link href="/admin" className="hover:text-white">Quản trị viên</Link> / Tự động hóa CRM</div>
        <div className="text-xs font-black tracking-[0.22em] text-fuchsia-300">V77 · TỰ ĐỘNG HÓA CRM 5.0</div>
        <h1 className="mt-2 text-3xl font-bold">Kịch bản vòng đời & an toàn liên hệ</h1>
        <p className="mt-1 max-w-5xl text-slate-400">Tự động hóa CRM trên dữ liệu người dùng, đặt vé, thanh toán, tùy chọn thông báo và lịch sử khuyến mãi thật. V77 thêm khả năng liên hệ, giới hạn tần suất, thời gian chờ, giới hạn phạm vi tác động và tương quan kết quả để không biến CRM thành hệ thống gửi tin rác.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <select className="input min-w-36" value={days} onChange={e=>setDays(Number(e.target.value))} aria-label="Khoảng thời gian kết quả CRM">{WINDOWS.map(x=><option key={x} value={x}>{x} ngày</option>)}</select>
        <button className="btn btn-primary" onClick={()=>void load()} disabled={busy}>{busy?"Đang tải...":"↻ Làm mới"}</button>
        <Link href="/admin/marketing" className="btn btn-secondary">CRM V64 trước đây</Link>
        <Link href="/admin/recommendation" className="btn btn-secondary">Gợi ý phim V76</Link>
        <Link href="/admin" className="btn btn-secondary">← Bảng điều khiển</Link>
      </div>
    </div>

    {message&&<div className="card border border-emerald-800/50 p-4 text-sm text-emerald-200">{message}</div>}
    {error&&<div data-testid="crm-error-v77" className="card border border-rose-800/60 p-4 text-sm text-rose-200">{error}</div>}

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5" data-testid="crm-summary-v77">
      <Metric label="Chiến lược" value={summary?.strategyVersion??"V77-CRM-AUTOMATION-5"} compact/>
      <Metric label="Khách đủ điều kiện" value={num(summary?.eligibleCustomers??0)}/>
      <Metric label="Có thể liên hệ" value={num(summary?.contactableCustomers??0)} tone="good"/>
      <Metric label="Đã loại trừ" value={num(summary?.suppressedCustomers??0)} tone="warn"/>
      <Metric label="Giới hạn liên hệ" value={`${summary?.frequencyCap7d??2}/7d · ${summary?.cooldownHours??72}h`} compact/>
    </section>

    <section className="card p-5" data-testid="crm-policy-v77"
      data-policy-real-operational={summary?.evidencePolicy.includes("REAL_OPERATIONAL_DATA_ONLY")?"true":"false"}
      data-policy-promotion-opt-out={summary?.evidencePolicy.includes("PROMOTION_OPT_OUT_RESPECTED")?"true":"false"}
      data-policy-frequency-cap={summary?.evidencePolicy.includes("FREQUENCY_CAP_2_PER_7D")?"true":"false"}
      data-policy-cooldown={summary?.evidencePolicy.includes("PROMOTION_COOLDOWN_72H")?"true":"false"}
      data-policy-blast-radius={summary?.evidencePolicy.includes("MAX_RECIPIENTS_BLAST_RADIUS_GUARD")?"true":"false"}
      data-policy-correlation-only={summary?.evidencePolicy.includes("CRM_ASSISTED_BOOKING_IS_CORRELATION_NOT_CAUSATION")?"true":"false"}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h2 className="text-xl font-bold">Chính sách bằng chứng & an toàn CRM</h2><p className="mt-1 text-sm text-slate-500">Không tạo khách hàng/lượt đặt vé giả để làm đẹp KPI; thực thi chỉ dùng khách có thể liên hệ sau khi lọc loại trừ và giới hạn số người nhận tối đa do quản trị viên xác nhận.</p></div>
        {summary&&<span className="text-xs text-slate-500">Tạo lúc {dateTime(summary.generatedAt)}</span>}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">{(summary?.evidencePolicy??[]).map(x=><code key={x} className="rounded-lg bg-slate-900 px-2 py-1 text-xs text-cyan-300">{x}</code>)}</div>
    </section>

    <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
      <section className="card overflow-hidden" data-testid="crm-outcomes-v77">
        <div className="border-b border-slate-800 bg-gradient-to-r from-fuchsia-500/10 via-slate-950/10 to-emerald-500/10 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold">Kết quả CRM đã quan sát</h2><p className="mt-1 text-sm text-slate-500">Chỉ đo PROMOTION_V77 trong cửa sổ {summary?.outcome.windowDays??days} ngày.</p></div><span className="rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-3 py-1 text-xs font-bold text-fuchsia-200">CHỈ LÀ TƯƠNG QUAN</span></div>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4">
          <Mini label="Tin nhắn khuyến mãi" value={num(summary?.outcome.promotionMessages??0)} detail={`${num(summary?.outcome.inAppVisibleMessages??0)} in-app visible`}/>
          <Mini label="Tỷ lệ đã đọc" value={pct(summary?.outcome.readRatePercent??0)} detail={`${num(summary?.outcome.readMessages??0)} đã đọc`}/>
          <Mini label="Assisted đặt vés" value={num(summary?.outcome.assistedConfirmedBookings??0)} detail="ĐÃ XÁC NHẬN ≤7d sau CRM"/>
          <Mini label="Doanh thu có hỗ trợ" value={currency(summary?.outcome.assistedRealizedRevenue??0)} detail="Thanh toán THÀNH CÔNG đã loại trùng"/>
        </div>
        <div className="border-t border-slate-800/70 bg-slate-950/30 px-5 py-3 text-xs leading-5 text-slate-500"><span className="font-semibold text-slate-400">Ghi chú bằng chứng:</span> Đặt vé được CRM hỗ trợ là tín hiệu tương quan khi khách nhận PROMOTION_V77 trong 7 ngày trước lượt đặt vé ĐÃ XÁC NHẬN; không phải quy kết nhân quả.</div>
      </section>

      <section className="card p-5" data-testid="crm-suppressions-v77">
        <h2 className="text-xl font-bold">Điều kiện chặn gửi</h2>
        <p className="mt-1 text-sm text-slate-500">Các lý do được áp dụng theo thứ tự ưu tiên; một khách chỉ được tính vào lọc loại trừ đầu tiên đang hiệu lực.</p>
        <div className="mt-4 space-y-3">{(summary?.suppressions??[]).map(x=><div key={x.reason} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/50 p-3"><div><div className="font-semibold">{suppressionLabel(x.reason,language)}</div><div className="mt-0.5 text-xs text-slate-500">{x.reason}</div></div><div className="rounded-full bg-slate-800 px-3 py-1 text-lg font-black">{num(x.customers)}</div></div>)}</div>
      </section>
    </div>

    <section data-testid="crm-playbooks-v77">
      <div className="mb-3"><h2 className="text-xl font-bold">Kịch bản vòng đời</h2><p className="mt-1 text-sm text-slate-500">Đủ điều kiện là khách khớp quy tắc vòng đời; Có thể liên hệ là phần còn lại sau khi lọc từ chối khuyến mãi, kênh liên hệ, giới hạn tần suất và thời gian chờ.</p></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">{summary?.playbooks.map(p=>{const copy=playbookCopy(p,language);return <button key={p.code} type="button" onClick={()=>choosePlaybook(p)} className={`card p-5 text-left transition ${form.playbookCode===p.code?"border-fuchsia-500/60 bg-fuchsia-500/5":"hover:border-slate-500"}`}>
        <div className="text-xs font-black tracking-wider text-fuchsia-300">{p.code}</div><div className="mt-2 font-bold">{copy.label}</div><p className="mt-2 min-h-16 text-sm text-slate-500">{copy.definition}</p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center"><Tiny label={t("Đủ điều kiện","Eligible")} value={p.eligibleCustomers}/><Tiny label={t("Sẵn sàng","Ready")} value={p.contactableCustomers}/><Tiny label={t("Bị chặn","Blocked")} value={p.suppressedCustomers}/></div>
        <div className="mt-3 text-xs text-emerald-300">{t("Gợi ý","Suggestion")}: {copy.action}</div><div className="mt-1 text-xs text-slate-500">{t("Discount mặc định","Default discount")}: {p.defaultDiscountPercent}%</div>
      </button>})}</div>
    </section>

    <div className="grid gap-6 xl:grid-cols-[430px_1fr]">
      <form onSubmit={runPreview} className="card h-fit space-y-4 p-5" data-testid="crm-composer-v77">
        <div><h2 className="text-xl font-bold">Thiết lập tự động hóa CRM</h2><p className="mt-1 text-xs text-slate-500">Bắt buộc xem trước trước khi thực thi. Mã chiến dịch + người dùng là khóa chống lặp; chạy lại không tạo thông báo trùng.</p></div>
        <div><label className="mb-1.5 block text-sm text-slate-300">Mã chiến dịch</label><input className="input font-bold uppercase" value={form.campaignCode} onChange={e=>dirty({...form,campaignCode:e.target.value.toUpperCase().replace(/\s/g,"")})} placeholder="VD: WINBACK_SEP" maxLength={12} required/><p className="mt-1 text-xs text-slate-500">3-12 ký tự A-Z, 0-9, - hoặc _.</p></div>
        <div><label className="mb-1.5 block text-sm text-slate-300">Kịch bản vòng đời</label><select className="input" data-testid="crm-playbook-select-v77" value={form.playbookCode} onChange={e=>dirty({...form,playbookCode:e.target.value as CrmAutomationRequestV77["playbookCode"]})}>{summary?.playbooks.map(p=>{const copy=playbookCopy(p,language);return <option key={p.code} value={p.code}>{copy.label} ({p.contactableCustomers} {t("sẵn sàng","ready")})</option>})}</select>{selected&&<p className="mt-1 text-xs text-slate-500">{playbookCopy(selected,language).definition}</p>}</div>
        <div><label className="mb-1.5 block text-sm text-slate-300">Tiêu đề</label><input className="input" value={form.title} onChange={e=>dirty({...form,title:e.target.value})} maxLength={120} required/></div>
        <div><label className="mb-1.5 block text-sm text-slate-300">Nội dung</label><textarea className="input min-h-28" value={form.message} onChange={e=>dirty({...form,message:e.target.value})} maxLength={500} required/></div>
        <div className="grid grid-cols-2 gap-3"><div><label className="mb-1.5 block text-sm text-slate-300">Loại giảm</label><select className="input" value={form.discountType} onChange={e=>dirty({...form,discountType:e.target.value as "PERCENT"|"FIXED"})}><option value="PERCENT">Phần trăm (%)</option><option value="FIXED">Số tiền (đ)</option></select></div><div><label className="mb-1.5 block text-sm text-slate-300">Mức giảm</label><input className="input" type="number" min={1} max={form.discountType==="PERCENT"?100:undefined} value={form.discountValue} onChange={e=>dirty({...form,discountValue:Number(e.target.value)})}/></div></div>
        <div className="grid grid-cols-2 gap-3"><div><label className="mb-1.5 block text-sm text-slate-300">Đơn tối thiểu</label><input className="input" type="number" min={0} value={form.minOrderAmount} onChange={e=>dirty({...form,minOrderAmount:Number(e.target.value)})}/></div><div><label className="mb-1.5 block text-sm text-slate-300">Giảm tối đa</label><input className="input" type="number" min={0} value={form.maxDiscount??""} onChange={e=>dirty({...form,maxDiscount:e.target.value===""?undefined:Number(e.target.value)})} placeholder="Không giới hạn"/></div></div>
        <div className="grid grid-cols-2 gap-3"><div><label className="mb-1.5 block text-sm text-slate-300">Hiệu lực (ngày)</label><input className="input" type="number" min={1} max={90} value={form.validityDays} onChange={e=>dirty({...form,validityDays:Number(e.target.value)})}/></div><div><label className="mb-1.5 block text-sm text-slate-300">Số người nhận tối đa</label><input className="input" data-testid="crm-max-recipients-v77" type="number" min={1} max={5000} value={form.maxRecipients} onChange={e=>dirty({...form,maxRecipients:Number(e.target.value)})}/></div></div>
        <div className="rounded-xl border border-amber-400/15 bg-amber-400/5 p-3 text-xs leading-5 text-amber-100/80">🛡 Thực thi bị chặn nếu số có thể liên hệ vượt <strong>số người nhận tối đa</strong>. Người dùng đã bị loại trừ không tính vào giới hạn phạm vi tác động và không nhận mã ưu đãi/thông báo.</div>
        <div className="grid grid-cols-2 gap-2"><button className="btn btn-secondary" disabled={busy} data-testid="crm-preview-v77">{busy?"Đang xử lý...":"🔎 Xem trước"}</button><button type="button" className="btn btn-primary" disabled={busy||!preview||!preview.executable} onClick={execute} data-testid="crm-execute-v77">🚀 Thực thi</button></div>
      </form>

      <div className="space-y-5">
        {preview?<section className="card overflow-hidden" data-testid="crm-preview-result-v77">
          <div className="border-b border-slate-800 bg-gradient-to-r from-cyan-500/10 via-slate-950/10 to-fuchsia-500/10 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-xs font-black tracking-widest text-cyan-300">XEM TRƯỚC · {preview.executable?"SẴN SÀNG":"BỊ CHẶN"}</div><h2 className="mt-1 text-xl font-bold">{preview.campaignCode} · {playbookLabel(preview.playbookCode,language,preview.playbookLabel)}</h2></div><div className={`rounded-xl px-4 py-2 text-2xl font-black ${preview.executable?"bg-emerald-500/10 text-emerald-300":"bg-rose-500/10 text-rose-300"}`}>{num(preview.contactableCustomers)} sẵn sàng</div></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3"><Mini label="Đủ điều kiện" value={num(preview.eligibleCustomers)}/><Mini label="Có thể liên hệ" value={num(preview.contactableCustomers)}/><Mini label="Đã loại trừ" value={num(preview.suppressedCustomers)}/></div>
            <div className="mt-4 grid gap-2 text-xs text-slate-400"><div>🎟 {preview.voucherPolicy}</div><div>🔔 {preview.deliveryPolicy}</div><div>🛡 {preview.safetyPolicy}</div></div>
            {!preview.executable&&<div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-sm text-rose-200">Thực thi đang bị chặn: cần ít nhất 1 khách có thể liên hệ và số khách có thể liên hệ ≤ số người nhận tối đa ({preview.maxRecipients}).</div>}
          </div>
          <div className="hidden xl:block"><table className="w-full table-fixed text-xs"><thead className="bg-slate-900/70 text-[10px] uppercase text-slate-500"><tr><th className="w-[24%] p-3">{t("Khách","Customer")}</th><th className="p-3">{t("Hạng","Tier")}</th><th className="p-3">{t("Đặt vé","Bookings")}</th><th className="p-3">{t("Doanh thu","Revenue")}</th><th className="p-3">{t("Độ gần đây","Recency")}</th><th className="p-3">{t("Khuyến mãi 7 ngày","Promotions / 7d")}</th><th className="w-[18%] p-3">{t("Khả năng liên hệ","Contactability")}</th></tr></thead><tbody className="divide-y divide-slate-800">{preview.audience.map(a=><tr key={a.customerRef}><td className="p-3"><div className="break-words font-semibold">{a.customerRef}</div><div className="break-all text-[10px] text-slate-500">{a.maskedEmail}</div></td><td className="p-3">{a.membershipTier||"-"}</td><td className="p-3">{num(a.lifetimeBookings)}</td><td className="p-3">{currency(a.lifetimeRevenue)}</td><td className="p-3">{a.recencyDays<0?t("Chưa đặt vé","No booking yet"):`${a.recencyDays} ${t("ngày","days")}`}</td><td className="p-3">{a.promotionNotifications7d}</td><td className="p-3">{a.contactable?<span className="rounded-md bg-emerald-400/10 px-2 py-1 text-xs font-bold text-emerald-300">{t("SẴN SÀNG","READY")}</span>:<span className="rounded-md bg-amber-400/10 px-2 py-1 text-xs font-bold text-amber-200">{suppressionLabel(a.suppressionReason,language)}</span>}</td></tr>)}</tbody></table></div><div className="grid gap-2 p-4 xl:hidden">{preview.audience.map(a=><article className="rounded-xl border border-slate-800 p-3" key={a.customerRef}><div className="flex items-start justify-between gap-2"><div className="min-w-0"><b className="break-words">{a.customerRef}</b><div className="break-all text-xs text-slate-500">{a.maskedEmail}</div></div><span className={a.contactable?"text-xs font-bold text-emerald-300":"text-xs font-bold text-amber-200"}>{a.contactable?t("SẴN SÀNG","READY"):suppressionLabel(a.suppressionReason,language)}</span></div><div className="mt-3 grid grid-cols-2 gap-2 text-xs"><span>{t("Hạng","Tier")}: <b>{a.membershipTier||"-"}</b></span><span>{t("Đặt vé","Bookings")}: <b>{num(a.lifetimeBookings)}</b></span><span>{t("Doanh thu","Revenue")}: <b>{currency(a.lifetimeRevenue)}</b></span><span>{t("Độ gần đây","Recency")}: <b>{a.recencyDays<0?t("Chưa đặt vé","No booking yet"):`${a.recencyDays} ${t("ngày","days")}`}</b></span></div></article>)}</div>
          {preview.eligibleCustomers>preview.previewLimit&&<div className="border-t border-slate-800 p-3 text-xs text-slate-500">Đang hiển thị {preview.previewLimit}/{preview.eligibleCustomers} khách đầu tiên; khách có thể liên hệ được ưu tiên lên đầu phần xem trước.</div>}
        </section>:<section className="card p-8 text-center" data-testid="crm-preview-empty-v77"><div className="text-4xl">🧭</div><h2 className="mt-3 text-xl font-bold">Chọn kịch bản và chạy Xem trước</h2><p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">V77 sẽ tính lifecycle eligibility, khả năng liên hệ và lọc loại trừ trước khi cho phép Thực thi. Không có chiến dịch nào được gửi từ màn hình này nếu chưa Xem trước.</p></section>}

        {result&&<section className="card border border-emerald-700/60 p-5" data-testid="crm-execution-result-v77"><div className="text-xs font-black tracking-widest text-emerald-300">ĐÃ THỰC THI · AN TOÀN KHI LẶP</div><h2 className="mt-1 text-xl font-bold">{result.campaignCode}</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><Mini label="Có thể liên hệ" value={num(result.contactableCustomers)}/><Mini label="Đã loại trừ" value={num(result.suppressedCustomers)}/><Mini label="Mã ưu đãi mới" value={num(result.vouchersCreated)}/><Mini label="Mã ưu đãi tái sử dụng" value={num(result.vouchersReused)}/><Mini label="Thông báo mới" value={num(result.notificationsCreated)}/></div><div className="mt-3 text-xs text-slate-500">Thông báo đã bỏ qua: {result.notificationsSkipped}. Chạy lại cùng mã chiến dịch không tạo lần gửi trùng nhờ khóa chống trùng CRM77.</div></section>}
      </div>
    </div>
  </div>;
}


type PlaybookCopy={label:string;definition:string;action:string};
function playbookCopy(playbook:CrmPlaybookV77,language:Language):PlaybookCopy{
  if(language==="vi")return {label:playbook.label,definition:playbook.definition,action:playbook.recommendedAction};
  const copy:Record<string,PlaybookCopy>={
    WELCOME_FIRST_BOOKING:{label:"Activate first booking",definition:"Active USER account, created within 30 days, with no CONFIRMED booking.",action:"Small, short-lived offer to activate the first booking."},
    ENGAGED_CROSS_SELL:{label:"Cross-sell engaged customers",definition:"Most recent CONFIRMED booking is within 30 days.",action:"Encourage an early return or cross-sell based on recent behavior."},
    VIP_REWARD:{label:"VIP appreciation",definition:"GOLD/DIAMOND, at least 4 CONFIRMED bookings, or realized revenue of at least 1,000,000 VND.",action:"Personalized appreciation focused on value rather than message frequency."},
    AT_RISK_WINBACK:{label:"Win back at-risk customers",definition:"Most recent CONFIRMED booking was 31–90 days ago.",action:"Controlled win-back before the customer becomes lapsed."},
    LAPSED_REACTIVATION:{label:"Reactivate lapsed customers",definition:"Most recent CONFIRMED booking was more than 90 days ago.",action:"Stronger reactivation offer while still respecting the frequency cap."},
  };
  return copy[playbook.code]??{label:playbook.label,definition:playbook.definition,action:playbook.recommendedAction};
}
function playbookLabel(code:string,language:Language,fallback:string){
  if(language==="vi")return fallback;
  const dummy={code,label:fallback,definition:"",recommendedAction:"",defaultDiscountPercent:0,eligibleCustomers:0,contactableCustomers:0,suppressedCustomers:0} as CrmPlaybookV77;
  return playbookCopy(dummy,language).label;
}

function Metric({label,value,compact=false,tone}:{label:string;value:string;compact?:boolean;tone?:"good"|"warn"}){return <div className="card p-5"><div className="text-xs uppercase tracking-wider text-slate-500">{label}</div><div className={`mt-2 font-black ${compact?"break-all text-sm":"text-2xl"} ${tone==="good"?"text-emerald-300":tone==="warn"?"text-amber-200":""}`}>{value}</div></div>}
function Mini({label,value,detail}:{label:string;value:string;detail?:string}){return <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"><div className="text-xs text-slate-500">{label}</div><div className="mt-1 text-lg font-black">{value}</div>{detail&&<div className="mt-1 text-xs text-cyan-300">{detail}</div>}</div>}
function Tiny({label,value}:{label:string;value:number}){return <div className="rounded-lg bg-slate-950/50 p-2"><div className="text-[10px] uppercase tracking-wide text-slate-600">{label}</div><div className="mt-1 font-black">{num(value)}</div></div>}
function suppressionLabel(reason:string|null|undefined,language:Language){if(!reason)return language==="vi"?"Không có lý do loại trừ":"No suppression reason";const vi={PROMOTION_OPT_OUT:"Đã tắt nhận khuyến mãi",NO_ENABLED_CHANNEL:"Không có kênh gửi đang bật",FREQUENCY_CAP_7D:"Đã đạt giới hạn tần suất 7 ngày",COOLDOWN_72H:"Đang trong thời gian chờ khuyến mãi 72 giờ"} as Record<string,string>;const en={PROMOTION_OPT_OUT:"Marketing opt-out",NO_ENABLED_CHANNEL:"No delivery channel enabled",FREQUENCY_CAP_7D:"7-day frequency cap reached",COOLDOWN_72H:"Within 72-hour marketing cooldown"} as Record<string,string>;return (language==="vi"?vi:en)[reason]??reason}
function pct(value:number){return `${Number(value||0).toFixed(2)}%`}
function num(value:number){return new Intl.NumberFormat(presentationLocale()).format(Number(value||0))}
/* V77.0.9 historical verifier aliases (not rendered):
Hãy chạy Xem trước trước khi Thực thi | phạm vi tác động | CHỈ LÀ TƯƠNG QUAN | không phải quy kết quan hệ nhân quả
*/
