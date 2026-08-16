"use client";

import { useEffect, useMemo, useState } from "react";
import { api, dateTime } from "@/lib/api";
import { getAuth } from "@/lib/auth";
import type { NotificationItem, NotificationPreference } from "@/lib/types";

type Filter = "ALL"|"UNREAD"|"BOOKING"|"REMINDER"|"REFUND"|"STAFF_SHIFT";
type PrefToggleKey = Exclude<keyof NotificationPreference,"updatedAt">;

const EMPTY_PREF:NotificationPreference={inAppEnabled:true,emailEnabled:false,browserEnabled:false,bookingEnabled:true,reminderEnabled:true,refundEnabled:true,staffShiftEnabled:true,promotionEnabled:true,updatedAt:""};

export default function NotificationsPage(){
  const [items,setItems]=useState<NotificationItem[]>([]);
  const [prefs,setPrefs]=useState<NotificationPreference>(EMPTY_PREF);
  const [filter,setFilter]=useState<Filter>("ALL");
  const [error,setError]=useState("");
  const [msg,setMsg]=useState("");
  const [busy,setBusy]=useState(false);
  const [browserPermission,setBrowserPermission]=useState<string>("unsupported");

  const load=async()=>{
    const [list,p]=await Promise.all([api<NotificationItem[]>("/notifications"),api<NotificationPreference>("/notifications/preferences")]);
    setItems(list);setPrefs(p);
  };

  useEffect(()=>{
    if(!getAuth()){location.href="/login?next=/notifications";return;}
    if(typeof Notification!=="undefined")setBrowserPermission(Notification.permission);
    load().catch(e=>setError(e.message));
  },[]);

  const visible=useMemo(()=>items.filter(n=>filter==="ALL"?true:filter==="UNREAD"?!n.read:n.category===filter),[items,filter]);

  async function read(n:NotificationItem){
    if(!n.read){await api(`/notifications/${n.id}/read`,{method:"POST"});await load();}
    if(n.linkUrl)location.href=n.linkUrl;
  }
  async function all(){await api("/notifications/read-all",{method:"POST"});await load();}
  async function testNotification(){setBusy(true);setError("");setMsg("");try{await api<NotificationItem>("/notifications/test",{method:"POST"});await load();setMsg("Đã tạo thông báo thử theo các kênh bạn đang bật.");}catch(e){setError((e as Error).message);}finally{setBusy(false);}}

  async function save(next:NotificationPreference){
    setBusy(true);setError("");setMsg("");
    try{
      const saved=await api<NotificationPreference>("/notifications/preferences",{method:"PUT",body:JSON.stringify({
        inAppEnabled:next.inAppEnabled,emailEnabled:next.emailEnabled,browserEnabled:next.browserEnabled,
        bookingEnabled:next.bookingEnabled,reminderEnabled:next.reminderEnabled,refundEnabled:next.refundEnabled,
        staffShiftEnabled:next.staffShiftEnabled,promotionEnabled:next.promotionEnabled
      })});
      setPrefs(saved);setMsg("Đã lưu tùy chọn thông báo.");
      window.dispatchEvent(new Event("notification-preferences-changed"));
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

  const icon=(n:NotificationItem)=>n.category==="BOOKING"?"🎟":n.category==="REMINDER"?"⏰":n.category==="REFUND"?"↩️":n.category==="STAFF_SHIFT"?"🕒":n.category==="PROMOTION"?"🎁":"🔔";
  const emailBadge=(n:NotificationItem)=>n.emailStatus==="SENT"?"Email ✓":n.emailStatus==="FAILED"?"Email lỗi":n.emailStatus==="DISABLED"?"SMTP tắt":null;

  return <div className="mx-auto max-w-5xl space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="section-kicker">CINEBOOKING · V22</p><h1 className="text-3xl font-bold">Trung tâm thông báo</h1><p className="mt-1 text-slate-400">Booking, lịch chiếu, hoàn vé và ca làm — chọn kênh nhận phù hợp với bạn.</p></div><div className="flex flex-wrap gap-2"><button disabled={busy} className="btn btn-secondary" onClick={testNotification}>Gửi thử</button><button className="btn btn-secondary" onClick={all}>Đánh dấu tất cả đã đọc</button></div></div>

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
        {toggle("reminderEnabled","⏰ Nhắc giờ chiếu","Nhắc chuẩn bị QR trước giờ chiếu.")}
        {toggle("refundEnabled","↩️ Hoàn vé","Tiếp nhận, duyệt hoặc từ chối yêu cầu hoàn vé.")}
        {toggle("staffShiftEnabled","🕒 Ca làm nhân viên","Thông báo khi được xếp/sửa/huỷ ca và nhắc trước ca.")}
        {toggle("promotionEnabled","🎁 Ưu đãi","Dành cho voucher và chiến dịch khuyến mãi trong các phiên bản sau.")}
      </div>
    </section>

    <section>
      <div className="flex flex-wrap gap-2">{([['ALL','Tất cả'],['UNREAD','Chưa đọc'],['BOOKING','Booking'],['REMINDER','Nhắc phim'],['REFUND','Hoàn vé'],['STAFF_SHIFT','Ca làm']] as [Filter,string][]).map(([k,l])=><button key={k} onClick={()=>setFilter(k)} className={`rounded-full border px-4 py-2 text-sm font-semibold ${filter===k?"border-rose-500 bg-rose-500/15 text-rose-200":"border-slate-700 bg-slate-900/70 text-slate-400"}`}>{l}</button>)}</div>
      <div className="mt-4 space-y-3">{visible.map(n=><button key={n.id} onClick={()=>read(n)} className={`card w-full p-5 text-left transition ${!n.read?"border-rose-500/40 bg-slate-900/90":"opacity-80"}`}><div className="flex items-start gap-4"><div className="text-2xl">{icon(n)}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><b>{n.title}</b><span className="text-xs text-slate-500">{dateTime(n.createdAt)}</span></div><p className="mt-1 text-sm leading-6 text-slate-400">{n.message}</p><div className="mt-2 flex flex-wrap items-center gap-2"><span className="rounded-full bg-slate-800 px-2 py-1 text-[10px] font-black tracking-wide text-slate-400">{n.category}</span>{emailBadge(n)&&<span className={`rounded-full px-2 py-1 text-[10px] font-bold ${n.emailStatus==="FAILED"?"bg-red-500/10 text-red-300":"bg-emerald-500/10 text-emerald-300"}`}>{emailBadge(n)}</span>}{n.linkUrl&&<span className="text-xs font-bold text-rose-400">Xem chi tiết →</span>}</div></div>{!n.read&&<i className="mt-2 h-2.5 w-2.5 rounded-full bg-rose-500"/>}</div></button>)}{!visible.length&&!error&&<div className="card p-8 text-center text-slate-400">Không có thông báo phù hợp bộ lọc.</div>}</div>
    </section>
  </div>;
}
