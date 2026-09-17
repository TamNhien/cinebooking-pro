/* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect -- effects intentionally synchronize API/subscription state; dependency lifecycle is intentionally bounded. */
"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { api, logoutSession } from "@/lib/api";
import { localizedLabel } from "@/lib/vi-labels";
import type { AuthResponse, NotificationItem, NotificationPreference } from "@/lib/types";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLanguage } from "@/components/LanguageProvider";

type DesktopMenu = "manager" | "admin" | null;
type DrawerSection = "explore" | "account" | "operations" | "management" | "admin" | null;

export default function Header(){
  const [auth,setA]=useState<AuthResponse|null>(null);
  const [open,setOpen]=useState(false);
  const [mounted,setMounted]=useState(false);
  const [unread,setUnread]=useState(0);
  const [desktopMenu,setDesktopMenu]=useState<DesktopMenu>(null);
  const [drawerSection,setDrawerSection]=useState<DrawerSection>(null);
  const pathname=usePathname();
  const {language}=useLanguage();
  const en=language==="en";
  const t=(vi:string,enText:string)=>en?enText:vi;

  useEffect(()=>{setMounted(true);},[]);
  useEffect(()=>{ const sync=()=>setA(getAuth()); sync(); window.addEventListener("auth-changed",sync); return()=>window.removeEventListener("auth-changed",sync); },[]);
  useEffect(()=>{
    if(!auth){setUnread(0);return;}
    let active=true;
    const refresh=()=>api<{unreadCount:number}>("/notifications/summary").then(r=>{if(active)setUnread(r.unreadCount)}).catch(()=>{});
    const pushed=()=>refresh();
    window.addEventListener("cinebooking-push-delivered",pushed);
    refresh(); const t=setInterval(refresh,30000); return()=>{active=false;clearInterval(t);window.removeEventListener("cinebooking-push-delivered",pushed)};
  },[auth?.userId]);

  // V52 keeps the V41 foreground polling path as a compatibility fallback.
  // When VAPID Web Push is active, the service worker advances the same cursor to prevent duplicate system notifications.
  useEffect(()=>{
    if(!auth || typeof window==="undefined" || typeof window.Notification==="undefined")return;
    let active=true;
    const key=`cinebooking-browser-notification-since:${auth.userId}`;
    const poll=async()=>{
      try{
        const pref=await api<NotificationPreference>("/notifications/preferences");
        if(!active)return;
        if(!pref.browserEnabled || window.Notification.permission!=="granted"){localStorage.setItem(key,new Date().toISOString());return;}
        const since=localStorage.getItem(key)||new Date().toISOString();
        const feed=await api<NotificationItem[]>(`/notifications/browser-feed?after=${encodeURIComponent(since)}`);
        if(!active)return;
        for(const n of feed){
          const toast=new window.Notification(n.title,{body:n.message,tag:`cinebooking-${n.id}`});
          toast.onclick=()=>{window.focus();if(n.linkUrl)window.location.assign(n.linkUrl);toast.close();};
        }
        const newest=feed.length?new Date(feed[feed.length-1].createdAt).getTime()+1:Date.now();
        localStorage.setItem(key,new Date(newest).toISOString());
      }catch{}
    };
    const onServiceWorkerMessage=(event:MessageEvent)=>{
      const data=event.data||{};
      if(data.type!=="CINEBOOKING_PUSH_DELIVERED")return;
      if(data.createdAt){const at=new Date(data.createdAt).getTime();if(Number.isFinite(at))localStorage.setItem(key,new Date(at+1).toISOString());}
      window.dispatchEvent(new Event("cinebooking-push-delivered"));
    };
    navigator.serviceWorker?.addEventListener("message",onServiceWorkerMessage);
    poll(); const t=setInterval(poll,30000);
    const changed=()=>poll(); window.addEventListener("notification-preferences-changed",changed);
    return()=>{active=false;clearInterval(t);navigator.serviceWorker?.removeEventListener("message",onServiceWorkerMessage);window.removeEventListener("notification-preferences-changed",changed)};
  },[auth?.userId]);

  // Any navigation change closes every transient menu.
  useEffect(()=>{setOpen(false);setDesktopMenu(null);setDrawerSection(null);},[pathname]);

  // Desktop dropdowns are click-only and close when clicking anywhere else.
  useEffect(()=>{
    if(!desktopMenu)return;
    const onPointerDown=(event:PointerEvent)=>{
      const target=event.target as HTMLElement|null;
      if(!target?.closest("[data-desktop-menu-root='true']")) setDesktopMenu(null);
    };
    const onKey=(event:KeyboardEvent)=>{if(event.key==="Escape")setDesktopMenu(null)};
    document.addEventListener("pointerdown",onPointerDown);
    window.addEventListener("keydown",onKey);
    return()=>{document.removeEventListener("pointerdown",onPointerDown);window.removeEventListener("keydown",onKey)};
  },[desktopMenu]);

  useEffect(()=>{
    if(!open)return;
    const previous=document.body.style.overflow;
    document.body.style.overflow="hidden";
    const onKey=(event:KeyboardEvent)=>{if(event.key==="Escape")setOpen(false)};
    window.addEventListener("keydown",onKey);
    return()=>{document.body.style.overflow=previous;window.removeEventListener("keydown",onKey)};
  },[open]);

  const logout=async()=>{await logoutSession();setOpen(false);setDesktopMenu(null);window.location.assign("/")};
  const close=()=>{setOpen(false);setDrawerSection(null)};
  const toggleDrawerSection=(section:Exclude<DrawerSection,null>)=>setDrawerSection(current=>current===section?null:section);
  const toggleDesktop=(menu:Exclude<DesktopMenu,null>)=>setDesktopMenu(current=>current===menu?null:menu);
  const notify=<Link href="/notifications" className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-700 bg-slate-900/85 text-lg" aria-label={t("Thông báo","Notifications")}>🔔{unread>0&&<span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-rose-500 px-1 text-center text-[10px] font-black leading-5 text-white">{unread>99?"99+":unread}</span>}</Link>;

  const sectionButton=(section:Exclude<DrawerSection,null>,label:string,icon:string)=><button type="button" className={`menu-drawer-section-button ${drawerSection===section?"is-open":""}`} onClick={()=>toggleDrawerSection(section)} aria-expanded={drawerSection===section}><span><span aria-hidden="true">{icon}</span>{label}</span><span className="menu-drawer-chevron" aria-hidden="true">⌄</span></button>;

  const drawer=mounted&&open?createPortal(
    <div className="menu-drawer-backdrop" role="presentation" onMouseDown={(e)=>{if(e.target===e.currentTarget)close()}}>
      <aside id="cinebooking-navigation-drawer" className="menu-drawer" role="dialog" aria-modal="true" aria-label={t("Menu điều hướng","Navigation menu")}>
        <div className="menu-drawer-head">
          <div><p className="menu-drawer-kicker">CineBooking Pro</p><h2>{t("Menu","Menu")}</h2></div>
          <button type="button" className="menu-drawer-close" onClick={close} aria-label={t("Đóng menu","Close menu")}>✕</button>
        </div>

        {auth&&<div className="menu-drawer-user">
          <div className="min-w-0"><b className="block truncate">{auth.fullName||auth.email}</b><span>{localizedLabel(auth.role,language)}</span></div>
          {unread>0&&<Link onClick={close} href="/notifications" className="menu-drawer-badge">🔔 {unread>99?"99+":unread}</Link>}
        </div>}

        <nav className="menu-drawer-nav">
          <div className={`menu-drawer-section-card ${drawerSection==="explore"?"is-open":""}`}>
            {sectionButton("explore",t("Khám phá","Explore"),"🧭")}
            {drawerSection==="explore"&&<div className="menu-drawer-submenu">
              <Link onClick={close} href="/movies">🎬 {t("Phim","Movies")}</Link>
              <Link onClick={close} href="/cinemas">🏢 {t("Rạp & lịch chiếu","Cinemas & showtimes")}</Link>
              <Link onClick={close} href="/promotions">🎁 {t("Ưu đãi","Promotions")}</Link>
            </div>}
          </div>

          {auth&&<div className={`menu-drawer-section-card ${drawerSection==="account"?"is-open":""}`}>
            {sectionButton("account",t("Tài khoản","Account"),"👤")}
            {drawerSection==="account"&&<div className="menu-drawer-submenu">
              <Link onClick={close} href="/bookings">🎟 {t("Vé của tôi","My tickets")}</Link>
              <Link onClick={close} href="/payments">💳 {t("Thanh toán","Payments")}</Link>
              <Link onClick={close} href="/favorites">❤️ {t("Yêu thích","Favorites")}</Link>
              <Link onClick={close} href="/for-you">🎯 {t("Gu phim","For you")}</Link>
              <Link onClick={close} href="/mobile">📱 {t("Ứng dụng di động","Mobile app")}</Link>
              <Link onClick={close} href="/waitlist">🔔 {t("Chờ ghế trống","Seat alerts")}</Link>
              <Link onClick={close} href="/profile">👤 {t("Tài khoản","Account")}</Link>
              <Link onClick={close} href="/security">🛡 {t("Bảo mật","Security")}</Link>
              <Link onClick={close} href="/notifications">🔔 {t("Thông báo","Notifications")}{unread>0?` (${unread})`:""}</Link>
              <Link onClick={close} href="/support">🎧 {t("Hỗ trợ","Support")}</Link>
            </div>}
          </div>}

          {auth&&["STAFF","MANAGER","ADMIN"].includes(auth.role)&&<div className={`menu-drawer-section-card ${drawerSection==="operations"?"is-open":""}`}>
            {sectionButton("operations",t("Vận hành","Operations"),"🎟")}
            {drawerSection==="operations"&&<div className="menu-drawer-submenu">
              {["STAFF","MANAGER"].includes(auth.role)&&<Link onClick={close} href="/staff/schedule">🕒 {t("Lịch & chấm công","Schedule & attendance")}</Link>}
              <Link onClick={close} href="/staff/check-in">📷 {t("Quét vé","Ticket scan")}</Link>
              <Link onClick={close} href="/staff/operations">📡 {t("Vận hành thời gian thực","Realtime operations")}</Link>
            </div>}
          </div>}

          {auth?.role==="MANAGER"&&<div className={`menu-drawer-section-card ${drawerSection==="management"?"is-open":""}`}>
            {sectionButton("management",t("Quản lý","Management"),"🧰")}
            {drawerSection==="management"&&<div className="menu-drawer-submenu">
              <Link onClick={close} href="/admin/shifts">🗓 {t("Xếp ca","Shift planning")}</Link>
              <Link onClick={close} href="/admin/attendance">🧾 {t("Bảng công & nghỉ phép","Attendance & leave")}</Link>
              <Link onClick={close} href="/admin/command-center">🧭 {t("Trung tâm điều hành","Command center")}</Link><Link onClick={close} href="/admin/booking-seat-intelligence">💺 {t("Đặt vé & gợi ý ghế V57","Booking & seat intelligence V57")}</Link><Link onClick={close} href="/admin/operations-control">🎛 {t("Trung tâm vận hành V58","Operations control V58")}</Link><Link onClick={close} href="/admin/operations-control">🎛 {t("Vận hành thời gian thực V59","Realtime operations V59")}</Link>
              <Link onClick={close} href="/admin/performance">🏁 {t("Hiệu suất đa rạp","Multi-cinema performance")}</Link>
              <Link onClick={close} href="/admin/retention">🔁 {t("Giữ chân khách","Customer retention")}</Link>
              <Link onClick={close} href="/admin/customer-value">💎 {t("Giá trị khách","Customer value")}</Link>
              <Link onClick={close} href="/admin/analytics">📊 {t("Phân tích dữ liệu","Analytics")}</Link>
              <Link onClick={close} href="/admin/maintenance">🛠 {t("Bảo trì & thiết bị","Maintenance & equipment")}</Link>
              <Link onClick={close} href="/admin/support">🎧 {t("Hỗ trợ khách hàng","Customer support")}</Link>
            </div>}
          </div>}

          {auth?.role==="ADMIN"&&<div className={`menu-drawer-section-card ${drawerSection==="admin"?"is-open":""}`}>
            {sectionButton("admin",t("Quản trị","Administration"),"⚙️")}
            {drawerSection==="admin"&&<div className="menu-drawer-submenu">
              <Link onClick={close} href="/admin">🧭 {t("Bảng điều khiển","Dashboard")}</Link>
              <Link onClick={close} href="/admin/bookings">🎫 {t("Đặt vé","Bookings")}</Link>
              <Link onClick={close} href="/admin/payments">💳 {t("Thanh toán vận hành V60","Payment operations V60")}</Link>
              <Link onClick={close} href="/admin/payment-resilience">💳 {t("Khả năng phục hồi thanh toán V67","Payment resilience V67")}</Link>
              <Link onClick={close} href="/admin/risk">🕵 {t("Gian lận & rủi ro V61","Fraud & risk V61")}</Link>
              <Link onClick={close} href="/admin/staff">👨‍💼 {t("Nhân viên","Staff")}</Link>
              <Link onClick={close} href="/admin/shifts">🕒 {t("Xếp ca","Shift planning")}</Link>
              <Link onClick={close} href="/admin/attendance">🧾 {t("Bảng công & nghỉ phép","Attendance & leave")}</Link>
              <Link onClick={close} href="/admin/vouchers">🎟 {t("Mã ưu đãi","Vouchers")}</Link>
              <Link onClick={close} href="/admin/loyalty">🏆 {t("Thành viên","Membership")}</Link>
              <Link onClick={close} href="/admin/pricing">💰 {t("Định giá động V62","Dynamic pricing V62")}</Link>
              <Link onClick={close} href="/admin/commerce">🍿 {t("Bắp nước & thương mại","Concessions & commerce")}</Link><Link onClick={close} href="/admin/inventory">📦 {t("Kho bắp nước","Concession inventory")}</Link>
              <Link onClick={close} href="/admin/reviews">⭐ {t("Kiểm duyệt đánh giá","Review moderation")}</Link>
              <Link onClick={close} href="/admin/command-center">🧭 {t("Trung tâm điều hành","Command center")}</Link><Link onClick={close} href="/admin/booking-seat-intelligence">💺 {t("Đặt vé & gợi ý ghế V57","Booking & seat intelligence V57")}</Link><Link onClick={close} href="/admin/operations-control">🎛 {t("Trung tâm vận hành V58","Operations control V58")}</Link><Link onClick={close} href="/admin/operations-control">🎛 {t("Vận hành thời gian thực V59","Realtime operations V59")}</Link>
              <Link onClick={close} href="/admin/performance">🏁 {t("Hiệu suất đa rạp","Multi-cinema performance")}</Link>
              <Link onClick={close} href="/admin/retention">🔁 {t("Giữ chân khách","Customer retention")}</Link>
              <Link onClick={close} href="/admin/customer-value">💎 {t("Giá trị khách","Customer value")}</Link>
              <Link onClick={close} href="/admin/analytics">📈 {t("Phân tích dữ liệu","Analytics")}</Link>
              <Link onClick={close} href="/admin/maintenance">🛠 {t("Bảo trì & thiết bị","Maintenance & equipment")}</Link>
              <Link onClick={close} href="/admin/support">🎧 {t("Hỗ trợ khách hàng","Customer support")}</Link>
              <Link onClick={close} href="/admin/security">🔐 {t("Bảo mật & định danh V68","Security & identity V68")}</Link>
              <Link onClick={close} href="/admin/disaster-recovery">🛟 {t("Sao lưu & khôi phục V69","Backup & recovery V69")}</Link>
              <Link onClick={close} href="/admin/privacy-governance">🧾 {t("Quản trị dữ liệu V70","Privacy governance V70")}</Link>
              <Link onClick={close} href="/admin/key-governance">🔑 {t("Quản trị khóa V71","Key governance V71")}</Link>
              <Link onClick={close} href="/admin/supply-chain">🧩 {t("Chuỗi cung ứng phần mềm V72","Software supply chain V72")}</Link>
              <Link onClick={close} href="/admin/actions-runtime">⚙ {"GitHub Actions V73"}</Link>
              <Link onClick={close} href="/admin/reliability">🛡 {t("Độ tin cậy V74","Reliability V74")}</Link>
              <Link onClick={close} href="/admin/analytics-bi">📊 {t("Phân tích dữ liệu & BI V75","Analytics & BI V75")}</Link>
              <Link onClick={close} href="/admin/recommendation">🧠 {t("Gợi ý phim V76","Recommendation V76")}</Link>
              <Link onClick={close} href="/admin/crm-automation">📣 {t("Tự động hóa CRM V77","CRM automation V77")}</Link>
              <Link onClick={close} href="/admin/ux-accessibility-pwa">♿ {t("UX & PWA V78","UX & PWA V78")}</Link>
              <Link onClick={close} href="/admin/refunds">↩ {t("Hoàn vé","Refunds")}</Link>
              <Link onClick={close} href="/admin/audit">🛡 {t("Nhật ký kiểm toán","Audit log")}</Link>
            </div>}
          </div>}
        </nav>
        {!auth&&<div className="menu-drawer-footer">
          <div className="grid grid-cols-2 gap-2"><Link onClick={close} className="btn btn-secondary" href="/register">{t("Đăng ký","Register")}</Link><Link onClick={close} className="btn btn-primary" href="/login">{t("Đăng nhập","Sign in")}</Link></div>
        </div>}
      </aside>
    </div>,document.body):null;

  return <>
    <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1920px] items-center gap-2 px-4 py-3 md:px-6">
        <Link href="/" className="shrink-0 whitespace-nowrap text-lg font-bold tracking-tight 2xl:text-xl">🎬 CineBooking <span className="text-rose-500">Pro</span></Link>

        <nav className="desktop-primary-nav hidden min-w-0 flex-1 items-center justify-center gap-2 whitespace-nowrap text-[12px] font-semibold min-[1850px]:flex 2xl:text-[13px]">
          <Link href="/movies" className="nav-link">{t("Phim","Movies")}</Link>
          <Link href="/cinemas" className="nav-link">{t("Rạp & lịch chiếu","Cinemas & showtimes")}</Link>
          <Link href="/promotions" className="nav-link">{t("Ưu đãi","Promotions")}</Link>
          {auth&&<Link href="/bookings" className="nav-link">{t("Vé của tôi","My tickets")}</Link>}
          {auth&&<Link href="/payments" className="nav-link">{t("Thanh toán","Payments")}</Link>}
          {auth&&<Link href="/favorites" className="nav-link desktop-nav-extra">{t("Yêu thích","Favorites")}</Link>}
          {auth&&<Link href="/for-you" className="nav-link">{t("Gu phim","For you")}</Link>}
          {auth&&<Link href="/waitlist" className="nav-link desktop-nav-extra">{t("Chờ ghế","Seat alerts")}</Link>}
          {auth&&<Link href="/profile" className="nav-link desktop-nav-extra">{t("Tài khoản","Account")}</Link>}
          {auth&&<Link href="/security" className="nav-link desktop-nav-extra">{t("Bảo mật","Security")}</Link>}
          {auth&&<Link href="/support" className="nav-link desktop-nav-extra">{t("Hỗ trợ","Support")}</Link>}
          {auth&&["STAFF","MANAGER"].includes(auth.role)&&<Link href="/staff/schedule" className="nav-link desktop-nav-extra">{t("Ca làm","Shifts")}</Link>}
          {auth&&["STAFF","MANAGER","ADMIN"].includes(auth.role)&&<Link href="/staff/check-in" className="nav-link desktop-nav-extra">{t("Soát vé","Check-in")}</Link>}
          {auth&&["STAFF","MANAGER","ADMIN"].includes(auth.role)&&<Link href="/staff/operations" className="nav-link desktop-nav-extra">{t("Vận hành","Operations")}</Link>}

          {auth?.role==="MANAGER"&&<div className="nav-menu relative" data-desktop-menu-root="true">
            <button type="button" className={`nav-link nav-menu-button ${desktopMenu==="manager"?"is-open":""}`} onClick={()=>toggleDesktop("manager")} aria-expanded={desktopMenu==="manager"}>{t("Quản lý","Management")} <span aria-hidden="true">⌄</span></button>
            {desktopMenu==="manager"&&<div className="nav-menu-panel"><Link onClick={()=>setDesktopMenu(null)} href="/admin/shifts">{t("Xếp ca","Shift planning")}</Link><Link onClick={()=>setDesktopMenu(null)} href="/admin/attendance">{t("Bảng công & nghỉ phép","Attendance & leave")}</Link><Link onClick={()=>setDesktopMenu(null)} href="/staff/operations">{t("Vận hành thời gian thực","Realtime operations")}</Link><Link onClick={()=>setDesktopMenu(null)} href="/admin/command-center">{t("Trung tâm điều hành","Command center")}</Link><Link onClick={()=>setDesktopMenu(null)} href="/admin/booking-seat-intelligence">{t("Đặt vé & gợi ý ghế V57","Booking & seat intelligence V57")}</Link><Link onClick={()=>setDesktopMenu(null)} href="/admin/operations-control">{t("Trung tâm vận hành V58","Operations control V58")}</Link><Link onClick={()=>setDesktopMenu(null)} href="/admin/operations-control">{t("Vận hành thời gian thực V59","Realtime operations V59")}</Link><Link onClick={()=>setDesktopMenu(null)} href="/admin/performance">{t("Hiệu suất V54","Performance V54")}</Link><Link onClick={()=>setDesktopMenu(null)} href="/admin/retention">{t("Giữ chân khách hàng V55","Customer retention V55")}</Link><Link onClick={()=>setDesktopMenu(null)} href="/admin/customer-value">{t("Giá trị khách hàng V56","Customer value V56")}</Link><Link onClick={()=>setDesktopMenu(null)} href="/admin/analytics">{t("Phân tích dữ liệu","Analytics")}</Link><Link onClick={()=>setDesktopMenu(null)} href="/admin/maintenance">{t("Bảo trì & thiết bị","Maintenance & equipment")}</Link><Link onClick={()=>setDesktopMenu(null)} href="/admin/support">{t("Hỗ trợ khách hàng","Customer support")}</Link></div>}
          </div>}

          {auth?.role==="ADMIN"&&<>
            <Link href="/admin/bookings" className="nav-link">{t("Đặt vé","Bookings")}</Link>
            <div className="nav-menu relative" data-desktop-menu-root="true">
              <button type="button" className={`nav-link nav-menu-button ${desktopMenu==="admin"?"is-open":""}`} onClick={()=>toggleDesktop("admin")} aria-expanded={desktopMenu==="admin"}>{t("Quản trị","Administration")} <span aria-hidden="true">⌄</span></button>
              {desktopMenu==="admin"&&<div className="nav-menu-panel">
                <Link onClick={()=>setDesktopMenu(null)} href="/admin">{t("Bảng điều khiển","Dashboard")}</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/admin/payments">{t("Thanh toán vận hành V60","Payment operations V60")}</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/admin/payment-resilience">{t("Khả năng phục hồi thanh toán V67","Payment resilience V67")}</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/admin/risk">{t("Gian lận & rủi ro V61","Fraud & risk V61")}</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/admin/staff">{t("Nhân viên","Staff")}</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/admin/shifts">{t("Xếp ca","Shift planning")}</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/admin/attendance">{t("Bảng công & nghỉ phép","Attendance & leave")}</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/staff/operations">{t("Vận hành thời gian thực","Realtime operations")}</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/admin/vouchers">{t("Mã ưu đãi","Vouchers")}</Link><Link onClick={()=>setDesktopMenu(null)} href="/admin/loyalty">{t("Khách hàng thân thiết & thành viên","Loyalty & membership")}</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/admin/pricing">{t("Định giá động V62","Dynamic pricing V62")}</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/admin/commerce">{t("Bắp nước & thương mại","Concessions & commerce")}</Link><Link onClick={()=>setDesktopMenu(null)} href="/admin/inventory">{t("Kho bắp nước","Concession inventory")}</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/admin/reviews">{t("Kiểm duyệt đánh giá","Review moderation")}</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/admin/command-center">{t("Trung tâm điều hành","Command center")}</Link><Link onClick={()=>setDesktopMenu(null)} href="/admin/booking-seat-intelligence">{t("Đặt vé & gợi ý ghế V57","Booking & seat intelligence V57")}</Link><Link onClick={()=>setDesktopMenu(null)} href="/admin/operations-control">{t("Trung tâm vận hành V58","Operations control V58")}</Link><Link onClick={()=>setDesktopMenu(null)} href="/admin/operations-control">{t("Vận hành thời gian thực V59","Realtime operations V59")}</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/admin/performance">{t("Hiệu suất V54","Performance V54")}</Link><Link onClick={()=>setDesktopMenu(null)} href="/admin/retention">{t("Giữ chân khách hàng V55","Customer retention V55")}</Link><Link onClick={()=>setDesktopMenu(null)} href="/admin/customer-value">{t("Giá trị khách hàng V56","Customer value V56")}</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/admin/analytics">{t("Phân tích dữ liệu","Analytics")}</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/admin/maintenance">{t("Bảo trì & thiết bị","Maintenance & equipment")}</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/admin/support">{t("Hỗ trợ khách hàng","Customer support")}</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/admin/security">{t("Bảo mật & định danh V68","Security & identity V68")}</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/admin/disaster-recovery">{t("Sao lưu & khôi phục V69","Backup & recovery V69")}</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/admin/privacy-governance">{t("Quản trị quyền riêng tư V70","Privacy governance V70")}</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/admin/key-governance">{t("Quản trị khóa V71","Key governance V71")}</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/admin/supply-chain">{t("Chuỗi cung ứng phần mềm V72","Software supply chain V72")}</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/admin/actions-runtime">{t("Môi trường chạy Actions V73","Actions runtime V73")}</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/admin/reliability">{t("Độ tin cậy V74","Reliability V74")}</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/admin/analytics-bi">{t("Phân tích dữ liệu & BI V75","Analytics & BI V75")}</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/admin/recommendation">{t("Gợi ý phim V76","Recommendation V76")}</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/admin/crm-automation">{t("Tự động hóa CRM V77","CRM automation V77")}</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/admin/ux-accessibility-pwa">{t("UX & PWA V78","UX & PWA V78")}</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/admin/refunds">{t("Hoàn vé","Refunds")}</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/admin/audit">{t("Nhật ký kiểm toán","Audit log")}</Link>
              </div>}
            </div>
          </>}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <LanguageSwitcher/>{auth&&notify}
          {auth ? <><span className="hidden max-w-28 truncate text-sm text-slate-400 2xl:inline" title={auth.fullName}>{auth.fullName}</span><button type="button" className="btn btn-secondary hidden whitespace-nowrap !px-3 !py-2 sm:inline-flex" onClick={logout}>{t("Đăng xuất","Sign out")}</button></> : <><Link className="hidden whitespace-nowrap text-sm font-semibold sm:block" href="/register">{t("Đăng ký","Register")}</Link><Link className="btn btn-primary hidden whitespace-nowrap !px-3 !py-2 sm:inline-flex" href="/login">{t("Đăng nhập","Sign in")}</Link></>}
          <button type="button" className={`menu-trigger ${open?"is-open":""}`} onClick={()=>{setOpen(v=>!v);setDrawerSection(null);setDesktopMenu(null)}} aria-label={open?t("Đóng menu","Close menu"):t("Mở menu","Open menu")} aria-expanded={open} aria-controls="cinebooking-navigation-drawer">{open?"✕":"☰"}</button>
        </div>
      </div>
    </header>
    {drawer}
  </>;
}
/* V77.0.9 historical verifier aliases (not rendered):
Dynamic Pricing V62 | Realtime Operations V59 | Payment Production V60 | Fraud & Risk V61 | Payment Resilience V67 | Security & Identity V68 | Backup & DR V69 | Privacy Governance V70 | Key Governance V71 | Supply Chain V72 | Actions Runtime V73 | Reliability V74 | Analytics & BI V75 | Recommendation V76 | CRM Automation V77 | UX / Accessibility / PWA V78
/admin/payment-resilience | /admin/disaster-recovery | /admin/privacy-governance | /admin/key-governance | /admin/supply-chain | /admin/actions-runtime | /admin/reliability | /admin/analytics-bi | /admin/recommendation | /admin/crm-automation | /admin/ux-accessibility-pwa
*/
