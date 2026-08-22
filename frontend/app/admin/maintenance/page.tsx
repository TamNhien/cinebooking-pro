"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { api, dateTime } from "@/lib/api";
import { getAuth } from "@/lib/auth";
import type {
  AuditoriumBlackout, MaintenanceAsset, MaintenanceAuditorium, MaintenanceCinema,
  MaintenanceIncident, MaintenanceStaff, MaintenanceSummary, MaintenanceWorkOrder,
  MaintenanceWorkOrderEvent
} from "@/lib/types";

const ASSET_EMPTY={auditoriumId:"",assetCode:"",name:"",category:"PROJECTOR",status:"OPERATIONAL",vendor:"",serialNumber:"",installedOn:"",lastServiceAt:"",nextServiceDue:"",note:""};
const ORDER_EMPTY={auditoriumId:"",assetId:"",sourceIncidentId:"",title:"",description:"",priority:"MEDIUM",assignedTo:"",dueAt:""};
const BLACKOUT_EMPTY={auditoriumId:"",startTime:"",endTime:"",reason:""};
const openStatuses=new Set(["OPEN","IN_PROGRESS","BLOCKED"]);
const toIso=(v:string)=>v?new Date(v).toISOString():null;

export default function MaintenancePage(){
  const [role,setRole]=useState<string|null>(null);
  const [cinemas,setCinemas]=useState<MaintenanceCinema[]>([]);
  const [cinemaId,setCinemaId]=useState("");
  const [auditoriums,setAuditoriums]=useState<MaintenanceAuditorium[]>([]);
  const [staff,setStaff]=useState<MaintenanceStaff[]>([]);
  const [incidents,setIncidents]=useState<MaintenanceIncident[]>([]);
  const [summary,setSummary]=useState<MaintenanceSummary|null>(null);
  const [assets,setAssets]=useState<MaintenanceAsset[]>([]);
  const [orders,setOrders]=useState<MaintenanceWorkOrder[]>([]);
  const [blackouts,setBlackouts]=useState<AuditoriumBlackout[]>([]);
  const [blackoutFilter,setBlackoutFilter]=useState("");
  const [assetForm,setAssetForm]=useState({...ASSET_EMPTY});
  const [editingAsset,setEditingAsset]=useState<string|null>(null);
  const [orderForm,setOrderForm]=useState({...ORDER_EMPTY});
  const [blackoutForm,setBlackoutForm]=useState({...BLACKOUT_EMPTY});
  const [history,setHistory]=useState<{orderId:string;items:MaintenanceWorkOrderEvent[]}|null>(null);
  const [busy,setBusy]=useState(false);const [error,setError]=useState("");const [msg,setMsg]=useState("");

  useEffect(()=>{
    const a=getAuth();
    if(!a||(a.role!=="ADMIN"&&a.role!=="MANAGER")){location.href="/login?returnTo=/admin/maintenance&reason=manager";return;}
    setRole(a.role);
    api<MaintenanceCinema[]>("/admin/maintenance/cinemas").then(xs=>{setCinemas(xs);if(xs[0])setCinemaId(xs[0].id)}).catch(e=>setError((e as Error).message));
  },[]);

  async function load(id=cinemaId){
    if(!id)return;
    const q=`?cinemaId=${encodeURIComponent(id)}`;
    const requests=[
      api<MaintenanceSummary>(`/admin/maintenance/summary${q}`),api<MaintenanceAsset[]>(`/admin/maintenance/assets${q}`),
      api<MaintenanceWorkOrder[]>(`/admin/maintenance/work-orders${q}`),api<MaintenanceAuditorium[]>(`/admin/maintenance/auditoriums${q}`),
      api<MaintenanceStaff[]>(`/admin/maintenance/staff-options${q}`),api<MaintenanceIncident[]>(`/admin/maintenance/incident-options${q}`)
    ] as const;
    const [sum,assetItems,wo,rooms,people,incs]=await Promise.all(requests);
    setSummary(sum);setAssets(assetItems);setOrders(wo);setAuditoriums(rooms);setStaff(people);setIncidents(incs);
    if(getAuth()?.role==="ADMIN")setBlackouts(await api<AuditoriumBlackout[]>("/admin/auditorium-blackouts"));
  }
  useEffect(()=>{if(cinemaId)load(cinemaId).catch(e=>setError((e as Error).message));},[cinemaId]);

  function announce(text:string){setMsg(text);setTimeout(()=>setMsg(""),4000)}
  function assetPayload(){return {cinemaId,auditoriumId:assetForm.auditoriumId||null,assetCode:assetForm.assetCode,name:assetForm.name,category:assetForm.category,status:assetForm.status,vendor:assetForm.vendor||null,serialNumber:assetForm.serialNumber||null,installedOn:assetForm.installedOn||null,lastServiceAt:toIso(assetForm.lastServiceAt),nextServiceDue:assetForm.nextServiceDue||null,note:assetForm.note||null};}

  async function saveAsset(e:FormEvent){e.preventDefault();setBusy(true);setError("");try{
    await api(editingAsset?`/admin/maintenance/assets/${editingAsset}`:"/admin/maintenance/assets",{method:editingAsset?"PUT":"POST",body:JSON.stringify(assetPayload())});
    setAssetForm({...ASSET_EMPTY});setEditingAsset(null);announce(editingAsset?"Đã cập nhật thiết bị.":"Đã thêm thiết bị.");await load();
  }catch(e){setError((e as Error).message)}finally{setBusy(false)}}

  function editAsset(a:MaintenanceAsset){setEditingAsset(a.id);setAssetForm({auditoriumId:a.auditoriumId||"",assetCode:a.assetCode,name:a.name,category:a.category,status:a.status,vendor:a.vendor||"",serialNumber:a.serialNumber||"",installedOn:a.installedOn||"",lastServiceAt:a.lastServiceAt?a.lastServiceAt.slice(0,16):"",nextServiceDue:a.nextServiceDue||"",note:a.note||""});window.scrollTo({top:0,behavior:"smooth"});}

  async function createOrder(e:FormEvent){e.preventDefault();setBusy(true);setError("");try{
    await api("/admin/maintenance/work-orders",{method:"POST",body:JSON.stringify({cinemaId,auditoriumId:orderForm.auditoriumId||null,assetId:orderForm.assetId||null,sourceIncidentId:orderForm.sourceIncidentId||null,title:orderForm.title,description:orderForm.description,priority:orderForm.priority,assignedTo:orderForm.assignedTo||null,dueAt:toIso(orderForm.dueAt)})});
    setOrderForm({...ORDER_EMPTY});announce("Đã tạo work order bảo trì.");await load();
  }catch(e){setError((e as Error).message)}finally{setBusy(false)}}

  async function transition(order:MaintenanceWorkOrder,target:string){let note:string|null=null;if(["BLOCKED","RESOLVED","CANCELLED"].includes(target)){note=prompt(target==="RESOLVED"?"Ghi chú xử lý / kết quả sửa chữa:":target==="BLOCKED"?"Lý do đang bị chặn:":"Lý do huỷ work order:");if(note===null)return;}
    setBusy(true);setError("");try{await api(`/admin/maintenance/work-orders/${order.id}/transition`,{method:"POST",body:JSON.stringify({targetStatus:target,note})});announce(`Đã chuyển ${order.title} → ${target}.`);await load();}catch(e){setError((e as Error).message)}finally{setBusy(false)}}

  async function showHistory(id:string){try{setHistory({orderId:id,items:await api<MaintenanceWorkOrderEvent[]>(`/admin/maintenance/work-orders/${id}/events`)})}catch(e){setError((e as Error).message)}}

  async function createBlackout(e:FormEvent){e.preventDefault();setBusy(true);setError("");try{await api("/admin/auditorium-blackouts",{method:"POST",body:JSON.stringify({auditoriumId:blackoutForm.auditoriumId,startTime:toIso(blackoutForm.startTime),endTime:toIso(blackoutForm.endTime),reason:blackoutForm.reason})});setBlackoutForm({...BLACKOUT_EMPTY});announce("Đã khóa phòng trong khoảng bảo trì.");await load();}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
  async function removeBlackout(id:string){if(!confirm("Mở lại phòng cho khoảng bảo trì này?"))return;setBusy(true);try{await api(`/admin/auditorium-blackouts/${id}`,{method:"DELETE"});announce("Đã mở lại phòng.");await load();}catch(e){setError((e as Error).message)}finally{setBusy(false)}}

  const selectedAssets=useMemo(()=>assets.filter(a=>a.cinemaId===cinemaId),[assets,cinemaId]);
  const selectedCinemaName=cinemas.find(c=>c.id===cinemaId)?.name||summary?.cinemaName||"";
  const selectedBlackouts=useMemo(()=>blackouts.filter(b=>auditoriums.some(a=>a.id===b.auditoriumId)).filter(b=>!blackoutFilter||b.auditoriumId===blackoutFilter).sort((a,b)=>a.startTime.localeCompare(b.startTime)),[blackouts,auditoriums,blackoutFilter]);

  return <div className="mx-auto max-w-7xl space-y-7">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="section-kicker">V44 · CINEMA MAINTENANCE & ASSET RELIABILITY 2.0</p><h1 className="text-3xl font-bold">Trung tâm bảo trì & độ tin cậy thiết bị</h1><p className="mt-2 max-w-4xl text-slate-400">Quản lý tài sản kỹ thuật, hạn bảo trì, work order, SLA quá hạn và lịch khóa phòng trong một màn hình. Work order có lịch sử append-only để truy vết ai đã thay đổi trạng thái.</p></div><div className="flex gap-2"><Link href="/staff/operations" className="btn btn-secondary">📡 Vận hành realtime</Link><Link href="/admin" className="btn btn-secondary">← Admin</Link></div></div>

    <div className="flex flex-wrap items-end gap-3"><label className="text-sm"><span className="mb-1 block text-slate-400">Rạp</span><select aria-label="Rạp bảo trì" className="input min-w-64" value={cinemaId} onChange={e=>setCinemaId(e.target.value)}>{cinemas.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><button className="btn btn-secondary" onClick={()=>load()} disabled={!cinemaId||busy}>Làm mới</button></div>
    {error&&<div className="rounded-xl border border-red-800/60 bg-red-950/40 p-4 text-sm text-red-200">{error}</div>}{msg&&<div className="rounded-xl border border-emerald-800/60 bg-emerald-950/30 p-4 text-sm text-emerald-200">{msg}</div>}

    {summary&&<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{[
      ["Thiết bị",summary.totalAssets],["Suy giảm",summary.degradedAssets],["Ngừng hoạt động",summary.outOfServiceAssets],["Work order mở",summary.openWorkOrders],["Critical mở",summary.criticalOpenWorkOrders],["Quá hạn",summary.overdueWorkOrders],["Đang bảo trì",summary.maintenanceAssets],["Đến hạn ≤14 ngày",summary.serviceDueNext14Days]
    ].map(([k,v])=><div key={String(k)} className="card p-4"><div className="text-xs text-slate-400">{k}</div><div className="mt-1 text-2xl font-bold">{v}</div></div>)}</div>}

    <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <form onSubmit={saveAsset} className="card space-y-3 p-5"><div><h2 className="text-xl font-bold">{editingAsset?"Cập nhật thiết bị":"Đăng ký thiết bị"}</h2><p className="text-sm text-slate-500">Mã tài sản là duy nhất toàn hệ thống.</p></div>
        <div className="grid grid-cols-2 gap-3"><input className="input" placeholder="Mã: PRJ-HCM-01" value={assetForm.assetCode} onChange={e=>setAssetForm({...assetForm,assetCode:e.target.value})} required/><input className="input" placeholder="Tên thiết bị" value={assetForm.name} onChange={e=>setAssetForm({...assetForm,name:e.target.value})} required/></div>
        <div className="grid grid-cols-2 gap-3"><select className="input" value={assetForm.category} onChange={e=>setAssetForm({...assetForm,category:e.target.value})}>{["PROJECTOR","AUDIO","HVAC","SCREEN","POS","NETWORK","POWER","SAFETY","OTHER"].map(x=><option key={x}>{x}</option>)}</select><select className="input" value={assetForm.status} onChange={e=>setAssetForm({...assetForm,status:e.target.value})}>{["OPERATIONAL","DEGRADED","OUT_OF_SERVICE","MAINTENANCE"].map(x=><option key={x}>{x}</option>)}</select></div>
        <select className="input" value={assetForm.auditoriumId} onChange={e=>setAssetForm({...assetForm,auditoriumId:e.target.value})}><option value="">Thiết bị dùng chung rạp</option>{auditoriums.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select>
        <div className="grid grid-cols-2 gap-3"><input className="input" placeholder="Nhà cung cấp" value={assetForm.vendor} onChange={e=>setAssetForm({...assetForm,vendor:e.target.value})}/><input className="input" placeholder="Serial" value={assetForm.serialNumber} onChange={e=>setAssetForm({...assetForm,serialNumber:e.target.value})}/></div>
        <div className="grid grid-cols-2 gap-3"><label className="text-xs text-slate-400">Ngày lắp<input className="input mt-1" type="date" value={assetForm.installedOn} onChange={e=>setAssetForm({...assetForm,installedOn:e.target.value})}/></label><label className="text-xs text-slate-400">Bảo trì kế tiếp<input className="input mt-1" type="date" value={assetForm.nextServiceDue} onChange={e=>setAssetForm({...assetForm,nextServiceDue:e.target.value})}/></label></div><label className="text-xs text-slate-400">Lần bảo trì gần nhất<input className="input mt-1" type="datetime-local" value={assetForm.lastServiceAt} onChange={e=>setAssetForm({...assetForm,lastServiceAt:e.target.value})}/></label>
        <textarea className="input min-h-20" placeholder="Ghi chú kỹ thuật" value={assetForm.note} onChange={e=>setAssetForm({...assetForm,note:e.target.value})}/>
        <div className="flex gap-2"><button className="btn btn-primary flex-1" disabled={busy||!cinemaId}>{busy?"Đang lưu...":editingAsset?"Lưu thiết bị":"Thêm thiết bị"}</button>{editingAsset&&<button type="button" className="btn btn-secondary" onClick={()=>{setEditingAsset(null);setAssetForm({...ASSET_EMPTY})}}>Huỷ sửa</button>}</div>
      </form>

      <section className="card p-5"><div className="flex items-end justify-between gap-3"><div><h2 className="text-xl font-bold">Danh mục thiết bị</h2><p className="text-sm text-slate-500">{selectedAssets.length} tài sản tại rạp.</p></div></div><div className="mt-4 overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-slate-400"><tr><th className="p-2">Mã</th><th className="p-2">Thiết bị</th><th className="p-2">Vị trí</th><th className="p-2">Trạng thái</th><th className="p-2">Bảo trì kế</th><th></th></tr></thead><tbody>{selectedAssets.map(a=><tr key={a.id} data-testid="maintenance-asset-row" className="border-t border-slate-800"><td className="p-2 font-mono">{a.assetCode}</td><td className="p-2"><b>{a.name}</b><div className="text-xs text-slate-500">{a.category}{a.serialNumber?` · ${a.serialNumber}`:""}</div></td><td className="p-2">{a.auditoriumName||"Dùng chung rạp"}</td><td className="p-2"><span className={`rounded px-2 py-1 text-xs ${a.status==="OPERATIONAL"?"bg-emerald-950 text-emerald-200":a.status==="OUT_OF_SERVICE"?"bg-red-950 text-red-200":"bg-amber-950 text-amber-200"}`}>{a.status}</span></td><td className="p-2">{a.nextServiceDue||"-"}</td><td className="p-2 text-right"><button className="btn btn-secondary" onClick={()=>editAsset(a)}>Sửa</button></td></tr>)}</tbody></table>{!selectedAssets.length&&<div className="py-10 text-center text-slate-500">Chưa có thiết bị. Hãy đăng ký tài sản đầu tiên.</div>}</div></section>
    </div>

    <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <form onSubmit={createOrder} className="card space-y-3 p-5"><div><h2 className="text-xl font-bold">Tạo work order</h2><p className="text-sm text-slate-500">Có thể liên kết thiết bị và sự cố V43.</p></div>
        <input className="input" placeholder="Tiêu đề công việc" value={orderForm.title} onChange={e=>setOrderForm({...orderForm,title:e.target.value})} required/><textarea className="input min-h-24" placeholder="Mô tả lỗi / công việc cần làm" value={orderForm.description} onChange={e=>setOrderForm({...orderForm,description:e.target.value})} required/>
        <div className="grid grid-cols-2 gap-3"><select className="input" value={orderForm.priority} onChange={e=>setOrderForm({...orderForm,priority:e.target.value})}>{["LOW","MEDIUM","HIGH","CRITICAL"].map(x=><option key={x}>{x}</option>)}</select><select className="input" value={orderForm.assignedTo} onChange={e=>setOrderForm({...orderForm,assignedTo:e.target.value})}><option value="">Chưa phân công</option>{staff.map(s=><option key={s.userId} value={s.userId}>{s.employeeCode} · {s.fullName}</option>)}</select></div>
        <select aria-label="Thiết bị work order" className="input" value={orderForm.assetId} onChange={e=>{const a=assets.find(x=>x.id===e.target.value);setOrderForm({...orderForm,assetId:e.target.value,auditoriumId:a?.auditoriumId||orderForm.auditoriumId})}}><option value="">Không gắn thiết bị</option>{assets.map(a=><option key={a.id} value={a.id}>{a.assetCode} · {a.name}</option>)}</select>
        <select className="input" value={orderForm.auditoriumId} onChange={e=>setOrderForm({...orderForm,auditoriumId:e.target.value})}><option value="">Không gắn phòng</option>{auditoriums.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select>
        <select className="input" value={orderForm.sourceIncidentId} onChange={e=>setOrderForm({...orderForm,sourceIncidentId:e.target.value})}><option value="">Không liên kết sự cố</option>{incidents.map(i=><option key={i.id} value={i.id}>{i.severity} · {i.title}</option>)}</select>
        <label className="text-xs text-slate-400">Hạn xử lý<input className="input mt-1" type="datetime-local" value={orderForm.dueAt} onChange={e=>setOrderForm({...orderForm,dueAt:e.target.value})}/></label>
        <button className="btn btn-primary w-full" disabled={busy||!cinemaId}>Tạo work order</button>
      </form>

      <section className="card p-5"><div><h2 className="text-xl font-bold">Work order</h2><p className="text-sm text-slate-500">{orders.filter(o=>openStatuses.has(o.status)).length} đang mở · {orders.filter(o=>o.overdue).length} quá hạn.</p></div><div className="mt-4 space-y-3">{orders.map(o=><div key={o.id} data-testid="maintenance-work-order" className={`rounded-xl border p-4 ${o.overdue?"border-red-800 bg-red-950/20":"border-slate-800"}`}><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><b>{o.title}</b><span className="rounded bg-slate-800 px-2 py-1 text-xs">{o.priority}</span><span className="rounded bg-slate-800 px-2 py-1 text-xs">{o.status}</span>{o.overdue&&<span className="rounded bg-red-900 px-2 py-1 text-xs text-red-100">OVERDUE</span>}</div><p className="mt-1 text-sm text-slate-400">{o.description}</p><div className="mt-2 text-xs text-slate-500">{o.assetCode?`${o.assetCode} · ${o.assetName}`:"Không gắn thiết bị"}{o.auditoriumName?` · ${o.auditoriumName}`:""} · Phụ trách: {o.assignedToName||"Chưa phân công"}{o.dueAt?` · Hạn ${dateTime(o.dueAt)}`:""}</div></div><div className="flex flex-wrap gap-2"><button className="btn btn-secondary" onClick={()=>showHistory(o.id)}>Lịch sử</button>{o.status==="OPEN"&&<button className="btn btn-primary" disabled={busy} onClick={()=>transition(o,"IN_PROGRESS")}>Bắt đầu</button>}{o.status==="BLOCKED"&&<button className="btn btn-primary" disabled={busy} onClick={()=>transition(o,"IN_PROGRESS")}>Tiếp tục</button>}{["OPEN","IN_PROGRESS"].includes(o.status)&&<button className="btn btn-secondary" disabled={busy} onClick={()=>transition(o,"BLOCKED")}>Block</button>}{o.status==="IN_PROGRESS"&&<button className="btn btn-primary" disabled={busy} onClick={()=>transition(o,"RESOLVED")}>Hoàn tất</button>}{openStatuses.has(o.status)&&<button className="btn btn-secondary" disabled={busy} onClick={()=>transition(o,"CANCELLED")}>Huỷ</button>}</div></div>{history?.orderId===o.id&&<div className="mt-3 border-t border-slate-800 pt-3 text-xs text-slate-400">{history.items.map(ev=><div key={ev.id} className="py-1"><b>{ev.eventType}</b> · {ev.fromStatus||"-"} → {ev.toStatus||"-"} · {ev.actorName} · {dateTime(ev.createdAt)}{ev.note?` · ${ev.note}`:""}</div>)}</div>}</div>)}{!orders.length&&<div className="py-10 text-center text-slate-500">Chưa có work order.</div>}</div></section>
    </div>

    {role==="ADMIN"&&<section className="card p-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="section-kicker">V34 COMPATIBILITY</p><h2 className="text-xl font-bold">Bảo trì & khóa phòng chiếu</h2><p className="text-sm text-slate-500">Giữ nguyên guard V34: không cho khóa trùng suất đang hoạt động và Showtime Planner vẫn nhận blackout là xung đột.</p></div><label className="text-sm text-slate-400">Lọc phòng bảo trì<select aria-label="Lọc phòng bảo trì" className="input mt-1 min-w-56" value={blackoutFilter} onChange={e=>setBlackoutFilter(e.target.value)}><option value="">Tất cả phòng</option>{auditoriums.map(a=><option key={a.id} value={a.id}>{selectedCinemaName} · {a.name}</option>)}</select></label></div><div className="mt-4 grid gap-5 lg:grid-cols-[400px_1fr]"><form onSubmit={createBlackout} className="space-y-3"><select aria-label="Phòng bảo trì" className="input" value={blackoutForm.auditoriumId} onChange={e=>setBlackoutForm({...blackoutForm,auditoriumId:e.target.value})} required><option value="">Chọn phòng</option>{auditoriums.map(a=><option key={a.id} value={a.id}>{selectedCinemaName} · {a.name}</option>)}</select><input aria-label="Bắt đầu bảo trì" className="input" type="datetime-local" value={blackoutForm.startTime} onChange={e=>setBlackoutForm({...blackoutForm,startTime:e.target.value})} required/><input aria-label="Kết thúc bảo trì" className="input" type="datetime-local" value={blackoutForm.endTime} onChange={e=>setBlackoutForm({...blackoutForm,endTime:e.target.value})} required/><textarea aria-label="Lý do bảo trì" className="input" placeholder="Lý do khóa phòng" value={blackoutForm.reason} onChange={e=>setBlackoutForm({...blackoutForm,reason:e.target.value})} required/><button className="btn btn-primary w-full" disabled={busy}>Khóa phòng</button></form><div className="space-y-2">{selectedBlackouts.map(b=><div key={b.id} aria-label={`Khoảng bảo trì: ${b.reason}`} className="rounded-xl border border-amber-900/60 bg-amber-950/20 p-3"><div className="flex items-start justify-between gap-3"><div><b>{b.auditoriumName}</b><div className="text-sm text-amber-200">{b.reason}</div><div className="text-xs text-slate-500">{dateTime(b.startTime)} → {dateTime(b.endTime)}</div></div><button className="btn btn-secondary" onClick={()=>removeBlackout(b.id)}>Mở lại</button></div></div>)}</div></div></section>}
  </div>;
}
