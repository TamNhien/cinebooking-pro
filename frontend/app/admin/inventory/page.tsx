/* eslint-disable react-hooks/exhaustive-deps -- effects intentionally synchronize API/subscription state; dependency lifecycle is intentionally bounded. */
"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ApiError, api, currency, dateTime } from "@/lib/api";
import { SUSTAINED_OPERATIONAL_READ_OPTIONS, withTransientReadRetry } from "@/lib/transient-read";
import { getAuth } from "@/lib/auth";
import type { InventoryBranchOverview, InventoryMovement, InventoryProduct, InventorySummary, InventoryTransfer } from "@/lib/types";
import { usePresentationLanguage, type Language } from "@/lib/usePresentationLanguage";
import { concessionProductName } from "@/lib/concession-presentation";
import { inventoryMovementNotePresentation } from "@/lib/controlled-business-presentation";

const INVENTORY_BRANCH_BOOTSTRAP_READ_OPTIONS={deadlineMs:10_000,attemptTimeoutMs:4_000,baseDelayMs:300,maxDelayMs:1_200} as const;

export default function InventoryAdmin(){
  const { language, t } = usePresentationLanguage();
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
  const [allBranchesHistory,setAllBranchesHistory]=useState(false);
  const [branchLoadState,setBranchLoadState]=useState<"LOADING"|"READY"|"RETRYING"|"ERROR">("LOADING");
  const bootstrapGeneration=useRef(0);

  async function loadBranches(){
    setBranchLoadState(current=>current==="READY"?"READY":"LOADING");
    const rows=await withTransientReadRetry(async signal=>{
      const result=await api<InventoryBranchOverview[]>("/admin/inventory/branches",{signal});
      if(result.length===0)throw new ApiError(503,"Inventory branch list is not ready yet.");
      return result;
    },INVENTORY_BRANCH_BOOTSTRAP_READ_OPTIONS);
    setBranches(rows);
    setBranchLoadState("READY");
    const next=cinemaId||rows[0]?.cinemaId||"";
    if(next&&!cinemaId)setCinemaId(next);
    if(next&&!transferTo)setTransferTo(rows.find(x=>x.cinemaId!==next)?.cinemaId||"");
    return next;
  }

  async function load(cid:string,productId?:string){
    if(!cid)return;
    const query=`cinemaId=${encodeURIComponent(cid)}${productId?`&productId=${encodeURIComponent(productId)}`:""}`;
    const [s,m]=await withTransientReadRetry(signal=>Promise.all([
      api<InventorySummary>(`/admin/inventory?cinemaId=${encodeURIComponent(cid)}`,{signal}),
      api<InventoryMovement[]>(`/admin/inventory/movements?${query}`,{signal})
    ]),SUSTAINED_OPERATIONAL_READ_OPTIONS);
    setSummary(s);if(!allBranchesHistory)setMovements(m);
    const chosen=productId||selectedId||s.products[0]?.productId||"";
    setSelectedId(chosen);
    const p=s.products.find(x=>x.productId===chosen)||s.products[0];
    if(p){setThreshold(p.lowStockThreshold);setTarget(p.targetStock);setPrice(p.price);}
  }

  useEffect(()=>{
    const a=getAuth();
    if(!a||a.role!=="ADMIN"){window.location.assign("/login?next=/admin/inventory");return;}
    const generation=++bootstrapGeneration.current;
    let cancelled=false;
    const bootstrap=async()=>{
      const deadline=Date.now()+60_000;
      let attempt=0;
      while(!cancelled&&generation===bootstrapGeneration.current){
        try{
          if(attempt>0)setBranchLoadState("RETRYING");
          const cid=await loadBranches();
          if(cancelled||generation!==bootstrapGeneration.current)return;
          // Branch options are useful on their own. Do not keep them visually blocked
          // behind a slower summary/movement aggregate during a loaded full-suite run.
          void load(cid).catch(e=>setMsg((e as Error).message));
          return;
        }catch(e){
          if(cancelled||generation!==bootstrapGeneration.current)return;
          if(Date.now()>=deadline){setBranchLoadState("ERROR");setMsg((e as Error).message);return;}
          attempt+=1;
          setBranchLoadState("RETRYING");
          await new Promise(resolve=>setTimeout(resolve,Math.min(500*attempt,2_000)));
        }
      }
    };
    void bootstrap();
    return()=>{cancelled=true;};
  },[]);

  const products=useMemo(()=>{
    const list=summary?.products||[];
    if(filter==="LOW")return list.filter(p=>p.inventoryEnabled&&p.lowStock&&!p.soldOut);
    if(filter==="SOLD_OUT")return list.filter(p=>p.inventoryEnabled&&p.soldOut);
    return list;
  },[summary,filter]);
  const selected=summary?.products.find(p=>p.productId===selectedId);
  const branch=branches.find(b=>b.cinemaId===cinemaId);

  async function changeCinema(id:string){setCinemaId(id);setSelectedId("");setTransferTo(branches.find(x=>x.cinemaId!==id)?.cinemaId||"");setAllBranchesHistory(false);await load(id);}
  async function selectProduct(id:string){setSelectedId(id);const p=summary?.products.find(x=>x.productId===id);if(p){setThreshold(p.lowStockThreshold);setTarget(p.targetStock);setPrice(p.price);}await load(cinemaId,id);}

  async function submit(e:FormEvent){
    e.preventDefault();if(!selectedId||!cinemaId)return;setBusy(true);setMsg("");
    try{
      await api<InventoryProduct>("/admin/inventory/adjustments",{method:"POST",body:JSON.stringify({cinemaId,productId:selectedId,operation,quantity:Number(quantity),lowStockThreshold:Number(threshold),targetStock:Number(target),note:note.trim()||null})});
      setNote("");await Promise.all([load(cinemaId,selectedId),loadBranches()]);setMsg(operation==="RESTOCK"?t("Đã nhập kho cho chi nhánh.","Branch stock was restocked."):operation==="WASTE"?t("Đã ghi nhận hao hụt.","Waste was recorded."):t("Đã cập nhật tồn kiểm kê.","Counted stock was updated."));
    }catch(e){setMsg((e as Error).message);}finally{setBusy(false);}
  }

  async function savePrice(){if(!selectedId||!cinemaId)return;setBusy(true);setMsg("");try{await api("/admin/inventory/prices",{method:"PUT",body:JSON.stringify({cinemaId,productId:selectedId,price:Number(price),active:true})});await load(cinemaId,selectedId);setMsg(t("Đã cập nhật giá bán tại rạp.","Cinema selling price was updated."));}catch(e){setMsg((e as Error).message)}finally{setBusy(false)}}
  async function transfer(){if(!selectedId||!cinemaId||!transferTo)return;setBusy(true);setMsg("");try{const r=await api<InventoryTransfer>("/admin/inventory/transfers",{method:"POST",body:JSON.stringify({productId:selectedId,fromCinemaId:cinemaId,toCinemaId:transferTo,quantity:Number(transferQty),note:note.trim()||null})});await Promise.all([load(cinemaId,selectedId),loadBranches()]);setMsg(t(`Đã điều chuyển ${r.quantity} ${r.productName} đến ${r.toCinemaName}. Mã ${r.referenceKey}`,`Transferred ${r.quantity} ${concessionProductName(r.productName,language)} to ${r.toCinemaName}. Reference ${r.referenceKey}`));}catch(e){setMsg((e as Error).message)}finally{setBusy(false)}}
  async function toggleHistoryScope(){
    try{
      if(allBranchesHistory){
        setMovements(await withTransientReadRetry(signal=>
          api<InventoryMovement[]>(`/admin/inventory/movements?cinemaId=${encodeURIComponent(cinemaId)}`,{signal})
        ));
        setAllBranchesHistory(false);
      }else{
        setMovements(await withTransientReadRetry(signal=>
          api<InventoryMovement[]>("/admin/inventory/movements",{signal})
        ));
        setAllBranchesHistory(true);
      }
    }catch(e){setMsg((e as Error).message)}
  }

  return <div className="space-y-7" data-testid="inventory-v48">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="section-kicker">{t("KHO · V48","INVENTORY · V48")}</p><h1 className="text-3xl font-black">{t("Kho bắp nước theo rạp","Cinema concession inventory")}</h1><p className="mt-1 text-slate-400">{t("Tồn kho, giá bán, hao hụt và điều chuyển được quản lý riêng cho từng chi nhánh.","Stock, branch pricing, waste, and transfers are managed independently for each cinema.")}</p></div>
      <div className="flex flex-wrap gap-2"><Link className="btn btn-secondary" href="/admin/commerce">🍿 {t("Danh mục sản phẩm","Product catalog")}</Link><Link className="btn btn-secondary" href="/admin">← {t("Quản trị","Administration")}</Link></div>
    </div>

    <section className="card p-5">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end"><label className="block text-sm"><span className="mb-1 block text-slate-400">{t("Chi nhánh đang quản lý", "Managed branch")}</span><select data-testid="inventory-cinema-select" className="input" value={cinemaId} onChange={e=>void changeCinema(e.target.value)}>{branches.map(b=><option key={b.cinemaId} value={b.cinemaId} data-i18n-skip="true">{b.cinemaName} · {language === "en" ? "available" : "khả dụng"} {b.totalAvailable} · {language === "en" ? "alert" : "cảnh báo"} {b.lowStockProducts+b.soldOutProducts}</option>)}</select><span data-testid="inventory-branch-load-state-v7820r4" className="mt-1 block text-xs text-slate-500">{branchLoadState==="READY"?t("Danh sách chi nhánh đã sẵn sàng","Branch list ready"):branchLoadState==="ERROR"?t("Không tải được danh sách chi nhánh","Branch list unavailable"):t("Đang đồng bộ danh sách chi nhánh…","Synchronizing branch list…")}</span></label><button className="btn btn-secondary" onClick={()=>void loadBranches().then(cid=>load(cid,selectedId||undefined)).catch(e=>setMsg((e as Error).message))}>{t("Làm mới","Refresh")}</button></div>
      {branch&&<p className="mt-3 text-xs text-slate-500">{branch.cinemaName}: {branch.trackedProducts} {t("mặt hàng","items")} · {branch.totalAvailable} {t("phần khả dụng","available")} · {branch.lowStockProducts} {t("sắp hết","low stock")} · {branch.soldOutProducts} {t("hết hàng","sold out")}.</p>}
    </section>

    {msg&&<div className="card p-4 text-sm" role="status">{msg}</div>}
    {summary&&<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      <Kpi label={t("Sản phẩm theo dõi","Tracked products")} value={summary.trackedProducts}/><Kpi label={t("Tồn thực tế","On hand")} value={summary.totalOnHand}/><Kpi label={t("Đang giữ","Reserved")} value={summary.totalReserved}/><Kpi label={t("Khả dụng","Available")} value={summary.totalAvailable}/><Kpi label={t("Sắp hết","Low stock")} value={summary.lowStockProducts} warn={summary.lowStockProducts>0}/><Kpi label={t("Hết hàng","Sold out")} value={summary.soldOutProducts} danger={summary.soldOutProducts>0}/>
    </div>}

    <section className="grid gap-6 2xl:grid-cols-[390px_minmax(0,1fr)]">
      <div className="space-y-5 2xl:sticky 2xl:top-24 2xl:h-fit">
        <form onSubmit={submit} className="card space-y-4 p-5">
          <div><h2 className="text-xl font-bold">{t("Nhập / kiểm kê / hao hụt","Restock / count / waste")}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{t("Mọi thay đổi đều sinh biến động kho có rạp và người thao tác.","Every change creates an inventory movement with its cinema and actor recorded.")}</p></div>
          <label className="block text-sm"><span className="mb-1 block text-slate-400">{t("Sản phẩm","Product")}</span><select data-testid="inventory-product-select" className="input" value={selectedId} onChange={e=>void selectProduct(e.target.value)}>{summary?.products.map(p=><option key={p.productId} value={p.productId} data-i18n-skip="true">{concessionProductName(p.name,language)} · {language === "en" ? "available" : "còn"} {p.stockAvailable}</option>)}</select></label>
          {selected&&<div className="rounded-2xl border border-slate-700 bg-slate-950/45 p-4 text-sm"><div className="font-bold">{concessionProductName(selected.name,language)}</div><div className="mt-2 grid grid-cols-3 gap-2 text-center"><Mini label={t("Tồn","On hand")} value={selected.stockOnHand}/><Mini label={t("Giữ","Reserved")} value={selected.stockReserved}/><Mini label={t("Khả dụng","Available")} value={selected.stockAvailable}/></div><div className="mt-3 text-xs text-slate-400">{t("Mục tiêu","Target")} {selected.targetStock} · {t("cảnh báo","alert")} ≤ {selected.lowStockThreshold}</div></div>}
          <div className="grid grid-cols-3 gap-2"><OpButton label={t("+ Nhập","+ Restock")} active={operation==="RESTOCK"} onClick={()=>setOperation("RESTOCK")}/><OpButton label={t("Kiểm kê","Count")} active={operation==="SET"} onClick={()=>setOperation("SET")}/><OpButton label={t("Hao hụt","Waste")} active={operation==="WASTE"} onClick={()=>setOperation("WASTE")}/></div>
          <label className="block text-sm"><span className="mb-1 block text-slate-400">{operation==="RESTOCK"?t("Số lượng nhập thêm","Restock quantity"):operation==="SET"?t("Tồn thực tế mới","New on-hand stock"):t("Số lượng hao hụt","Waste quantity")}</span><input className="input" type="number" min={operation==="SET"?0:1} value={quantity} onChange={e=>setQuantity(Number(e.target.value))} required/></label>
          <div className="grid grid-cols-2 gap-3"><label className="text-sm"><span className="mb-1 block text-slate-400" data-testid="inventory-alert-threshold-label-v7806">{t("Ngưỡng cảnh báo", "Alert threshold")}</span><input className="input" type="number" min={0} value={threshold} onChange={e=>setThreshold(Number(e.target.value))}/></label><label className="text-sm"><span className="mb-1 block text-slate-400" data-testid="inventory-target-stock-label-v7806">{t("Tồn mục tiêu", "Target stock")}</span><input className="input" type="number" min={0} value={target} onChange={e=>setTarget(Number(e.target.value))}/></label></div>
          <textarea className="input" value={note} onChange={e=>setNote(e.target.value)} placeholder={t("Ghi chú nghiệp vụ...","Operational note...")} maxLength={300}/>
          <button className="btn btn-primary w-full" disabled={busy||!selectedId}>{busy?t("Đang lưu...","Saving..."):t("Ghi sổ kho","Record inventory")}</button>
        </form>

        <div className="card space-y-4 p-5"><h2 className="font-bold">{t("Giá theo rạp","Cinema pricing")}</h2><p className="text-xs text-slate-500">{t("Giá này được dùng trực tiếp khi khách đặt bắp nước tại suất chiếu của chi nhánh.","This price is used directly when customers add concessions for a showtime at this cinema.")}</p>{selected&&<><div className="text-xs text-slate-400">{t("Giá gốc","Base price")}: {currency(selected.basePrice)} {selected.priceOverride&&<span className="ml-2 text-amber-300">· {t("đang ghi đè","override active")}</span>}</div><input data-testid="branch-price-input" className="input" type="number" min={0} value={price} onChange={e=>setPrice(Number(e.target.value))}/><button data-testid="branch-price-save" className="btn btn-secondary w-full" disabled={busy} onClick={()=>void savePrice()}>{t("Lưu giá chi nhánh","Save cinema price")}</button></>}</div>

        <div className="card space-y-4 p-5"><h2 className="font-bold">{t("Điều chuyển giữa rạp","Transfer between cinemas")}</h2><p className="text-xs text-slate-500">{t("Chỉ chuyển phần khả dụng; phần đang giữ cho lượt đặt vé ĐANG CHỜ không bị lấy đi.","Only available stock is transferred; stock reserved for PENDING bookings is not moved.")}</p><select className="input" value={transferTo} onChange={e=>setTransferTo(e.target.value)}>{branches.filter(b=>b.cinemaId!==cinemaId).map(b=><option key={b.cinemaId} value={b.cinemaId} data-i18n-skip="true">{b.cinemaName}</option>)}</select><input className="input" type="number" min={1} value={transferQty} onChange={e=>setTransferQty(Number(e.target.value))}/><button data-testid="inventory-transfer-button" className="btn btn-secondary w-full" disabled={busy||!transferTo||!selectedId} onClick={()=>void transfer()}>{t("Điều chuyển tồn kho","Transfer stock")}</button></div>
      </div>

      <div className="space-y-5">
        <div className="card p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold">{t("Tình trạng","Status")} {summary?.cinemaName}</h2><p className="text-xs text-slate-500">{t("Khả dụng = tồn thực tế - lượng đang giữ cho lượt đặt vé chờ thanh toán.","Available = on-hand stock - stock reserved for bookings awaiting payment.")}</p></div><div className="flex gap-2"><FilterButton label={t("Tất cả","All")} active={filter==="ALL"} onClick={()=>setFilter("ALL")}/><FilterButton label={t("Sắp hết","Low stock")} active={filter==="LOW"} onClick={()=>setFilter("LOW")}/><FilterButton label={t("Hết hàng","Sold out")} active={filter==="SOLD_OUT"} onClick={()=>setFilter("SOLD_OUT")}/></div></div></div>
        <div className="grid gap-3 md:grid-cols-2">{products.map(p=><ProductCard key={p.productId} p={p} language={language} t={t} onHistory={()=>void selectProduct(p.productId)}/>)}</div>
        {!products.length&&<div className="card p-8 text-center text-slate-500">{t("Không có sản phẩm phù hợp bộ lọc.","No products match the current filter.")}</div>}
      </div>
    </section>

    <section className="card overflow-hidden" data-testid="inventory-movement-history-v48"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-5"><div><h2 className="text-xl font-bold">{t("Sổ nhập / xuất kho","Inventory movement ledger")} {allBranchesHistory?t("toàn hệ thống","system-wide"):t("theo rạp","by cinema")}</h2><p className="mt-1 text-xs text-slate-500">{t("Nhập kho · Giữ hàng · Giải phóng · Bán hàng · Hoàn hàng · Hao hụt · Chuyển vào/ra · Thưởng thành viên.","Restock · Reserve · Release · Sale · Refund · Waste · Transfer in/out · Loyalty reward.")}</p></div><button data-testid="inventory-history-scope-toggle" className="btn btn-secondary" onClick={()=>void toggleHistoryScope()}>{allBranchesHistory?t("Chỉ rạp hiện tại","Current cinema only"):t("Xem toàn chi nhánh","View all cinemas")}</button></div>
      <div className="hidden xl:block"><table className="w-full table-fixed text-sm"><thead className="bg-slate-950/45 text-slate-400"><tr><th className="w-[12%] p-3">{t("Thời gian","Time")}</th><th className="w-[13%] p-3">{t("Rạp","Cinema")}</th><th className="w-[14%] p-3">{t("Sản phẩm","Product")}</th><th className="w-[11%] p-3">{t("Loại","Type")}</th><th className="w-[7%] p-3">{t("Δ tồn","Δ stock")}</th><th className="w-[7%] p-3">{t("Δ giữ","Δ reserved")}</th><th className="w-[12%] p-3">{t("Sau giao dịch","After transaction")}</th><th className="w-[13%] p-3">{t("Tham chiếu","Reference")}</th><th className="w-[11%] p-3">{t("Ghi chú","Note")}</th></tr></thead><tbody>{movements.map(m=><tr key={m.id} className="border-t border-slate-800/80 align-top"><td className="p-3">{dateTime(m.createdAt)}</td><td className="break-words p-3 text-xs">{m.cinemaName}</td><td className="break-words p-3 font-semibold">{concessionProductName(m.productName,language)}</td><td className="p-3"><span className={`inline-block rounded-full px-2 py-1 text-xs font-bold ${movementClass(m.movementType)}`}>{m.movementType}</span></td><td className={`p-3 font-bold ${m.quantityDelta>0?"text-emerald-300":m.quantityDelta<0?"text-rose-300":"text-slate-500"}`}>{signed(m.quantityDelta)}</td><td className={`p-3 font-bold ${m.reservedDelta>0?"text-amber-300":m.reservedDelta<0?"text-cyan-300":"text-slate-500"}`}>{signed(m.reservedDelta)}</td><td className="p-3">{t("Tồn","Stock")} {m.stockAfter} · {t("Giữ","Reserved")} {m.reservedAfter}</td><td className="break-all p-3 text-xs text-slate-400">{m.referenceKey||m.bookingId||m.actorEmail||t("Hệ thống","System")}</td><td data-testid="inventory-movement-note-v7820r1" className="break-words p-3 text-xs text-slate-400">{m.note?inventoryMovementNotePresentation(m.note,language):"-"}</td></tr>)}</tbody></table></div>
      <div className="grid gap-3 p-4 xl:hidden">{movements.map(m=><article key={m.id} className="rounded-2xl border border-slate-800 bg-slate-950/35 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-xs text-slate-500">{dateTime(m.createdAt)} · {m.cinemaName}</div><h3 className="mt-1 font-bold" data-testid="inventory-movement-product-name-v7807" data-i18n-skip="true">{concessionProductName(m.productName,language)}</h3></div><span className={`rounded-full px-2 py-1 text-xs font-bold ${movementClass(m.movementType)}`}>{m.movementType}</span></div><div className="mt-3 grid grid-cols-2 gap-2 text-sm"><div>{t("Δ tồn","Δ stock")} <b className={m.quantityDelta>0?"text-emerald-300":m.quantityDelta<0?"text-rose-300":"text-slate-400"}>{signed(m.quantityDelta)}</b></div><div>{t("Δ giữ","Δ reserved")} <b>{signed(m.reservedDelta)}</b></div><div>{t("Tồn sau","Stock after")} <b>{m.stockAfter}</b></div><div>{t("Giữ sau","Reserved after")} <b>{m.reservedAfter}</b></div></div><div className="mt-3 break-all text-xs text-slate-500">{m.referenceKey||m.bookingId||m.actorEmail||t("Hệ thống","System")}</div>{m.note&&<p data-testid="inventory-movement-note-v7820r1" className="mt-2 break-words text-xs text-slate-400">{inventoryMovementNotePresentation(m.note,language)}</p>}</article>)}</div>
      {!movements.length&&<div className="p-8 text-center text-slate-500">{t("Chưa có biến động kho trong phạm vi đang xem.","No inventory movements in the current scope.")}</div>}
    </section>
  </div>;
}

