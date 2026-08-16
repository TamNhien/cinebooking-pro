"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { Suspense, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { PaymentCheckout } from "@/lib/types";

function Inner(){
  const q=useSearchParams(); const paymentId=q.get("paymentId")||""; const [payment,setPayment]=useState<PaymentCheckout|null>(null); const [err,setErr]=useState("");
  useEffect(()=>{if(!paymentId){setErr("Thiếu paymentId");return;}let active=true;const load=()=>api<PaymentCheckout>(`/payments/${paymentId}/checkout`).then(p=>{if(!active)return;setPayment(p);if(p.status==="SUCCESS")location.href="/bookings"}).catch(e=>active&&setErr(e.message));load();const timer=setInterval(load,3000);return()=>{active=false;clearInterval(timer)};},[paymentId]);
  return <div className="mx-auto max-w-xl card p-8 text-center"><div className="text-sm font-bold uppercase tracking-widest text-fuchsia-300">MoMo QR</div><h1 className="mt-2 text-3xl font-bold">Quét mã để thanh toán</h1><p className="mt-2 text-sm text-slate-400">Mở ứng dụng MoMo, chọn Quét mã và quét QR bên dưới.</p>
  {err&&<p className="mt-5 text-red-300">{err}</p>}
  {payment&&<div className="mt-7 space-y-5">{payment.qrData?<div className="mx-auto w-fit rounded-2xl bg-white p-5"><QRCodeSVG value={payment.qrData} size={260} level="M"/></div>:<div className="rounded-xl bg-amber-950/40 p-4 text-amber-200">MoMo không trả về qrCodeUrl cho tài khoản này. Hãy dùng nút mở trang thanh toán.</div>}
  <div className="flex flex-wrap justify-center gap-3">{payment.deeplink&&<a className="btn btn-primary" href={payment.deeplink}>Mở ứng dụng MoMo</a>}{payment.paymentUrl&&<a className="btn btn-secondary" href={payment.paymentUrl}>Mở trang thanh toán</a>}</div>
  <p className="text-xs text-slate-500">Sau khi thanh toán, trạng thái booking sẽ được cập nhật qua IPN/redirect từ MoMo.</p></div>}
  <Link href="/bookings" className="mt-6 inline-block text-sm text-rose-400">Xem vé của tôi</Link></div>
}
export default function QrPayment(){return <Suspense fallback={<div>Đang tải...</div>}><Inner/></Suspense>}
