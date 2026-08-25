"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getAuth } from "@/lib/auth";
import { registerCurrentPwaDevice } from "@/lib/pwa";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function PwaManager() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [online, setOnline] = useState(true);
  const [updateReady, setUpdateReady] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [authUserId,setAuthUserId]=useState<string|undefined>();

  const isIos = useMemo(() => typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent), []);

  useEffect(() => {
    setOnline(navigator.onLine);
    setStandalone(window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    const syncAuth=()=>setAuthUserId(getAuth()?.userId);syncAuth();window.addEventListener("auth-changed",syncAuth);

    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    const onInstallPrompt = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPromptEvent); };
    window.addEventListener("beforeinstallprompt", onInstallPrompt);
    const onInstalled = () => { setInstallPrompt(null); setStandalone(true); registerCurrentPwaDevice().catch(()=>{}); };
    window.addEventListener("appinstalled", onInstalled);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache:"none" }).then(reg => {
        setRegistration(reg);
        window.dispatchEvent(new Event("cinebooking-sw-ready"));
        if (reg.waiting) setUpdateReady(true);
        reg.addEventListener("updatefound", () => {
          const worker = reg.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) setUpdateReady(true);
          });
        });
      }).catch(() => {});
    }

    return () => {
      window.removeEventListener("auth-changed",syncAuth);
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("beforeinstallprompt", onInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(()=>{
    if(!authUserId||!online)return;
    let active=true;
    const sync=()=>{if(active)registerCurrentPwaDevice().catch(()=>{});};
    sync();const timer=setInterval(sync,5*60*1000);
    const onVisible=()=>{if(document.visibilityState==="visible")sync();};document.addEventListener("visibilitychange",onVisible);
    return()=>{active=false;clearInterval(timer);document.removeEventListener("visibilitychange",onVisible);};
  },[authUserId,online,standalone]);

  async function install() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setInstallPrompt(null);
  }

  function update() {
    const worker = registration?.waiting;
    if (!worker) { registration?.update().catch(() => {}); return; }
    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloaded) return; reloaded = true; location.reload();
    });
    worker.postMessage({ type: "SKIP_WAITING" });
  }

  const showIosHint = isIos && !standalone;
  if (dismissed && online && !updateReady) return null;
  if (standalone && online && !updateReady) return null;
  if (online && !updateReady && !installPrompt && !showIosHint) return null;

  return (
    <div className="pwa-manager" role="status" aria-live="polite">
      {!online ? <>
        <div className="pwa-manager-copy"><b>📴 Đang offline</b><span>V52 vẫn mở được vé đã lưu và không cache API/tài khoản.</span></div>
        <Link className="pwa-manager-action" href="/offline-tickets">Mở vé offline</Link>
      </> : updateReady ? <>
        <div className="pwa-manager-copy"><b>✨ Có bản CineBooking mới</b><span>Service Worker V52 sẵn sàng cập nhật.</span></div>
        <button className="pwa-manager-action" type="button" onClick={update}>Cập nhật</button>
      </> : installPrompt ? <>
        <div className="pwa-manager-copy"><b>📲 Cài CineBooking</b><span>Mở nhanh như ứng dụng, vé offline và Web Push khi được bật.</span></div>
        <button className="pwa-manager-action" type="button" onClick={install}>Cài ứng dụng</button>
        <button className="pwa-manager-close" type="button" onClick={() => setDismissed(true)} aria-label="Đóng">×</button>
      </> : showIosHint ? <>
        <div className="pwa-manager-copy"><b>📲 Cài trên iPhone/iPad</b><span>Safari → Chia sẻ → Thêm vào Màn hình chính.</span></div>
        <button className="pwa-manager-close" type="button" onClick={() => setDismissed(true)} aria-label="Đóng">×</button>
      </> : null}
    </div>
  );
}