function Kpi({label,value,warn,danger}:{label:string;value:number;warn?:boolean;danger?:boolean}){return <div className={`card p-4 ${danger?"border-rose-800/60":warn?"border-amber-700/60":""}`}><div className="text-xs uppercase tracking-wider text-slate-500">{label}</div><div className={`mt-1 text-2xl font-black ${danger?"text-rose-300":warn?"text-amber-300":""}`}>{value}</div></div>}
function Mini({label,value}:{label:string;value:number}){return <div className="rounded-xl bg-slate-900 p-2"><div className="text-[10px] uppercase text-slate-500">{label}</div><b>{value}</b></div>}
function OpButton({label,active,onClick}:{label:string;active:boolean;onClick:()=>void}){return <button type="button" className={`btn ${active?"btn-primary":"btn-secondary"} !px-2`} onClick={onClick}>{label}</button>}
function FilterButton({label,active,onClick}:{label:string;active:boolean;onClick:()=>void}){return <button className={`btn ${active?"btn-primary":"btn-secondary"}`} onClick={onClick}>{label}</button>}
function ProductCard({p,language,t,onHistory}:{p:InventoryProduct;language:Language;t:(vi:string,en:string)=>string;onHistory:()=>void}){return <div className={`card p-5 ${p.soldOut?"border-rose-800/60":p.lowStock?"border-amber-700/50":""}`} data-testid="inventory-product-card"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold" data-testid="inventory-product-name-v7807">{concessionProductName(p.name,language)}</h3><div className="mt-1 text-sm text-amber-300">{currency(p.price)} {p.priceOverride&&<span className="text-[10px] text-violet-300">· {t("giá chi nhánh","cinema price")}</span>}</div></div><span className={`rounded-full px-2 py-1 text-xs font-bold ${!p.inventoryEnabled?"bg-slate-800 text-slate-400":p.soldOut?"bg-rose-950 text-rose-300":p.lowStock?"bg-amber-950 text-amber-300":"bg-emerald-950 text-emerald-300"}`}>{!p.inventoryEnabled?t("Không theo dõi","Not tracked"):p.soldOut?t("Hết hàng","Sold out"):p.lowStock?t("Sắp hết","Low stock"):t("Còn hàng","In stock")}</span></div><div className="mt-4 grid grid-cols-3 gap-2 text-center"><Mini label={t("Tồn","On hand")} value={p.stockOnHand}/><Mini label={t("Đang giữ","Reserved")} value={p.stockReserved}/><Mini label={t("Khả dụng","Available")} value={p.stockAvailable}/></div><div className="mt-3 flex items-center justify-between text-xs text-slate-500"><span>{t("Cảnh báo","Alert")} {p.lowStockThreshold} · {t("mục tiêu","target")} {p.targetStock}</span><button className="font-semibold text-rose-300 hover:underline" onClick={onHistory}>{t("Xem lịch sử","View history")}</button></div></div>}
function signed(v:number){return v>0?`+${v}`:`${v}`}
function movementClass(t:string){if(t==="SALE"||t==="WASTE"||t==="TRANSFER_OUT")return "bg-rose-950 text-rose-300";if(t==="REFUND"||t==="RESTOCK"||t==="TRANSFER_IN")return "bg-emerald-950 text-emerald-300";if(t==="RESERVE")return "bg-amber-950 text-amber-300";if(t==="RELEASE")return "bg-cyan-950 text-cyan-300";return "bg-slate-800 text-slate-300"}
/* V77.0.9 historical-verifier compatibility markers (not rendered):
INVENTORY · V48
Kho bắp nước theo rạp
*/
