"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { api, logoutSession } from "@/lib/api";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLanguage } from "@/components/LanguageProvider";
export default function Header() {
    const [auth, setA] = useState(null);
    const [open, setOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [unread, setUnread] = useState(0);
    const [desktopMenu, setDesktopMenu] = useState(null);
    const [drawerSection, setDrawerSection] = useState(null);
    const pathname = usePathname();
    const { language } = useLanguage();
    const en = language === "en";
    useEffect(() => { setMounted(true); }, []);
    useEffect(() => { const sync = () => setA(getAuth()); sync(); window.addEventListener("auth-changed", sync); return () => window.removeEventListener("auth-changed", sync); }, []);
    useEffect(() => {
        if (!auth) {
            setUnread(0);
            return;
        }
        let active = true;
        const refresh = () => api("/notifications/summary").then(r => { if (active)
            setUnread(r.unreadCount); }).catch(() => { });
        refresh();
        const t = setInterval(refresh, 30000);
        return () => { active = false; clearInterval(t); };
    }, [auth?.userId]);
    // V22: browser notifications without storing a push credential. This deliberately
    // works while CineBooking is open; true background Web Push can be added later
    // with VAPID without changing the preference model/API.
    useEffect(() => {
        if (!auth || typeof window === "undefined" || typeof window.Notification === "undefined")
            return;
        let active = true;
        const key = `cinebooking-browser-notification-since:${auth.userId}`;
        const poll = async () => {
            try {
                const pref = await api("/notifications/preferences");
                if (!active)
                    return;
                if (!pref.browserEnabled || window.Notification.permission !== "granted") {
                    localStorage.setItem(key, new Date().toISOString());
                    return;
                }
                const since = localStorage.getItem(key) || new Date().toISOString();
                const feed = await api(`/notifications/browser-feed?after=${encodeURIComponent(since)}`);
                if (!active)
                    return;
                for (const n of feed) {
                    const toast = new window.Notification(n.title, { body: n.message, tag: `cinebooking-${n.id}` });
                    toast.onclick = () => { window.focus(); if (n.linkUrl)
                        location.href = n.linkUrl; toast.close(); };
                }
                const newest = feed.length ? new Date(feed[feed.length - 1].createdAt).getTime() + 1 : Date.now();
                localStorage.setItem(key, new Date(newest).toISOString());
            }
            catch { }
        };
        poll();
        const t = setInterval(poll, 30000);
        const changed = () => poll();
        window.addEventListener("notification-preferences-changed", changed);
        return () => { active = false; clearInterval(t); window.removeEventListener("notification-preferences-changed", changed); };
    }, [auth?.userId]);
    // Any navigation change closes every transient menu.
    useEffect(() => { setOpen(false); setDesktopMenu(null); setDrawerSection(null); }, [pathname]);
    // Desktop dropdowns are click-only and close when clicking anywhere else.
    useEffect(() => {
        if (!desktopMenu)
            return;
        const onPointerDown = (event) => {
            const target = event.target;
            if (!target?.closest("[data-desktop-menu-root='true']"))
                setDesktopMenu(null);
        };
        const onKey = (event) => { if (event.key === "Escape")
            setDesktopMenu(null); };
        document.addEventListener("pointerdown", onPointerDown);
        window.addEventListener("keydown", onKey);
        return () => { document.removeEventListener("pointerdown", onPointerDown); window.removeEventListener("keydown", onKey); };
    }, [desktopMenu]);
    useEffect(() => {
        if (!open)
            return;
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const onKey = (event) => { if (event.key === "Escape")
            setOpen(false); };
        window.addEventListener("keydown", onKey);
        return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", onKey); };
    }, [open]);
    const logout = async () => { await logoutSession(); setOpen(false); setDesktopMenu(null); location.href = "/"; };
    const close = () => { setOpen(false); setDrawerSection(null); };
    const toggleDrawerSection = (section) => setDrawerSection(current => current === section ? null : section);
    const toggleDesktop = (menu) => setDesktopMenu(current => current === menu ? null : menu);
    const notify = _jsxs(Link, { href: "/notifications", className: "relative grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-700 bg-slate-900/85 text-lg", "aria-label": en ? "Notifications" : "Thông báo", children: ["\uD83D\uDD14", unread > 0 && _jsx("span", { className: "absolute -right-1 -top-1 min-w-5 rounded-full bg-rose-500 px-1 text-center text-[10px] font-black leading-5 text-white", children: unread > 99 ? "99+" : unread })] });
    const sectionButton = (section, label, icon) => _jsxs("button", { type: "button", className: `menu-drawer-section-button ${drawerSection === section ? "is-open" : ""}`, onClick: () => toggleDrawerSection(section), "aria-expanded": drawerSection === section, children: [_jsxs("span", { children: [_jsx("span", { "aria-hidden": "true", children: icon }), label] }), _jsx("span", { className: "menu-drawer-chevron", "aria-hidden": "true", children: "\u2304" })] });
    const drawer = mounted && open ? createPortal(_jsx("div", { className: "menu-drawer-backdrop", role: "presentation", onMouseDown: (e) => { if (e.target === e.currentTarget)
            close(); }, children: _jsxs("aside", { id: "cinebooking-navigation-drawer", className: "menu-drawer", role: "dialog", "aria-modal": "true", "aria-label": en ? "Navigation menu" : "Menu điều hướng", children: [_jsxs("div", { className: "menu-drawer-head", children: [_jsxs("div", { children: [_jsx("p", { className: "menu-drawer-kicker", children: "CineBooking Pro" }), _jsx("h2", { children: en ? "Navigation" : "Menu" })] }), _jsx("button", { type: "button", className: "menu-drawer-close", onClick: close, "aria-label": en ? "Close menu" : "Đóng menu", children: "\u2715" })] }), auth && _jsxs("div", { className: "menu-drawer-user", children: [_jsxs("div", { className: "min-w-0", children: [_jsx("b", { className: "block truncate", children: auth.fullName || auth.email }), _jsx("span", { children: auth.role })] }), unread > 0 && _jsxs(Link, { onClick: close, href: "/notifications", className: "menu-drawer-badge", children: ["\uD83D\uDD14 ", unread > 99 ? "99+" : unread] })] }), _jsxs("nav", { className: "menu-drawer-nav", children: [_jsxs("div", { className: `menu-drawer-section-card ${drawerSection === "explore" ? "is-open" : ""}`, children: [sectionButton("explore", en ? "Explore" : "Khám phá", "🧭"), drawerSection === "explore" && _jsxs("div", { className: "menu-drawer-submenu", children: [_jsxs(Link, { onClick: close, href: "/movies", children: ["\uD83C\uDFAC ", en ? "Movies" : "Phim"] }), _jsxs(Link, { onClick: close, href: "/cinemas", children: ["\uD83C\uDFE2 ", en ? "Cinemas & showtimes" : "Rạp & lịch chiếu"] }), _jsxs(Link, { onClick: close, href: "/promotions", children: ["\uD83C\uDF81 ", en ? "Promotions" : "Ưu đãi"] })] })] }), auth && _jsxs("div", { className: `menu-drawer-section-card ${drawerSection === "account" ? "is-open" : ""}`, children: [sectionButton("account", en ? "My account" : "Tài khoản", "👤"), drawerSection === "account" && _jsxs("div", { className: "menu-drawer-submenu", children: [_jsxs(Link, { onClick: close, href: "/bookings", children: ["\uD83C\uDF9F ", en ? "My tickets" : "Vé của tôi"] }), _jsxs(Link, { onClick: close, href: "/favorites", children: ["\u2764\uFE0F ", en ? "Favorites" : "Yêu thích"] }), _jsxs(Link, { onClick: close, href: "/profile", children: ["\uD83D\uDC64 ", en ? "Account" : "Tài khoản"] }), _jsxs(Link, { onClick: close, href: "/notifications", children: ["\uD83D\uDD14 ", en ? "Notifications" : "Thông báo", unread > 0 ? ` (${unread})` : ""] })] })] }), auth && ["STAFF", "MANAGER", "ADMIN"].includes(auth.role) && _jsxs("div", { className: `menu-drawer-section-card ${drawerSection === "operations" ? "is-open" : ""}`, children: [sectionButton("operations", en ? "Operations" : "Vận hành", "🎟"), drawerSection === "operations" && _jsxs("div", { className: "menu-drawer-submenu", children: [["STAFF", "MANAGER"].includes(auth.role) && _jsxs(Link, { onClick: close, href: "/staff/schedule", children: ["\uD83D\uDD52 ", en ? "Shift & attendance" : "Lịch & chấm công"] }), _jsxs(Link, { onClick: close, href: "/staff/check-in", children: ["\uD83D\uDCF7 ", en ? "Ticket check-in" : "Quét vé"] })] })] }), auth?.role === "MANAGER" && _jsxs("div", { className: `menu-drawer-section-card ${drawerSection === "management" ? "is-open" : ""}`, children: [sectionButton("management", en ? "Management" : "Quản lý", "🧰"), drawerSection === "management" && _jsxs("div", { className: "menu-drawer-submenu", children: [_jsxs(Link, { onClick: close, href: "/admin/shifts", children: ["\uD83D\uDDD3 ", en ? "Shift scheduling" : "Xếp ca"] }), _jsxs(Link, { onClick: close, href: "/admin/attendance", children: ["\uD83E\uDDFE ", en ? "Timesheet & leave" : "Bảng công & nghỉ phép"] }), _jsx(Link, { onClick: close, href: "/admin/analytics", children: "\uD83D\uDCCA Analytics" })] })] }), auth?.role === "ADMIN" && _jsxs("div", { className: `menu-drawer-section-card ${drawerSection === "admin" ? "is-open" : ""}`, children: [sectionButton("admin", en ? "Administration" : "Quản trị", "⚙️"), drawerSection === "admin" && _jsxs("div", { className: "menu-drawer-submenu", children: [_jsx(Link, { onClick: close, href: "/admin", children: "\uD83E\uDDED Dashboard" }), _jsx(Link, { onClick: close, href: "/admin/bookings", children: "\uD83C\uDFAB Booking" }), _jsxs(Link, { onClick: close, href: "/admin/staff", children: ["\uD83D\uDC68\u200D\uD83D\uDCBC ", en ? "Staff accounts" : "Nhân viên"] }), _jsxs(Link, { onClick: close, href: "/admin/shifts", children: ["\uD83D\uDD52 ", en ? "Shift scheduling" : "Xếp ca"] }), _jsxs(Link, { onClick: close, href: "/admin/attendance", children: ["\uD83E\uDDFE ", en ? "Timesheet & leave" : "Bảng công & nghỉ phép"] }), _jsxs(Link, { onClick: close, href: "/admin/vouchers", children: ["\uD83C\uDF9F ", en ? "Vouchers" : "Mã ưu đãi"] }), _jsxs(Link, { onClick: close, href: "/admin/pricing", children: ["\uD83D\uDCB0 ", en ? "Dynamic pricing" : "Giá vé động"] }), _jsxs(Link, { onClick: close, href: "/admin/commerce", children: ["\uD83C\uDF7F ", en ? "Food & commerce" : "Bắp nước & thương mại"] }), _jsxs(Link, { onClick: close, href: "/admin/inventory", children: ["\uD83D\uDCE6 ", en ? "Inventory" : "Kho bắp nước"] }), _jsxs(Link, { onClick: close, href: "/admin/reviews", children: ["\u2B50 ", en ? "Review moderation" : "Kiểm duyệt đánh giá"] }), _jsx(Link, { onClick: close, href: "/admin/analytics", children: "\uD83D\uDCC8 Analytics" }), _jsxs(Link, { onClick: close, href: "/admin/refunds", children: ["\u21A9 ", en ? "Refunds" : "Hoàn vé"] }), _jsx(Link, { onClick: close, href: "/admin/audit", children: "\uD83D\uDEE1 Audit log" })] })] })] }), !auth && _jsx("div", { className: "menu-drawer-footer", children: _jsxs("div", { className: "grid grid-cols-2 gap-2", children: [_jsx(Link, { onClick: close, className: "btn btn-secondary", href: "/register", children: en ? "Register" : "Đăng ký" }), _jsx(Link, { onClick: close, className: "btn btn-primary", href: "/login", children: en ? "Sign in" : "Đăng nhập" })] }) })] }) }), document.body) : null;
    return _jsxs(_Fragment, { children: [_jsx("header", { className: "sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl", children: _jsxs("div", { className: "mx-auto flex max-w-[1500px] items-center gap-4 px-4 py-3 md:px-6", children: [_jsxs(Link, { href: "/", className: "shrink-0 whitespace-nowrap text-lg font-bold tracking-tight 2xl:text-xl", children: ["\uD83C\uDFAC CineBooking ", _jsx("span", { className: "text-rose-500", children: "Pro" })] }), _jsxs("nav", { className: "hidden min-w-0 flex-1 items-center justify-center gap-4 whitespace-nowrap text-[13px] font-semibold xl:flex 2xl:gap-5 2xl:text-sm", children: [_jsx(Link, { href: "/movies", className: "nav-link", children: en ? "Movies" : "Phim" }), _jsx(Link, { href: "/cinemas", className: "nav-link", children: en ? "Cinemas & showtimes" : "Rạp & lịch chiếu" }), _jsx(Link, { href: "/promotions", className: "nav-link", children: en ? "Promotions" : "Ưu đãi" }), auth && _jsx(Link, { href: "/bookings", className: "nav-link", children: en ? "My tickets" : "Vé của tôi" }), auth && _jsx(Link, { href: "/favorites", className: "nav-link", children: en ? "Favorites" : "Yêu thích" }), auth && _jsx(Link, { href: "/profile", className: "nav-link", children: en ? "Account" : "Tài khoản" }), auth && ["STAFF", "MANAGER"].includes(auth.role) && _jsx(Link, { href: "/staff/schedule", className: "nav-link", children: "Ca l\u00E0m" }), auth && ["STAFF", "MANAGER", "ADMIN"].includes(auth.role) && _jsx(Link, { href: "/staff/check-in", className: "nav-link", children: "Check-in" }), auth?.role === "MANAGER" && _jsxs("div", { className: "nav-menu relative", "data-desktop-menu-root": "true", children: [_jsxs("button", { type: "button", className: `nav-link nav-menu-button ${desktopMenu === "manager" ? "is-open" : ""}`, onClick: () => toggleDesktop("manager"), "aria-expanded": desktopMenu === "manager", children: ["Qu\u1EA3n l\u00FD ", _jsx("span", { "aria-hidden": "true", children: "\u2304" })] }), desktopMenu === "manager" && _jsxs("div", { className: "nav-menu-panel", children: [_jsx(Link, { onClick: () => setDesktopMenu(null), href: "/admin/shifts", children: "X\u1EBFp ca" }), _jsx(Link, { onClick: () => setDesktopMenu(null), href: "/admin/attendance", children: "B\u1EA3ng c\u00F4ng & ngh\u1EC9 ph\u00E9p" }), _jsx(Link, { onClick: () => setDesktopMenu(null), href: "/admin/analytics", children: "Analytics" })] })] }), auth?.role === "ADMIN" && _jsxs(_Fragment, { children: [_jsx(Link, { href: "/admin/bookings", className: "nav-link", children: "Booking" }), _jsxs("div", { className: "nav-menu relative", "data-desktop-menu-root": "true", children: [_jsxs("button", { type: "button", className: `nav-link nav-menu-button ${desktopMenu === "admin" ? "is-open" : ""}`, onClick: () => toggleDesktop("admin"), "aria-expanded": desktopMenu === "admin", children: ["Qu\u1EA3n tr\u1ECB ", _jsx("span", { "aria-hidden": "true", children: "\u2304" })] }), desktopMenu === "admin" && _jsxs("div", { className: "nav-menu-panel", children: [_jsx(Link, { onClick: () => setDesktopMenu(null), href: "/admin", children: "Dashboard" }), _jsx(Link, { onClick: () => setDesktopMenu(null), href: "/admin/staff", children: "Nh\u00E2n vi\u00EAn" }), _jsx(Link, { onClick: () => setDesktopMenu(null), href: "/admin/shifts", children: "X\u1EBFp ca" }), _jsx(Link, { onClick: () => setDesktopMenu(null), href: "/admin/attendance", children: "B\u1EA3ng c\u00F4ng & ngh\u1EC9 ph\u00E9p" }), _jsx(Link, { onClick: () => setDesktopMenu(null), href: "/admin/vouchers", children: "M\u00E3 \u01B0u \u0111\u00E3i" }), _jsx(Link, { onClick: () => setDesktopMenu(null), href: "/admin/pricing", children: "Gi\u00E1 v\u00E9 \u0111\u1ED9ng" }), _jsx(Link, { onClick: () => setDesktopMenu(null), href: "/admin/commerce", children: "B\u1EAFp n\u01B0\u1EDBc & th\u01B0\u01A1ng m\u1EA1i" }), _jsx(Link, { onClick: () => setDesktopMenu(null), href: "/admin/inventory", children: "Kho b\u1EAFp n\u01B0\u1EDBc" }), _jsx(Link, { onClick: () => setDesktopMenu(null), href: "/admin/reviews", children: "Ki\u1EC3m duy\u1EC7t \u0111\u00E1nh gi\u00E1" }), _jsx(Link, { onClick: () => setDesktopMenu(null), href: "/admin/analytics", children: "Analytics" }), _jsx(Link, { onClick: () => setDesktopMenu(null), href: "/admin/refunds", children: "Ho\u00E0n v\u00E9" }), _jsx(Link, { onClick: () => setDesktopMenu(null), href: "/admin/audit", children: "Audit log" })] })] })] })] }), _jsxs("div", { className: "ml-auto flex shrink-0 items-center gap-2", children: [_jsx(LanguageSwitcher, {}), auth && notify, auth ? _jsxs(_Fragment, { children: [_jsx("span", { className: "hidden max-w-28 truncate text-sm text-slate-400 2xl:inline", title: auth.fullName, children: auth.fullName }), _jsx("button", { type: "button", className: "btn btn-secondary hidden whitespace-nowrap !px-3 !py-2 sm:inline-flex", onClick: logout, children: en ? "Sign out" : "Đăng xuất" })] }) : _jsxs(_Fragment, { children: [_jsx(Link, { className: "hidden whitespace-nowrap text-sm font-semibold sm:block", href: "/register", children: en ? "Register" : "Đăng ký" }), _jsx(Link, { className: "btn btn-primary hidden whitespace-nowrap !px-3 !py-2 sm:inline-flex", href: "/login", children: en ? "Sign in" : "Đăng nhập" })] }), _jsx("button", { type: "button", className: `menu-trigger ${open ? "is-open" : ""}`, onClick: () => { setOpen(v => !v); setDrawerSection(null); setDesktopMenu(null); }, "aria-label": open ? (en ? "Close menu" : "Đóng menu") : (en ? "Open menu" : "Mở menu"), "aria-expanded": open, "aria-controls": "cinebooking-navigation-drawer", children: open ? "✕" : "☰" })] })] }) }), drawer] });
}
