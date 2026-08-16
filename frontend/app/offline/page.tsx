import Link from "next/link";

export default function OfflinePage() {
  return <div className="mx-auto max-w-2xl card p-7 text-center">
    <div className="text-5xl">📴</div>
    <p className="section-kicker mt-4">PWA · OFFLINE</p>
    <h1 className="text-3xl font-black">Bạn đang không có kết nối mạng</h1>
    <p className="mx-auto mt-3 max-w-xl text-slate-400">Các thao tác cần máy chủ như đặt ghế, thanh toán và check-in vẫn cần Internet. Vé đã lưu trên thiết bị có thể mở ngay cả khi mất mạng.</p>
    <div className="mt-6 flex flex-wrap justify-center gap-3">
      <Link href="/offline-tickets" className="btn btn-primary">🎟 Mở vé offline</Link>
      <Link href="/" className="btn btn-secondary">Thử lại trang chủ</Link>
    </div>
  </div>;
}
