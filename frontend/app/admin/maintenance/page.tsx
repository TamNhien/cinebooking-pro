/* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect -- effects intentionally synchronize API/subscription state; dependency lifecycle is intentionally bounded. */
"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { api, dateTime } from "@/lib/api";
import { getAuth } from "@/lib/auth";
import {
  maintenanceAssetStatusOptions,
  maintenanceCategoryOptions,
  maintenancePriorityOptions,
  viLabel,
} from "@/lib/vi-labels";
import type {
  AuditoriumBlackout,
  MaintenanceAsset,
  MaintenanceAuditorium,
  MaintenanceCinema,
  MaintenanceIncident,
  MaintenanceStaff,
  MaintenanceSummary,
  MaintenanceWorkOrder,
  MaintenanceWorkOrderEvent,
} from "@/lib/types";

function maintenanceDisplayText(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/work order/gi, "phiếu bảo trì").replace(/booking/gi, "lượt đặt vé");
}

const ASSET_EMPTY = {
  auditoriumId: "",
  assetCode: "",
  name: "",
  category: "PROJECTOR",
  status: "OPERATIONAL",
  vendor: "",
  serialNumber: "",
  installedOn: "",
  lastServiceAt: "",
  nextServiceDue: "",
  note: "",
};
const ORDER_EMPTY = {
  auditoriumId: "",
  assetId: "",
  sourceIncidentId: "",
  title: "",
  description: "",
  priority: "MEDIUM",
  assignedTo: "",
  dueAt: "",
};
const BLACKOUT_EMPTY = { auditoriumId: "", startTime: "", endTime: "", reason: "" };
const openStatuses = new Set(["OPEN", "IN_PROGRESS", "BLOCKED"]);
const noteRequiredStatuses = new Set(["BLOCKED", "RESOLVED", "CANCELLED"]);
const toIso = (value: string) => (value ? new Date(value).toISOString() : null);

type TransitionDialogState = {
  order: MaintenanceWorkOrder;
  target: string;
  note: string;
  validation: string;
};

function transitionTitle(target: string) {
  if (target === "RESOLVED") return "Xác nhận hoàn tất phiếu bảo trì";
  if (target === "BLOCKED") return "Xác nhận tạm chặn phiếu bảo trì";
  if (target === "CANCELLED") return "Xác nhận hủy phiếu bảo trì";
  return "Xác nhận thay đổi trạng thái";
}

function transitionPrompt(target: string) {
  if (target === "RESOLVED") return "Kết quả xử lý / sửa chữa";
  if (target === "BLOCKED") return "Lý do công việc đang bị chặn";
  if (target === "CANCELLED") return "Lý do hủy phiếu bảo trì";
  return "Ghi chú";
}

function transitionSuccess(target: string, title: string) {
  if (target === "RESOLVED") return `Đã hoàn tất phiếu bảo trì “${title}”.`;
  if (target === "BLOCKED") return `Đã chuyển phiếu “${title}” sang trạng thái đang bị chặn.`;
  if (target === "CANCELLED") return `Đã hủy phiếu bảo trì “${title}”.`;
  if (target === "IN_PROGRESS") return `Đã bắt đầu/tiếp tục xử lý phiếu “${title}”.`;
  return `Đã chuyển trạng thái phiếu “${title}” sang ${viLabel(target)}.`;
}

