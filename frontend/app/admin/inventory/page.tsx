"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { api, currency, dateTime } from "@/lib/api";
import { getAuth } from "@/lib/auth";
import type { InventoryMovement, InventoryProduct, InventorySummary } from "@/lib/types";

export default function InventoryAdmin(){
  const [summary,setSummary]=useState<InventorySummary|null>(null);
  const [movements,setMovements]=useState<InventoryMovement[]>([]);
  const [selectedId,setSelectedId]=useState("");
  const [operation,setOperation]=useState<"RESTOCK"|"SET">("RESTOCK");
  const [quantity,setQuantity]=useState(20);
  const [note,setNote]=useState("");
  const [filter,setFilter]=useState<"ALL"|"LOW"|"SOLD_OUT">("ALL");
  const [msg,setMsg]=useState("");
  const [busy,setBusy]=useState(false);

  const load=async(productId?:string)=>{
    const [s,m]=await Promise.all([
      api<InventorySummary>("/admin/inventory"),
      api<InventoryMovement[]>(`/admin/inventory/movements${productId?`?productId=${encodeURIComponent(productId)}`:""}`)
    ]);
    setSummary(s);setMovements(m);
    if(!selectedId&&s.products.length)setSelectedId(s.products[0].productId);
  };

  useEffect(()=>{
    const a=getAuth();
    if(!a||a.role!=="ADMIN"){location.href="/login?next=/admin/inventory";return;}
    load().catch(e=>setMsg((e as Error).message));
  },[]);

  const products=useMemo(()=>{
    const list=summary?.products||[];
    if(filter==="LOW")return list.filter(p=>p.inventoryEnabled&&p.lowStock&&!p.soldOut);
    if(filter==="SOLD_OUT")return list.filter(p=>p.inventoryEnabled&&p.soldOut);
    return list;
  },[summary,filter]);
  const selected=summary?.products.find(p=>p.productId===selectedId);

  async function submit(e:FormEvent){
    e.preventDefault();if(!selectedId)return;setBusy(true);setMsg("");
    try{
      await api<InventoryProduct>("/admin/inventory/adjustments",{method:"POST",body:JSON.stringify({productId:selectedId,operation,quantity:Number(quantity),note:note.trim()||null})});
      setNote("");await load(selectedId);setMsg(operation==="RESTOCK"?"Đã nhập kho và ghi lịch sử.":"Đã điều chỉnh tồn kho và ghi lịch sử.");
    }catch(e){setMsg((e as Error).message);}finally{setBusy(false);}
  }

  async function viewHistory(id:string){setSelectedId(id);try{setMovements(await api<InventoryMovement[]>(`/admin/inventory/movements?productId=${encodeURIComponent(id)}`));}catch(e){setMsg((e as Error).message)}}
  async function allHistory(){try{setMovements(await api<InventoryMovement[]>("/admin/inventory/movements"));}catch(e){setMsg((e as Error).message)}}

  return <div className="space-y-7">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="section-kicker">INVENTORY · V19</p><h1 className="text-3xl font-black">Kho bắp nước & combo</h1><p className="mt-1 text-slate-400">Giữ tồn cho đơn chờ thanh toán, xuất kho khi payment thành công và hoàn kho khi refund.</p></div>
      <div className="flex flex-wrap gap-2"><Link className="btn btn-secondary" href="/admin/commerce">🍿 Sản phẩm</Link><Link className="btn btn-secondary" href="/admin">← Admin</Link></div>
    </div>

    {msg&&<div className="card p-4 text-sm">{msg}</div>}
    {summary&&<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      <Kpi label="Sản phẩm theo dõi" value={summary.trackedProducts}/><Kpi label="Tồn thực tế" value={summary.totalOnHand}/><Kpi label="Đang giữ" value={summary.totalReserved}/><Kpi label="Khả dụng" value={summary.totalAvailable}/><Kpi label="Sắp hết" value={summary.lowStockProducts} warn={summary.lowStockProducts>0}/><Kpi label="Hết hàng" value={summary.soldOutProducts} danger={summary.soldOutProducts>0}/>
    </div>}

    <section className="grid gap-6 xl:grid-cols-[380px_1fr]">
      <form onSubmit={submit} className="card h-fit space-y-4 p-5 xl:sticky xl:top-24">
        <div><h2 className="text-xl font-bold">Nhập / điều chỉnh kho</h2><p className="mt-1 text-xs leading-5 text-slate-500">Không sửa trực tiếp số tồn trong sản phẩm; mọi thay đổi được ghi vào sổ kho.</p></div>
        <label className="block text-sm"><span className="mb-1 block text-slate-400">Sản phẩm</span><select className="input" value={selectedId} onChange={e=>{setSelectedId(e.target.value);void viewHistory(e.target.value)}}>{summary?.products.map(p=><option key={p.productId} value={p.productId}>{p.name} · còn {p.stockAvailable}</option>)}</select></label>
        {selected&&<div className="rounded-2xl border border-slate-700 bg-slate-950/45 p-4 text-sm"><div className="font-bold">{selected.name}</div><div className="mt-2 grid grid-cols-3 gap-2 text-center"><Mini label="Tồn" value={selected.stockOnHand}/><Mini label="Giữ" value={selected.stockReserved}/><Mini label="Bán được" value={selected.stockAvailable}/></div>{selected.stockReserved>0&&<p className="mt-3 text-xs text-amber-300">Có {selected.stockReserved} phần đang được giữ cho booking PENDING; không thể SET tồn thấp hơn mức này.</p>}</div>}
        <div className="grid grid-cols-2 gap-3"><button type="button" className={`btn ${operation==="RESTOCK"?"btn-primary":"btn-secondary"}`} onClick={()=>setOperation("RESTOCK")}>+ Nhập kho</button><button type="button" className={`btn ${operation==="SET"?"btn-primary":"btn-secondary"}`} onClick={()=>setOperation("SET")}>Đặt tồn</button></div>
        <label className="block text-sm"><span className="mb-1 block text-slate-400">{operation==="RESTOCK"?"Số lượng nhập thêm":"Tồn thực tế mới"}</span><input className="input" type="number" min={operation==="RESTOCK"?1:0} value={quantity} onChange={e=>setQuantity(Number(e.target.value))} required/></label>
        <textarea className="input" value={note} onChange={e=>setNote(e.target.value)} placeholder="Ghi chú: nhập hàng ca sáng, kiểm kê cuối ngày..." maxLength={300}/>
        <button className="btn btn-primary w-full" disabled={busy||!selectedId}>{busy?"Đang lưu...":operation==="RESTOCK"?"Nhập kho & ghi sổ":"Cập nhật tồn & ghi sổ"}</button>
      </form>

      <div className="space-y-5">
        <div className="card p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold">Tình trạng kho</h2><p className="text-xs text-slate-500">Khả dụng = tồn thực tế - số đang giữ cho booking chờ thanh toán.</p></div><div className="flex gap-2"><button className={`btn ${filter==="ALL"?"btn-primary":"btn-secondary"}`} onClick={()=>setFilter("ALL")}>Tất cả</button><button className={`btn ${filter==="LOW"?"btn-primary":"btn-secondary"}`} onClick={()=>setFilter("LOW")}>Sắp hết</button><button className={`btn ${filter==="SOLD_OUT"?"btn-primary":"btn-secondary"}`} onClick={()=>setFilter("SOLD_OUT")}>Hết hàng</button></div></div></div>
        <div className="grid gap-3 md:grid-cols-2">{products.map(p=><ProductCard key={p.productId} p={p} onHistory={()=>viewHistory(p.productId)}/>)}</div>
        {!products.length&&<div className="card p-8 text-center text-slate-500">Không có sản phẩm phù hợp bộ lọc.</div>}
      </div>
    </section>

    <section className="card overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-5"><div><h2 className="text-xl font-bold">Sổ nhập / xuất kho</h2><p className="mt-1 text-xs text-slate-500">RESERVE/RELEASE theo booking, SALE khi thanh toán, REFUND khi hoàn vé.</p></div><button className="btn btn-secondary" onClick={allHistory}>Xem tất cả</button></div><div className="overflow-x-auto"><table className="w-full min-w-[920px] text-sm"><thead className="bg-slate-950/45 text-left text-slate-400"><tr><th className="p-3">Thời gian</th><th className="p-3">Sản phẩm</th><th className="p-3">Loại</th><th className="p-3">Δ tồn</th><th className="p-3">Δ giữ</th><th className="p-3">Sau giao dịch</th><th className="p-3">Booking / người thao tác</th><th className="p-3">Ghi chú</th></tr></thead><tbody>{movements.map(m=><tr key={m.id} className="border-t border-slate-800/80"><td className="p-3 whitespace-nowrap">{dateTime(m.createdAt)}</td><td className="p-3 font-semibold">{m.productName}</td><td className="p-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${movementClass(m.movementType)}`}>{m.movementType}</span></td><td className={`p-3 font-bold ${m.quantityDelta>0?"text-emerald-300":m.quantityDelta<0?"text-rose-300":"text-slate-500"}`}>{signed(m.quantityDelta)}</td><td className={`p-3 font-bold ${m.reservedDelta>0?"text-amber-300":m.reservedDelta<0?"text-cyan-300":"text-slate-500"}`}>{signed(m.reservedDelta)}</td><td className="p-3">Tồn {m.stockAfter} · Giữ {m.reservedAfter}</td><td className="p-3"><div className="max-w-[240px] break-all text-xs text-slate-400">{m.bookingId?`Booking ${m.bookingId}`:m.actorEmail||"Hệ thống"}</div></td><td className="p-3 text-xs text-slate-400">{m.note||"-"}</td></tr>)}</tbody></table>{!movements.length&&<div className="p-8 text-center text-slate-500">Chưa có biến động kho.</div>}</div></section>
  </div>;
}

function Kpi({label,value,warn,danger}:{label:string;value:number;warn?:boolean;danger?:boolean}){return <div className={`card p-4 ${danger?"border-rose-800/60":warn?"border-amber-700/60":""}`}><div className="text-xs uppercase tracking-wider text-slate-500">{label}</div><div className={`mt-1 text-2xl font-black ${danger?"text-rose-300":warn?"text-amber-300":""}`}>{value}</div></div>}
function Mini({label,value}:{label:string;value:number}){return <div className="rounded-xl bg-slate-900 p-2"><div className="text-[10px] uppercase text-slate-500">{label}</div><b>{value}</b></div>}
function ProductCard({p,onHistory}:{p:InventoryProduct;onHistory:()=>void}){return <div className={`card p-5 ${p.soldOut?"border-rose-800/60":p.lowStock?"border-amber-700/50":""}`}><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold">{p.name}</h3><div className="mt-1 text-sm text-amber-300">{currency(p.price)}</div></div><span className={`rounded-full px-2 py-1 text-xs font-bold ${!p.inventoryEnabled?"bg-slate-800 text-slate-400":p.soldOut?"bg-rose-950 text-rose-300":p.lowStock?"bg-amber-950 text-amber-300":"bg-emerald-950 text-emerald-300"}`}>{!p.inventoryEnabled?"Không theo dõi":p.soldOut?"Hết hàng":p.lowStock?"Sắp hết":"Còn hàng"}</span></div><div className="mt-4 grid grid-cols-3 gap-2 text-center"><Mini label="Tồn" value={p.stockOnHand}/><Mini label="Đang giữ" value={p.stockReserved}/><Mini label="Khả dụng" value={p.stockAvailable}/></div><div className="mt-3 flex items-center justify-between text-xs text-slate-500"><span>Ngưỡng cảnh báo: {p.lowStockThreshold}</span><button className="font-semibold text-rose-300 hover:underline" onClick={onHistory}>Xem lịch sử</button></div></div>}
function signed(v:number){return v>0?`+${v}`:`${v}`}
function movementClass(t:string){if(t==="SALE")return "bg-rose-950 text-rose-300";if(t==="REFUND"||t==="RESTOCK")return "bg-emerald-950 text-emerald-300";if(t==="RESERVE")return "bg-amber-950 text-amber-300";if(t==="RELEASE")return "bg-cyan-950 text-cyan-300";return "bg-slate-800 text-slate-300"}
