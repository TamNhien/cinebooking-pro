"use client";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";

export default function SiteFooter(){
  const {language}=useLanguage();
  const en=language==="en";
  return <footer className="site-footer">
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-4 md:px-6">
      <div><div className="text-xl font-bold">🎬 CineBooking <span className="text-rose-500">Pro</span></div><p className="mt-3 text-sm leading-6 text-slate-400">{en?"Multi-cinema movie booking with realtime seat selection and electronic QR tickets.":"Nền tảng đặt vé điện ảnh đa rạp với chọn ghế realtime và vé QR điện tử."}</p></div>
      <div><h3>{en?"Explore":"Khám phá"}</h3><Link href="/movies">{en?"Movies":"Phim"}</Link><Link href="/cinemas">{en?"Cinemas & showtimes":"Rạp & lịch chiếu"}</Link><Link href="/promotions">{en?"Promotions":"Ưu đãi"}</Link></div>
      <div><h3>{en?"Customer":"Khách hàng"}</h3><Link href="/bookings">{en?"My tickets":"Vé của tôi"}</Link><Link href="/profile">{en?"Account":"Tài khoản"}</Link><Link href="/forgot-password">{en?"Forgot password":"Quên mật khẩu"}</Link></div>
      <div><h3>{en?"Information":"Thông tin"}</h3><p>{en?"Demo hotline: 1900 0000":"Hotline demo: 1900 0000"}</p><p>Email: support@cinebooking.local</p><p>{en?"Support 08:00–22:00":"Hỗ trợ 08:00–22:00"}</p></div>
    </div>
    <div className="border-t border-slate-800/80 py-4 text-center text-xs text-slate-500">© 2026 CineBooking Pro. {en?"Cinema booking system project.":"Đồ án hệ thống đặt vé xem phim."}</div>
  </footer>
}
