"use client";

import { Client } from "@stomp/stompjs";
import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError, api, currency, dateTime } from "@/lib/api";
import { getAuth } from "@/lib/auth";
import { useLanguage } from "@/components/LanguageProvider";
import type { Booking, ConcessionProduct, PaymentProviderAvailability, PaymentStart, SeatMap, Showtime, UserProfile, VoucherQuote, WaitlistStatus } from "@/lib/types";

export default function BookingPage({params}:{params:Promise<{showtimeId:string}>}){
  const {showtimeId}=use(params);
  const {language}=useLanguage();
  const en=language==="en";
  const [showtime,setShowtime]=useState<Showtime|null>(null);
  const [map,setMap]=useState<SeatMap|null>(null);
  const [products,setProducts]=useState<ConcessionProduct[]>([]);
  const [profile,setProfile]=useState<UserProfile|null>(null);
  const [pendingBooking,setPendingBooking]=useState<Booking|null>(null);
  const [selected,setSelected]=useState<string[]>([]);
  const [addons,setAddons]=useState<Record<string,number>>({});
  const [held,setHeld]=useState(false);
  const [seconds,setSeconds]=useState(0);
  const [provider,setProvider]=useState("MOCK");
  const [providerAvailability,setProviderAvailability]=useState<PaymentProviderAvailability[]>([]);
  const [voucherCode,setVoucherCode]=useState("");
  const [voucher,setVoucher]=useState<VoucherQuote|null>(null);
  const [points,setPoints]=useState(0);
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);
  const [fatalError,setFatalError]=useState("");
  const [waitlist,setWaitlist]=useState<WaitlistStatus|null>(null);
  const [waitlistBusy,setWaitlistBusy]=useState(false);
  const checkoutKeyRef=useRef<string|null>(null);
  const paymentKeysRef=useRef<Record<string,string>>({});
  const auth = typeof window !== "undefined" ? getAuth() : null;

  const load=useCallback(async()=>{
    setFatalError("");
    try {
      // Showtime + seat map are required. Optional commerce/profile failures must not leave the page stuck loading.
      const [s,m]=await Promise.all([
        api<Showtime>(`/showtimes/${showtimeId}`),
        api<SeatMap>(`/showtimes/${showtimeId}/seats`)
      ]);
      setShowtime(s);
      setMap(m);

      api<ConcessionProduct[]>("/commerce/products").then(setProducts).catch(()=>setProducts([]));
      if(getAuth()) api<UserProfile>("/me").then(setProfile).catch(()=>setProfile(null));
    } catch (e) {
      setShowtime(null);
      setMap(null);
      const err=e as Error;
      if(e instanceof ApiError && e.status===404){
        setFatalError(en
          ? "This showtime no longer exists. It may have been deleted or changed by an administrator."
          : "Suất chiếu này không còn tồn tại. Có thể suất chiếu đã bị Admin xoá hoặc thay đổi.");
      } else {
        setFatalError(err.message || (en ? "Could not load this showtime." : "Không thể tải suất chiếu này."));
      }
    } finally {
      setLoading(false);
    }
  },[showtimeId,en]);

  const loadWaitlist=useCallback(async()=>{
    if(!getAuth()){setWaitlist(null);return;}
    try{setWaitlist(await api<WaitlistStatus>(`/waitlist/showtimes/${showtimeId}`));}catch{setWaitlist(null);}
  },[showtimeId]);

  const loadPending=useCallback(async()=>{
    if(!getAuth()){setPendingBooking(null);return;}
    try{setPendingBooking(await api<Booking|null>(`/bookings/pending?showtimeId=${encodeURIComponent(showtimeId)}`));}
    catch{setPendingBooking(null);}
  },[showtimeId]);

  useEffect(()=>{setLoading(true);load();loadPending().catch(()=>{});loadWaitlist().catch(()=>{});},[load,loadPending,loadWaitlist]);
  useEffect(()=>{if(!getAuth()){setProviderAvailability([]);return;}api<PaymentProviderAvailability[]>("/payments/providers").then(setProviderAvailability).catch(()=>setProviderAvailability([]));},[auth?.userId]);
  useEffect(()=>{
    const scheme=location.protocol==="https:"?"wss":"ws";
    const client=new Client({brokerURL:`${scheme}://${location.host}/ws`,reconnectDelay:2000,onConnect:()=>client.subscribe(`/topic/showtimes/${showtimeId}/seats`,()=>load().catch(()=>{}))});
    client.activate(); return()=>{void client.deactivate();};
  },[showtimeId,load]);
  useEffect(()=>{if(seconds<=0)return;const t=setInterval(()=>setSeconds(x=>Math.max(0,x-1)),1000);return()=>clearInterval(t);},[seconds]);
  useEffect(()=>{if(held&&seconds===0){setHeld(false);setSelected([]);load().catch(()=>{});}},[seconds,held,load]);


  const availableSeats=useMemo(()=>map?.seats.filter(s=>s.status==="AVAILABLE").length??0,[map]);
  const soldOut=Boolean(map&&map.seats.length>0&&availableSeats===0&&!map.seats.some(s=>s.heldByMe));

  async function toggleWaitlist(){
    if(!auth){location.href=`/login?returnTo=${encodeURIComponent(`/booking/${showtimeId}`)}&reason=required`;return;}
    setWaitlistBusy(true);setMessage("");
    try{
      if(waitlist?.subscribed){setWaitlist(await api<WaitlistStatus>(`/waitlist/showtimes/${showtimeId}`,{method:"DELETE"}));setMessage(en?"Seat alert cancelled.":"Đã huỷ theo dõi ghế trống.");}
      else{setWaitlist(await api<WaitlistStatus>(`/waitlist/showtimes/${showtimeId}`,{method:"POST"}));setMessage(en?"Seat alert enabled. We will notify you when seats reopen.":"Đã đăng ký chờ. CineBooking sẽ báo khi có ghế trống trở lại.");}
    }catch(e){setMessage((e as Error).message);await load();await loadWaitlist();}
    finally{setWaitlistBusy(false);}
  }

  const selectedSeats=useMemo(()=>map?.seats.filter(s=>selected.includes(s.id))??[],[map,selected]);
  const seatTotal=selectedSeats.reduce((sum,s)=>sum+s.price,0);
  const dynamicTotal=selectedSeats.reduce((sum,s)=>sum+(s.dynamicAdjustment||0),0);
  const addonTotal=products.reduce((sum,p)=>sum+p.price*(addons[p.id]||0),0);
  const gross=seatTotal+addonTotal;
  const voucherDiscount=voucher?.discountAmount||0;
  const afterVoucher=Math.max(0,gross-voucherDiscount);
  const maxPointByOrder=Math.floor(afterVoucher*0.30/100);
  const maxPoints=Math.min(profile?.loyaltyPoints||0,maxPointByOrder);
  const pointDiscount=Math.min(points,maxPoints)*100;
  const previewTotal=Math.max(0,afterVoucher-pointDiscount);

  useEffect(()=>{setVoucher(null);},[gross]);
  useEffect(()=>{if(points>maxPoints)setPoints(maxPoints);},[points,maxPoints]);
  useEffect(()=>{setAddons(current=>{const next={...current};for(const p of products){if(!p.inventoryEnabled)continue;next[p.id]=Math.min(next[p.id]||0,Math.min(10,p.stockAvailable));}return next;});},[products]);

  const rows=useMemo(()=>{
    const grouped=new Map<string,NonNullable<typeof map>["seats"]>();
    map?.seats.forEach(s=>grouped.set(s.rowLabel,[...(grouped.get(s.rowLabel)||[]),s]));
    return [...grouped.entries()].sort(([a],[b])=>a.localeCompare(b,"vi",{numeric:true})).map(([row,seats])=>[row,[...seats].sort((a,b)=>a.seatNumber-b.seatNumber)] as const);
  },[map]);

  function toggle(id:string,status:string,heldByMe:boolean){if(held)return;if(status!=="AVAILABLE"&&!heldByMe)return;setSelected(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id]);}
  function qty(id:string,delta:number){const product=products.find(p=>p.id===id);const cap=product?.inventoryEnabled?Math.min(10,product.stockAvailable):10;setAddons(v=>{const next=Math.max(0,Math.min(cap,(v[id]||0)+delta));return {...v,[id]:next};});}


  function paymentKey(bookingId:string,paymentProvider:string){
    const bucket=`${bookingId}:${paymentProvider}`;
    if(!paymentKeysRef.current[bucket]){
      const suffix=typeof crypto!=="undefined"&&typeof crypto.randomUUID==="function"?crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2)}`;
      paymentKeysRef.current[bucket]=`pay-${bookingId}-${paymentProvider}-${suffix}`;
    }
    return paymentKeysRef.current[bucket];
  }
  function providerReady(value:string){const base=value.startsWith("VNPAY")?"VNPAY":value.startsWith("MOMO")?"MOMO":value;const row=providerAvailability.find(x=>x.provider===base);return row?row.configured:true;}

  async function applyVoucher(){if(!voucherCode.trim())return;if(gross<=0){setVoucher(null);setMessage(en?"Select at least one seat before applying a voucher.":"Hãy chọn ít nhất 1 ghế trước khi áp dụng mã ưu đãi.");return;}setBusy(true);setMessage("");try{const q=await api<VoucherQuote>("/commerce/vouchers/quote",{method:"POST",body:JSON.stringify({code:voucherCode.trim(),orderAmount:gross})});setVoucher(q);setVoucherCode(q.code);}catch(e){setVoucher(null);setMessage((e as Error).message);}finally{setBusy(false);}}
  async function holdSeats(){if(!auth){location.href=`/login?next=${encodeURIComponent(`/booking/${showtimeId}`)}`;return;}if(pendingBooking){setMessage(en?"You already have an unpaid booking for this showtime. Continue payment or cancel it first.":"Bạn đang có đơn chờ thanh toán cho suất này. Hãy tiếp tục thanh toán hoặc huỷ đơn cũ để mở ghế.");return;}if(!selected.length)return;setBusy(true);setMessage("");try{const r=await api<{ttlSeconds:number}>(`/showtimes/${showtimeId}/holds`,{method:"POST",body:JSON.stringify({seatIds:selected})});checkoutKeyRef.current=null;setHeld(true);setSeconds(r.ttlSeconds);await load();}catch(e){setMessage((e as Error).message);await load();}finally{setBusy(false);}}
  async function release(){setBusy(true);try{if(selected.length)await api(`/showtimes/${showtimeId}/holds`,{method:"DELETE",body:JSON.stringify({seatIds:selected})});}catch{}finally{checkoutKeyRef.current=null;setHeld(false);setSeconds(0);setSelected([]);setBusy(false);await load();}}
  async function refreshSeats(){setBusy(true);setMessage("");try{if(held&&selected.length){try{await api(`/showtimes/${showtimeId}/holds`,{method:"DELETE",body:JSON.stringify({seatIds:selected})});}catch{}}checkoutKeyRef.current=null;setHeld(false);setSeconds(0);setSelected([]);await Promise.all([load(),loadPending()]);setMessage(en?"Seat map refreshed. Expired holds/bookings were cleaned up.":"Đã đồng bộ sơ đồ ghế. Các lượt giữ/đơn hết hạn và khóa ghế treo đã được kiểm tra, giải phóng nếu không còn hiệu lực.");}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}
  async function resumePendingPayment(){if(!pendingBooking)return;setBusy(true);setMessage("");try{const payment=await api<PaymentStart>(`/payments/bookings/${pendingBooking.id}/start`,{method:"POST",headers:{"Idempotency-Key":paymentKey(pendingBooking.id,provider)},body:JSON.stringify({provider})});location.href=payment.paymentUrl;}catch(e){setMessage((e as Error).message);await Promise.all([load(),loadPending()]);setBusy(false);}}
  async function cancelPendingBooking(){if(!pendingBooking)return;setBusy(true);setMessage("");try{await api<Booking>(`/bookings/${pendingBooking.id}/cancel`,{method:"POST"});checkoutKeyRef.current=null;setPendingBooking(null);setSelected([]);setHeld(false);setSeconds(0);setVoucher(null);await Promise.all([load(),loadPending()]);setMessage(en?"Unpaid booking cancelled. Its seats are available again.":"Đã huỷ đơn chưa thanh toán và mở lại ghế.");}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}
  async function checkout(){if(!held||!selected.length)return;setBusy(true);setMessage("");let booking:Booking|null=null;try{
      const concessions=(Object.entries(addons) as [string,number][]).filter(([,q])=>q>0).map(([productId,quantity])=>({productId,quantity}));
      const generatedKey=typeof crypto!=="undefined"&&typeof crypto.randomUUID==="function"?`checkout-${crypto.randomUUID()}`:`checkout-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const idempotencyKey=checkoutKeyRef.current||generatedKey;
      checkoutKeyRef.current=idempotencyKey;
      booking=await api<Booking>("/bookings",{method:"POST",headers:{"Idempotency-Key":idempotencyKey},body:JSON.stringify({showtimeId,seatIds:selected,concessions,voucherCode:voucher?.code||null,redeemPoints:Math.min(points,maxPoints)})});
      checkoutKeyRef.current=null;
      setPendingBooking(booking);setHeld(false);setSeconds(0);
      try{
        const payment=await api<PaymentStart>(`/payments/bookings/${booking.id}/start`,{method:"POST",headers:{"Idempotency-Key":paymentKey(booking.id,provider)},body:JSON.stringify({provider})});
        location.href=payment.paymentUrl;
        return;
      }catch(paymentError){
        setMessage(en?"The booking was created, but the payment page could not be opened. Use Continue payment below or cancel the unpaid booking to release the seats.":"Đơn đã được tạo nhưng chưa mở được trang thanh toán. Hãy bấm Tiếp tục thanh toán bên dưới, hoặc huỷ đơn chờ để mở lại ghế.");
        await Promise.all([load(),loadPending()]);
      }
    }catch(e){setMessage((e as Error).message);await Promise.all([load(),loadPending()]);}finally{setBusy(false);}}

  if(loading)return <div className="card p-8 text-center text-slate-400">{en?"Loading seat map...":"Đang tải sơ đồ ghế..."}</div>;

  if(fatalError||!showtime||!map)return <div className="mx-auto max-w-2xl card p-7 text-center md:p-10">
    <div className="text-5xl">🎬</div>
    <h1 className="mt-4 text-2xl font-bold">{en?"Showtime unavailable":"Suất chiếu không còn khả dụng"}</h1>
    <p className="mx-auto mt-3 max-w-xl leading-7 text-slate-300">{fatalError||(en?"This showtime could not be loaded.":"Không thể tải dữ liệu suất chiếu.")}</p>
    <p className="mt-2 text-sm text-slate-500">ID: <span className="break-all font-mono">{showtimeId}</span></p>
    <div className="mt-6 flex flex-wrap justify-center gap-3">
      <Link href="/cinemas" className="btn btn-primary">{en?"Choose another showtime":"Chọn suất chiếu khác"}</Link>
      <Link href="/movies" className="btn btn-secondary">{en?"Browse movies":"Xem danh sách phim"}</Link>
      {auth?.role==="ADMIN"&&<Link href="/admin" className="btn btn-secondary">{en?"Open Admin":"Mở Admin"}</Link>}
    </div>
  </div>;

  return <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_380px]">
    <section className="space-y-6 min-w-0">
      <div className="card p-5 md:p-7">
        <div className="mb-7 flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><div className="text-sm font-semibold text-rose-400">{showtime.cinemaName} · {showtime.auditoriumName}</div><h1 className="mt-1 text-2xl font-bold md:text-3xl">{showtime.movieTitle}</h1><p className="mt-1 text-slate-400">{dateTime(showtime.startTime)}</p></div><button type="button" className="btn btn-secondary" disabled={busy} onClick={refreshSeats}>{en?"Refresh seats":"Làm mới ghế"}</button></div>
        <div className="mx-auto mb-9 max-w-3xl"><div className="h-2 rounded-full bg-gradient-to-r from-transparent via-slate-200 to-transparent shadow-[0_8px_30px_rgba(255,255,255,.16)]"/><div className="mt-3 text-center text-xs uppercase tracking-[.4em] text-slate-500">{en?"SCREEN":"MÀN HÌNH"}</div></div>
        {rows.length===0?<div className="mx-auto max-w-xl rounded-2xl border border-amber-700/50 bg-amber-950/25 p-6 text-center"><div className="text-4xl">💺</div><h2 className="mt-3 text-lg font-bold text-amber-100">{en?"No seats configured for this auditorium":"Phòng chiếu này chưa có sơ đồ ghế"}</h2><p className="mt-2 text-sm leading-6 text-amber-200/80">{en?"An administrator needs to generate or add seats before customers can book this showtime.":"Admin cần tạo sơ đồ ghế cho phòng chiếu trước khi khách đặt vé."}</p>{auth?.role==="ADMIN"&&<Link href="/admin" className="btn btn-primary mt-4 inline-flex">{en?"Open Admin":"Mở trang Admin"}</Link>}</div>:<>
          <div className="overflow-x-auto pb-4"><div className="mx-auto w-max min-w-[620px] space-y-3 px-3">{rows.map(([row,seats])=><div key={row} className="flex items-center justify-center gap-2"><span className="w-7 text-center text-sm font-bold text-slate-500">{row}</span>{seats.map(s=>{const isSelected=selected.includes(s.id);const cls=s.status==="BLOCKED"?"border-slate-800 bg-black/50 text-slate-700 cursor-not-allowed":s.status==="BOOKED"?"border-slate-700 bg-slate-800 text-slate-600 cursor-not-allowed":s.status==="HELD"&&!s.heldByMe?"border-amber-700 bg-amber-900/70 text-amber-200 cursor-not-allowed":isSelected||s.heldByMe?"border-rose-300 bg-rose-500 text-white shadow-lg shadow-rose-950/40":s.seatType==="VIP"?"border-violet-700 bg-violet-950/60 text-violet-200 hover:bg-violet-900":s.seatType==="COUPLE"?"border-pink-700 bg-pink-950/60 text-pink-200 hover:bg-pink-900":s.seatType==="ACCESSIBLE"?"border-cyan-700 bg-cyan-950/60 text-cyan-200 hover:bg-cyan-900":"border-emerald-800 bg-emerald-950/60 text-emerald-200 hover:bg-emerald-900";return <button key={s.id} type="button" aria-label={`${en?"Seat":"Ghế"} ${s.code}`} title={`${s.code} · ${s.seatType} · ${currency(s.price)}${s.dynamicAdjustment?` · Giá động ${s.dynamicAdjustment>0?"+":""}${currency(s.dynamicAdjustment)}${s.pricingRules?.length?` (${s.pricingRules.join(", ")})`:""}`:""} · ${s.status}`} onClick={()=>toggle(s.id,s.status,s.heldByMe)} className={`h-10 w-12 rounded-t-xl rounded-b-md border text-xs font-bold transition ${cls}`}>{s.status==="BLOCKED"?"×":s.seatNumber}</button>})}<span className="w-7 text-center text-sm font-bold text-slate-500">{row}</span></div>)}</div></div>
          <div className="mt-7 grid gap-2 text-xs text-slate-400 sm:grid-cols-2 xl:grid-cols-5"><span className="flex items-center gap-2"><i className="h-4 w-5 rounded border border-emerald-800 bg-emerald-950/60"/> {en?"Standard":"Ghế thường"}</span><span className="flex items-center gap-2"><i className="h-4 w-5 rounded border border-violet-700 bg-violet-950/60"/> VIP</span><span className="flex items-center gap-2"><i className="h-4 w-5 rounded border border-pink-700 bg-pink-950/60"/> {en?"Couple":"Ghế đôi"}</span><span className="flex items-center gap-2"><i className="h-4 w-5 rounded bg-rose-500"/> {en?"Selected":"Đang chọn"}</span><span className="flex items-center gap-2"><i className="h-4 w-5 rounded border border-cyan-700 bg-cyan-950/60"/> ♿ {en?"Accessible":"Ghế hỗ trợ"}</span><span className="flex items-center gap-2"><i className="h-4 w-5 rounded bg-slate-800"/> {en?"Booked/blocked":"Đã đặt/khóa"}</span></div>
          {soldOut&&<div className="mt-6 rounded-2xl border border-amber-700/60 bg-amber-950/30 p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="font-bold text-amber-100">🔔 {en?"No seats available right now":"Hiện tại đã hết ghế"}</div><p className="mt-1 text-sm leading-6 text-amber-200/75">{en?"Join the waitlist and CineBooking will notify you when a seat is released.":"Đăng ký danh sách chờ; CineBooking sẽ tự báo khi có ghế được mở lại."}</p></div><button type="button" className={waitlist?.subscribed?"btn btn-secondary":"btn btn-primary"} disabled={waitlistBusy} onClick={toggleWaitlist}>{waitlistBusy?(en?"Saving...":"Đang lưu..."):waitlist?.subscribed?(en?"Cancel alert":"Huỷ theo dõi"):(en?"Notify me":"Báo khi có ghế")}</button></div>{waitlist?.subscribed&&<div className="mt-3 text-xs font-semibold text-emerald-300">✓ {en?"Seat alert is active":"Đang theo dõi suất chiếu này"} · <Link className="underline" href="/waitlist">{en?"Manage waitlist":"Quản lý danh sách chờ"}</Link></div>}</div>}
        </>}
      </div>

      <div className="card p-5 md:p-7">
        <div className="section-heading"><div><p className="section-kicker">CINE FOOD</p><h2>{en?"Snacks & drinks":"Bắp nước & combo"}</h2></div><span className="text-sm text-slate-400">{en?"Optional":"Không bắt buộc"}</span></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{products.map(p=>{const current=addons[p.id]||0;const cap=p.inventoryEnabled?Math.min(10,p.stockAvailable):10;return <div key={p.id} className={`rounded-2xl border bg-slate-950/55 p-4 ${p.soldOut?"border-rose-900/70 opacity-75":p.lowStock?"border-amber-800/70":"border-slate-700/70"}`}><div className="flex gap-3"><div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-2xl">🍿</div><div className="min-w-0"><div className="font-bold">{p.name}</div><div className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">{p.description||"Combo rạp chiếu"}</div><div className="mt-2 font-bold text-amber-300">{currency(p.price)}</div>{p.inventoryEnabled&&<div className={`mt-1 text-xs font-semibold ${p.soldOut?"text-rose-300":p.lowStock?"text-amber-300":"text-emerald-300"}`}>{p.soldOut?(en?"Sold out":"Hết hàng"):(en?`${p.stockAvailable} available`:`Còn ${p.stockAvailable} phần`)}</div>}</div></div><div className="mt-4 flex items-center justify-between"><button className="btn btn-secondary !h-9 !w-9 !p-0" onClick={()=>qty(p.id,-1)} disabled={!current}>−</button><strong>{current}</strong><button className="btn btn-secondary !h-9 !w-9 !p-0" onClick={()=>qty(p.id,1)} disabled={p.soldOut||current>=cap}>+</button></div></div>})}</div>
      </div>
    </section>

    <aside className="card h-fit p-6 lg:sticky lg:top-24">
      <h2 className="text-xl font-bold">{en?"Order summary":"Đơn hàng"}</h2>
      <div className="mt-4 min-h-16 text-sm text-slate-300">{selectedSeats.length?selectedSeats.map(s=><div key={s.id} className="flex justify-between gap-3 py-1"><span>{en?"Seat":"Ghế"} {s.code} · {s.seatType}{s.dynamicAdjustment!==0&&<small className="ml-2 text-amber-300">{en?"dynamic":"giá động"} {s.dynamicAdjustment>0?"+":""}{currency(s.dynamicAdjustment)}</small>}</span><span>{currency(s.price)}</span></div>):<span className="text-slate-500">{rows.length?en?"Select seats on the map.":"Chọn ghế trên sơ đồ.":en?"No seats are available for this auditorium.":"Phòng chiếu chưa có ghế để chọn."}</span>}</div>
      {products.filter(p=>(addons[p.id]||0)>0).map(p=><div key={p.id} className="flex justify-between gap-3 py-1 text-sm text-slate-300"><span>{p.name} × {addons[p.id]}</span><span>{currency(p.price*(addons[p.id]||0))}</span></div>)}
      <div className="my-4 border-t border-slate-800"/>
      <div className="space-y-2 text-sm"><div className="flex justify-between"><span className="text-slate-400">{en?"Tickets":"Vé"}</span><span>{currency(seatTotal)}</span></div>{dynamicTotal!==0&&<div className={`flex justify-between ${dynamicTotal>0?"text-amber-300":"text-emerald-300"}`}><span>{en?"Dynamic pricing included":"Đã gồm giá động"}</span><span>{dynamicTotal>0?"+":""}{currency(dynamicTotal)}</span></div>}<div className="flex justify-between"><span className="text-slate-400">{en?"Concessions":"Bắp nước"}</span><span>{currency(addonTotal)}</span></div>{voucher&&<div className="flex justify-between text-emerald-300"><span>{voucher.code}</span><span>-{currency(voucherDiscount)}</span></div>}{points>0&&<div className="flex justify-between text-amber-300"><span>{en?"Member points":"Điểm thành viên"} ({Math.min(points,maxPoints)})</span><span>-{currency(pointDiscount)}</span></div>}</div>
      <div className="mt-4 flex justify-between border-t border-slate-800 pt-4 text-lg font-bold"><span>{en?"Total":"Tổng"}</span><span>{currency(previewTotal)}</span></div>

      {pendingBooking&&<div className="mt-5 rounded-2xl border border-amber-700/60 bg-amber-950/35 p-4 text-sm"><div className="font-bold text-amber-200">⏳ {en?"Unpaid booking exists":"Bạn có đơn chờ thanh toán"}</div><div className="mt-2 text-slate-300">{en?"Seats":"Ghế"}: <strong>{pendingBooking.seats.map(s=>s.code).join(", ")}</strong></div><div className="mt-1 text-slate-400">{en?"Amount":"Số tiền"}: {currency(pendingBooking.totalAmount)}</div><div className="mt-1 break-all text-xs text-slate-500">#{pendingBooking.id}</div><p className="mt-3 text-xs leading-5 text-amber-200/80">{en?"These seats stay reserved until payment, cancellation, or the 5-minute payment window expires.":"Các ghế này được giữ cho đơn đến khi thanh toán, huỷ đơn hoặc hết thời hạn thanh toán 5 phút."}</p><div className="mt-3 grid gap-2 sm:grid-cols-2"><button className="btn btn-primary" disabled={busy} onClick={resumePendingPayment}>{en?"Continue payment":"Tiếp tục thanh toán"}</button><button className="btn btn-secondary" disabled={busy} onClick={cancelPendingBooking}>{en?"Cancel & release seats":"Huỷ đơn & mở ghế"}</button></div></div>}

      <div className="mt-5"><label className="text-xs font-bold uppercase tracking-wider text-slate-500">{en?"Voucher":"Mã ưu đãi"}</label><div className="mt-2 flex gap-2"><input className="input !py-2" value={voucherCode} onChange={e=>{setVoucherCode(e.target.value.toUpperCase());setVoucher(null)}} placeholder="WELCOME10"/><button className="btn btn-secondary" disabled={busy||!voucherCode.trim()} onClick={applyVoucher}>{en?"Apply":"Áp dụng"}</button></div>{voucher&&<p className="mt-2 text-xs text-emerald-300">✓ {voucher.name}</p>}{gross<=0&&voucherCode.trim()&&<p className="mt-2 text-xs text-amber-300">{en?"Select a seat to calculate the discount.":"Chọn ghế để hệ thống tính số tiền được giảm."}</p>}</div>

      {profile&&<div className="mt-5"><div className="flex items-center justify-between"><label className="text-xs font-bold uppercase tracking-wider text-slate-500">{en?"Use points":"Dùng điểm"}</label><span className="text-xs text-amber-300">{en?"Available":"Có"}: {profile.loyaltyPoints}</span></div><input className="input mt-2" type="number" min={0} max={maxPoints} value={points} onChange={e=>setPoints(Math.max(0,Math.min(maxPoints,Number(e.target.value)||0)))} disabled={maxPoints<=0}/><p className="mt-1 text-xs text-slate-500">1 điểm = 100đ · {en?"up to 30% after voucher":"tối đa 30% giá trị sau voucher"} · max {maxPoints}</p></div>}

      {held&&<div className="mt-4 rounded-xl bg-rose-950/40 p-3 text-center text-sm text-rose-200">{en?"Seats held for":"Ghế được giữ trong"} <strong>{Math.floor(seconds/60)}:{String(seconds%60).padStart(2,"0")}</strong></div>}
      {!auth&&rows.length>0&&<div className="mt-4 rounded-xl bg-amber-950/40 p-3 text-sm text-amber-200">{en?<>Please <Link className="underline" href="/login">sign in</Link> to hold seats.</>:<>Bạn cần <Link className="underline" href="/login">đăng nhập</Link> để giữ ghế.</>}</div>}
      {message&&<div className="mt-4 rounded-xl bg-red-950/50 p-3 text-sm text-red-300">{message}</div>}
      {rows.length>0&&(!held?<button disabled={!selected.length||busy||!!pendingBooking} onClick={holdSeats} className="btn btn-primary mt-5 w-full">{busy?(en?"Processing...":"Đang xử lý..."):(en?"Hold seats for 5 minutes":"Giữ ghế 5 phút")}</button>:<><label className="mt-5 block text-sm text-slate-400">{en?"Payment method":"Phương thức thanh toán"}</label><select className="input mt-2" value={provider} onChange={e=>setProvider(e.target.value)}><option value="MOCK" disabled={!providerReady("MOCK")}>Mock (demo){!providerReady("MOCK")?" · tắt":""}</option><option value="VNPAY" disabled={!providerReady("VNPAY")}>VNPay{!providerReady("VNPAY")?" · chưa cấu hình":""}</option><option value="VNPAY_QR" disabled={!providerReady("VNPAY_QR")}>VNPay QR{!providerReady("VNPAY_QR")?" · chưa cấu hình":""}</option><option value="MOMO" disabled={!providerReady("MOMO")}>MoMo{!providerReady("MOMO")?" · chưa cấu hình":""}</option><option value="MOMO_QR" disabled={!providerReady("MOMO_QR")}>MoMo QR{!providerReady("MOMO_QR")?" · chưa cấu hình":""}</option></select><button disabled={busy||seconds===0} onClick={checkout} className="btn btn-primary mt-4 w-full">{en?"Pay now":"Thanh toán"} · {currency(previewTotal)}</button><p className="mt-2 text-center text-[11px] leading-4 text-slate-500">🔒 {en?"Duplicate checkout retries are protected by an idempotency key.":"Chống tạo đơn trùng khi mạng chập chờn hoặc nút thanh toán bị gửi lại."}</p><button disabled={busy} onClick={release} className="btn btn-secondary mt-2 w-full">{en?"Release seats":"Bỏ giữ ghế"}</button></>)}
    </aside>
  </div>;
}
