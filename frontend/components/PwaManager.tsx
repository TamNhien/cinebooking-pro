"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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

  const isIos = useMemo(() => typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent), []);

  useEffect(() => {
    setOnline(navigator.onLine);
    setStandalone(window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));

    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    const onInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onInstallPrompt);
    const onInstalled = () => { setInstallPrompt(null); setStandalone(true); };
    window.addEventListener("appinstalled", onInstalled);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).then(reg => {
        setRegistration(reg);
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
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("beforeinstallprompt", onInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setInstallPrompt(null);
  }

  function update() {
    const worker = registration?.waiting;
    if (!worker) {
      registration?.update().catch(() => {});
      return;
    }
    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloaded) return;
      reloaded = true;
      location.reload();
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
        <div className="pwa-manager-copy"><b>📴 Đang offline</b><span>Vé đã lưu vẫn mở được trên thiết bị này.</span></div>
        <Link className="pwa-manager-action" href="/offline-tickets">Mở vé offline</Link>
      </> : updateReady ? <>
        <div className="pwa-manager-copy"><b>✨ Có bản CineBooking mới</b><span>Cập nhật để dùng phiên bản mới nhất.</span></div>
        <button className="pwa-manager-action" type="button" onClick={update}>Cập nhật</button>
      </> : installPrompt ? <>
        <div className="pwa-manager-copy"><b>📲 Cài CineBooking</b><span>Mở nhanh như ứng dụng và dùng vé offline.</span></div>
        <button className="pwa-manager-action" type="button" onClick={install}>Cài ứng dụng</button>
        <button className="pwa-manager-close" type="button" onClick={() => setDismissed(true)} aria-label="Đóng">×</button>
      </> : showIosHint ? <>
        <div className="pwa-manager-copy"><b>📲 Cài trên iPhone/iPad</b><span>Safari → Chia sẻ → Thêm vào Màn hình chính.</span></div>
        <button className="pwa-manager-close" type="button" onClick={() => setDismissed(true)} aria-label="Đóng">×</button>
      </> : null}
    </div>
  );
}
