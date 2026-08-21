"use client";

import { useEffect, useMemo, useState } from "react";
import { api, dateTime } from "@/lib/api";
import { getAuth } from "@/lib/auth";
import type { NotificationItem, NotificationPreference } from "@/lib/types";

type Filter = "ALL"|"UNREAD"|"BOOKING"|"REMINDER"|"REFUND"|"STAFF_SHIFT"|"PROMOTION"|"LOYALTY"|"WAITLIST";
type View = "ACTIVE"|"ARCHIVED";
type PrefToggleKey = Exclude<keyof NotificationPreference,"updatedAt">;

const EMPTY_PREF:NotificationPreference={inAppEnabled:true,emailEnabled:false,browserEnabled:false,bookingEnabled:true,reminderEnabled:true,refundEnabled:true,staffShiftEnabled:true,promotionEnabled:true,loyaltyEnabled:true,waitlistEnabled:true,updatedAt:""};

export default function NotificationsPage(){
  const [items,setItems]=useState<NotificationItem[]>([]);
  const [prefs,setPrefs]=useState<NotificationPreference>(EMPTY_PREF);
  const [filter,setFilter]=useState<Filter>("ALL");
  const [view,setView]=useState<View>("ACTIVE");
  const [error,setError]=useState("");
  const [msg,setMsg]=useState("");
  const [busy,setBusy]=useState(false);
  const [browserPermission,setBrowserPermission]=useState<string>("unsupported");

  const load=async(nextView:View=view)=>{
    const [list,p]=await Promise.all([api<NotificationItem[]>(`/notifications?view=${nextView}`),api<NotificationPreference>("/notifications/preferences")]);
    setItems(list);setPrefs(p);
  };

  useEffect(()=>{
    if(!getAuth()){location.href="/login?next=/notifications";return;}
    if(typeof Notification!=="undefined")setBrowserPermission(Notification.permission);
    load("ACTIVE").catch(e=>setError(e.message));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  const visible=useMemo(()=>items.filter(n=>filter==="ALL"?true:filter==="UNREAD"?!n.read:n.category===filter),[items,filter]);

  async function switchView(next:View){setView(next);setFilter("ALL");setError("");await load(next);}
  async function openNotification(n:NotificationItem){if(!n.read){await api(`/notifications/${n.id}/read`,{method:"POST"});await load();}if(n.linkUrl)location.href=n.linkUrl;}
  async function all(){await api("/notifications/read-all",{method:"POST"});await load();}
  async function archive(n:NotificationItem){await api(`/notifications/${n.id}/${n.archived?"unarchive":"archive"}`,{method:"POST"});await load();setMsg(n.archived?"Đã đưa thông báo trở lại hộp thư.":"Đã lưu trữ thông báo.");}
  async function testNotification(){setBusy(true);setError("");setMsg("");try{await api<NotificationItem>("/notifications/test",{method:"POST"});await switchView("ACTIVE");setMsg("Đã tạo thông báo thử theo các kênh bạn đang bật.");}catch(e){setError((e as Error).message);}finally{setBusy(false);}}

  async function save(next:NotificationPreference){
    setBusy(true);setError("");setMsg("");
    try{
      const saved=await api<NotificationPreference>("/notifications/preferences",{method:"PUT",body:JSON.stringify({
        inAppEnabled:next.inAppEnabled,emailEnabled:next.emailEnabled,browserEnabled:next.browserEnabled,
        bookingEnabled:next.bookingEnabled,reminderEnabled:next.reminderEnabled,refundEnabled:next.refundEnabled,
        staffShiftEnabled:next.staffShiftEnabled,promotionEnabled:next.promotionEnabled,loyaltyEnabled:next.loyaltyEnabled,waitlistEnabled:next.waitlistEnabled
      })});
      setPrefs(saved);setMsg("Đã lưu tùy chọn thông báo.");window.dispatchEvent(new Event("notification-preferences-changed"));
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }

  async function toggleBrowser(enabled:boolean){
    if(enabled){
      if(typeof Notification==="undefined"){setError("Trình duyệt này không hỗ trợ Browser Notification.");return;}
      const permission=await Notification.requestPermission();setBrowserPermission(permission);
      if(permission!=="granted"){setError("Bạn chưa cấp quyền thông báo cho trình duyệt.");await save({...prefs,browserEnabled:false});return;}
    }
    await save({...prefs,browserEnabled:enabled});
  }

  const toggle=(key:PrefToggleKey,label:string,desc:string)=><label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
    <span><b className="block">{label}</b><span className="mt-1 block text-xs leading-5 text-slate-500">{desc}</span></span>
    <input type="checkbox" className="mt-1 h-5 w-5 accent-rose-500" disabled={busy} checked={Boolean(prefs[key])} onChange={e=>save({...prefs,[key]:e.target.checked})}/>
  </label>;

  const icon=(n:NotificationItem)=>n.category==="BOOKING"?"🎟":n.category==="REMINDER"?"⏰":n.category==="REFUND"?"↩️":n.category==="STAFF_SHIFT"?"🕒":n.category==="PROMOTION"?"🎁":n.category==="LOYALTY"?"🏆":n.category==="WAITLIST"?"💺":"🔔";
  const emailBadge=(n:NotificationItem)=>n.emailStatus==="SENT"?"Email ✓":n.emailStatus==="FAILED"?"Email lỗi":n.emailStatus==="DISABLED"?"SMTP tắt":null;

  return <div className="mx-auto max-w-5xl space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="section-kicker">CINEBOOKING · V41</p><h1 className="text-3xl font-bold">Trung tâm thông báo</h1><p className="mt-1 text-slate-400">Inbox có lưu trữ, ưu tiên và nhắc việc tự động cho booking, waitlist, loyalty, refund và ca làm.</p></div><div className="flex flex-wrap gap-2"><button disabled={busy} className="btn btn-secondary" onClick={testNotification}>Gửi thử</button>{view==="ACTIVE"&&<button className="btn btn-secondary" onClick={all}>Đánh dấu tất cả đã đọc</button>}</div></div>

    {(error||msg)&&<div className={`rounded-xl p-4 text-sm ${error?"bg-red-950/50 text-red-300":"bg-emerald-950/40 text-emerald-300"}`}>{error||msg}</div>}

    <section className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold">Kênh nhận thông báo</h2><p className="mt-1 text-sm text-slate-400">Email dùng SMTP hiện tại. Thông báo trình duyệt hoạt động khi CineBooking đang mở trên thiết bị này.</p></div><span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-400">Browser permission: {browserPermission}</span></div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {toggle("inAppEnabled","🔔 Trong ứng dụng","Hiển thị tại biểu tượng chuông và trang thông báo.")}
        {toggle("emailEnabled","✉️ Email","Gửi email theo SMTP đã cấu hình sau khi giao dịch commit thành công.")}
        <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/45 p-4"><span><b className="block">🖥️ Trình duyệt</b><span className="mt-1 block text-xs leading-5 text-slate-500">Hiện Browser Notification khi website đang mở; cần cấp quyền trên từng trình duyệt.</span></span><input type="checkbox" className="mt-1 h-5 w-5 accent-rose-500" disabled={busy} checked={prefs.browserEnabled} onChange={e=>toggleBrowser(e.target.checked)}/></label>
      </div>
    </section>

    <section className="card p-5">
      <h2 className="text-xl font-bold">Loại thông báo</h2><p className="mt-1 text-sm text-slate-400">Tắt một loại sẽ ngừng tạo thông báo mới của loại đó trên mọi kênh.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {toggle("bookingEnabled","🎟 Booking & thanh toán","Thanh toán thành công, booking bị huỷ hoặc hết hạn.")}
        {toggle("reminderEnabled","⏰ Nhắc giờ chiếu","Nhắc trước 3 giờ và nhắc cuối trước 30 phút, có dedupe giữa các backend.")}
        {toggle("waitlistEnabled","💺 Waitlist","Ghế vừa trống hoặc quyền ưu tiên mua lại suất đã hết chỗ.")}
        {toggle("loyaltyEnabled","🏆 Loyalty & thành viên","Điểm sắp hết hạn, quà sinh nhật và trạng thái phần thưởng.")}
        {toggle("refundEnabled","↩️ Hoàn vé","Tiếp nhận, duyệt hoặc từ chối yêu cầu hoàn vé.")}
        {toggle("staffShiftEnabled","🕒 Ca làm nhân viên","Thông báo khi được xếp/sửa/huỷ ca và nhắc trước ca.")}
        {toggle("promotionEnabled","🎁 Ưu đãi","Voucher và chiến dịch khuyến mãi.")}
      </div>
    </section>

    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2"><button data-testid="notifications-active-tab" onClick={()=>switchView("ACTIVE")} className={`rounded-full border px-4 py-2 text-sm font-semibold ${view==="ACTIVE"?"border-rose-500 bg-rose-500/15 text-rose-200":"border-slate-700 bg-slate-900/70 text-slate-400"}`}>Hộp thư</button><button data-testid="notifications-archived-tab" onClick={()=>switchView("ARCHIVED")} className={`rounded-full border px-4 py-2 text-sm font-semibold ${view==="ARCHIVED"?"border-rose-500 bg-rose-500/15 text-rose-200":"border-slate-700 bg-slate-900/70 text-slate-400"}`}>Đã lưu trữ</button></div>
        <span className="text-xs text-slate-500">{visible.length} thông báo</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">{([['ALL','Tất cả'],['UNREAD','Chưa đọc'],['BOOKING','Booking'],['REMINDER','Nhắc phim'],['WAITLIST','Waitlist'],['LOYALTY','Loyalty'],['REFUND','Hoàn vé'],['STAFF_SHIFT','Ca làm'],['PROMOTION','Ưu đãi']] as [Filter,string][]).map(([k,l])=><button key={k} onClick={()=>setFilter(k)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${filter===k?"border-rose-500 bg-rose-500/15 text-rose-200":"border-slate-700 bg-slate-900/70 text-slate-400"}`}>{l}</button>)}</div>
      <div className="mt-4 space-y-3">{visible.map(n=><article key={n.id} data-testid="notification-card" className={`card p-5 transition ${!n.read&&!n.archived?"border-rose-500/40 bg-slate-900/90":"opacity-85"}`}>
        <div className="flex items-start gap-4"><div className="text-2xl">{icon(n)}</div><button type="button" onClick={()=>openNotification(n)} className="min-w-0 flex-1 text-left"><div className="flex flex-wrap items-center justify-between gap-2"><b>{n.title}</b><span className="text-xs text-slate-500">{dateTime(n.createdAt)}</span></div><p className="mt-1 text-sm leading-6 text-slate-400">{n.message}</p><div className="mt-2 flex flex-wrap items-center gap-2"><span className="rounded-full bg-slate-800 px-2 py-1 text-[10px] font-black tracking-wide text-slate-400">{n.category}</span>{n.priority==="HIGH"&&<span className="rounded-full bg-amber-500/10 px-2 py-1 text-[10px] font-black text-amber-300">ƯU TIÊN</span>}{emailBadge(n)&&<span className={`rounded-full px-2 py-1 text-[10px] font-bold ${n.emailStatus==="FAILED"?"bg-red-500/10 text-red-300":"bg-emerald-500/10 text-emerald-300"}`}>{emailBadge(n)}</span>}{n.linkUrl&&<span className="text-xs font-bold text-rose-400">Xem chi tiết →</span>}</div></button>{!n.read&&!n.archived&&<i className="mt-2 h-2.5 w-2.5 rounded-full bg-rose-500"/>}</div>
        <div className="mt-3 flex justify-end"><button data-testid="notification-archive-toggle" type="button" className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white" onClick={()=>archive(n)}>{n.archived?"Khôi phục":"Lưu trữ"}</button></div>
      </article>)}{!visible.length&&!error&&<div className="card p-8 text-center text-slate-400">Không có thông báo phù hợp bộ lọc.</div>}</div>
    </section>
  </div>;
}