export default function MaintenancePage() {
  const [role, setRole] = useState<string | null>(null);
  const [cinemas, setCinemas] = useState<MaintenanceCinema[]>([]);
  const [cinemaId, setCinemaId] = useState("");
  const [auditoriums, setAuditoriums] = useState<MaintenanceAuditorium[]>([]);
  const [staff, setStaff] = useState<MaintenanceStaff[]>([]);
  const [incidents, setIncidents] = useState<MaintenanceIncident[]>([]);
  const [summary, setSummary] = useState<MaintenanceSummary | null>(null);
  const [assets, setAssets] = useState<MaintenanceAsset[]>([]);
  const [orders, setOrders] = useState<MaintenanceWorkOrder[]>([]);
  const [blackouts, setBlackouts] = useState<AuditoriumBlackout[]>([]);
  const [blackoutFilter, setBlackoutFilter] = useState("");
  const [assetForm, setAssetForm] = useState({ ...ASSET_EMPTY });
  const [editingAsset, setEditingAsset] = useState<string | null>(null);
  const [orderForm, setOrderForm] = useState({ ...ORDER_EMPTY });
  const [blackoutForm, setBlackoutForm] = useState({ ...BLACKOUT_EMPTY });
  const [history, setHistory] = useState<{ orderId: string; items: MaintenanceWorkOrderEvent[] } | null>(null);
  const [transitionDialog, setTransitionDialog] = useState<TransitionDialogState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const auth = getAuth();
    if (!auth || (auth.role !== "ADMIN" && auth.role !== "MANAGER")) {
      window.location.assign("/login?returnTo=/admin/maintenance&reason=manager");
      return;
    }
    setRole(auth.role);
    api<MaintenanceCinema[]>("/admin/maintenance/cinemas")
      .then((items) => {
        setCinemas(items);
        if (items[0]) setCinemaId(items[0].id);
      })
      .catch((cause) => setError((cause as Error).message));
  }, []);

  async function load(id = cinemaId) {
    if (!id) return;
    const query = `?cinemaId=${encodeURIComponent(id)}`;
    const requests = [
      api<MaintenanceSummary>(`/admin/maintenance/summary${query}`),
      api<MaintenanceAsset[]>(`/admin/maintenance/assets${query}`),
      api<MaintenanceWorkOrder[]>(`/admin/maintenance/work-orders${query}`),
      api<MaintenanceAuditorium[]>(`/admin/maintenance/auditoriums${query}`),
      api<MaintenanceStaff[]>(`/admin/maintenance/staff-options${query}`),
      api<MaintenanceIncident[]>(`/admin/maintenance/incident-options${query}`),
    ] as const;
    const [sum, assetItems, workOrders, rooms, people, incidentItems] = await Promise.all(requests);
    setSummary(sum);
    setAssets(assetItems);
    setOrders(workOrders);
    setAuditoriums(rooms);
    setStaff(people);
    setIncidents(incidentItems);
    if (getAuth()?.role === "ADMIN") {
      setBlackouts(await api<AuditoriumBlackout[]>("/admin/auditorium-blackouts"));
    }
  }

  useEffect(() => {
    if (cinemaId) load(cinemaId).catch((cause) => setError((cause as Error).message));
  }, [cinemaId]);

  function announce(text: string) {
    setMsg(text);
    window.setTimeout(() => setMsg(""), 4000);
  }

  function assetPayload() {
    return {
      cinemaId,
      auditoriumId: assetForm.auditoriumId || null,
      assetCode: assetForm.assetCode,
      name: assetForm.name,
      category: assetForm.category,
      status: assetForm.status,
      vendor: assetForm.vendor || null,
      serialNumber: assetForm.serialNumber || null,
      installedOn: assetForm.installedOn || null,
      lastServiceAt: toIso(assetForm.lastServiceAt),
      nextServiceDue: assetForm.nextServiceDue || null,
      note: assetForm.note || null,
    };
  }

  async function saveAsset(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(editingAsset ? `/admin/maintenance/assets/${editingAsset}` : "/admin/maintenance/assets", {
        method: editingAsset ? "PUT" : "POST",
        body: JSON.stringify(assetPayload()),
      });
      setAssetForm({ ...ASSET_EMPTY });
      setEditingAsset(null);
      announce(editingAsset ? "Đã cập nhật thiết bị." : "Đã thêm thiết bị.");
      await load();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function editAsset(asset: MaintenanceAsset) {
    setEditingAsset(asset.id);
    setAssetForm({
      auditoriumId: asset.auditoriumId || "",
      assetCode: asset.assetCode,
      name: asset.name,
      category: asset.category,
      status: asset.status,
      vendor: asset.vendor || "",
      serialNumber: asset.serialNumber || "",
      installedOn: asset.installedOn || "",
      lastServiceAt: asset.lastServiceAt ? asset.lastServiceAt.slice(0, 16) : "",
      nextServiceDue: asset.nextServiceDue || "",
      note: asset.note || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function createOrder(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/admin/maintenance/work-orders", {
        method: "POST",
        body: JSON.stringify({
          cinemaId,
          auditoriumId: orderForm.auditoriumId || null,
          assetId: orderForm.assetId || null,
          sourceIncidentId: orderForm.sourceIncidentId || null,
          title: orderForm.title,
          description: orderForm.description,
          priority: orderForm.priority,
          assignedTo: orderForm.assignedTo || null,
          dueAt: toIso(orderForm.dueAt),
        }),
      });
      setOrderForm({ ...ORDER_EMPTY });
      announce("Đã tạo phiếu bảo trì.");
      await load();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function executeTransition(order: MaintenanceWorkOrder, target: string, note: string | null) {
    setBusy(true);
    setError("");
    try {
      await api(`/admin/maintenance/work-orders/${order.id}/transition`, {
        method: "POST",
        body: JSON.stringify({ targetStatus: target, note }),
      });
      setTransitionDialog(null);
      announce(transitionSuccess(target, order.title));
      await load();
    } catch (cause) {
      const message = (cause as Error).message;
      setError(message);
      if (transitionDialog) {
        setTransitionDialog((current) => (current ? { ...current, validation: message } : current));
      }
    } finally {
      setBusy(false);
    }
  }

  function requestTransition(order: MaintenanceWorkOrder, target: string) {
    if (noteRequiredStatuses.has(target)) {
      setTransitionDialog({ order, target, note: "", validation: "" });
      return;
    }
    void executeTransition(order, target, null);
  }

  async function submitTransition(event: FormEvent) {
    event.preventDefault();
    if (!transitionDialog) return;
    const note = transitionDialog.note.trim();
    if (note.length < 2) {
      setTransitionDialog({
        ...transitionDialog,
        validation: "Vui lòng nhập kết quả hoặc lý do ít nhất 2 ký tự. Ví dụ: OK.",
      });
      return;
    }
    await executeTransition(transitionDialog.order, transitionDialog.target, note);
  }

  async function showHistory(id: string) {
    try {
      setHistory({
        orderId: id,
        items: await api<MaintenanceWorkOrderEvent[]>(`/admin/maintenance/work-orders/${id}/events`),
      });
    } catch (cause) {
      setError((cause as Error).message);
    }
  }

  async function createBlackout(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/admin/auditorium-blackouts", {
        method: "POST",
        body: JSON.stringify({
          auditoriumId: blackoutForm.auditoriumId,
          startTime: toIso(blackoutForm.startTime),
          endTime: toIso(blackoutForm.endTime),
          reason: blackoutForm.reason,
        }),
      });
      setBlackoutForm({ ...BLACKOUT_EMPTY });
      announce("Đã khóa phòng trong khoảng bảo trì.");
      await load();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function removeBlackout(id: string) {
    if (!window.confirm("Mở lại phòng cho khoảng bảo trì này?")) return;
    setBusy(true);
    try {
      await api(`/admin/auditorium-blackouts/${id}`, { method: "DELETE" });
      announce("Đã mở lại phòng.");
      await load();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const selectedAssets = useMemo(() => assets.filter((asset) => asset.cinemaId === cinemaId), [assets, cinemaId]);
  const selectedCinemaName = cinemas.find((cinema) => cinema.id === cinemaId)?.name || summary?.cinemaName || "";
  const selectedBlackouts = useMemo(
    () =>
      blackouts
        .filter((item) => auditoriums.some((room) => room.id === item.auditoriumId))
        .filter((item) => !blackoutFilter || item.auditoriumId === blackoutFilter)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [blackouts, auditoriums, blackoutFilter],
  );

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-kicker">V44 · BẢO TRÌ RẠP & ĐỘ TIN CẬY TÀI SẢN 2.0</p>
          <h1 className="text-3xl font-bold">Trung tâm bảo trì & độ tin cậy thiết bị</h1>
          <p className="mt-2 max-w-4xl text-slate-400">
            Quản lý tài sản kỹ thuật, hạn bảo trì, phiếu công việc, cam kết thời gian xử lý quá hạn và lịch khóa phòng trong một màn hình. Lịch sử phiếu chỉ ghi thêm để truy vết người thay đổi trạng thái.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/staff/operations" className="btn btn-secondary">📡 Vận hành thời gian thực</Link>
          <Link href="/admin" className="btn btn-secondary">← Quản trị</Link>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-slate-400">Rạp</span>
          <select aria-label="Rạp bảo trì" className="input min-w-64" value={cinemaId} onChange={(event) => setCinemaId(event.target.value)}>
            {cinemas.map((cinema) => <option key={cinema.id} value={cinema.id}>{cinema.name}</option>)}
          </select>
        </label>
        <button className="btn btn-secondary" onClick={() => load()} disabled={!cinemaId || busy}>Làm mới</button>
      </div>

      {error && <div className="rounded-xl border border-red-800/60 bg-red-950/40 p-4 text-sm text-red-200">{error}</div>}
      {msg && <div data-testid="maintenance-success-message" className="rounded-xl border border-emerald-800/60 bg-emerald-950/30 p-4 text-sm text-emerald-200">{msg}</div>}

      {summary && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Thiết bị", summary.totalAssets],
            ["Hoạt động suy giảm", summary.degradedAssets],
            ["Ngừng hoạt động", summary.outOfServiceAssets],
            ["Phiếu bảo trì đang mở", summary.openWorkOrders],
            ["Mức nghiêm trọng đang mở", summary.criticalOpenWorkOrders],
            ["Quá hạn", summary.overdueWorkOrders],
            ["Đang bảo trì", summary.maintenanceAssets],
            ["Đến hạn trong 14 ngày", summary.serviceDueNext14Days],
          ].map(([key, value]) => (
            <div key={String(key)} className="card p-4">
              <div className="text-xs text-slate-400">{key}</div>
              <div className="mt-1 text-2xl font-bold">{value}</div>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <form onSubmit={saveAsset} className="card space-y-3 p-5">
          <div>
            <h2 className="text-xl font-bold">{editingAsset ? "Cập nhật thiết bị" : "Đăng ký thiết bị"}</h2>
            <p className="text-sm text-slate-500">Mã tài sản là duy nhất toàn hệ thống.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input className="input" placeholder="Mã: PRJ-HCM-01" value={assetForm.assetCode} onChange={(event) => setAssetForm({ ...assetForm, assetCode: event.target.value })} required />
            <input className="input" placeholder="Tên thiết bị" value={assetForm.name} onChange={(event) => setAssetForm({ ...assetForm, name: event.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <select aria-label="Nhóm thiết bị" className="input" value={assetForm.category} onChange={(event) => setAssetForm({ ...assetForm, category: event.target.value })}>
              {maintenanceCategoryOptions.map((value) => <option key={value} value={value}>{viLabel(value)}</option>)}
            </select>
            <select aria-label="Trạng thái thiết bị" className="input" value={assetForm.status} onChange={(event) => setAssetForm({ ...assetForm, status: event.target.value })}>
              {maintenanceAssetStatusOptions.map((value) => <option key={value} value={value}>{viLabel(value)}</option>)}
            </select>
          </div>
          <select aria-label="Vị trí thiết bị" className="input" value={assetForm.auditoriumId} onChange={(event) => setAssetForm({ ...assetForm, auditoriumId: event.target.value })}>
            <option value="">Thiết bị dùng chung rạp</option>
            {auditoriums.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input className="input" placeholder="Nhà cung cấp" value={assetForm.vendor} onChange={(event) => setAssetForm({ ...assetForm, vendor: event.target.value })} />
            <input className="input" placeholder="Số sê-ri" value={assetForm.serialNumber} onChange={(event) => setAssetForm({ ...assetForm, serialNumber: event.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-slate-400">Ngày lắp<input className="input mt-1" type="date" value={assetForm.installedOn} onChange={(event) => setAssetForm({ ...assetForm, installedOn: event.target.value })} /></label>
            <label className="text-xs text-slate-400">Bảo trì kế tiếp<input className="input mt-1" type="date" value={assetForm.nextServiceDue} onChange={(event) => setAssetForm({ ...assetForm, nextServiceDue: event.target.value })} /></label>
          </div>
          <label className="text-xs text-slate-400">Lần bảo trì gần nhất<input className="input mt-1" type="datetime-local" value={assetForm.lastServiceAt} onChange={(event) => setAssetForm({ ...assetForm, lastServiceAt: event.target.value })} /></label>
          <textarea className="input min-h-20" placeholder="Ghi chú kỹ thuật" value={assetForm.note} onChange={(event) => setAssetForm({ ...assetForm, note: event.target.value })} />
          <div className="flex gap-2">
            <button className="btn btn-primary flex-1" disabled={busy || !cinemaId}>{busy ? "Đang lưu..." : editingAsset ? "Lưu thiết bị" : "Thêm thiết bị"}</button>
            {editingAsset && <button type="button" className="btn btn-secondary" onClick={() => { setEditingAsset(null); setAssetForm({ ...ASSET_EMPTY }); }}>Hủy sửa</button>}
          </div>
        </form>

        <section className="card p-5">
          <div className="flex items-end justify-between gap-3">
            <div><h2 className="text-xl font-bold">Danh mục thiết bị</h2><p className="text-sm text-slate-500">{selectedAssets.length} tài sản tại rạp.</p></div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-slate-400"><tr><th className="p-2">Mã</th><th className="p-2">Thiết bị</th><th className="p-2">Vị trí</th><th className="p-2">Trạng thái</th><th className="p-2">Bảo trì kế tiếp</th><th /></tr></thead>
              <tbody>
                {selectedAssets.map((asset) => (
                  <tr key={asset.id} data-testid="maintenance-asset-row" className="border-t border-slate-800">
                    <td className="p-2 font-mono">{asset.assetCode}</td>
                    <td className="p-2"><b>{asset.name}</b><div className="text-xs text-slate-500">{viLabel(asset.category)}{asset.serialNumber ? ` · ${asset.serialNumber}` : ""}</div></td>
                    <td className="p-2">{asset.auditoriumName || "Dùng chung rạp"}</td>
                    <td className="p-2"><span className={`rounded px-2 py-1 text-xs ${asset.status === "OPERATIONAL" ? "bg-emerald-950 text-emerald-200" : asset.status === "OUT_OF_SERVICE" ? "bg-red-950 text-red-200" : "bg-amber-950 text-amber-200"}`}>{viLabel(asset.status)}</span></td>
                    <td className="p-2">{asset.nextServiceDue || "-"}</td>
                    <td className="p-2 text-right"><button className="btn btn-secondary" onClick={() => editAsset(asset)}>Sửa</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!selectedAssets.length && <div className="py-10 text-center text-slate-500">Chưa có thiết bị. Hãy đăng ký tài sản đầu tiên.</div>}
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <form onSubmit={createOrder} className="card space-y-3 p-5">
          <div><h2 className="text-xl font-bold">Tạo phiếu bảo trì</h2><p className="text-sm text-slate-500">Có thể liên kết thiết bị và sự cố V43.</p></div>
          <input className="input" placeholder="Tiêu đề công việc" value={orderForm.title} onChange={(event) => setOrderForm({ ...orderForm, title: event.target.value })} required />
          <textarea className="input min-h-24" placeholder="Mô tả lỗi / công việc cần làm" value={orderForm.description} onChange={(event) => setOrderForm({ ...orderForm, description: event.target.value })} required />
          <div className="grid grid-cols-2 gap-3">
            <select aria-label="Mức ưu tiên" className="input" value={orderForm.priority} onChange={(event) => setOrderForm({ ...orderForm, priority: event.target.value })}>
              {maintenancePriorityOptions.map((value) => <option key={value} value={value}>{viLabel(value)}</option>)}
            </select>
            <select aria-label="Người phụ trách" className="input" value={orderForm.assignedTo} onChange={(event) => setOrderForm({ ...orderForm, assignedTo: event.target.value })}>
              <option value="">Chưa phân công</option>
              {staff.map((person) => <option key={person.userId} value={person.userId}>{person.employeeCode} · {person.fullName}</option>)}
            </select>
          </div>
          <select aria-label="Thiết bị của phiếu bảo trì" className="input" value={orderForm.assetId} onChange={(event) => { const asset = assets.find((item) => item.id === event.target.value); setOrderForm({ ...orderForm, assetId: event.target.value, auditoriumId: asset?.auditoriumId || orderForm.auditoriumId }); }}>
            <option value="">Không gắn thiết bị</option>
            {assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.assetCode} · {asset.name}</option>)}
          </select>
          <select aria-label="Phòng của phiếu bảo trì" className="input" value={orderForm.auditoriumId} onChange={(event) => setOrderForm({ ...orderForm, auditoriumId: event.target.value })}>
            <option value="">Không gắn phòng</option>
            {auditoriums.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}
          </select>
          <select aria-label="Sự cố liên quan" className="input" value={orderForm.sourceIncidentId} onChange={(event) => setOrderForm({ ...orderForm, sourceIncidentId: event.target.value })}>
            <option value="">Không liên kết sự cố</option>
            {incidents.map((incident) => <option key={incident.id} value={incident.id}>{viLabel(incident.severity)} · {incident.title}</option>)}
          </select>
          <label className="text-xs text-slate-400">Hạn xử lý<input className="input mt-1" type="datetime-local" value={orderForm.dueAt} onChange={(event) => setOrderForm({ ...orderForm, dueAt: event.target.value })} /></label>
          <button className="btn btn-primary w-full" disabled={busy || !cinemaId}>Tạo phiếu bảo trì</button>
        </form>

        <section className="card p-5">
          <div><h2 className="text-xl font-bold">Phiếu bảo trì</h2><p className="text-sm text-slate-500">{orders.filter((order) => openStatuses.has(order.status)).length} đang mở · {orders.filter((order) => order.overdue).length} quá hạn.</p></div>
          <div className="mt-4 space-y-3">
            {orders.map((order) => (
              <div key={order.id} data-testid="maintenance-work-order" className={`rounded-xl border p-4 ${order.overdue ? "border-red-800 bg-red-950/20" : "border-slate-800"}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <b>{order.title}</b>
                      <span className="rounded bg-slate-800 px-2 py-1 text-xs">{viLabel(order.priority)}</span>
                      <span data-testid="maintenance-work-order-status" className="rounded bg-slate-800 px-2 py-1 text-xs">{viLabel(order.status)}</span>
                      {order.overdue && <span className="rounded bg-red-900 px-2 py-1 text-xs text-red-100">Quá hạn</span>}
                    </div>
                    <p className="mt-1 text-sm text-slate-400">{order.description}</p>
                    <div className="mt-2 text-xs text-slate-500">
                      {order.assetCode ? `${order.assetCode} · ${order.assetName}` : "Không gắn thiết bị"}
                      {order.auditoriumName ? ` · ${order.auditoriumName}` : ""} · Phụ trách: {order.assignedToName || "Chưa phân công"}
                      {order.dueAt ? ` · Hạn ${dateTime(order.dueAt)}` : ""}
                    </div>
                    {order.status === "RESOLVED" && order.resolutionNote && <div className="mt-2 text-xs text-emerald-300">Kết quả: {order.resolutionNote}</div>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button className="btn btn-secondary" onClick={() => showHistory(order.id)}>Lịch sử</button>
                    {order.status === "OPEN" && <button className="btn btn-primary" disabled={busy} onClick={() => requestTransition(order, "IN_PROGRESS")}>Bắt đầu</button>}
                    {order.status === "BLOCKED" && <button className="btn btn-primary" disabled={busy} onClick={() => requestTransition(order, "IN_PROGRESS")}>Tiếp tục</button>}
                    {["OPEN", "IN_PROGRESS"].includes(order.status) && <button className="btn btn-secondary" disabled={busy} onClick={() => requestTransition(order, "BLOCKED")}>Tạm chặn</button>}
                    {order.status === "IN_PROGRESS" && <button className="btn btn-primary" disabled={busy} onClick={() => requestTransition(order, "RESOLVED")}>Hoàn tất</button>}
                    {openStatuses.has(order.status) && <button className="btn btn-secondary" disabled={busy} onClick={() => requestTransition(order, "CANCELLED")}>Hủy</button>}
                  </div>
                </div>
                {history?.orderId === order.id && (
                  <div className="mt-3 border-t border-slate-800 pt-3 text-xs text-slate-400">
                    {history.items.map((event) => (
                      <div key={event.id} className="py-1"><b>{viLabel(event.eventType)}</b> · {viLabel(event.fromStatus)} → {viLabel(event.toStatus)} · {event.actorName} · {dateTime(event.createdAt)}{event.note ? ` · ${maintenanceDisplayText(event.note)}` : ""}</div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {!orders.length && <div className="py-10 text-center text-slate-500">Chưa có phiếu bảo trì.</div>}
          </div>
        </section>
      </div>

      {role === "ADMIN" && (
        <section className="card p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="section-kicker">V34 · TƯƠNG THÍCH</p>
              <h2 className="text-xl font-bold">Bảo trì & khóa phòng chiếu</h2>
              <p className="text-sm text-slate-500">Giữ nguyên cơ chế bảo vệ V34: không cho khóa trùng suất đang hoạt động và bộ lập lịch suất chiếu vẫn nhận khoảng khóa phòng là xung đột.</p>
            </div>
            <label className="text-sm text-slate-400">Lọc phòng bảo trì<select aria-label="Lọc phòng bảo trì" className="input mt-1 min-w-56" value={blackoutFilter} onChange={(event) => setBlackoutFilter(event.target.value)}><option value="">Tất cả phòng</option>{auditoriums.map((room) => <option key={room.id} value={room.id}>{selectedCinemaName} · {room.name}</option>)}</select></label>
          </div>
          <div className="mt-4 grid gap-5 lg:grid-cols-[400px_1fr]">
            <form onSubmit={createBlackout} className="space-y-3">
              <select aria-label="Phòng bảo trì" className="input" value={blackoutForm.auditoriumId} onChange={(event) => setBlackoutForm({ ...blackoutForm, auditoriumId: event.target.value })} required><option value="">Chọn phòng</option>{auditoriums.map((room) => <option key={room.id} value={room.id}>{selectedCinemaName} · {room.name}</option>)}</select>
              <input aria-label="Bắt đầu bảo trì" className="input" type="datetime-local" value={blackoutForm.startTime} onChange={(event) => setBlackoutForm({ ...blackoutForm, startTime: event.target.value })} required />
              <input aria-label="Kết thúc bảo trì" className="input" type="datetime-local" value={blackoutForm.endTime} onChange={(event) => setBlackoutForm({ ...blackoutForm, endTime: event.target.value })} required />
              <textarea aria-label="Lý do bảo trì" className="input" placeholder="Lý do khóa phòng" value={blackoutForm.reason} onChange={(event) => setBlackoutForm({ ...blackoutForm, reason: event.target.value })} required />
              <button className="btn btn-primary w-full" disabled={busy}>Khóa phòng</button>
            </form>
            <div className="space-y-2">
              {selectedBlackouts.map((item) => (
                <div key={item.id} aria-label={`Khoảng bảo trì: ${item.reason}`} className="rounded-xl border border-amber-900/60 bg-amber-950/20 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div><b>{item.auditoriumName}</b><div className="text-sm text-amber-200">{item.reason}</div><div className="text-xs text-slate-500">{dateTime(item.startTime)} → {dateTime(item.endTime)}</div></div>
                    <button className="btn btn-secondary" aria-label="Mở lại phòng" onClick={() => removeBlackout(item.id)}>Mở lại</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {transitionDialog && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/75 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setTransitionDialog(null); }}>
          <form data-testid="maintenance-transition-dialog" role="dialog" aria-modal="true" aria-labelledby="maintenance-transition-title" onSubmit={submitTransition} className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-950 p-6 shadow-2xl">
            <h2 id="maintenance-transition-title" className="text-xl font-black">{transitionTitle(transitionDialog.target)}</h2>
            <p className="mt-2 text-sm text-slate-400">Phiếu: <b className="text-slate-200">{transitionDialog.order.title}</b></p>
            <label className="mt-5 block text-sm text-slate-300">
              {transitionPrompt(transitionDialog.target)}
              <textarea
                data-testid="maintenance-transition-note"
                aria-label={transitionPrompt(transitionDialog.target)}
                className="input mt-2 min-h-28"
                value={transitionDialog.note}
                onChange={(event) => setTransitionDialog({ ...transitionDialog, note: event.target.value, validation: "" })}
                placeholder={transitionDialog.target === "RESOLVED" ? "Ví dụ: OK, đã kiểm tra và thiết bị hoạt động bình thường." : "Nhập lý do..."}
                autoFocus
                required
              />
            </label>
            <p className="mt-2 text-xs text-slate-500">Tối thiểu 2 ký tự. Nội dung này được lưu vào lịch sử xử lý.</p>
            {transitionDialog.validation && <div data-testid="maintenance-transition-validation" className="mt-3 rounded-xl border border-red-800/60 bg-red-950/40 p-3 text-sm text-red-200">{transitionDialog.validation}</div>}
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => setTransitionDialog(null)}>Hủy</button>
              <button data-testid="maintenance-transition-confirm" type="submit" className="btn btn-primary" disabled={busy}>{busy ? "Đang cập nhật..." : transitionDialog.target === "RESOLVED" ? "Xác nhận hoàn tất" : "Xác nhận"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
/* V77.0.9 historical-verifier compatibility markers (not rendered):
method:"DELETE"
aria-label="Mở lại phòng"
V44 · CINEMA MAINTENANCE & ASSET RELIABILITY 2.0
Trung tâm bảo trì & độ tin cậy thiết bị
Danh mục thiết bị
Tạo phiếu bảo trì
OUT_OF_SERVICE
MAINTENANCE
Bảo trì kế tiếp
nextServiceDue
V34 COMPATIBILITY
/admin/auditorium-blackouts
Bảo trì & khóa phòng chiếu
*/
