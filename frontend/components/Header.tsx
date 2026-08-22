"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { api, logoutSession } from "@/lib/api";
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
  const {language}=useLanguage(); const en=language==="en";

  useEffect(()=>{setMounted(true);},[]);
  useEffect(()=>{ const sync=()=>setA(getAuth()); sync(); window.addEventListener("auth-changed",sync); return()=>window.removeEventListener("auth-changed",sync); },[]);
  useEffect(()=>{
    if(!auth){setUnread(0);return;}
    let active=true;
    const refresh=()=>api<{unreadCount:number}>("/notifications/summary").then(r=>{if(active)setUnread(r.unreadCount)}).catch(()=>{});
    refresh(); const t=setInterval(refresh,30000); return()=>{active=false;clearInterval(t)};
  },[auth?.userId]);

  // V22: browser notifications without storing a push credential. This deliberately
  // works while CineBooking is open; true background Web Push can be added later
  // with VAPID without changing the preference model/API.
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
          toast.onclick=()=>{window.focus();if(n.linkUrl)location.href=n.linkUrl;toast.close();};
        }
        const newest=feed.length?new Date(feed[feed.length-1].createdAt).getTime()+1:Date.now();
        localStorage.setItem(key,new Date(newest).toISOString());
      }catch{}
    };
    poll(); const t=setInterval(poll,30000);
    const changed=()=>poll(); window.addEventListener("notification-preferences-changed",changed);
    return()=>{active=false;clearInterval(t);window.removeEventListener("notification-preferences-changed",changed)};
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

  const logout=async()=>{await logoutSession();setOpen(false);setDesktopMenu(null);location.href="/"};
  const close=()=>{setOpen(false);setDrawerSection(null)};
  const toggleDrawerSection=(section:Exclude<DrawerSection,null>)=>setDrawerSection(current=>current===section?null:section);
  const toggleDesktop=(menu:Exclude<DesktopMenu,null>)=>setDesktopMenu(current=>current===menu?null:menu);
  const notify=<Link href="/notifications" className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-700 bg-slate-900/85 text-lg" aria-label={en?"Notifications":"Thông báo"}>🔔{unread>0&&<span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-rose-500 px-1 text-center text-[10px] font-black leading-5 text-white">{unread>99?"99+":unread}</span>}</Link>;

  const sectionButton=(section:Exclude<DrawerSection,null>,label:string,icon:string)=><button type="button" className={`menu-drawer-section-button ${drawerSection===section?"is-open":""}`} onClick={()=>toggleDrawerSection(section)} aria-expanded={drawerSection===section}><span><span aria-hidden="true">{icon}</span>{label}</span><span className="menu-drawer-chevron" aria-hidden="true">⌄</span></button>;

  const drawer=mounted&&open?createPortal(
    <div className="menu-drawer-backdrop" role="presentation" onMouseDown={(e)=>{if(e.target===e.currentTarget)close()}}>
      <aside id="cinebooking-navigation-drawer" className="menu-drawer" role="dialog" aria-modal="true" aria-label={en?"Navigation menu":"Menu điều hướng"}>
        <div className="menu-drawer-head">
          <div><p className="menu-drawer-kicker">CineBooking Pro</p><h2>{en?"Navigation":"Menu"}</h2></div>
          <button type="button" className="menu-drawer-close" onClick={close} aria-label={en?"Close menu":"Đóng menu"}>✕</button>
        </div>

        {auth&&<div className="menu-drawer-user">
          <div className="min-w-0"><b className="block truncate">{auth.fullName||auth.email}</b><span>{auth.role}</span></div>
          {unread>0&&<Link onClick={close} href="/notifications" className="menu-drawer-badge">🔔 {unread>99?"99+":unread}</Link>}
        </div>}

        <nav className="menu-drawer-nav">
          <div className={`menu-drawer-section-card ${drawerSection==="explore"?"is-open":""}`}>
            {sectionButton("explore",en?"Explore":"Khám phá","🧭")}
            {drawerSection==="explore"&&<div className="menu-drawer-submenu">
              <Link onClick={close} href="/movies">🎬 {en?"Movies":"Phim"}</Link>
              <Link onClick={close} href="/cinemas">🏢 {en?"Cinemas & showtimes":"Rạp & lịch chiếu"}</Link>
              <Link onClick={close} href="/promotions">🎁 {en?"Promotions":"Ưu đãi"}</Link>
            </div>}
          </div>

          {auth&&<div className={`menu-drawer-section-card ${drawerSection==="account"?"is-open":""}`}>
            {sectionButton("account",en?"My account":"Tài khoản","👤")}
            {drawerSection==="account"&&<div className="menu-drawer-submenu">
              <Link onClick={close} href="/bookings">🎟 {en?"My tickets":"Vé của tôi"}</Link>
              <Link onClick={close} href="/payments">💳 {en?"Payments":"Thanh toán"}</Link>
              <Link onClick={close} href="/favorites">❤️ {en?"Favorites":"Yêu thích"}</Link>
              <Link onClick={close} href="/waitlist">🔔 {en?"Seat alerts":"Chờ ghế trống"}</Link>
              <Link onClick={close} href="/profile">👤 {en?"Account":"Tài khoản"}</Link>
              <Link onClick={close} href="/notifications">🔔 {en?"Notifications":"Thông báo"}{unread>0?` (${unread})`:""}</Link>
            </div>}
          </div>}

          {auth&&["STAFF","MANAGER","ADMIN"].includes(auth.role)&&<div className={`menu-drawer-section-card ${drawerSection==="operations"?"is-open":""}`}>
            {sectionButton("operations",en?"Operations":"Vận hành","🎟")}
            {drawerSection==="operations"&&<div className="menu-drawer-submenu">
              {["STAFF","MANAGER"].includes(auth.role)&&<Link onClick={close} href="/staff/schedule">🕒 {en?"Shift & attendance":"Lịch & chấm công"}</Link>}
              <Link onClick={close} href="/staff/check-in">📷 {en?"Ticket check-in":"Quét vé"}</Link>
              <Link onClick={close} href="/staff/operations">📡 {en?"Live operations":"Vận hành realtime"}</Link>
            </div>}
          </div>}

          {auth?.role==="MANAGER"&&<div className={`menu-drawer-section-card ${drawerSection==="management"?"is-open":""}`}>
            {sectionButton("management",en?"Management":"Quản lý","🧰")}
            {drawerSection==="management"&&<div className="menu-drawer-submenu">
              <Link onClick={close} href="/admin/shifts">🗓 {en?"Shift scheduling":"Xếp ca"}</Link>
              <Link onClick={close} href="/admin/attendance">🧾 {en?"Timesheet & leave":"Bảng công & nghỉ phép"}</Link>
              <Link onClick={close} href="/admin/analytics">📊 Analytics</Link>
              <Link onClick={close} href="/admin/maintenance">🛠 Bảo trì & thiết bị</Link>
            </div>}
          </div>}

          {auth?.role==="ADMIN"&&<div className={`menu-drawer-section-card ${drawerSection==="admin"?"is-open":""}`}>
            {sectionButton("admin",en?"Administration":"Quản trị","⚙️")}
            {drawerSection==="admin"&&<div className="menu-drawer-submenu">
              <Link onClick={close} href="/admin">🧭 Dashboard</Link>
              <Link onClick={close} href="/admin/bookings">🎫 Booking</Link>
              <Link onClick={close} href="/admin/payments">💳 Payment Ops</Link>
              <Link onClick={close} href="/admin/staff">👨‍💼 {en?"Staff accounts":"Nhân viên"}</Link>
              <Link onClick={close} href="/admin/shifts">🕒 {en?"Shift scheduling":"Xếp ca"}</Link>
              <Link onClick={close} href="/admin/attendance">🧾 {en?"Timesheet & leave":"Bảng công & nghỉ phép"}</Link>
              <Link onClick={close} href="/admin/vouchers">🎟 {en?"Vouchers":"Mã ưu đãi"}</Link>
              <Link onClick={close} href="/admin/loyalty">🏆 {en?"Loyalty":"Thành viên"}</Link>
              <Link onClick={close} href="/admin/pricing">💰 {en?"Dynamic pricing":"Giá vé động"}</Link>
              <Link onClick={close} href="/admin/commerce">🍿 {en?"Food & commerce":"Bắp nước & thương mại"}</Link><Link onClick={close} href="/admin/inventory">📦 {en?"Inventory":"Kho bắp nước"}</Link>
              <Link onClick={close} href="/admin/reviews">⭐ {en?"Review moderation":"Kiểm duyệt đánh giá"}</Link>
              <Link onClick={close} href="/admin/analytics">📈 Analytics</Link>
              <Link onClick={close} href="/admin/maintenance">🛠 {en?"Maintenance & assets":"Bảo trì & thiết bị"}</Link>
              <Link onClick={close} href="/admin/refunds">↩ {en?"Refunds":"Hoàn vé"}</Link>
              <Link onClick={close} href="/admin/audit">🛡 Audit log</Link>
            </div>}
          </div>}
        </nav>
        {!auth&&<div className="menu-drawer-footer">
          <div className="grid grid-cols-2 gap-2"><Link onClick={close} className="btn btn-secondary" href="/register">{en?"Register":"Đăng ký"}</Link><Link onClick={close} className="btn btn-primary" href="/login">{en?"Sign in":"Đăng nhập"}</Link></div>
        </div>}
      </aside>
    </div>,document.body):null;

  return <>
    <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1500px] items-center gap-4 px-4 py-3 md:px-6">
        <Link href="/" className="shrink-0 whitespace-nowrap text-lg font-bold tracking-tight 2xl:text-xl">🎬 CineBooking <span className="text-rose-500">Pro</span></Link>

        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-4 whitespace-nowrap text-[13px] font-semibold xl:flex 2xl:gap-5 2xl:text-sm">
          <Link href="/movies" className="nav-link">{en?"Movies":"Phim"}</Link>
          <Link href="/cinemas" className="nav-link">{en?"Cinemas & showtimes":"Rạp & lịch chiếu"}</Link>
          <Link href="/promotions" className="nav-link">{en?"Promotions":"Ưu đãi"}</Link>
          {auth&&<Link href="/bookings" className="nav-link">{en?"My tickets":"Vé của tôi"}</Link>}
          {auth&&<Link href="/payments" className="nav-link">{en?"Payments":"Thanh toán"}</Link>}
          {auth&&<Link href="/favorites" className="nav-link">{en?"Favorites":"Yêu thích"}</Link>}
          {auth&&<Link href="/waitlist" className="nav-link">{en?"Seat alerts":"Chờ ghế"}</Link>}
          {auth&&<Link href="/profile" className="nav-link">{en?"Account":"Tài khoản"}</Link>}
          {auth&&["STAFF","MANAGER"].includes(auth.role)&&<Link href="/staff/schedule" className="nav-link">Ca làm</Link>}
          {auth&&["STAFF","MANAGER","ADMIN"].includes(auth.role)&&<Link href="/staff/check-in" className="nav-link">Check-in</Link>}
          {auth&&["STAFF","MANAGER","ADMIN"].includes(auth.role)&&<Link href="/staff/operations" className="nav-link">Vận hành</Link>}

          {auth?.role==="MANAGER"&&<div className="nav-menu relative" data-desktop-menu-root="true">
            <button type="button" className={`nav-link nav-menu-button ${desktopMenu==="manager"?"is-open":""}`} onClick={()=>toggleDesktop("manager")} aria-expanded={desktopMenu==="manager"}>Quản lý <span aria-hidden="true">⌄</span></button>
            {desktopMenu==="manager"&&<div className="nav-menu-panel"><Link onClick={()=>setDesktopMenu(null)} href="/admin/shifts">Xếp ca</Link><Link onClick={()=>setDesktopMenu(null)} href="/admin/attendance">Bảng công & nghỉ phép</Link><Link onClick={()=>setDesktopMenu(null)} href="/staff/operations">Vận hành realtime</Link><Link onClick={()=>setDesktopMenu(null)} href="/admin/analytics">Analytics</Link><Link onClick={()=>setDesktopMenu(null)} href="/admin/maintenance">Bảo trì & thiết bị</Link></div>}
          </div>}

          {auth?.role==="ADMIN"&&<>
            <Link href="/admin/bookings" className="nav-link">Booking</Link>
            <div className="nav-menu relative" data-desktop-menu-root="true">
              <button type="button" className={`nav-link nav-menu-button ${desktopMenu==="admin"?"is-open":""}`} onClick={()=>toggleDesktop("admin")} aria-expanded={desktopMenu==="admin"}>Quản trị <span aria-hidden="true">⌄</span></button>
              {desktopMenu==="admin"&&<div className="nav-menu-panel">
                <Link onClick={()=>setDesktopMenu(null)} href="/admin">Dashboard</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/admin/payments">Payment Ops</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/admin/staff">Nhân viên</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/admin/shifts">Xếp ca</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/admin/attendance">Bảng công & nghỉ phép</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/staff/operations">Vận hành realtime</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/admin/vouchers">Mã ưu đãi</Link><Link onClick={()=>setDesktopMenu(null)} href="/admin/loyalty">Loyalty & thành viên</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/admin/pricing">Giá vé động</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/admin/commerce">Bắp nước & thương mại</Link><Link onClick={()=>setDesktopMenu(null)} href="/admin/inventory">Kho bắp nước</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/admin/reviews">Kiểm duyệt đánh giá</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/admin/analytics">Analytics</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/admin/maintenance">Bảo trì & thiết bị</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/admin/refunds">Hoàn vé</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/admin/audit">Audit log</Link>
              </div>}
            </div>
          </>}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <LanguageSwitcher/>{auth&&notify}
          {auth ? <><span className="hidden max-w-28 truncate text-sm text-slate-400 2xl:inline" title={auth.fullName}>{auth.fullName}</span><button type="button" className="btn btn-secondary hidden whitespace-nowrap !px-3 !py-2 sm:inline-flex" onClick={logout}>{en?"Sign out":"Đăng xuất"}</button></> : <><Link className="hidden whitespace-nowrap text-sm font-semibold sm:block" href="/register">{en?"Register":"Đăng ký"}</Link><Link className="btn btn-primary hidden whitespace-nowrap !px-3 !py-2 sm:inline-flex" href="/login">{en?"Sign in":"Đăng nhập"}</Link></>}
          <button type="button" className={`menu-trigger ${open?"is-open":""}`} onClick={()=>{setOpen(v=>!v);setDrawerSection(null);setDesktopMenu(null)}} aria-label={open?(en?"Close menu":"Đóng menu"):(en?"Open menu":"Mở menu")} aria-expanded={open} aria-controls="cinebooking-navigation-drawer">{open?"✕":"☰"}</button>
        </div>
      </div>
    </header>
    {drawer}
  </>;
}
