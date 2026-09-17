/* eslint-disable react-hooks/set-state-in-effect -- effects intentionally synchronize API/subscription state. */
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getAuth } from "@/lib/auth";
import { registerCurrentPwaDevice } from "@/lib/pwa";
import { usePresentationLanguage } from "@/lib/usePresentationLanguage";

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
  const { t } = usePresentationLanguage();

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
  const mode = !online
    ? "offline"
    : updateReady
      ? "update"
      : !dismissed && !standalone && installPrompt
        ? "install"
        : !dismissed && !standalone && showIosHint
          ? "ios"
          : "idle";
  const active = mode !== "idle";

  return (
    <div
      className={`pwa-manager${active ? "" : " pwa-manager-idle"}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-testid="pwa-live-region-v7814"
      data-active={active ? "true" : "false"}
    >
      {mode === "offline" ? <>
        <div className="pwa-manager-copy"><b>📴 {t("Đang ngoại tuyến","Offline")}</b><span>{t("V52 vẫn mở được vé đã lưu và không lưu đệm API/tài khoản.","V52 can still open saved tickets and does not cache APIs or account data.")}</span></div>
        <Link className="pwa-manager-action" href="/offline-tickets">{t("Mở vé ngoại tuyến","Open offline tickets")}</Link>
      </> : mode === "update" ? <>
        <div className="pwa-manager-copy"><b>✨ {t("Có bản CineBooking mới","A new CineBooking version is available")}</b><span>{t("Bộ xử lý nền V52 sẵn sàng cập nhật.","The V52 service worker is ready to update.")}</span></div>
        <button className="pwa-manager-action" type="button" onClick={update}>{t("Cập nhật","Update")}</button>
      </> : mode === "install" ? <>
        <div className="pwa-manager-copy"><b>📲 {t("Cài CineBooking","Install CineBooking")}</b><span>{t("Mở nhanh như ứng dụng, vé ngoại tuyến và Web Push khi được bật.","Launch it like an app, keep offline tickets, and use Web Push when enabled.")}</span></div>
        <button className="pwa-manager-action" type="button" onClick={install}>{t("Cài ứng dụng","Install app")}</button>
        <button className="pwa-manager-close" type="button" onClick={() => setDismissed(true)} aria-label={t("Đóng","Close")}>×</button>
      </> : mode === "ios" ? <>
        <div className="pwa-manager-copy"><b>📲 {t("Cài trên iPhone/iPad","Install on iPhone/iPad")}</b><span>{t("Safari → Chia sẻ → Thêm vào Màn hình chính.","Safari → Share → Add to Home Screen.")}</span></div>
        <button className="pwa-manager-close" type="button" onClick={() => setDismissed(true)} aria-label={t("Đóng","Close")}>×</button>
      </> : null}
    </div>
  );
}
