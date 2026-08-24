"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { api, currency, dateTime } from "@/lib/api";
import { getAuth } from "@/lib/auth";
import type { InventoryBranchOverview, InventoryMovement, InventoryProduct, InventorySummary, InventoryTransfer } from "@/lib/types";

export default function InventoryAdmin(){
  const [branches,setBranches]=useState<InventoryBranchOverview[]>([]);
  const [cinemaId,setCinemaId]=useState("");
  const [summary,setSummary]=useState<InventorySummary|null>(null);
  const [movements,setMovements]=useState<InventoryMovement[]>([]);
  const [selectedId,setSelectedId]=useState("");
  const [operation,setOperation]=useState<"RESTOCK"|"SET"|"WASTE">("RESTOCK");
  const [quantity,setQuantity]=useState(20);
  const [threshold,setThreshold]=useState(10);
  const [target,setTarget]=useState(50);
  const [price,setPrice]=useState(0);
  const [transferTo,setTransferTo]=useState("");
  const [transferQty,setTransferQty]=useState(10);
  const [note,setNote]=useState("");
  const [filter,setFilter]=useState<"ALL"|"LOW"|"SOLD_OUT">("ALL");
  const [msg,setMsg]=useState("");
  const [busy,setBusy]=useState(false);

  async function loadBranches(){
    const rows=await api<InventoryBranchOverview[]>("/admin/inventory/branches");
    setBranches(rows);
    const next=cinemaId||rows[0]?.cinemaId||"";
    if(next&&!cinemaId)setCinemaId(next);
    if(next&&!transferTo)setTransferTo(rows.find(x=>x.cinemaId!==next)?.cinemaId||"");
    return next;
  }

  async function load(cid:string,productId?:string){
    if(!cid)return;
    const query=`cinemaId=${encodeURIComponent(cid)}${productId?`&productId=${encodeURIComponent(productId)}`:""}`;
    const [s,m]=await Promise.all([
      api<InventorySummary>(`/admin/inventory?cinemaId=${encodeURIComponent(cid)}`),
      api<InventoryMovement[]>(`/admin/inventory/movements?${query}`)
    ]);
    setSummary(s);setMovements(m);
    const chosen=productId||selectedId||s.products[0]?.productId||"";
    setSelectedId(chosen);
    const p=s.products.find(x=>x.productId===chosen)||s.products[0];
    if(p){setThreshold(p.lowStockThreshold);setTarget(p.targetStock);setPrice(p.price);}
  }

  useEffect(()=>{
    const a=getAuth();
    if(!a||a.role!=="ADMIN"){location.href="/login?next=/admin/inventory";return;}
    loadBranches().then(cid=>load(cid)).catch(e=>setMsg((e as Error).message));
  },[]);

  const products=useMemo(()=>{
    const list=summary?.products||[];
    if(filter==="LOW")return list.filter(p=>p.inventoryEnabled&&p.lowStock&&!p.soldOut);
    if(filter==="SOLD_OUT")return list.filter(p=>p.inventoryEnabled&&p.soldOut);
    return list;
  },[summary,filter]);
  const selected=summary?.products.find(p=>p.productId===selectedId);
  const branch=branches.find(b=>b.cinemaId===cinemaId);

  async function changeCinema(id:string){setCinemaId(id);setSelectedId("");setTransferTo(branches.find(x=>x.cinemaId!==id)?.cinemaId||"");await load(id);}
  async function selectProduct(id:string){setSelectedId(id);const p=summary?.products.find(x=>x.productId===id);if(p){setThreshold(p.lowStockThreshold);setTarget(p.targetStock);setPrice(p.price);}await load(cinemaId,id);}

  async function submit(e:FormEvent){
    e.preventDefault();if(!selectedId||!cinemaId)return;setBusy(true);setMsg("");
    try{
      await api<InventoryProduct>("/admin/inventory/adjustments",{method:"POST",body:JSON.stringify({cinemaId,productId:selectedId,operation,quantity:Number(quantity),lowStockThreshold:Number(threshold),targetStock:Number(target),note:note.trim()||null})});
      setNote("");await Promise.all([load(cinemaId,selectedId),loadBranches()]);setMsg(operation==="RESTOCK"?"Đã nhập kho cho chi nhánh.":operation==="WASTE"?"Đã ghi nhận hao hụt.":"Đã cập nhật tồn kiểm kê.");
    }catch(e){setMsg((e as Error).message);}finally{setBusy(false);}
  }

  async function savePrice(){if(!selectedId||!cinemaId)return;setBusy(true);setMsg("");try{await api("/admin/inventory/prices",{method:"PUT",body:JSON.stringify({cinemaId,productId:selectedId,price:Number(price),active:true})});await load(cinemaId,selectedId);setMsg("Đã cập nhật giá bán tại rạp.");}catch(e){setMsg((e as Error).message)}finally{setBusy(false)}}
  async function transfer(){if(!selectedId||!cinemaId||!transferTo)return;setBusy(true);setMsg("");try{const r=await api<InventoryTransfer>("/admin/inventory/transfers",{method:"POST",body:JSON.stringify({productId:selectedId,fromCinemaId:cinemaId,toCinemaId:transferTo,quantity:Number(transferQty),note:note.trim()||null})});await Promise.all([load(cinemaId,selectedId),loadBranches()]);setMsg(`Đã điều chuyển ${r.quantity} ${r.productName} đến ${r.toCinemaName}. Mã ${r.referenceKey}`);}catch(e){setMsg((e as Error).message)}finally{setBusy(false)}}
  async function allHistory(){try{setMovements(await api<InventoryMovement[]>(`/admin/inventory/movements?cinemaId=${encodeURIComponent(cinemaId)}`));}catch(e){setMsg((e as Error).message)}}

  return <div className="space-y-7" data-testid="inventory-v48">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="section-kicker">INVENTORY · V48</p><h1 className="text-3xl font-black">Kho bắp nước theo rạp</h1><p className="mt-1 text-slate-400">Tồn kho, giá bán, hao hụt và điều chuyển được quản lý riêng cho từng chi nhánh.</p></div>
      <div className="flex flex-wrap gap-2"><Link className="btn btn-secondary" href="/admin/commerce">🍿 Danh mục sản phẩm</Link><Link className="btn btn-secondary" href="/admin">← Admin</Link></div>
    </div>

    <section className="card p-5">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end"><label className="block text-sm"><span className="mb-1 block text-slate-400">Chi nhánh đang quản lý</span><select data-testid="inventory-cinema-select" className="input" value={cinemaId} onChange={e=>void changeCinema(e.target.value)}>{branches.map(b=><option key={b.cinemaId} value={b.cinemaId}>{b.cinemaName} · khả dụng {b.totalAvailable} · cảnh báo {b.lowStockProducts+b.soldOutProducts}</option>)}</select></label><button className="btn btn-secondary" onClick={()=>void Promise.all([loadBranches(),load(cinemaId,selectedId||undefined)])}>Làm mới</button></div>
      {branch&&<p className="mt-3 text-xs text-slate-500">{branch.cinemaName}: {branch.trackedProducts} mặt hàng · {branch.totalAvailable} phần khả dụng · {branch.lowStockProducts} sắp hết · {branch.soldOutProducts} hết hàng.</p>}
    </section>

    {msg&&<div className="card p-4 text-sm" role="status">{msg}</div>}
    {summary&&<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      <Kpi label="Sản phẩm theo dõi" value={summary.trackedProducts}/><Kpi label="Tồn thực tế" value={summary.totalOnHand}/><Kpi label="Đang giữ" value={summary.totalReserved}/><Kpi label="Khả dụng" value={summary.totalAvailable}/><Kpi label="Sắp hết" value={summary.lowStockProducts} warn={summary.lowStockProducts>0}/><Kpi label="Hết hàng" value={summary.soldOutProducts} danger={summary.soldOutProducts>0}/>
    </div>}

    <section className="grid gap-6 xl:grid-cols-[390px_1fr]">
      <div className="space-y-5 xl:sticky xl:top-24 xl:h-fit">
        <form onSubmit={submit} className="card space-y-4 p-5">
          <div><h2 className="text-xl font-bold">Nhập / kiểm kê / hao hụt</h2><p className="mt-1 text-xs leading-5 text-slate-500">Mọi thay đổi đều sinh inventory movement có rạp và người thao tác.</p></div>
          <label className="block text-sm"><span className="mb-1 block text-slate-400">Sản phẩm</span><select data-testid="inventory-product-select" className="input" value={selectedId} onChange={e=>void selectProduct(e.target.value)}>{summary?.products.map(p=><option key={p.productId} value={p.productId}>{p.name} · còn {p.stockAvailable}</option>)}</select></label>
          {selected&&<div className="rounded-2xl border border-slate-700 bg-slate-950/45 p-4 text-sm"><div className="font-bold">{selected.name}</div><div className="mt-2 grid grid-cols-3 gap-2 text-center"><Mini label="Tồn" value={selected.stockOnHand}/><Mini label="Giữ" value={selected.stockReserved}/><Mini label="Khả dụng" value={selected.stockAvailable}/></div><div className="mt-3 text-xs text-slate-400">Mục tiêu {selected.targetStock} · cảnh báo ≤ {selected.lowStockThreshold}</div></div>}
          <div className="grid grid-cols-3 gap-2"><OpButton label="+ Nhập" active={operation==="RESTOCK"} onClick={()=>setOperation("RESTOCK")}/><OpButton label="Kiểm kê" active={operation==="SET"} onClick={()=>setOperation("SET")}/><OpButton label="Hao hụt" active={operation==="WASTE"} onClick={()=>setOperation("WASTE")}/></div>
          <label className="block text-sm"><span className="mb-1 block text-slate-400">{operation==="RESTOCK"?"Số lượng nhập thêm":operation==="SET"?"Tồn thực tế mới":"Số lượng hao hụt"}</span><input className="input" type="number" min={operation==="SET"?0:1} value={quantity} onChange={e=>setQuantity(Number(e.target.value))} required/></label>
          <div className="grid grid-cols-2 gap-3"><label className="text-sm"><span className="mb-1 block text-slate-400">Ngưỡng cảnh báo</span><input className="input" type="number" min={0} value={threshold} onChange={e=>setThreshold(Number(e.target.value))}/></label><label className="text-sm"><span className="mb-1 block text-slate-400">Tồn mục tiêu</span><input className="input" type="number" min={0} value={target} onChange={e=>setTarget(Number(e.target.value))}/></label></div>
          <textarea className="input" value={note} onChange={e=>setNote(e.target.value)} placeholder="Ghi chú nghiệp vụ..." maxLength={300}/>
          <button className="btn btn-primary w-full" disabled={busy||!selectedId}>{busy?"Đang lưu...":"Ghi sổ kho"}</button>
        </form>

        <div className="card space-y-4 p-5"><h2 className="font-bold">Giá theo rạp</h2><p className="text-xs text-slate-500">Giá này được dùng trực tiếp khi khách đặt bắp nước tại suất chiếu của chi nhánh.</p>{selected&&<><div className="text-xs text-slate-400">Giá gốc: {currency(selected.basePrice)} {selected.priceOverride&&<span className="ml-2 text-amber-300">· đang override</span>}</div><input data-testid="branch-price-input" className="input" type="number" min={0} value={price} onChange={e=>setPrice(Number(e.target.value))}/><button data-testid="branch-price-save" className="btn btn-secondary w-full" disabled={busy} onClick={()=>void savePrice()}>Lưu giá chi nhánh</button></>}</div>

        <div className="card space-y-4 p-5"><h2 className="font-bold">Điều chuyển giữa rạp</h2><p className="text-xs text-slate-500">Chỉ chuyển phần khả dụng; phần đang giữ cho booking PENDING không bị lấy đi.</p><select className="input" value={transferTo} onChange={e=>setTransferTo(e.target.value)}>{branches.filter(b=>b.cinemaId!==cinemaId).map(b=><option key={b.cinemaId} value={b.cinemaId}>{b.cinemaName}</option>)}</select><input className="input" type="number" min={1} value={transferQty} onChange={e=>setTransferQty(Number(e.target.value))}/><button data-testid="inventory-transfer-button" className="btn btn-secondary w-full" disabled={busy||!transferTo||!selectedId} onClick={()=>void transfer()}>Điều chuyển tồn kho</button></div>
      </div>

      <div className="space-y-5">
        <div className="card p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold">Tình trạng {summary?.cinemaName}</h2><p className="text-xs text-slate-500">Khả dụng = tồn thực tế - lượng đang giữ cho booking chờ thanh toán.</p></div><div className="flex gap-2"><FilterButton label="Tất cả" active={filter==="ALL"} onClick={()=>setFilter("ALL")}/><FilterButton label="Sắp hết" active={filter==="LOW"} onClick={()=>setFilter("LOW")}/><FilterButton label="Hết hàng" active={filter==="SOLD_OUT"} onClick={()=>setFilter("SOLD_OUT")}/></div></div></div>
        <div className="grid gap-3 md:grid-cols-2">{products.map(p=><ProductCard key={p.productId} p={p} onHistory={()=>void selectProduct(p.productId)}/>)}</div>
        {!products.length&&<div className="card p-8 text-center text-slate-500">Không có sản phẩm phù hợp bộ lọc.</div>}
      </div>
    </section>

    <section className="card overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-5"><div><h2 className="text-xl font-bold">Sổ nhập / xuất kho theo rạp</h2><p className="mt-1 text-xs text-slate-500">RESTOCK · RESERVE · RELEASE · SALE · REFUND · WASTE · TRANSFER_IN/OUT · LOYALTY_REWARD.</p></div><button className="btn btn-secondary" onClick={()=>void allHistory()}>Xem toàn chi nhánh</button></div><div className="overflow-x-auto"><table className="w-full min-w-[1080px] text-sm"><thead className="bg-slate-950/45 text-left text-slate-400"><tr><th className="p-3">Thời gian</th><th className="p-3">Rạp</th><th className="p-3">Sản phẩm</th><th className="p-3">Loại</th><th className="p-3">Δ tồn</th><th className="p-3">Δ giữ</th><th className="p-3">Sau giao dịch</th><th className="p-3">Tham chiếu</th><th className="p-3">Ghi chú</th></tr></thead><tbody>{movements.map(m=><tr key={m.id} className="border-t border-slate-800/80"><td className="p-3 whitespace-nowrap">{dateTime(m.createdAt)}</td><td className="p-3 text-xs">{m.cinemaName}</td><td className="p-3 font-semibold">{m.productName}</td><td className="p-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${movementClass(m.movementType)}`}>{m.movementType}</span></td><td className={`p-3 font-bold ${m.quantityDelta>0?"text-emerald-300":m.quantityDelta<0?"text-rose-300":"text-slate-500"}`}>{signed(m.quantityDelta)}</td><td className={`p-3 font-bold ${m.reservedDelta>0?"text-amber-300":m.reservedDelta<0?"text-cyan-300":"text-slate-500"}`}>{signed(m.reservedDelta)}</td><td className="p-3">Tồn {m.stockAfter} · Giữ {m.reservedAfter}</td><td className="p-3"><div className="max-w-[260px] break-all text-xs text-slate-400">{m.referenceKey||m.bookingId||m.actorEmail||"Hệ thống"}</div></td><td className="p-3 text-xs text-slate-400">{m.note||"-"}</td></tr>)}</tbody></table>{!movements.length&&<div className="p-8 text-center text-slate-500">Chưa có biến động kho tại chi nhánh này.</div>}</div></section>
  </div>;
}

function Kpi({label,value,warn,danger}:{label:string;value:number;warn?:boolean;danger?:boolean}){return <div className={`card p-4 ${danger?"border-rose-800/60":warn?"border-amber-700/60":""}`}><div className="text-xs uppercase tracking-wider text-slate-500">{label}</div><div className={`mt-1 text-2xl font-black ${danger?"text-rose-300":warn?"text-amber-300":""}`}>{value}</div></div>}
function Mini({label,value}:{label:string;value:number}){return <div className="rounded-xl bg-slate-900 p-2"><div className="text-[10px] uppercase text-slate-500">{label}</div><b>{value}</b></div>}
function OpButton({label,active,onClick}:{label:string;active:boolean;onClick:()=>void}){return <button type="button" className={`btn ${active?"btn-primary":"btn-secondary"} !px-2`} onClick={onClick}>{label}</button>}
function FilterButton({label,active,onClick}:{label:string;active:boolean;onClick:()=>void}){return <button className={`btn ${active?"btn-primary":"btn-secondary"}`} onClick={onClick}>{label}</button>}
function ProductCard({p,onHistory}:{p:InventoryProduct;onHistory:()=>void}){return <div className={`card p-5 ${p.soldOut?"border-rose-800/60":p.lowStock?"border-amber-700/50":""}`} data-testid="inventory-product-card"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold">{p.name}</h3><div className="mt-1 text-sm text-amber-300">{currency(p.price)} {p.priceOverride&&<span className="text-[10px] text-violet-300">· giá chi nhánh</span>}</div></div><span className={`rounded-full px-2 py-1 text-xs font-bold ${!p.inventoryEnabled?"bg-slate-800 text-slate-400":p.soldOut?"bg-rose-950 text-rose-300":p.lowStock?"bg-amber-950 text-amber-300":"bg-emerald-950 text-emerald-300"}`}>{!p.inventoryEnabled?"Không theo dõi":p.soldOut?"Hết hàng":p.lowStock?"Sắp hết":"Còn hàng"}</span></div><div className="mt-4 grid grid-cols-3 gap-2 text-center"><Mini label="Tồn" value={p.stockOnHand}/><Mini label="Đang giữ" value={p.stockReserved}/><Mini label="Khả dụng" value={p.stockAvailable}/></div><div className="mt-3 flex items-center justify-between text-xs text-slate-500"><span>Cảnh báo {p.lowStockThreshold} · mục tiêu {p.targetStock}</span><button className="font-semibold text-rose-300 hover:underline" onClick={onHistory}>Xem lịch sử</button></div></div>}
function signed(v:number){return v>0?`+${v}`:`${v}`}
function movementClass(t:string){if(t==="SALE"||t==="WASTE"||t==="TRANSFER_OUT")return "bg-rose-950 text-rose-300";if(t==="REFUND"||t==="RESTOCK"||t==="TRANSFER_IN")return "bg-emerald-950 text-emerald-300";if(t==="RESERVE")return "bg-amber-950 text-amber-300";if(t==="RELEASE")return "bg-cyan-950 text-cyan-300";return "bg-slate-800 text-slate-300"}
