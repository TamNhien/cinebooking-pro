"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api, dateTime } from "@/lib/api";
import { getAuth } from "@/lib/auth";
import { listOfflineTickets, requestPersistentStorage, storageEstimate, syncOfflineTickets } from "@/lib/offlineTickets";
import { disableCurrentDevicePush, isStandalonePwa, listPwaDevices, pushConfig, registerCurrentPwaDevice, removePwaDevice } from "@/lib/pwa";
import type { NotificationPreference, PwaDevice, PwaPushConfig } from "@/lib/types";

export default function MobileCenterPage(){
  const [config,setConfig]=useState<PwaPushConfig|null>(null);
  const [devices,setDevices]=useState<PwaDevice[]>([]);
  const [offlineCount,setOfflineCount]=useState(0);
  const [staleCount,setStaleCount]=useState(0);
  const [persistent,setPersistent]=useState(false);
  const [usage,setUsage]=useState<number|undefined>();
  const [quota,setQuota]=useState<number|undefined>();
  const [permission,setPermission]=useState("unsupported");
  const [standalone,setStandalone]=useState(false);
  const [online,setOnline]=useState(true);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");
  const auth=getAuth();

  async function load(){
    if(!auth)return;
    // Register/upsert the current browser first so the device list cannot race
    // the global PwaManager background sync on a freshly authenticated session.
    await registerCurrentPwaDevice();
    const [cfg,ds,tickets,estimate]=await Promise.all([pushConfig(),listPwaDevices(),listOfflineTickets(auth.userId),storageEstimate()]);
    setConfig(cfg);setDevices(ds);setOfflineCount(tickets.length);setStaleCount(tickets.filter(t=>t.syncState==="STALE").length);
    setUsage(estimate?.usage);setQuota(estimate?.quota);
    if(navigator.storage?.persisted)setPersistent(await navigator.storage.persisted().catch(()=>false));
    if(typeof Notification!=="undefined")setPermission(Notification.permission);
    setStandalone(isStandalonePwa());setOnline(navigator.onLine);
  }

  useEffect(()=>{
    if(!auth){location.href="/login?next=/mobile";return;}
    load().catch(e=>setError((e as Error).message));
    const onNet=()=>setOnline(navigator.onLine);window.addEventListener("online",onNet);window.addEventListener("offline",onNet);
    return()=>{window.removeEventListener("online",onNet);window.removeEventListener("offline",onNet);};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  const current=useMemo(()=>devices.find(d=>d.current),[devices]);
  const storageText=quota?`${Math.round((usage||0)/1024/1024)} MB / ${Math.round(quota/1024/1024)} MB`:"Không rõ";

  async function enablePush(){
    setBusy(true);setError("");setMessage("");
    try{
      const prefs=await api<NotificationPreference>("/notifications/preferences");
      if(!prefs.browserEnabled){
        await api<NotificationPreference>("/notifications/preferences",{method:"PUT",body:JSON.stringify({
          inAppEnabled:prefs.inAppEnabled,emailEnabled:prefs.emailEnabled,browserEnabled:true,
          bookingEnabled:prefs.bookingEnabled,reminderEnabled:prefs.reminderEnabled,refundEnabled:prefs.refundEnabled,
          staffShiftEnabled:prefs.staffShiftEnabled,promotionEnabled:prefs.promotionEnabled,loyaltyEnabled:prefs.loyaltyEnabled,waitlistEnabled:prefs.waitlistEnabled
        })});
        window.dispatchEvent(new Event("notification-preferences-changed"));
      }
      const result=await registerCurrentPwaDevice({subscribe:true});
      setPermission(typeof Notification!=="undefined"?Notification.permission:"unsupported");
      setMessage(result.config?.enabled?"✅ Đã bật Web Push nền cho thiết bị này.":"Web Push chưa được cấu hình; CineBooking vẫn dùng thông báo foreground khi website đang mở.");
      await load();
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }

  async function disablePush(){setBusy(true);setError("");setMessage("");try{await disableCurrentDevicePush();setMessage("Đã tắt Web Push trên thiết bị hiện tại.");await load();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  async function persist(){setBusy(true);try{const ok=await requestPersistentStorage();setPersistent(ok);setMessage(ok?"✅ Trình duyệt đã cấp persistent storage.":"Trình duyệt chưa cấp persistent storage; vé offline vẫn được lưu nhưng có thể bị hệ thống dọn khi thiếu dung lượng.");await load();}finally{setBusy(false);}}
  async function syncTickets(){if(!auth)return;setBusy(true);setError("");try{const r=await syncOfflineTickets(auth.userId);setMessage(`Đồng bộ ${r.checked} vé: ${r.refreshed} hợp lệ, ${r.stale} stale, ${r.failed} chưa xác minh.`);await load();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  async function remove(device:PwaDevice){if(!confirm(`Gỡ thiết bị ${device.deviceLabel}?`))return;setBusy(true);try{await removePwaDevice(device);await load();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}

  return <div className="mx-auto max-w-5xl space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="section-kicker">PWA / MOBILE · V52</p><h1 className="text-3xl font-black">Mobile Experience 3.0</h1><p className="mt-2 max-w-3xl text-slate-400">Trung tâm cài app, Web Push nền, persistent storage và đồng bộ vé QR offline có kiểm soát.</p></div><div className="flex gap-2"><Link className="btn btn-secondary" href="/offline-tickets">🎟 Vé offline</Link><Link className="btn btn-secondary" href="/notifications">🔔 Thông báo</Link></div></div>

    {(error||message)&&<div className={`rounded-xl p-4 text-sm ${error?"bg-red-950/45 text-red-200":"bg-emerald-950/35 text-emerald-200"}`}>{error||message}</div>}

    <section className="grid gap-4 md:grid-cols-4">
      <div className="card p-5"><div className="text-xs text-slate-500">Kết nối</div><div className={`mt-2 font-black ${online?"text-emerald-300":"text-amber-300"}`}>{online?"ONLINE":"OFFLINE"}</div></div>
      <div className="card p-5"><div className="text-xs text-slate-500">Chế độ app</div><div className="mt-2 font-black">{standalone?"STANDALONE":"BROWSER"}</div></div>
      <div className="card p-5"><div className="text-xs text-slate-500">Vé offline</div><div className="mt-2 text-2xl font-black">{offlineCount}</div><div className="text-xs text-slate-500">{staleCount} stale</div></div>
      <div className="card p-5"><div className="text-xs text-slate-500">Storage</div><div className="mt-2 font-black">{persistent?"PERSISTENT":"BEST EFFORT"}</div><div className="text-xs text-slate-500">{storageText}</div></div>
    </section>

    <section className="card p-5" data-testid="pwa-push-v52">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-black">🔔 Background Web Push</h2><p className="mt-1 text-sm text-slate-400">V52 dùng VAPID khi server đã cấu hình; nếu chưa có key, foreground polling V41 vẫn hoạt động khi website đang mở.</p></div><span className={`rounded-full px-3 py-1 text-xs font-black ${config?.enabled?"bg-emerald-950 text-emerald-300":"bg-slate-800 text-slate-300"}`}>{config?.enabled?"VAPID READY":"FALLBACK"}</span></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-slate-800 p-4"><span className="text-xs text-slate-500">Permission</span><b className="mt-1 block">{permission}</b></div><div className="rounded-xl border border-slate-800 p-4"><span className="text-xs text-slate-500">Thiết bị hiện tại</span><b className="mt-1 block">{current?.pushEnabled?"Push ON":"Push OFF"}</b></div><div className="rounded-xl border border-slate-800 p-4"><span className="text-xs text-slate-500">Delivery</span><b className="mt-1 block">{config?.deliveryMode||"..."}</b></div></div>
      <div className="mt-4 flex flex-wrap gap-2"><button className="btn btn-primary" disabled={busy||current?.pushEnabled} onClick={enablePush}>Bật push thiết bị này</button><button className="btn btn-secondary" disabled={busy||!current?.pushEnabled} onClick={disablePush}>Tắt push thiết bị này</button></div>
    </section>

    <section className="card p-5" data-testid="offline-sync-v52"><h2 className="text-xl font-black">🎟 Vé offline & storage</h2><p className="mt-1 text-sm text-slate-400">QR offline chỉ được lưu qua IndexedDB. Service Worker không cache API, trang tài khoản hay QR riêng tư.</p><div className="mt-4 flex flex-wrap gap-2"><button className="btn btn-primary" disabled={busy||!online} onClick={syncTickets}>↻ Đồng bộ vé</button><button className="btn btn-secondary" disabled={busy||persistent} onClick={persist}>Yêu cầu persistent storage</button></div></section>

    <section className="card p-5" data-testid="pwa-devices-v52"><div className="flex items-center justify-between"><div><h2 className="text-xl font-black">📱 Thiết bị PWA</h2><p className="mt-1 text-sm text-slate-400">Không seed credential Web Push giả. Chỉ browser thực mới ghi endpoint/key.</p></div><span className="text-sm text-slate-500">{devices.length} thiết bị</span></div><div className="mt-4 space-y-3">{devices.map(d=><div key={d.id} className="flex flex-col gap-3 rounded-xl border border-slate-800 p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="font-bold">{d.deviceLabel} {d.current&&<span className="text-xs text-rose-300">· Thiết bị này</span>}</div><div className="mt-1 text-xs text-slate-500">{d.platform} · {d.standalone?"Standalone":"Browser"} · Push {d.pushEnabled?"ON":"OFF"} · Seen {dateTime(d.lastSeenAt)}</div>{d.lastFailureAt&&<div className="mt-1 text-xs text-amber-300">Push failures: {d.failureCount} · {dateTime(d.lastFailureAt)}</div>}</div><button className="btn btn-secondary" disabled={busy} onClick={()=>remove(d)}>Gỡ</button></div>)}{!devices.length&&<div className="text-sm text-slate-500">Thiết bị hiện tại sẽ được ghi nhận sau khi Service Worker sẵn sàng.</div>}</div></section>
  </div>;
}
