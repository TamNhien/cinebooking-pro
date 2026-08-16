"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { api, currency, dateTime } from "@/lib/api";
import { clearAuth, getAuth } from "@/lib/auth";
import type { UserProfile, Voucher, VoucherQuote } from "@/lib/types";

type VoucherForm = {
  code:string;
  name:string;
  discountType:"PERCENT"|"FIXED";
  discountValue:number;
  minOrderAmount:number;
  maxDiscount:string;
  startsAt:string;
  endsAt:string;
  usageLimit:string;
  active:boolean;
};

const emptyForm:VoucherForm={
  code:"",name:"",discountType:"PERCENT",discountValue:10,minOrderAmount:0,maxDiscount:"50000",
  startsAt:"",endsAt:"",usageLimit:"100",active:true,
};

function toLocal(v?:string){
  if(!v)return "";
  const d=new Date(v);
  return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);
}

function currentStatus(v:Voucher){
  const now=Date.now();
  if(!v.active)return {label:"Tạm dừng",cls:"bg-slate-700 text-slate-300"};
  if(v.startsAt&&new Date(v.startsAt).getTime()>now)return {label:"Chưa bắt đầu",cls:"bg-cyan-500/15 text-cyan-300"};
  if(v.endsAt&&new Date(v.endsAt).getTime()<now)return {label:"Hết hạn",cls:"bg-red-500/15 text-red-300"};
  if(v.usageLimit!=null&&v.usedCount>=v.usageLimit)return {label:"Hết lượt",cls:"bg-amber-500/15 text-amber-300"};
  return {label:"Đang dùng",cls:"bg-emerald-500/15 text-emerald-300"};
}

