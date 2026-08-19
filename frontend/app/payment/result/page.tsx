"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { PaymentCheckout } from "@/lib/types";

const BASE=process.env.NEXT_PUBLIC_API_URL||"/api";

type ReturnResult={signatureValid:boolean;provider:string;paymentId?:string;bookingId?:string;paymentStatus?:string;bookingStatus?:string;providerCode?:string;message:string};

function ResultInner(){
 const q=useSearchParams(); const [state,setState]=useState("Đang xác minh kết quả thanh toán..."); const [paymentId,setPaymentId]=useState<string|undefined>();
 useEffect(()=>{let active=true;(async()=>{try{
   const params=new URLSearchParams(q.toString()); let body:ReturnResult;
   if(params.has("vnp_TxnRef")){
     const r=await fetch(`${BASE}/payments/vnpay/return?${params.toString()}`,{cache:"no-store"}); body=await r.json();
   }else if(params.has("partnerCode")&&params.has("orderId")){
     const obj=Object.fromEntries(params.entries()) as Record<string,string>;
     const r=await fetch(`${BASE}/payments/momo/return`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(obj),cache:"no-store"}); body=await r.json();
   }else{if(active)setState("Không có tham số cổng thanh toán. Hãy kiểm tra trạng thái giao dịch trong Lịch sử thanh toán.");return;}
   if(!active)return;
   if(!body.signatureValid){setState(`${body.provider||"Gateway"}: kết quả redirect không hợp lệ. Trạng thái thanh toán không được thay đổi từ trình duyệt.`);return;}
   setPaymentId(body.paymentId);
   if(!body.paymentId){setState(`${body.provider}: không tìm thấy payment tương ứng.`);return;}
   setState(`${body.provider}: redirect hợp lệ. Đang chờ xác nhận server-to-server...`);
   for(let i=0;i<10&&active;i++){
     try{
       const p=await api<PaymentCheckout>(`/payments/${body.paymentId}/checkout`);
       if(!active)return;
       if(p.status==="SUCCESS"){setState("Thanh toán thành công. Vé đã được xác nhận.");return;}
       if(p.status==="REVIEW"){setState("Cổng thanh toán báo thành công nhưng booking cần đối soát thủ công. Vui lòng không thanh toán lại.");return;}
       if(["FAILED","EXPIRED","REFUNDED"].includes(p.status)){setState(`Thanh toán hiện ở trạng thái ${p.status}.`);return;}
     }catch{}
     await new Promise(r=>setTimeout(r,1500));
   }
   if(active)setState("Kết quả redirect đã được xác minh, nhưng server chưa nhận IPN. Bạn có thể xem Lịch sử thanh toán hoặc chờ đối soát.");
 }catch(e){if(active)setState((e as Error).message)}})();return()=>{active=false}},[q]);
 return <div className="mx-auto max-w-xl card p-8 text-center"><div className="text-5xl">💳</div><h1 className="mt-4 text-3xl font-bold">Kết quả thanh toán</h1><p className="mt-3 text-slate-300">{state}</p><p className="mt-2 text-sm text-slate-500">Redirect chỉ dùng để hiển thị kết quả. Trạng thái cuối cùng được cập nhật bởi IPN server-to-server hoặc đối soát gateway.</p>{paymentId&&<div className="mt-3 break-all text-xs text-slate-500">Payment: {paymentId}</div>}<div className="mt-6 flex flex-wrap justify-center gap-3"><Link href="/bookings" className="btn btn-primary">Xem vé của tôi</Link><Link href="/payments" className="btn btn-secondary">Lịch sử thanh toán</Link></div></div>
}
export default function Result(){return <Suspense fallback={<div>Đang tải...</div>}><ResultInner/></Suspense>}
