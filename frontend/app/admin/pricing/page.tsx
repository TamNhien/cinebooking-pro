"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { api, currency, dateTime } from "@/lib/api";
import { clearAuth, getAuth } from "@/lib/auth";
import type { AdminSeat, Auditorium, Cinema, Movie, PricingQuote, PricingRule, Showtime, UserProfile } from "@/lib/types";

type FormState={
  name:string; cinemaId:string; auditoriumId:string; movieId:string; seatType:string; daysOfWeek:number[];
  startTime:string; endTime:string; validFrom:string; validTo:string; adjustmentType:"FIXED"|"PERCENT"; adjustmentValue:number; priority:number; active:boolean;
};

const DAYS=[
  [1,"T2"],[2,"T3"],[3,"T4"],[4,"T5"],[5,"T6"],[6,"T7"],[7,"CN"],
] as const;
const empty:FormState={name:"",cinemaId:"",auditoriumId:"",movieId:"",seatType:"",daysOfWeek:[],startTime:"",endTime:"",validFrom:"",validTo:"",adjustmentType:"FIXED",adjustmentValue:15000,priority:0,active:true};

function ruleBody(f:FormState){
  return {
    name:f.name.trim(),cinemaId:f.cinemaId||null,auditoriumId:f.auditoriumId||null,movieId:f.movieId||null,seatType:f.seatType||null,
    daysOfWeek:f.daysOfWeek,startTime:f.startTime||null,endTime:f.endTime||null,validFrom:f.validFrom||null,validTo:f.validTo||null,
    adjustmentType:f.adjustmentType,adjustmentValue:Number(f.adjustmentValue),priority:Number(f.priority)||0,active:f.active,
  };
}
function adjustmentText(r:PricingRule){return r.adjustmentType==="PERCENT"?`${r.adjustmentValue>0?"+":""}${r.adjustmentValue}%`:`${r.adjustmentValue>0?"+":""}${currency(r.adjustmentValue)}`;}
function daysText(days:number[]){return !days.length?"Mọi ngày":days.length===7?"Cả tuần":days.map(d=>DAYS.find(x=>x[0]===d)?.[1]||d).join(", ");}