export default function AdminVouchersPage(){
  const [items,setItems]=useState<Voucher[]>([]);
  const [form,setForm]=useState<VoucherForm>({...emptyForm});
  const [editingId,setEditingId]=useState<string|null>(null);
  const [query,setQuery]=useState("");
  const [filter,setFilter]=useState("ALL");
  const [msg,setMsg]=useState("");
  const [busy,setBusy]=useState(false);
  const [testAmount,setTestAmount]=useState(130000);
  const [testQuote,setTestQuote]=useState<VoucherQuote|null>(null);

  async function load(){
    const me=await api<UserProfile>("/me");
    if(me.role!=="ADMIN"){
      clearAuth(); location.href="/login?returnTo=/admin/vouchers&reason=admin"; return;
    }
    setItems(await api<Voucher[]>("/admin/commerce/vouchers"));
  }

  useEffect(()=>{
    if(!getAuth()){location.href="/login?returnTo=/admin/vouchers&reason=required";return;}
    load().catch(e=>setMsg((e as Error).message));
  },[]);

  const filtered=useMemo(()=>items.filter(v=>{
    const q=query.trim().toLowerCase();
    const hit=!q||v.code.toLowerCase().includes(q)||v.name.toLowerCase().includes(q);
    const status=currentStatus(v).label;
    return hit&&(filter==="ALL"||status===filter);
  }),[items,query,filter]);

  const duplicateVoucher=useMemo(()=>{
    const code=form.code.trim().toUpperCase();
    if(!code)return null;
    return items.find(v=>v.code.toUpperCase()===code&&v.id!==editingId)??null;
  },[items,form.code,editingId]);

  function reset(){
    setEditingId(null);setForm({...emptyForm});setTestQuote(null);
  }

  function edit(v:Voucher){
    setEditingId(v.id);
    setForm({
      code:v.code,name:v.name,discountType:v.discountType as "PERCENT"|"FIXED",discountValue:v.discountValue,
      minOrderAmount:v.minOrderAmount,maxDiscount:v.maxDiscount==null?"":String(v.maxDiscount),startsAt:toLocal(v.startsAt),
      endsAt:toLocal(v.endsAt),usageLimit:v.usageLimit==null?"":String(v.usageLimit),active:v.active,
    });
    setTestQuote(null);window.scrollTo({top:0,behavior:"smooth"});
  }

  async function save(e:FormEvent){
    e.preventDefault();setBusy(true);setMsg("");setTestQuote(null);
    try{
      const code=form.code.trim().toUpperCase();
      if(duplicateVoucher)throw new Error(`Mã ${code} đã tồn tại. Hãy bấm Sửa mã hiện có hoặc nhập một mã mới.`);
      if(!/^[A-Z0-9_-]{3,30}$/.test(code))throw new Error("Mã ưu đãi chỉ gồm A-Z, 0-9, - hoặc _ và dài 3-30 ký tự.");
      if(form.discountType==="PERCENT"&&(form.discountValue<=0||form.discountValue>100))throw new Error("Mức giảm phần trăm phải từ 1 đến 100%.");
      if(form.discountValue<=0)throw new Error("Mức giảm phải lớn hơn 0.");
      if(form.startsAt&&form.endsAt&&new Date(form.endsAt)<=new Date(form.startsAt))throw new Error("Thời gian kết thúc phải sau thời gian bắt đầu.");
      const body={
        code,name:form.name.trim(),discountType:form.discountType,discountValue:Number(form.discountValue),
        minOrderAmount:Number(form.minOrderAmount)||0,maxDiscount:form.maxDiscount===""?null:Number(form.maxDiscount),
        startsAt:form.startsAt?new Date(form.startsAt).toISOString():null,endsAt:form.endsAt?new Date(form.endsAt).toISOString():null,
        usageLimit:form.usageLimit===""?null:Number(form.usageLimit),active:form.active,
      };
      await api(editingId?`/admin/commerce/vouchers/${editingId}`:"/admin/commerce/vouchers",{method:editingId?"PUT":"POST",body:JSON.stringify(body)});
      setMsg(editingId?`Đã cập nhật mã ${code}.`:`Đã tạo mã ưu đãi ${code}.`);reset();await load();
    }catch(e){setMsg((e as Error).message)}finally{setBusy(false)}
  }

  async function toggle(v:Voucher){
    setMsg("");
    try{
      const body={code:v.code,name:v.name,discountType:v.discountType,discountValue:v.discountValue,minOrderAmount:v.minOrderAmount,
        maxDiscount:v.maxDiscount??null,startsAt:v.startsAt??null,endsAt:v.endsAt??null,usageLimit:v.usageLimit??null,active:!v.active};
      await api(`/admin/commerce/vouchers/${v.id}`,{method:"PUT",body:JSON.stringify(body)});
      setMsg(`${v.code}: ${v.active?"đã tạm dừng":"đã kích hoạt"}.`);await load();
    }catch(e){setMsg((e as Error).message)}
  }

  async function testVoucher(v:Voucher){
    setMsg("");setTestQuote(null);
    try{
      const q=await api<VoucherQuote>("/commerce/vouchers/quote",{method:"POST",body:JSON.stringify({code:v.code,orderAmount:Number(testAmount)||0})});
      setTestQuote(q);setMsg(`Test ${v.code} thành công: giảm ${currency(q.discountAmount)}.`);
    }catch(e){setMsg(`Test ${v.code}: ${(e as Error).message}`)}
  }

  return <div className="space-y-7">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><div className="mb-2 text-sm text-slate-400"><Link href="/admin" className="hover:text-white">Admin</Link> / Mã ưu đãi</div><h1 className="text-3xl font-bold">Quản lý mã ưu đãi</h1><p className="mt-1 text-slate-400">Admin tạo, sửa, kích hoạt/tạm dừng và test voucher trước khi khách sử dụng. Mã phải là duy nhất; WELCOME10/CINE20K là dữ liệu mẫu có sẵn.</p></div>
      <div className="flex gap-2"><Link href="/admin/commerce" className="btn btn-secondary">🍿 Bắp nước</Link><Link href="/admin" className="btn btn-secondary">← Dashboard</Link></div>
    </div>

    {msg&&<div className="card p-4 text-sm">{msg}</div>}

    <div className="grid gap-6 xl:grid-cols-[440px_1fr]">
      <form onSubmit={save} className="card h-fit space-y-4 p-5">
        <div className="flex items-center justify-between"><h2 className="text-xl font-bold">{editingId?"Chỉnh sửa mã ưu đãi":"Tạo mã ưu đãi mới"}</h2>{editingId&&<button type="button" className="text-sm text-slate-400 hover:text-white" onClick={reset}>Huỷ sửa</button>}</div>
        <div><label className="mb-1.5 block text-sm text-slate-300">Mã ưu đãi</label><input className={`input font-bold uppercase ${duplicateVoucher?"border-red-500/70":""}`} value={form.code} onChange={e=>setForm({...form,code:e.target.value.toUpperCase().replace(/\s/g,"")})} placeholder="VD: THANG8_20" maxLength={30} required/><p className="mt-1 text-xs text-slate-500">3-30 ký tự: A-Z, 0-9, - hoặc _. Mã không phân biệt hoa/thường khi khách nhập.</p>{duplicateVoucher&&<div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200"><b>{duplicateVoucher.code}</b> đã tồn tại trong hệ thống. <button type="button" className="ml-1 underline hover:text-white" onClick={()=>edit(duplicateVoucher)}>Sửa mã hiện có</button> hoặc nhập mã khác.</div>}</div>
        <div><label className="mb-1.5 block text-sm text-slate-300">Tên chương trình</label><input className="input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Ưu đãi thành viên mới" required/></div>
        <div className="grid grid-cols-2 gap-3"><div><label className="mb-1.5 block text-sm text-slate-300">Loại giảm</label><select className="input" value={form.discountType} onChange={e=>setForm({...form,discountType:e.target.value as VoucherForm["discountType"]})}><option value="PERCENT">Phần trăm (%)</option><option value="FIXED">Số tiền (đ)</option></select></div><div><label className="mb-1.5 block text-sm text-slate-300">Mức giảm</label><input className="input" type="number" min={1} max={form.discountType==="PERCENT"?100:undefined} value={form.discountValue} onChange={e=>setForm({...form,discountValue:Number(e.target.value)})} required/></div></div>
        <div className="grid grid-cols-2 gap-3"><div><label className="mb-1.5 block text-sm text-slate-300">Đơn tối thiểu</label><input className="input" type="number" min={0} value={form.minOrderAmount} onChange={e=>setForm({...form,minOrderAmount:Number(e.target.value)})}/></div><div><label className="mb-1.5 block text-sm text-slate-300">Giảm tối đa</label><input className="input" type="number" min={0} value={form.maxDiscount} onChange={e=>setForm({...form,maxDiscount:e.target.value})} placeholder="Trống = không giới hạn"/></div></div>
        <div className="grid grid-cols-2 gap-3"><div><label className="mb-1.5 block text-sm text-slate-300">Bắt đầu</label><input className="input" type="datetime-local" value={form.startsAt} onChange={e=>setForm({...form,startsAt:e.target.value})}/></div><div><label className="mb-1.5 block text-sm text-slate-300">Kết thúc</label><input className="input" type="datetime-local" value={form.endsAt} onChange={e=>setForm({...form,endsAt:e.target.value})}/></div></div>
        <div><label className="mb-1.5 block text-sm text-slate-300">Giới hạn tổng lượt sử dụng</label><input className="input" type="number" min={1} value={form.usageLimit} onChange={e=>setForm({...form,usageLimit:e.target.value})} placeholder="Trống = không giới hạn"/></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={e=>setForm({...form,active:e.target.checked})}/> Cho phép sử dụng mã này</label>
        <button className="btn btn-primary w-full" disabled={busy||!!duplicateVoucher} title={duplicateVoucher?`Mã ${duplicateVoucher.code} đã tồn tại`:undefined}>{busy?"Đang lưu...":editingId?"Lưu thay đổi":"Tạo mã ưu đãi"}</button>
      </form>

      <div className="space-y-4">
        <div className="card grid gap-3 p-4 md:grid-cols-[1fr_210px] lg:grid-cols-[1fr_210px_180px]"><input className="input" placeholder="Tìm theo mã hoặc tên ưu đãi..." value={query} onChange={e=>setQuery(e.target.value)}/><select className="input" value={filter} onChange={e=>setFilter(e.target.value)}><option value="ALL">Tất cả trạng thái</option><option>Đang dùng</option><option>Chưa bắt đầu</option><option>Hết hạn</option><option>Hết lượt</option><option>Tạm dừng</option></select><input className="input" type="number" min={0} value={testAmount} onChange={e=>setTestAmount(Number(e.target.value))} title="Giá trị đơn để test voucher"/></div>
        {testQuote&&<div className="card border border-emerald-700/60 p-4 text-sm"><b>Test gần nhất: {testQuote.code}</b><div className="mt-2 flex flex-wrap gap-5 text-slate-300"><span>Đơn: {currency(testAmount)}</span><span className="text-emerald-300">Giảm: -{currency(testQuote.discountAmount)}</span><span>Thanh toán: {currency(testQuote.finalAmount)}</span></div></div>}
        <div className="grid gap-3">{filtered.map(v=>{const st=currentStatus(v);return <div key={v.id} className="card p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><span className="rounded-lg bg-rose-500/15 px-2 py-1 text-base font-black text-rose-300">{v.code}</span><span className={`rounded-full px-2 py-1 text-xs ${st.cls}`}>{st.label}</span></div><div className="mt-2 text-lg font-bold">{v.name}</div><div className="mt-2 text-sm text-slate-400">{v.discountType==="PERCENT"?`Giảm ${v.discountValue}%`:`Giảm ${currency(v.discountValue)}`} · đơn từ {currency(v.minOrderAmount)}{v.maxDiscount!=null?` · tối đa ${currency(v.maxDiscount)}`:""}</div><div className="mt-1 text-xs text-slate-500">Đã dùng {v.usedCount}{v.usageLimit!=null?`/${v.usageLimit}`:" / không giới hạn"}{v.startsAt?` · từ ${dateTime(v.startsAt)}`:""}{v.endsAt?` · đến ${dateTime(v.endsAt)}`:""}</div></div><div className="flex flex-wrap gap-2"><button className="btn btn-secondary" onClick={()=>navigator.clipboard?.writeText(v.code)}>📋 Copy</button><button className="btn btn-secondary" onClick={()=>testVoucher(v)}>🧪 Test</button><button className="btn btn-secondary" onClick={()=>edit(v)}>✏️ Sửa</button><button className="btn btn-secondary" onClick={()=>toggle(v)}>{v.active?"⏸ Tạm dừng":"▶ Kích hoạt"}</button></div></div></div>})}{filtered.length===0&&<div className="card p-8 text-center text-slate-400">Chưa có mã ưu đãi phù hợp.</div>}</div>
      </div>
    </div>
  </div>;
}
