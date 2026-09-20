/* eslint-disable react-hooks/set-state-in-effect -- effects intentionally synchronize API/subscription state. */
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api, dateTime } from "@/lib/api";
import { getAuth } from "@/lib/auth";
import { listOfflineTickets, requestPersistentStorage, storageEstimate, syncOfflineTickets } from "@/lib/offlineTickets";
import { disableCurrentDevicePush, isStandalonePwa, listPwaDevices, pushConfig, registerCurrentPwaDevice, removePwaDevice } from "@/lib/pwa";
import type { NotificationPreference, PwaDevice, PwaPushConfig } from "@/lib/types";
import { usePresentationLanguage } from "@/lib/usePresentationLanguage";

export default function MobileCenterPage(){
  const { t }=usePresentationLanguage();
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
    // Delivery mode is server configuration and must not be blocked by
    // Service Worker activation. Publish it first so the UI never stays in
    // LOADING just because navigator.serviceWorker.ready is delayed.
    const cfg=await pushConfig();
    setConfig(cfg);
    // Register/upsert the current browser before reading the device list. The
    // registration helper has a bounded Service Worker readiness fallback.
    await registerCurrentPwaDevice();
    const [ds,tickets,estimate]=await Promise.all([listPwaDevices(),listOfflineTickets(auth.userId),storageEstimate()]);
    setDevices(ds);setOfflineCount(tickets.length);setStaleCount(tickets.filter(t=>t.syncState==="STALE").length);
    setUsage(estimate?.usage);setQuota(estimate?.quota);
    if(navigator.storage?.persisted)setPersistent(await navigator.storage.persisted().catch(()=>false));
    if(typeof Notification!=="undefined")setPermission(Notification.permission);
    setStandalone(isStandalonePwa());setOnline(navigator.onLine);
  }

  useEffect(()=>{
    if(!auth){window.location.assign("/login?next=/mobile");return;}
    load().catch(e=>setError((e as Error).message));
    const onNet=()=>setOnline(navigator.onLine);window.addEventListener("online",onNet);window.addEventListener("offline",onNet);
    return()=>{window.removeEventListener("online",onNet);window.removeEventListener("offline",onNet);};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  const current=useMemo(()=>devices.find(d=>d.current),[devices]);
  const storageText=quota?`${Math.round((usage||0)/1024/1024)} MB / ${Math.round(quota/1024/1024)} MB`:t("Không rõ","Unknown");

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
      setMessage(result.config?.enabled?t("✅ Đã bật thông báo đẩy nền cho thiết bị này.","✅ Background push notifications are enabled for this device."):t("Thông báo đẩy chưa được cấu hình; CineBooking vẫn thông báo khi website đang mở.","Push notifications are not configured; CineBooking will still notify you while the website is open."));
      await load();
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }

  async function disablePush(){setBusy(true);setError("");setMessage("");try{await disableCurrentDevicePush();setMessage(t("Đã tắt thông báo đẩy trên thiết bị hiện tại.","Push notifications are disabled on this device."));await load();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  async function persist(){setBusy(true);try{const ok=await requestPersistentStorage();setPersistent(ok);setMessage(ok?t("✅ Trình duyệt đã cấp lưu trữ bền vững.","✅ The browser granted persistent storage."):t("Trình duyệt chưa cấp lưu trữ bền vững; vé ngoại tuyến vẫn được lưu nhưng có thể bị dọn khi thiếu dung lượng.","The browser did not grant persistent storage; offline tickets remain saved but may be evicted when storage is low."));await load();}finally{setBusy(false);}}
  async function syncTickets(){if(!auth)return;setBusy(true);setError("");try{const r=await syncOfflineTickets(auth.userId);setMessage(t(`Đồng bộ ${r.checked} vé: ${r.refreshed} hợp lệ, ${r.stale} cần đồng bộ lại, ${r.failed} chưa xác minh.`,`Synced ${r.checked} tickets: ${r.refreshed} valid, ${r.stale} stale, ${r.failed} not verified.`));await load();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  async function remove(device:PwaDevice){if(!confirm(t(`Gỡ thiết bị ${device.deviceLabel}?`,`Remove device ${device.deviceLabel}?`)))return;setBusy(true);try{await removePwaDevice(device);await load();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}

  return <div className="mx-auto max-w-5xl space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="section-kicker">PWA / DI ĐỘNG · V52</p><h1 className="text-3xl font-black">Trải nghiệm di động 3.0</h1><p className="mt-2 max-w-3xl text-slate-400">Trung tâm cài ứng dụng, thông báo đẩy nền, lưu trữ bền vững và đồng bộ vé QR ngoại tuyến có kiểm soát.</p></div><div className="flex gap-2"><Link className="btn btn-secondary" href="/offline-tickets">🎟 Vé ngoại tuyến</Link><Link className="btn btn-secondary" href="/notifications">🔔 Thông báo</Link></div></div>

    {(error||message)&&<div className={`rounded-xl p-4 text-sm ${error?"bg-red-950/45 text-red-200":"bg-emerald-950/35 text-emerald-200"}`}>{error||message}</div>}

    <section className="grid gap-4 md:grid-cols-4">
      <div className="card p-5"><div className="text-xs text-slate-500">{t("Kết nối","Connection")}</div><div className={`mt-2 font-black ${online?"text-emerald-300":"text-amber-300"}`}>{online?t("Trực tuyến","Online"):t("Ngoại tuyến","Offline")}</div></div>
      <div className="card p-5"><div className="text-xs text-slate-500">{t("Chế độ app","App mode")}</div><div className="mt-2 font-black">{standalone?"STANDALONE":"BROWSER"}</div></div>
      <div className="card p-5"><div className="text-xs text-slate-500">{t("Vé ngoại tuyến","Offline tickets")}</div><div className="mt-2 text-2xl font-black">{offlineCount}</div><div className="text-xs text-slate-500">{staleCount} {t("cần đồng bộ lại","need resync")}</div></div>
      <div className="card p-5"><div className="text-xs text-slate-500">{t("Lưu trữ","Storage")}</div><div className="mt-2 font-black">{persistent?t("Bền vững","Persistent"):t("Theo khả năng trình duyệt","Browser-managed")}</div><div className="text-xs text-slate-500">{storageText}</div></div>
    </section>

    <section className="card p-5" data-testid="pwa-push-v52" data-delivery-mode={config?.deliveryMode||"LOADING"}>
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-black">🔔 Thông báo đẩy nền</h2><p className="mt-1 text-sm text-slate-400">V52 dùng VAPID khi máy chủ đã cấu hình; nếu chưa có khóa, cơ chế thăm dò V41 vẫn hoạt động khi website đang mở.</p></div><span className={`rounded-full px-3 py-1 text-xs font-black ${config?.enabled?"bg-emerald-950 text-emerald-300":"bg-slate-800 text-slate-300"}`}>{config?.enabled?"VAPID sẵn sàng":"Chế độ dự phòng"}</span></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-slate-800 p-4"><span className="text-xs text-slate-500">Quyền</span><b className="mt-1 block">{permission}</b></div><div className="rounded-xl border border-slate-800 p-4"><span className="text-xs text-slate-500">Thiết bị hiện tại</span><b className="mt-1 block">{current?.pushEnabled?"Push ON":"Push OFF"}</b></div><div className="rounded-xl border border-slate-800 p-4"><span className="text-xs text-slate-500">Phân phối</span><b className="mt-1 block">{config?.deliveryMode||"..."}</b></div></div>
      <div className="mt-4 flex flex-wrap gap-2"><button className="btn btn-primary" disabled={busy||current?.pushEnabled} onClick={enablePush}>Bật push thiết bị này</button><button className="btn btn-secondary" disabled={busy||!current?.pushEnabled} onClick={disablePush}>Tắt push thiết bị này</button></div>
    </section>

    <section className="card p-5" data-testid="offline-sync-v52"><h2 className="text-xl font-black">🎟 Vé ngoại tuyến & lưu trữ</h2><p className="mt-1 text-sm text-slate-400">QR ngoại tuyến chỉ được lưu qua IndexedDB. Service Worker không lưu đệm API, trang tài khoản hay QR riêng tư.</p><div className="mt-4 flex flex-wrap gap-2"><button className="btn btn-primary" disabled={busy||!online} onClick={syncTickets}>↻ Đồng bộ vé</button><button className="btn btn-secondary" disabled={busy||persistent} onClick={persist}>Yêu cầu lưu trữ bền vững</button></div></section>

    <section className="card p-5" data-testid="pwa-devices-v52"><div className="flex items-center justify-between"><div><h2 className="text-xl font-black">📱 {t("Thiết bị PWA","PWA devices")}</h2><p className="mt-1 text-sm text-slate-400">{t("Không tạo thông tin xác thực Web Push giả. Chỉ trình duyệt thật mới ghi địa chỉ nhận và khóa.","No fake Web Push credentials are created. Only a real browser records the endpoint and keys.")}</p></div><span data-testid="pwa-device-count-v7820r1" className="text-sm text-slate-500">{devices.length} {t("thiết bị","devices")}</span></div><div className="mt-4 space-y-3">{devices.map(d=><div key={d.id} className="flex flex-col gap-3 rounded-xl border border-slate-800 p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="font-bold">{d.deviceLabel} {d.current&&<span className="text-xs text-rose-300">· {t("Thiết bị này","This device")}</span>}</div><div data-testid="pwa-device-meta-v7820r1" className="mt-1 text-xs text-slate-500">{d.platform} · {d.standalone?t("Ứng dụng độc lập","Standalone app"):t("Trình duyệt","Browser")} · {t("Đẩy","Push")} {d.pushEnabled?t("BẬT","ON"):t("TẮT","OFF")} · {t("Đã xem","Last seen")} {dateTime(d.lastSeenAt)}</div>{d.lastFailureAt&&<div className="mt-1 text-xs text-amber-300">{t("Lỗi thông báo đẩy","Push failure")}: {d.failureCount} · {dateTime(d.lastFailureAt)}</div>}</div><button className="btn btn-secondary" disabled={busy} onClick={()=>remove(d)}>{t("Gỡ","Remove")}</button></div>)}{!devices.length&&<div className="text-sm text-slate-500">{t("Thiết bị hiện tại sẽ được ghi nhận sau khi Service Worker sẵn sàng.","The current device will be recorded after the Service Worker is ready.")}</div>}</div></section>
  </div>;
}
