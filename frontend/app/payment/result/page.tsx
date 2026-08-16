"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

const BASE=process.env.NEXT_PUBLIC_API_URL||"/api";

function ResultInner(){
 const q=useSearchParams(); const [state,setState]=useState("Đang xác minh kết quả thanh toán...");
 useEffect(()=>{(async()=>{try{
   const params=new URLSearchParams(q.toString());
   if(params.has("vnp_TxnRef")){
     const r=await fetch(`${BASE}/payments/vnpay/return?${params.toString()}`,{cache:"no-store"});
     const body=await r.json(); setState(body.RspCode==="00"||body.RspCode==="02"?"VNPay đã được ghi nhận.":`VNPay: ${body.Message||"không thành công"}`); return;
   }
   if(params.has("partnerCode")&&params.has("orderId")){
     const obj = Object.fromEntries(params.entries()) as Record<string,string>;
     const r=await fetch(`${BASE}/payments/momo/ipn`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(obj)});
     const body=await r.json(); setState(Number(body.resultCode)===0?"MoMo đã được ghi nhận.":`MoMo: ${body.message||"không thành công"}`); return;
   }
   setState("Không có tham số cổng thanh toán. Nếu IPN server-to-server đã chạy, trạng thái booking vẫn được cập nhật.");
 }catch(e){setState((e as Error).message)}})()},[q]);
 return <div className="mx-auto max-w-xl card p-8 text-center"><div className="text-5xl">💳</div><h1 className="mt-4 text-3xl font-bold">Kết quả thanh toán</h1><p className="mt-3 text-slate-300">{state}</p><p className="mt-2 text-sm text-slate-500">Nguồn chân lý cuối cùng vẫn là trạng thái payment/booking phía backend.</p><Link href="/bookings" className="btn btn-primary mt-6">Xem vé của tôi</Link></div>
}
export default function Result(){return <Suspense fallback={<div>Đang tải...</div>}><ResultInner/></Suspense>}
