"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { clearAuth, getAuth } from "@/lib/auth";
import { usePresentationLanguage } from "@/lib/usePresentationLanguage";
import type { UserProfile } from "@/lib/types";

export default function UxAccessibilityPwaV78Page(){
  const { t } = usePresentationLanguage();
  const [ready,setReady]=useState(false);
  const [error,setError]=useState("");

  useEffect(()=>{
    const local=getAuth();
    if(!local){window.location.assign("/login?returnTo=/admin/ux-accessibility-pwa&reason=required");return;}
    void (async()=>{
      try{
        const me=await api<UserProfile>("/me");
        if(me.role!=="ADMIN"){
          clearAuth();
          window.location.assign("/login?returnTo=/admin/ux-accessibility-pwa&reason=admin");
          return;
        }
        setReady(true);
      }catch(e){setError((e as Error).message)}
    })();
  },[]);

  return <div className="space-y-7" data-testid="ux-accessibility-pwa-v78" data-v78-ready={ready?"true":"false"}>
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="mb-2 text-sm text-slate-400"><Link href="/admin" className="hover:text-white">{t("Quản trị viên","Administrator")}</Link> / {t("Trải nghiệm, tiếp cận & PWA","UX, accessibility & PWA")}</div>
        <div className="text-xs font-black tracking-[0.22em] text-fuchsia-300">V78 · UX / ACCESSIBILITY / PWA 5.0</div>
        <h1 className="mt-2 text-3xl font-bold">{t("Ngôn ngữ toàn diện · Khả năng tiếp cận · PWA","Full-language UX · Accessibility · PWA")}</h1>
        <p className="mt-1 max-w-5xl text-slate-400">{t("V78 kiểm soát presentation VI/EN theo kiểu fail-closed, giữ dữ liệu nghiệp vụ nguyên bản, tăng khả năng dùng bàn phím và củng cố trải nghiệm cài đặt/ngoại tuyến.","V78 enforces fail-closed VI/EN presentation ownership, preserves source-owned business data, improves keyboard accessibility, and hardens install/offline experiences.")}</p>
      </div>
      <Link href="/admin" className="btn btn-secondary">{t("← Bảng điều khiển","← Dashboard")}</Link>
    </div>

    {error&&<div className="card border border-rose-800/60 p-4 text-sm text-rose-200" role="alert">{error}</div>}

    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <StatusCard icon="🌐" title={t("VI ↔ EN toàn giao diện","Full-surface VI ↔ EN")} body={t("Audit literal toàn frontend, semantic dynamic copy và browser sweep fail-closed trên hơn 50 tuyến.","Full-frontend literal audit, semantic dynamic copy, and a fail-closed browser sweep across 50+ routes.")}/>
      <StatusCard icon="⌨️" title={t("Khả năng tiếp cận","Accessibility")} body={t("Skip link, main landmark có thể focus, focus-visible và reduced-motion được kiểm tra ở shell dùng chung.","Skip link, focusable main landmark, focus-visible styling, and reduced-motion are verified in the shared shell.")}/>
      <StatusCard icon="📱" title="PWA 5.0" body={t("Manifest, biểu tượng, vùng safe-area, trạng thái aria-live và trải nghiệm vé ngoại tuyến tiếp tục được bảo vệ.","Manifest, icons, safe-area metadata, aria-live status, and offline-ticket experiences remain protected.")}/>
      <StatusCard icon="🧱" title={t("Ranh giới dữ liệu thật","Real-data boundaries")} body={t("Tên phim, rạp, sản phẩm, ID và payload nghiệp vụ không bị dịch máy; chỉ presentation copy thuộc hệ thống đổi ngôn ngữ.","Movie, cinema, product names, IDs, and business payloads are never machine-translated; only system-owned presentation copy switches language.")}/>
    </section>

    <section className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h2 className="text-xl font-bold">{t("Các bề mặt V78","V78 surfaces")}</h2><p className="mt-1 text-sm text-slate-500">{t("Mở nhanh các luồng được V78 bảo vệ trực tiếp.","Open the flows directly protected by V78.")}</p></div>
        <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-300">V78.0.20</span>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Link href="/mobile" className="btn btn-secondary">{t("📱 Trung tâm di động","📱 Mobile hub")}</Link>
        <Link href="/offline-tickets" className="btn btn-secondary">{t("🎟 Vé ngoại tuyến","🎟 Offline tickets")}</Link>
        <Link href="/notifications" className="btn btn-secondary">{t("🔔 Thông báo","🔔 Notifications")}</Link>
        <Link href="/admin/inventory" className="btn btn-secondary">{t("📦 Biên dữ liệu kho","📦 Inventory boundaries")}</Link>
      </div>
    </section>
  </div>;
}

function StatusCard({icon,title,body}:{icon:string;title:string;body:string}){
  return <article className="card p-5"><div className="text-3xl" aria-hidden="true">{icon}</div><h2 className="mt-3 text-lg font-black">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-400">{body}</p></article>;
}