export default function AdminPricingPage(){
  const [rules,setRules]=useState<PricingRule[]>([]); const [cinemas,setCinemas]=useState<Cinema[]>([]); const [auditoriums,setAuditoriums]=useState<Auditorium[]>([]); const [movies,setMovies]=useState<Movie[]>([]); const [showtimes,setShowtimes]=useState<Showtime[]>([]); const [seats,setSeats]=useState<AdminSeat[]>([]);
  const [form,setForm]=useState<FormState>({...empty}); const [editingId,setEditingId]=useState<string|null>(null); const [query,setQuery]=useState(""); const [msg,setMsg]=useState(""); const [busy,setBusy]=useState(false);
  const [previewShowtime,setPreviewShowtime]=useState(""); const [previewSeat,setPreviewSeat]=useState(""); const [quote,setQuote]=useState<PricingQuote|null>(null);

  async function load(){
    const me=await api<UserProfile>("/me");
    if(me.role!=="ADMIN"){clearAuth();location.href="/login?returnTo=/admin/pricing&reason=admin";return;}
    const [r,c,a,m,s,st]=await Promise.all([
      api<PricingRule[]>("/admin/pricing/rules"),api<Cinema[]>("/admin/cinemas"),api<Auditorium[]>("/admin/auditoriums"),api<Movie[]>("/admin/movies"),api<Showtime[]>("/admin/showtimes"),api<AdminSeat[]>("/admin/seats")
    ]);
    setRules(r);setCinemas(c);setAuditoriums(a);setMovies(m);setShowtimes(s);setSeats(st);
  }
  useEffect(()=>{if(!getAuth()){location.href="/login?returnTo=/admin/pricing&reason=required";return;}load().catch(e=>setMsg((e as Error).message));},[]);

  const roomOptions=useMemo(()=>auditoriums.filter(a=>!form.cinemaId||a.cinemaId===form.cinemaId),[auditoriums,form.cinemaId]);
  const selectedPreviewShowtime=showtimes.find(s=>s.id===previewShowtime);
  const previewSeats=useMemo(()=>selectedPreviewShowtime?seats.filter(s=>s.auditoriumId===selectedPreviewShowtime.auditoriumId):[],[seats,selectedPreviewShowtime]);
  const filtered=useMemo(()=>{const q=query.trim().toLowerCase();return rules.filter(r=>!q||[r.name,r.cinemaName,r.auditoriumName,r.movieTitle,r.seatType].some(v=>v?.toLowerCase().includes(q)));},[rules,query]);

  function reset(){setEditingId(null);setForm({...empty});setQuote(null);}
  function edit(r:PricingRule){
    setEditingId(r.id);setForm({name:r.name,cinemaId:r.cinemaId||"",auditoriumId:r.auditoriumId||"",movieId:r.movieId||"",seatType:r.seatType||"",daysOfWeek:r.daysOfWeek||[],startTime:r.startTime?.slice(0,5)||"",endTime:r.endTime?.slice(0,5)||"",validFrom:r.validFrom||"",validTo:r.validTo||"",adjustmentType:r.adjustmentType,adjustmentValue:r.adjustmentValue,priority:r.priority,active:r.active});window.scrollTo({top:0,behavior:"smooth"});
  }
  function toggleDay(day:number){setForm(f=>({...f,daysOfWeek:f.daysOfWeek.includes(day)?f.daysOfWeek.filter(d=>d!==day):[...f.daysOfWeek,day].sort()}));}
  async function save(e:FormEvent){
    e.preventDefault();setBusy(true);setMsg("");
    try{
      if(!form.name.trim())throw new Error("Nhập tên quy tắc giá.");
      if(!form.adjustmentValue)throw new Error("Mức điều chỉnh phải khác 0.");
      if((form.startTime&&!form.endTime)||(!form.startTime&&form.endTime))throw new Error("Khung giờ phải có cả giờ bắt đầu và kết thúc.");
      if(form.startTime&&form.startTime===form.endTime)throw new Error("Giờ bắt đầu và kết thúc không được trùng nhau.");
      await api(editingId?`/admin/pricing/rules/${editingId}`:"/admin/pricing/rules",{method:editingId?"PUT":"POST",body:JSON.stringify(ruleBody(form))});
      setMsg(editingId?"Đã cập nhật quy tắc giá.":"Đã tạo quy tắc giá mới. Quy tắc có hiệu lực với booking mới khi đang bật.");reset();await load();
    }catch(e){setMsg((e as Error).message)}finally{setBusy(false)}
  }
  async function toggle(r:PricingRule){
    setBusy(true);setMsg("");
    try{
      const f:FormState={name:r.name,cinemaId:r.cinemaId||"",auditoriumId:r.auditoriumId||"",movieId:r.movieId||"",seatType:r.seatType||"",daysOfWeek:r.daysOfWeek||[],startTime:r.startTime?.slice(0,5)||"",endTime:r.endTime?.slice(0,5)||"",validFrom:r.validFrom||"",validTo:r.validTo||"",adjustmentType:r.adjustmentType,adjustmentValue:r.adjustmentValue,priority:r.priority,active:!r.active};
      await api(`/admin/pricing/rules/${r.id}`,{method:"PUT",body:JSON.stringify(ruleBody(f))});setMsg(`${r.name}: ${r.active?"đã tạm dừng":"đã kích hoạt"}.`);await load();
    }catch(e){setMsg((e as Error).message)}finally{setBusy(false)}
  }
  async function preview(){if(!previewShowtime||!previewSeat)return;setBusy(true);setMsg("");try{setQuote(await api<PricingQuote>("/admin/pricing/preview",{method:"POST",body:JSON.stringify({showtimeId:previewShowtime,seatId:previewSeat})}));}catch(e){setQuote(null);setMsg((e as Error).message)}finally{setBusy(false)}}
  async function removeRule(r:PricingRule){if(!confirm(`Xoá quy tắc giá "${r.name}"? Giá các booking đã tạo sẽ không thay đổi.`))return;setBusy(true);setMsg("");try{await api(`/admin/pricing/rules/${r.id}`,{method:"DELETE"});if(editingId===r.id)reset();setMsg(`Đã xoá quy tắc ${r.name}.`);await load();}catch(e){setMsg((e as Error).message)}finally{setBusy(false)}}

  return <div className="space-y-7">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="section-kicker">V18 · DYNAMIC PRICING</p><h1 className="text-3xl font-bold">Giá vé động</h1><p className="mt-1 max-w-3xl text-slate-400">Cấu hình phụ thu/giảm giá theo rạp, phòng, phim, loại ghế, ngày trong tuần và khung giờ. Giá cuối cùng được chốt vào booking, nên thay đổi rule sau này không làm đổi vé đã mua.</p></div><div className="flex gap-2"><Link href="/admin" className="btn btn-secondary">← Dashboard</Link></div></div>
    {msg&&<div className="card p-4 text-sm">{msg}</div>}

    <div className="grid gap-6 xl:grid-cols-[450px_1fr]">
      <form className="card h-fit space-y-4 p-5" onSubmit={save}>
        <div className="flex items-center justify-between"><h2 className="text-xl font-bold">{editingId?"Chỉnh sửa quy tắc":"Tạo quy tắc giá"}</h2>{editingId&&<button type="button" className="text-sm text-slate-400 hover:text-white" onClick={reset}>Huỷ sửa</button>}</div>
        <div><label className="mb-1.5 block text-sm text-slate-300">Tên quy tắc</label><input className="input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="VD: Cuối tuần +15.000đ" required/></div>
        <div className="grid grid-cols-2 gap-3"><div><label className="mb-1.5 block text-sm text-slate-300">Loại điều chỉnh</label><select className="input" value={form.adjustmentType} onChange={e=>setForm({...form,adjustmentType:e.target.value as FormState["adjustmentType"]})}><option value="FIXED">Số tiền (đ)</option><option value="PERCENT">Phần trăm (%)</option></select></div><div><label className="mb-1.5 block text-sm text-slate-300">Mức điều chỉnh</label><input className="input" type="number" step="1" value={form.adjustmentValue} onChange={e=>setForm({...form,adjustmentValue:Number(e.target.value)})}/><p className="mt-1 text-xs text-slate-500">Số âm = giảm giá, ví dụ -10%.</p></div></div>
        <div className="grid grid-cols-2 gap-3"><div><label className="mb-1.5 block text-sm text-slate-300">Rạp</label><select className="input" value={form.cinemaId} onChange={e=>setForm({...form,cinemaId:e.target.value,auditoriumId:""})}><option value="">Tất cả rạp</option>{cinemas.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div><div><label className="mb-1.5 block text-sm text-slate-300">Phòng</label><select className="input" value={form.auditoriumId} onChange={e=>setForm({...form,auditoriumId:e.target.value})}><option value="">Tất cả phòng</option>{roomOptions.map(a=><option key={a.id} value={a.id}>{a.cinemaName} · {a.name}</option>)}</select></div></div>
        <div className="grid grid-cols-2 gap-3"><div><label className="mb-1.5 block text-sm text-slate-300">Phim</label><select className="input" value={form.movieId} onChange={e=>setForm({...form,movieId:e.target.value})}><option value="">Tất cả phim</option>{movies.map(m=><option key={m.id} value={m.id}>{m.title}</option>)}</select></div><div><label className="mb-1.5 block text-sm text-slate-300">Loại ghế</label><select className="input" value={form.seatType} onChange={e=>setForm({...form,seatType:e.target.value})}><option value="">Tất cả loại ghế</option><option>STANDARD</option><option>VIP</option><option>COUPLE</option><option>ACCESSIBLE</option></select></div></div>
        <div><label className="mb-2 block text-sm text-slate-300">Ngày trong tuần <span className="text-slate-500">(không chọn = mọi ngày)</span></label><div className="grid grid-cols-7 gap-2">{DAYS.map(([d,label])=><button type="button" key={d} onClick={()=>toggleDay(d)} className={`rounded-xl border px-2 py-2 text-sm font-bold ${form.daysOfWeek.includes(d)?"border-rose-500 bg-rose-500/20 text-rose-200":"border-slate-700 bg-slate-900/70 text-slate-400"}`}>{label}</button>)}</div></div>
        <div className="grid grid-cols-2 gap-3"><div><label className="mb-1.5 block text-sm text-slate-300">Từ giờ</label><input className="input" type="time" value={form.startTime} onChange={e=>setForm({...form,startTime:e.target.value})}/></div><div><label className="mb-1.5 block text-sm text-slate-300">Đến giờ</label><input className="input" type="time" value={form.endTime} onChange={e=>setForm({...form,endTime:e.target.value})}/></div></div><p className="-mt-2 text-xs text-slate-500">Để trống cả hai = cả ngày. Hỗ trợ qua nửa đêm, ví dụ 20:00 → 02:00.</p>
        <div className="grid grid-cols-2 gap-3"><div><label className="mb-1.5 block text-sm text-slate-300">Từ ngày</label><input className="input" type="date" value={form.validFrom} onChange={e=>setForm({...form,validFrom:e.target.value})}/></div><div><label className="mb-1.5 block text-sm text-slate-300">Đến ngày</label><input className="input" type="date" value={form.validTo} onChange={e=>setForm({...form,validTo:e.target.value})}/></div></div>
        <div className="grid grid-cols-2 gap-3"><div><label className="mb-1.5 block text-sm text-slate-300">Ưu tiên</label><input className="input" type="number" value={form.priority} onChange={e=>setForm({...form,priority:Number(e.target.value)})}/></div><label className="mt-7 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={e=>setForm({...form,active:e.target.checked})}/> Kích hoạt rule</label></div>
        <div className="rounded-xl border border-cyan-800/50 bg-cyan-950/25 p-3 text-xs leading-5 text-cyan-100">Các rule phù hợp được <b>cộng dồn</b>. Rule % tính trên <b>giá cơ bản + phụ thu loại ghế</b>. Giá cuối không bao giờ âm.</div>
        <button className="btn btn-primary w-full" disabled={busy}>{busy?"Đang lưu...":editingId?"Lưu thay đổi":"Tạo quy tắc giá"}</button>
      </form>

      <div className="space-y-5">
        <section className="card p-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-bold">🧪 Mô phỏng giá</h2><p className="mt-1 text-sm text-slate-400">Chọn suất và ghế để xem chính xác rule nào đang tác động.</p></div><span className="text-xs text-slate-500">Timezone: Asia/Ho_Chi_Minh</span></div><div className="mt-4 grid gap-3 md:grid-cols-[1fr_220px_auto]"><select className="input" value={previewShowtime} onChange={e=>{setPreviewShowtime(e.target.value);setPreviewSeat("");setQuote(null)}}><option value="">Chọn suất chiếu</option>{showtimes.map(s=><option key={s.id} value={s.id}>{s.movieTitle} · {s.cinemaName}/{s.auditoriumName} · {dateTime(s.startTime)}</option>)}</select><select className="input" value={previewSeat} onChange={e=>{setPreviewSeat(e.target.value);setQuote(null)}} disabled={!previewShowtime}><option value="">Chọn ghế</option>{previewSeats.map(s=><option key={s.id} value={s.id}>{s.rowLabel}{s.seatNumber} · {s.seatType}</option>)}</select><button className="btn btn-secondary" disabled={busy||!previewShowtime||!previewSeat} onClick={preview}>Tính giá</button></div>
          {quote&&<div className="mt-5 grid gap-4 lg:grid-cols-[260px_1fr]"><div className="rounded-2xl border border-slate-700 bg-slate-950/45 p-4 text-sm"><div className="text-slate-400">{quote.movieTitle}</div><div className="mt-1 font-bold">{quote.cinemaName} · {quote.auditoriumName}</div><div className="mt-1 text-slate-400">Ghế {quote.seatCode} · {quote.seatType}</div><div className="mt-4 space-y-2"><div className="flex justify-between"><span>Giá suất</span><b>{currency(quote.basePrice)}</b></div><div className="flex justify-between"><span>Loại ghế</span><b>{quote.seatModifier>=0?"+":""}{currency(quote.seatModifier)}</b></div><div className="flex justify-between text-amber-300"><span>Giá động</span><b>{quote.dynamicAdjustment>=0?"+":""}{currency(quote.dynamicAdjustment)}</b></div><div className="flex justify-between border-t border-slate-700 pt-2 text-lg"><span>Giá cuối</span><b>{currency(quote.finalPrice)}</b></div></div></div><div className="rounded-2xl border border-slate-700 bg-slate-950/45 p-4"><h3 className="font-bold">Rule được áp dụng</h3><div className="mt-3 space-y-2">{quote.appliedRules.length?quote.appliedRules.map(r=><div key={r.ruleId} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-900/75 p-3 text-sm"><div><b>{r.name}</b><div className="text-xs text-slate-500">priority {r.priority} · {r.adjustmentType} {r.adjustmentValue}</div></div><span className={r.appliedAmount>=0?"font-bold text-amber-300":"font-bold text-emerald-300"}>{r.appliedAmount>=0?"+":""}{currency(r.appliedAmount)}</span></div>):<p className="text-sm text-slate-500">Không có rule động nào phù hợp. Giá = base + loại ghế.</p>}</div></div></div>}
        </section>

        <div className="card p-4"><input className="input" placeholder="Tìm theo tên, rạp, phòng, phim, loại ghế..." value={query} onChange={e=>setQuery(e.target.value)}/></div>
        <div className="space-y-3">{filtered.map(r=><article key={r.id} className={`card p-5 ${!r.active?"opacity-65":""}`}><div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-bold">{r.name}</h3><span className={`rounded-full px-2 py-1 text-xs font-bold ${r.active?"bg-emerald-500/15 text-emerald-300":"bg-slate-700 text-slate-300"}`}>{r.active?"Đang bật":"Tạm dừng"}</span><span className={`rounded-full px-2 py-1 text-xs font-black ${r.adjustmentValue>=0?"bg-amber-500/15 text-amber-300":"bg-emerald-500/15 text-emerald-300"}`}>{adjustmentText(r)}</span></div><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-400"><span>🏢 {r.cinemaName||"Tất cả rạp"}</span><span>🎦 {r.auditoriumName||"Tất cả phòng"}</span><span>🎬 {r.movieTitle||"Tất cả phim"}</span><span>💺 {r.seatType||"Mọi loại ghế"}</span></div><div className="mt-2 text-xs text-slate-500">{daysText(r.daysOfWeek)} · {r.startTime&&r.endTime?`${r.startTime.slice(0,5)} → ${r.endTime.slice(0,5)}`:"Cả ngày"}{r.validFrom||r.validTo?` · ${r.validFrom||"..."} → ${r.validTo||"..."}`:""} · priority {r.priority}</div></div><div className="flex flex-wrap gap-2"><button className="btn btn-secondary" onClick={()=>edit(r)}>✏️ Sửa</button><button className="btn btn-secondary" disabled={busy} onClick={()=>toggle(r)}>{r.active?"⏸ Tạm dừng":"▶ Kích hoạt"}</button><button className="btn btn-secondary" disabled={busy} onClick={()=>removeRule(r)}>🗑 Xoá</button></div></div></article>)}{!filtered.length&&<div className="card p-8 text-center text-slate-400">Chưa có quy tắc giá phù hợp.</div>}</div>
      </div>
    </div>
  </div>;
}
