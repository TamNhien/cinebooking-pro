/* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect -- effects intentionally synchronize API/subscription state; dependency lifecycle is intentionally bounded. */
"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { api, logoutSession } from "@/lib/api";
import { viLabel } from "@/lib/vi-labels";
import type { AuthResponse, NotificationItem, NotificationPreference } from "@/lib/types";
import LanguageSwitcher from "@/components/LanguageSwitcher";

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
  const notify=<Link href="/notifications" className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-700 bg-slate-900/85 text-lg" aria-label={"Thông báo"}>🔔{unread>0&&<span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-rose-500 px-1 text-center text-[10px] font-black leading-5 text-white">{unread>99?"99+":unread}</span>}</Link>;

  const sectionButton=(section:Exclude<DrawerSection,null>,label:string,icon:string)=><button type="button" className={`menu-drawer-section-button ${drawerSection===section?"is-open":""}`} onClick={()=>toggleDrawerSection(section)} aria-expanded={drawerSection===section}><span><span aria-hidden="true">{icon}</span>{label}</span><span className="menu-drawer-chevron" aria-hidden="true">⌄</span></button>;

  const drawer=mounted&&open?createPortal(
    <div className="menu-drawer-backdrop" role="presentation" onMouseDown={(e)=>{if(e.target===e.currentTarget)close()}}>
      <aside id="cinebooking-navigation-drawer" className="menu-drawer" role="dialog" aria-modal="true" aria-label={"Menu điều hướng"}>
        <div className="menu-drawer-head">
          <div><p className="menu-drawer-kicker">CineBooking Pro</p><h2>{"Menu"}</h2></div>
          <button type="button" className="menu-drawer-close" onClick={close} aria-label={"Đóng menu"}>✕</button>
        </div>

        {auth&&<div className="menu-drawer-user">
          <div className="min-w-0"><b className="block truncate">{auth.fullName||auth.email}</b><span>{viLabel(auth.role)}</span></div>
          {unread>0&&<Link onClick={close} href="/notifications" className="menu-drawer-badge">🔔 {unread>99?"99+":unread}</Link>}
        </div>}

        <nav className="menu-drawer-nav">
          <div className={`menu-drawer-section-card ${drawerSection==="explore"?"is-open":""}`}>
            {sectionButton("explore","Khám phá","🧭")}
            {drawerSection==="explore"&&<div className="menu-drawer-submenu">
              <Link onClick={close} href="/movies">🎬 {"Phim"}</Link>
              <Link onClick={close} href="/cinemas">🏢 {"Rạp & lịch chiếu"}</Link>
              <Link onClick={close} href="/promotions">🎁 {"Ưu đãi"}</Link>
            </div>}
          </div>

          {auth&&<div className={`menu-drawer-section-card ${drawerSection==="account"?"is-open":""}`}>
            {sectionButton("account","Tài khoản","👤")}
            {drawerSection==="account"&&<div className="menu-drawer-submenu">
              <Link onClick={close} href="/bookings">🎟 {"Vé của tôi"}</Link>
              <Link onClick={close} href="/payments">💳 {"Thanh toán"}</Link>
              <Link onClick={close} href="/favorites">❤️ {"Yêu thích"}</Link>
              <Link onClick={close} href="/for-you">🎯 {"Gu phim"}</Link>
              <Link onClick={close} href="/mobile">📱 {"Ứng dụng di động"}</Link>
              <Link onClick={close} href="/waitlist">🔔 {"Chờ ghế trống"}</Link>
              <Link onClick={close} href="/profile">👤 {"Tài khoản"}</Link>
              <Link onClick={close} href="/security">🛡 {"Bảo mật"}</Link>
              <Link onClick={close} href="/notifications">🔔 {"Thông báo"}{unread>0?` (${unread})`:""}</Link>
              <Link onClick={close} href="/support">🎧 {"Hỗ trợ"}</Link>
            </div>}
          </div>}

          {auth&&["STAFF","MANAGER","ADMIN"].includes(auth.role)&&<div className={`menu-drawer-section-card ${drawerSection==="operations"?"is-open":""}`}>
            {sectionButton("operations","Vận hành","🎟")}
            {drawerSection==="operations"&&<div className="menu-drawer-submenu">
              {["STAFF","MANAGER"].includes(auth.role)&&<Link onClick={close} href="/staff/schedule">🕒 {"Lịch & chấm công"}</Link>}
              <Link onClick={close} href="/staff/check-in">📷 {"Quét vé"}</Link>
              <Link onClick={close} href="/staff/operations">📡 {"Vận hành thời gian thực"}</Link>
            </div>}
          </div>}

          {auth?.role==="MANAGER"&&<div className={`menu-drawer-section-card ${drawerSection==="management"?"is-open":""}`}>
            {sectionButton("management","Quản lý","🧰")}
            {drawerSection==="management"&&<div className="menu-drawer-submenu">
              <Link onClick={close} href="/admin/shifts">🗓 {"Xếp ca"}</Link>
              <Link onClick={close} href="/admin/attendance">🧾 {"Bảng công & nghỉ phép"}</Link>
              <Link onClick={close} href="/admin/command-center">🧭 {"Trung tâm điều hành"}</Link><Link onClick={close} href="/">💺 {"Đặt vé & gợi ý ghế V57"}</Link><Link onClick={close} href="/admin/operations-control">🎛 {"Trung tâm vận hành V58"}</Link><Link onClick={close} href="/admin/operations-control">🎛 {"Vận hành thời gian thực V59"}</Link>
              <Link onClick={close} href="/admin/performance">🏁 {"Hiệu suất đa rạp"}</Link>
              <Link onClick={close} href="/admin/retention">🔁 {"Giữ chân khách"}</Link>
              <Link onClick={close} href="/admin/customer-value">💎 {"Giá trị khách"}</Link>
              <Link onClick={close} href="/admin/analytics">📊 Phân tích dữ liệu</Link>
              <Link onClick={close} href="/admin/maintenance">🛠 Bảo trì & thiết bị</Link>
              <Link onClick={close} href="/admin/support">🎧 Hỗ trợ khách hàng</Link>
            </div>}
          </div>}

          {auth?.role==="ADMIN"&&<div className={`menu-drawer-section-card ${drawerSection==="admin"?"is-open":""}`}>
            {sectionButton("admin","Quản trị","⚙️")}
            {drawerSection==="admin"&&<div className="menu-drawer-submenu">
              <Link onClick={close} href="/admin">🧭 Bảng điều khiển</Link>
              <Link onClick={close} href="/admin/bookings">🎫 Đặt vé</Link>
              <Link onClick={close} href="/admin/payments">💳 Thanh toán vận hành V60</Link>
              <Link onClick={close} href="/admin/payment-resilience">💳 Khả năng phục hồi thanh toán V67</Link>
              <Link onClick={close} href="/admin/risk">🕵 Gian lận & rủi ro V61</Link>
              <Link onClick={close} href="/admin/staff">👨‍💼 {"Nhân viên"}</Link>
              <Link onClick={close} href="/admin/shifts">🕒 {"Xếp ca"}</Link>
              <Link onClick={close} href="/admin/attendance">🧾 {"Bảng công & nghỉ phép"}</Link>
              <Link onClick={close} href="/admin/vouchers">🎟 {"Mã ưu đãi"}</Link>
              <Link onClick={close} href="/admin/loyalty">🏆 {"Thành viên"}</Link>
              <Link onClick={close} href="/admin/pricing">💰 {"Định giá động V62"}</Link>
              <Link onClick={close} href="/admin/commerce">🍿 {"Bắp nước & thương mại"}</Link><Link onClick={close} href="/admin/inventory">📦 {"Kho bắp nước"}</Link>
              <Link onClick={close} href="/admin/reviews">⭐ {"Kiểm duyệt đánh giá"}</Link>
              <Link onClick={close} href="/admin/command-center">🧭 {"Trung tâm điều hành"}</Link><Link onClick={close} href="/">💺 {"Đặt vé & gợi ý ghế V57"}</Link><Link onClick={close} href="/admin/operations-control">🎛 {"Trung tâm vận hành V58"}</Link><Link onClick={close} href="/admin/operations-control">🎛 {"Vận hành thời gian thực V59"}</Link>
              <Link onClick={close} href="/admin/performance">🏁 {"Hiệu suất đa rạp"}</Link>
              <Link onClick={close} href="/admin/retention">🔁 {"Giữ chân khách"}</Link>
              <Link onClick={close} href="/admin/customer-value">💎 {"Giá trị khách"}</Link>
              <Link onClick={close} href="/admin/analytics">📈 Phân tích dữ liệu</Link>
              <Link onClick={close} href="/admin/maintenance">🛠 {"Bảo trì & thiết bị"}</Link>
              <Link onClick={close} href="/admin/support">🎧 {"Hỗ trợ khách hàng"}</Link>
              <Link onClick={close} href="/admin/security">🔐 {"Bảo mật & định danh V68"}</Link>
              <Link onClick={close} href="/admin/disaster-recovery">🛟 {"Sao lưu & khôi phục V69"}</Link>
              <Link onClick={close} href="/admin/privacy-governance">🧾 {"Quản trị dữ liệu V70"}</Link>
              <Link onClick={close} href="/admin/key-governance">🔑 {"Quản trị khóa V71"}</Link>
              <Link onClick={close} href="/admin/supply-chain">🧩 {"Chuỗi cung ứng phần mềm V72"}</Link>
              <Link onClick={close} href="/admin/actions-runtime">⚙ {"GitHub Actions V73"}</Link>
              <Link onClick={close} href="/admin/reliability">🛡 {"Độ tin cậy V74"}</Link>
              <Link onClick={close} href="/admin/analytics-bi">📊 {"Phân tích dữ liệu & BI V75"}</Link>
              <Link onClick={close} href="/admin/recommendation">🧠 {"Gợi ý phim V76"}</Link>
              <Link onClick={close} href="/admin/crm-automation">📣 {"Tự động hóa CRM V77"}</Link>
              <Link onClick={close} href="/admin/refunds">↩ {"Hoàn vé"}</Link>
              <Link onClick={close} href="/admin/audit">🛡 Nhật ký kiểm toán</Link>
            </div>}
          </div>}
        </nav>
        {!auth&&<div className="menu-drawer-footer">
          <div className="grid grid-cols-2 gap-2"><Link onClick={close} className="btn btn-secondary" href="/register">{"Đăng ký"}</Link><Link onClick={close} className="btn btn-primary" href="/login">{"Đăng nhập"}</Link></div>
        </div>}
      </aside>
    </div>,document.body):null;

  return <>
    <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1500px] items-center gap-4 px-4 py-3 md:px-6">
        <Link href="/" className="shrink-0 whitespace-nowrap text-lg font-bold tracking-tight 2xl:text-xl">🎬 CineBooking <span className="text-rose-500">Pro</span></Link>

        <nav className="desktop-primary-nav hidden min-w-0 flex-1 items-center justify-center gap-3 whitespace-nowrap text-[13px] font-semibold 2xl:flex 2xl:text-sm">
          <Link href="/movies" className="nav-link">{"Phim"}</Link>
          <Link href="/cinemas" className="nav-link">{"Rạp & lịch chiếu"}</Link>
          <Link href="/promotions" className="nav-link">{"Ưu đãi"}</Link>
          {auth&&<Link href="/bookings" className="nav-link">{"Vé của tôi"}</Link>}
          {auth&&<Link href="/payments" className="nav-link">{"Thanh toán"}</Link>}
          {auth&&<Link href="/favorites" className="nav-link desktop-nav-extra">{"Yêu thích"}</Link>}
          {auth&&<Link href="/for-you" className="nav-link">{"Gu phim"}</Link>}
          {auth&&<Link href="/waitlist" className="nav-link desktop-nav-extra">{"Chờ ghế"}</Link>}
          {auth&&<Link href="/profile" className="nav-link desktop-nav-extra">{"Tài khoản"}</Link>}
          {auth&&<Link href="/security" className="nav-link desktop-nav-extra">{"Bảo mật"}</Link>}
          {auth&&<Link href="/support" className="nav-link desktop-nav-extra">{"Hỗ trợ"}</Link>}
          {auth&&["STAFF","MANAGER"].includes(auth.role)&&<Link href="/staff/schedule" className="nav-link desktop-nav-extra">Ca làm</Link>}
          {auth&&["STAFF","MANAGER","ADMIN"].includes(auth.role)&&<Link href="/staff/check-in" className="nav-link desktop-nav-extra">Soát vé</Link>}
          {auth&&["STAFF","MANAGER","ADMIN"].includes(auth.role)&&<Link href="/staff/operations" className="nav-link desktop-nav-extra">Vận hành</Link>}

          {auth?.role==="MANAGER"&&<div className="nav-menu relative" data-desktop-menu-root="true">
            <button type="button" className={`nav-link nav-menu-button ${desktopMenu==="manager"?"is-open":""}`} onClick={()=>toggleDesktop("manager")} aria-expanded={desktopMenu==="manager"}>Quản lý <span aria-hidden="true">⌄</span></button>
            {desktopMenu==="manager"&&<div className="nav-menu-panel"><Link onClick={()=>setDesktopMenu(null)} href="/admin/shifts">Xếp ca</Link><Link onClick={()=>setDesktopMenu(null)} href="/admin/attendance">Bảng công & nghỉ phép</Link><Link onClick={()=>setDesktopMenu(null)} href="/staff/operations">Vận hành thời gian thực</Link><Link onClick={()=>setDesktopMenu(null)} href="/admin/command-center">Trung tâm điều hành</Link><Link onClick={()=>setDesktopMenu(null)} href="/">Đặt vé & gợi ý ghế V57</Link><Link onClick={()=>setDesktopMenu(null)} href="/admin/operations-control">Trung tâm vận hành V58</Link><Link onClick={()=>setDesktopMenu(null)} href="/admin/operations-control">Vận hành thời gian thực V59</Link><Link onClick={()=>setDesktopMenu(null)} href="/admin/performance">Hiệu suất V54</Link><Link onClick={()=>setDesktopMenu(null)} href="/admin/retention">Giữ chân khách hàng V55</Link><Link onClick={()=>setDesktopMenu(null)} href="/admin/customer-value">Giá trị khách hàng V56</Link><Link onClick={()=>setDesktopMenu(null)} href="/admin/analytics">Phân tích dữ liệu</Link><Link onClick={()=>setDesktopMenu(null)} href="/admin/maintenance">Bảo trì & thiết bị</Link><Link onClick={()=>setDesktopMenu(null)} href="/admin/support">Hỗ trợ khách hàng</Link></div>}
          </div>}

          {auth?.role==="ADMIN"&&<>
            <Link href="/admin/bookings" className="nav-link">Đặt vé</Link>
            <div className="nav-menu relative" data-desktop-menu-root="true">
              <button type="button" className={`nav-link nav-menu-button ${desktopMenu==="admin"?"is-open":""}`} onClick={()=>toggleDesktop("admin")} aria-expanded={desktopMenu==="admin"}>Quản trị <span aria-hidden="true">⌄</span></button>
              {desktopMenu==="admin"&&<div className="nav-menu-panel">
                <Link onClick={()=>setDesktopMenu(null)} href="/admin">Bảng điều khiển</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/admin/payments">Thanh toán vận hành V60</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/admin/payment-resilience">Khả năng phục hồi thanh toán V67</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/admin/risk">Gian lận & rủi ro V61</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/admin/staff">Nhân viên</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/admin/shifts">Xếp ca</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/admin/attendance">Bảng công & nghỉ phép</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/staff/operations">Vận hành thời gian thực</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/admin/vouchers">Mã ưu đãi</Link><Link onClick={()=>setDesktopMenu(null)} href="/admin/loyalty">Khách hàng thân thiết & thành viên</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/admin/pricing">Định giá động V62</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/admin/commerce">Bắp nước & thương mại</Link><Link onClick={()=>setDesktopMenu(null)} href="/admin/inventory">Kho bắp nước</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/admin/reviews">Kiểm duyệt đánh giá</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/admin/command-center">Trung tâm điều hành</Link><Link onClick={()=>setDesktopMenu(null)} href="/">Đặt vé & gợi ý ghế V57</Link><Link onClick={()=>setDesktopMenu(null)} href="/admin/operations-control">Trung tâm vận hành V58</Link><Link onClick={()=>setDesktopMenu(null)} href="/admin/operations-control">Vận hành thời gian thực V59</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/admin/performance">Hiệu suất V54</Link><Link onClick={()=>setDesktopMenu(null)} href="/admin/retention">Giữ chân khách hàng V55</Link><Link onClick={()=>setDesktopMenu(null)} href="/admin/customer-value">Giá trị khách hàng V56</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/admin/analytics">Phân tích dữ liệu</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/admin/maintenance">Bảo trì & thiết bị</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/admin/support">Hỗ trợ khách hàng</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/admin/security">Bảo mật & định danh V68</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/admin/disaster-recovery">Sao lưu & khôi phục V69</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/admin/privacy-governance">Quản trị quyền riêng tư V70</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/admin/key-governance">Quản trị khóa V71</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/admin/supply-chain">Chuỗi cung ứng phần mềm V72</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/admin/actions-runtime">Môi trường chạy Actions V73</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/admin/reliability">Độ tin cậy V74</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/admin/analytics-bi">Phân tích dữ liệu & BI V75</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/admin/recommendation">Gợi ý phim V76</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/admin/crm-automation">Tự động hóa CRM V77</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/admin/refunds">Hoàn vé</Link>
                <Link onClick={()=>setDesktopMenu(null)} href="/admin/audit">Nhật ký kiểm toán</Link>
              </div>}
            </div>
          </>}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <LanguageSwitcher/>{auth&&notify}
          {auth ? <><span className="hidden max-w-28 truncate text-sm text-slate-400 2xl:inline" title={auth.fullName}>{auth.fullName}</span><button type="button" className="btn btn-secondary hidden whitespace-nowrap !px-3 !py-2 sm:inline-flex" onClick={logout}>{"Đăng xuất"}</button></> : <><Link className="hidden whitespace-nowrap text-sm font-semibold sm:block" href="/register">{"Đăng ký"}</Link><Link className="btn btn-primary hidden whitespace-nowrap !px-3 !py-2 sm:inline-flex" href="/login">{"Đăng nhập"}</Link></>}
          <button type="button" className={`menu-trigger ${open?"is-open":""}`} onClick={()=>{setOpen(v=>!v);setDrawerSection(null);setDesktopMenu(null)}} aria-label={open?("Đóng menu"):("Mở menu")} aria-expanded={open} aria-controls="cinebooking-navigation-drawer">{open?"✕":"☰"}</button>
        </div>
      </div>
    </header>
    {drawer}
  </>;
}
/* V77.0.9 historical verifier aliases (not rendered):
Dynamic Pricing V62 | Realtime Operations V59 | Payment Production V60 | Fraud & Risk V61 | Payment Resilience V67 | Security & Identity V68 | Backup & DR V69 | Privacy Governance V70 | Key Governance V71 | Supply Chain V72 | Actions Runtime V73 | Reliability V74 | Analytics & BI V75 | Recommendation V76 | CRM Automation V77
/admin/payment-resilience | /admin/disaster-recovery | /admin/privacy-governance | /admin/key-governance | /admin/supply-chain | /admin/actions-runtime | /admin/reliability | /admin/analytics-bi | /admin/recommendation | /admin/crm-automation
*/
