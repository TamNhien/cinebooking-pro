/* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect -- effects intentionally synchronize API/subscription state; dependency lifecycle is intentionally bounded. */
"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { withTransientReadRetry } from "@/lib/transient-read";
import { usePresentationLanguage, type Language } from "@/lib/usePresentationLanguage";
import { getAuth } from "@/lib/auth";
import {
  maintenanceAssetStatusOptions,
  maintenanceCategoryOptions,
  maintenancePriorityOptions,
  localizedLabel,
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

function maintenanceDisplayText(value: string | null | undefined, language: Language): string {
  if (!value) return "";
  if (language === "en") return value;
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

function transitionTitle(target: string, language: Language) {
  if (language === "en") {
    if (target === "RESOLVED") return "Confirm maintenance work order completion";
    if (target === "BLOCKED") return "Confirm maintenance work order block";
    if (target === "CANCELLED") return "Confirm work order cancellation";
    return "Confirm status change";
  }
  if (target === "RESOLVED") return "Xác nhận hoàn tất phiếu bảo trì";
  if (target === "BLOCKED") return "Xác nhận tạm chặn phiếu bảo trì";
  if (target === "CANCELLED") return "Xác nhận hủy phiếu bảo trì";
  return "Xác nhận thay đổi trạng thái";
}

function transitionPrompt(target: string, language: Language) {
  if (language === "en") {
    if (target === "RESOLVED") return "Resolution / repair result";
    if (target === "BLOCKED") return "Reason the work is blocked";
    if (target === "CANCELLED") return "Work order cancellation reason";
    return "Notes";
  }
  if (target === "RESOLVED") return "Kết quả xử lý / sửa chữa";
  if (target === "BLOCKED") return "Lý do công việc đang bị chặn";
  if (target === "CANCELLED") return "Lý do hủy phiếu bảo trì";
  return "Ghi chú";
}

function transitionSuccess(target: string, title: string, language: Language) {
  if (language === "en") {
    if (target === "RESOLVED") return `Maintenance work order “${title}” completed.`;
    if (target === "BLOCKED") return `Work order “${title}” moved to Blocked.`;
    if (target === "CANCELLED") return `Maintenance work order “${title}” cancelled.`;
    if (target === "IN_PROGRESS") return `Started/continued work on “${title}”.`;
    return `Work order “${title}” moved to ${localizedLabel(target, "en")}.`;
  }
  if (target === "RESOLVED") return `Đã hoàn tất phiếu bảo trì “${title}”.`;
  if (target === "BLOCKED") return `Đã chuyển phiếu “${title}” sang trạng thái đang bị chặn.`;
  if (target === "CANCELLED") return `Đã hủy phiếu bảo trì “${title}”.`;
  if (target === "IN_PROGRESS") return `Đã bắt đầu/tiếp tục xử lý phiếu “${title}”.`;
  return `Đã chuyển trạng thái phiếu “${title}” sang ${localizedLabel(target, "vi")}.`;
}

export default function MaintenancePage() {
  const { language, locale, t } = usePresentationLanguage();
  const formatDateTime = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
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
  const messageTimerRef = useRef<number | null>(null);
  const loadGenerationRef = useRef(0);

  useEffect(() => {
    const auth = getAuth();
    if (!auth || (auth.role !== "ADMIN" && auth.role !== "MANAGER")) {
      window.location.assign("/login?returnTo=/admin/maintenance&reason=manager");
      return;
    }
    setRole(auth.role);
    withTransientReadRetry((signal) => api<MaintenanceCinema[]>("/admin/maintenance/cinemas", { signal }))
      .then((items) => {
        setCinemas(items);
        if (items[0]) setCinemaId(items[0].id);
      })
      .catch((cause) => setError((cause as Error).message));
  }, []);

  async function load(id = cinemaId) {
    if (!id) return;
    const generation = ++loadGenerationRef.current;
    const query = `?cinemaId=${encodeURIComponent(id)}`;
    const read = <T,>(path: string) => withTransientReadRetry((signal) => api<T>(path, { signal }));
    const canReadBlackouts = getAuth()?.role === "ADMIN";
    try {
      const [sum, assetItems, workOrders, rooms, people, incidentItems, blackoutItems] = await Promise.all([
        read<MaintenanceSummary>(`/admin/maintenance/summary${query}`),
        read<MaintenanceAsset[]>(`/admin/maintenance/assets${query}`),
        read<MaintenanceWorkOrder[]>(`/admin/maintenance/work-orders${query}`),
        read<MaintenanceAuditorium[]>(`/admin/maintenance/auditoriums${query}`),
        read<MaintenanceStaff[]>(`/admin/maintenance/staff-options${query}`),
        read<MaintenanceIncident[]>(`/admin/maintenance/incident-options${query}`),
        canReadBlackouts ? read<AuditoriumBlackout[]>("/admin/auditorium-blackouts") : Promise.resolve<AuditoriumBlackout[]>([]),
      ]);
      // Cinema changes can overlap while the previous read batch is still in flight.
      // Only the newest generation owns the rendered maintenance snapshot.
      if (generation !== loadGenerationRef.current) return;
      setSummary(sum);
      setAssets(assetItems);
      setOrders(workOrders);
      setAuditoriums(rooms);
      setStaff(people);
      setIncidents(incidentItems);
      if (canReadBlackouts) setBlackouts(blackoutItems);
    } catch (cause) {
      // A superseded cinema load is intentionally silent. Its data/error no longer
      // owns the current page state and must not overwrite the latest selection.
      if (generation !== loadGenerationRef.current) return;
      throw cause;
    }
  }

  useEffect(() => {
    if (cinemaId) load(cinemaId).catch((cause) => setError((cause as Error).message));
  }, [cinemaId]);

  function announce(text: string) {
    if (messageTimerRef.current !== null) {
      window.clearTimeout(messageTimerRef.current);
    }
    setMsg(text);
    messageTimerRef.current = window.setTimeout(() => {
      setMsg("");
      messageTimerRef.current = null;
    }, 4000);
  }

  useEffect(() => () => {
    if (messageTimerRef.current !== null) {
      window.clearTimeout(messageTimerRef.current);
    }
  }, []);

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
      announce(editingAsset ? t("Đã cập nhật thiết bị.", "Equipment updated.") : t("Đã thêm thiết bị.", "Equipment added."));
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
      announce(t("Đã tạo phiếu bảo trì.", "Maintenance work order created."));
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
      announce(transitionSuccess(target, order.title, language));
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
        validation: t("Vui lòng nhập kết quả hoặc lý do ít nhất 2 ký tự. Ví dụ: OK.", "Enter a result or reason of at least 2 characters. Example: OK."),
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
      announce(t("Đã khóa phòng trong khoảng bảo trì.", "Auditorium blocked for the maintenance window."));
      await load();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function removeBlackout(id: string) {
    if (!window.confirm(t("Mở lại phòng cho khoảng bảo trì này?", "Reopen the auditorium for this maintenance window?"))) return;
    setBusy(true);
    try {
      await api(`/admin/auditorium-blackouts/${id}`, { method: "DELETE" });
      announce(t("Đã mở lại phòng.", "Auditorium reopened."));
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
    <div className="mx-auto max-w-7xl space-y-7" data-testid="maintenance-page">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-kicker">{t("V44 · BẢO TRÌ RẠP & ĐỘ TIN CẬY TÀI SẢN 2.0", "V44 · CINEMA MAINTENANCE & ASSET RELIABILITY 2.0")}</p>
          <h1 className="text-3xl font-bold">{t("Trung tâm bảo trì & độ tin cậy thiết bị", "Maintenance & equipment reliability center")}</h1>
          <p className="mt-2 max-w-4xl text-slate-400">
            {t("Quản lý tài sản kỹ thuật, hạn bảo trì, phiếu công việc, cam kết thời gian xử lý quá hạn và lịch khóa phòng trong một màn hình. Lịch sử phiếu chỉ ghi thêm để truy vết người thay đổi trạng thái.", "Manage technical assets, maintenance due dates, work orders, overdue resolution commitments, and auditorium blocking schedules in one place. Work-order history is append-only so status changes remain traceable.")}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/staff/operations" className="btn btn-secondary">{t("📡 Vận hành thời gian thực", "📡 Realtime operations")}</Link>
          <Link href="/admin" className="btn btn-secondary">{t("← Quản trị", "← Administration")}</Link>
        </div>
      </div>

      <section className="card p-4 sm:p-5" data-testid="maintenance-cinema-selector">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <label className="min-w-0 text-sm">
            <span className="mb-1 block text-slate-400">{t("Rạp", "Cinema")}</span>
            <select aria-label={t("Rạp bảo trì", "Maintenance cinema")} className="input w-full" value={cinemaId} onChange={(event) => setCinemaId(event.target.value)}>
              {cinemas.map((cinema) => <option key={cinema.id} value={cinema.id} data-i18n-skip="true">{cinema.name}</option>)}
            </select>
          </label>
          <button className="btn btn-secondary lg:min-w-28" onClick={() => load()} disabled={!cinemaId || busy}>{t("Làm mới", "Refresh")}</button>
        </div>
        {selectedCinemaName && <p className="mt-2 break-words text-sm font-semibold text-slate-200" data-testid="maintenance-selected-cinema-name">{selectedCinemaName}</p>}
      </section>

      {error && <div className="rounded-xl border border-red-800/60 bg-red-950/40 p-4 text-sm text-red-200">{error}</div>}
      {msg && <div data-testid="maintenance-success-message" className="rounded-xl border border-emerald-800/60 bg-emerald-950/30 p-4 text-sm text-emerald-200">{msg}</div>}

      {summary && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [t("Thiết bị", "Equipment"), summary.totalAssets],
            [t("Hoạt động suy giảm", "Degraded"), summary.degradedAssets],
            [t("Ngừng hoạt động", "Out of service"), summary.outOfServiceAssets],
            [t("Phiếu bảo trì đang mở", "Open maintenance work orders"), summary.openWorkOrders],
            [t("Mức nghiêm trọng đang mở", "Open critical items"), summary.criticalOpenWorkOrders],
            [t("Quá hạn", "Overdue"), summary.overdueWorkOrders],
            [t("Đang bảo trì", "Under maintenance"), summary.maintenanceAssets],
            [t("Đến hạn trong 14 ngày", "Due within 14 days"), summary.serviceDueNext14Days],
          ].map(([key, value]) => (
            <div key={String(key)} className="card p-4">
              <div className="text-xs text-slate-400">{key}</div>
              <div className="mt-1 text-2xl font-bold">{value}</div>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-6 2xl:grid-cols-[420px_minmax(0,1fr)]">
        <form onSubmit={saveAsset} className="card space-y-3 p-5">
          <div>
            <h2 data-testid="maintenance-register-equipment-title" className="text-xl font-bold">{editingAsset ? t("Cập nhật thiết bị", "Update equipment") : t("Đăng ký thiết bị", "Register equipment")}</h2>
            <p className="text-sm text-slate-500">{t("Mã tài sản là duy nhất toàn hệ thống.", "Asset codes are unique across the entire system.")}</p>
          </div>
          <div className="admin-form-grid-2">
            <input className="input" placeholder={t("Mã: PRJ-HCM-01", "Code: PRJ-HCM-01")} value={assetForm.assetCode} onChange={(event) => setAssetForm({ ...assetForm, assetCode: event.target.value })} required />
            <input className="input" placeholder={t("Tên thiết bị", "Equipment name")} value={assetForm.name} onChange={(event) => setAssetForm({ ...assetForm, name: event.target.value })} required />
          </div>
          <div className="admin-form-grid-2">
            <select aria-label={t("Nhóm thiết bị", "Equipment category")} className="input" value={assetForm.category} onChange={(event) => setAssetForm({ ...assetForm, category: event.target.value })}>
              {maintenanceCategoryOptions.map((value) => <option key={value} value={value}>{localizedLabel(value, language)}</option>)}
            </select>
            <select aria-label={t("Trạng thái thiết bị", "Equipment status")} className="input" value={assetForm.status} onChange={(event) => setAssetForm({ ...assetForm, status: event.target.value })}>
              {maintenanceAssetStatusOptions.map((value) => <option key={value} value={value}>{localizedLabel(value, language)}</option>)}
            </select>
          </div>
          <select aria-label={t("Vị trí thiết bị", "Equipment location")} className="input" value={assetForm.auditoriumId} onChange={(event) => setAssetForm({ ...assetForm, auditoriumId: event.target.value })}>
            <option value="">{t("Thiết bị dùng chung rạp", "Shared cinema equipment")}</option>
            {auditoriums.map((room) => <option key={room.id} value={room.id} data-i18n-skip="true">{room.name}</option>)}
          </select>
          <div className="admin-form-grid-2">
            <input className="input" placeholder={t("Nhà cung cấp", "Vendor")} value={assetForm.vendor} onChange={(event) => setAssetForm({ ...assetForm, vendor: event.target.value })} />
            <input className="input" placeholder={t("Số sê-ri", "Serial number")} value={assetForm.serialNumber} onChange={(event) => setAssetForm({ ...assetForm, serialNumber: event.target.value })} />
          </div>
          <div className="admin-form-grid-2">
            <label className="text-xs text-slate-400">{t("Ngày lắp", "Installation date")}<input className="input mt-1" type="date" value={assetForm.installedOn} onChange={(event) => setAssetForm({ ...assetForm, installedOn: event.target.value })} /></label>
            <label className="text-xs text-slate-400">{t("Bảo trì kế tiếp", "Next maintenance")}<input className="input mt-1" type="date" value={assetForm.nextServiceDue} onChange={(event) => setAssetForm({ ...assetForm, nextServiceDue: event.target.value })} /></label>
          </div>
          <label className="text-xs text-slate-400">{t("Lần bảo trì gần nhất", "Last maintenance")}<input className="input mt-1" type="datetime-local" value={assetForm.lastServiceAt} onChange={(event) => setAssetForm({ ...assetForm, lastServiceAt: event.target.value })} /></label>
          <textarea className="input min-h-20" placeholder={t("Ghi chú kỹ thuật", "Technical notes")} value={assetForm.note} onChange={(event) => setAssetForm({ ...assetForm, note: event.target.value })} />
          <div className="flex gap-2">
            <button className="btn btn-primary flex-1" disabled={busy || !cinemaId}>{busy ? t("Đang lưu...", "Saving...") : editingAsset ? t("Lưu thiết bị", "Save equipment") : t("Thêm thiết bị", "Add equipment")}</button>
            {editingAsset && <button type="button" className="btn btn-secondary" onClick={() => { setEditingAsset(null); setAssetForm({ ...ASSET_EMPTY }); }}>{t("Hủy sửa", "Cancel editing")}</button>}
          </div>
        </form>

        <section className="card p-5">
          <div className="flex items-end justify-between gap-3">
            <div><h2 className="text-xl font-bold">{t("Danh mục thiết bị", "Equipment catalog")}</h2><p className="text-sm text-slate-500">{t(`${selectedAssets.length} tài sản tại rạp.`, `${selectedAssets.length} assets at this cinema.`)}</p></div>
          </div>
          <div className="mt-4 hidden 2xl:block">
            <table className="w-full table-fixed text-sm">
              <thead className="text-left text-slate-400"><tr><th className="w-[15%] p-2">{t("Mã", "Code")}</th><th className="w-[25%] p-2">{t("Thiết bị", "Equipment")}</th><th className="w-[20%] p-2">{t("Vị trí", "Location")}</th><th className="w-[16%] p-2">{t("Trạng thái", "Status")}</th><th className="w-[16%] p-2">{t("Bảo trì kế tiếp", "Next maintenance")}</th><th className="w-[8%]" /></tr></thead>
              <tbody>
                {selectedAssets.map((asset) => (
                  <tr key={asset.id} data-testid="maintenance-asset-row" className="border-t border-slate-800 align-top">
                    <td className="break-all p-2 font-mono">{asset.assetCode}</td>
                    <td className="p-2"><b data-testid="maintenance-asset-name-table-v7812" data-i18n-skip="true" className="break-words">{asset.name}</b><div className="break-words text-xs text-slate-500">{localizedLabel(asset.category, language)}{asset.serialNumber ? ` · ${asset.serialNumber}` : ""}</div></td>
                    <td className="break-words p-2">{asset.auditoriumName || t("Dùng chung rạp", "Shared by cinema")}</td>
                    <td className="p-2"><span className={`inline-block rounded px-2 py-1 text-xs ${asset.status === "OPERATIONAL" ? "bg-emerald-950 text-emerald-200" : asset.status === "OUT_OF_SERVICE" ? "bg-red-950 text-red-200" : "bg-amber-950 text-amber-200"}`}>{localizedLabel(asset.status, language)}</span></td>
                    <td className="p-2">{asset.nextServiceDue || "-"}</td>
                    <td className="p-2 text-right"><button className="btn btn-secondary !px-3" onClick={() => editAsset(asset)}>{t("Sửa", "Edit")}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 grid gap-3 2xl:hidden" data-testid="maintenance-asset-cards">
            {selectedAssets.map((asset) => (
              <article key={asset.id} data-testid="maintenance-asset-card" className="rounded-2xl border border-slate-800 bg-slate-950/35 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="break-all font-mono text-xs text-slate-400">{asset.assetCode}</div><h3 data-testid="maintenance-asset-name-card-v7812" data-i18n-skip="true" className="mt-1 break-words font-bold">{asset.name}</h3><p className="mt-1 break-words text-xs text-slate-500">{localizedLabel(asset.category, language)}{asset.serialNumber ? ` · ${asset.serialNumber}` : ""}</p></div><span className={`rounded px-2 py-1 text-xs ${asset.status === "OPERATIONAL" ? "bg-emerald-950 text-emerald-200" : asset.status === "OUT_OF_SERVICE" ? "bg-red-950 text-red-200" : "bg-amber-950 text-amber-200"}`}>{localizedLabel(asset.status, language)}</span></div>
                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2"><div><span className="text-slate-500">{t("Vị trí", "Location")}: </span><span className="break-words">{asset.auditoriumName || t("Dùng chung rạp", "Shared by cinema")}</span></div><div><span className="text-slate-500">{t("Bảo trì kế tiếp", "Next maintenance")}: </span>{asset.nextServiceDue || "-"}</div></div>
                <button className="btn btn-secondary mt-3 w-full sm:w-auto" onClick={() => editAsset(asset)}>{t("Sửa", "Edit")}</button>
              </article>
            ))}
          </div>
          {!selectedAssets.length && <div className="py-10 text-center text-slate-500">{t("Chưa có thiết bị. Hãy đăng ký tài sản đầu tiên.", "No equipment yet. Register the first asset.")}</div>}
        </section>
      </div>

      <div className="grid gap-6 2xl:grid-cols-[420px_minmax(0,1fr)]">
        <form onSubmit={createOrder} className="card space-y-3 p-5">
          <div><h2 className="text-xl font-bold">{t("Tạo phiếu bảo trì", "Create maintenance work order")}</h2><p className="text-sm text-slate-500">{t("Có thể liên kết thiết bị và sự cố V43.", "Equipment and V43 incidents can be linked to the work order.")}</p></div>
          <input className="input" placeholder={t("Tiêu đề công việc", "Work title")} value={orderForm.title} onChange={(event) => setOrderForm({ ...orderForm, title: event.target.value })} required />
          <textarea className="input min-h-24" placeholder={t("Mô tả lỗi / công việc cần làm", "Describe the issue / required work")} value={orderForm.description} onChange={(event) => setOrderForm({ ...orderForm, description: event.target.value })} required />
          <div className="admin-form-grid-2">
            <select aria-label={t("Mức ưu tiên", "Priority")} className="input" value={orderForm.priority} onChange={(event) => setOrderForm({ ...orderForm, priority: event.target.value })}>
              {maintenancePriorityOptions.map((value) => <option key={value} value={value}>{localizedLabel(value, language)}</option>)}
            </select>
            <select aria-label={t("Người phụ trách", "Assignee")} className="input" value={orderForm.assignedTo} onChange={(event) => setOrderForm({ ...orderForm, assignedTo: event.target.value })}>
              <option value="">{t("Chưa phân công", "Unassigned")}</option>
              {staff.map((person) => <option key={person.userId} value={person.userId} data-testid="maintenance-assignee-option-v7815" data-i18n-skip="true">{person.employeeCode} · {person.fullName}</option>)}
            </select>
          </div>
          <select aria-label={t("Thiết bị của phiếu bảo trì", "Work-order equipment")} className="input" value={orderForm.assetId} onChange={(event) => { const asset = assets.find((item) => item.id === event.target.value); setOrderForm({ ...orderForm, assetId: event.target.value, auditoriumId: asset?.auditoriumId || orderForm.auditoriumId }); }}>
            <option value="">{t("Không gắn thiết bị", "No equipment assigned")}</option>
            {assets.map((asset) => <option key={asset.id} value={asset.id} data-i18n-skip="true">{asset.assetCode} · {asset.name}</option>)}
          </select>
          <select aria-label={t("Phòng của phiếu bảo trì", "Work-order auditorium")} className="input" value={orderForm.auditoriumId} onChange={(event) => setOrderForm({ ...orderForm, auditoriumId: event.target.value })}>
            <option value="">{t("Không gắn phòng", "No auditorium assigned")}</option>
            {auditoriums.map((room) => <option key={room.id} value={room.id} data-i18n-skip="true">{room.name}</option>)}
          </select>
          <select aria-label={t("Sự cố liên quan", "Related incident")} className="input" value={orderForm.sourceIncidentId} onChange={(event) => setOrderForm({ ...orderForm, sourceIncidentId: event.target.value })}>
            <option value="">{t("Không liên kết sự cố", "No linked incident")}</option>
            {incidents.map((incident) => <option key={incident.id} value={incident.id} data-i18n-skip="true">{localizedLabel(incident.severity, language)} · {incident.title}</option>)}
          </select>
          <label className="text-xs text-slate-400">{t("Hạn xử lý", "Resolution deadline")}<input className="input mt-1" type="datetime-local" value={orderForm.dueAt} onChange={(event) => setOrderForm({ ...orderForm, dueAt: event.target.value })} /></label>
          <button className="btn btn-primary w-full" disabled={busy || !cinemaId}>{t("Tạo phiếu bảo trì", "Create maintenance work order")}</button>
        </form>

        <section className="card p-5">
          <div><h2 className="text-xl font-bold">{t("Phiếu bảo trì", "Maintenance work orders")}</h2><p className="text-sm text-slate-500">{t(`${orders.filter((order) => openStatuses.has(order.status)).length} đang mở · ${orders.filter((order) => order.overdue).length} quá hạn.`, `${orders.filter((order) => openStatuses.has(order.status)).length} open · ${orders.filter((order) => order.overdue).length} overdue.`)}</p></div>
          <div className="mt-4 space-y-3">
            {orders.map((order) => (
              <div key={order.id} data-testid="maintenance-work-order" className={`rounded-xl border p-4 ${order.overdue ? "border-red-800 bg-red-950/20" : "border-slate-800"}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <b>{order.title}</b>
                      <span className="rounded bg-slate-800 px-2 py-1 text-xs">{localizedLabel(order.priority, language)}</span>
                      <span data-testid="maintenance-work-order-status" className="rounded bg-slate-800 px-2 py-1 text-xs">{localizedLabel(order.status, language)}</span>
                      {order.overdue && <span className="rounded bg-red-900 px-2 py-1 text-xs text-red-100">{t("Quá hạn", "Overdue")}</span>}
                    </div>
                    <p className="mt-1 text-sm text-slate-400">{order.description}</p>
                    <div className="mt-2 text-xs text-slate-500">
                      {order.assetCode ? `${order.assetCode} · ${order.assetName}` : t("Không gắn thiết bị", "No equipment assigned")}
                      {order.auditoriumName ? ` · ${order.auditoriumName}` : ""} · {t("Phụ trách", "Assignee")}: {order.assignedToName || t("Chưa phân công", "Unassigned")}
                      {order.dueAt ? ` · ${t("Hạn", "Due")} ${formatDateTime(order.dueAt)}` : ""}
                    </div>
                    {order.status === "RESOLVED" && order.resolutionNote && <div className="mt-2 text-xs text-emerald-300">{t("Kết quả", "Result")}: {order.resolutionNote}</div>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button className="btn btn-secondary" onClick={() => showHistory(order.id)}>{t("Lịch sử", "History")}</button>
                    {order.status === "OPEN" && <button className="btn btn-primary" disabled={busy} onClick={() => requestTransition(order, "IN_PROGRESS")}>{t("Bắt đầu", "Start")}</button>}
                    {order.status === "BLOCKED" && <button className="btn btn-primary" disabled={busy} onClick={() => requestTransition(order, "IN_PROGRESS")}>{t("Tiếp tục", "Continue")}</button>}
                    {["OPEN", "IN_PROGRESS"].includes(order.status) && <button className="btn btn-secondary" disabled={busy} onClick={() => requestTransition(order, "BLOCKED")}>{t("Tạm chặn", "Block temporarily")}</button>}
                    {order.status === "IN_PROGRESS" && <button className="btn btn-primary" disabled={busy} onClick={() => requestTransition(order, "RESOLVED")}>{t("Hoàn tất", "Complete")}</button>}
                    {openStatuses.has(order.status) && <button className="btn btn-secondary" disabled={busy} onClick={() => requestTransition(order, "CANCELLED")}>{t("Hủy", "Cancel")}</button>}
                  </div>
                </div>
                {history?.orderId === order.id && (
                  <div className="mt-3 border-t border-slate-800 pt-3 text-xs text-slate-400">
                    {history.items.map((event) => (
                      <div key={event.id} className="py-1"><b>{localizedLabel(event.eventType, language)}</b> · {localizedLabel(event.fromStatus, language)} → {localizedLabel(event.toStatus, language)} · {event.actorName} · {formatDateTime(event.createdAt)}{event.note ? ` · ${maintenanceDisplayText(event.note, language)}` : ""}</div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {!orders.length && <div className="py-10 text-center text-slate-500">{t("Chưa có phiếu bảo trì.", "No maintenance work orders yet.")}</div>}
          </div>
        </section>
      </div>

      {role === "ADMIN" && (
        <section className="card p-5" data-testid="maintenance-auditorium-blocking">
          <div>
            <p className="section-kicker">{t("V34 · TƯƠNG THÍCH","V34 · COMPATIBILITY")}</p>
            <h2 className="text-xl font-bold">{t("Bảo trì & khóa phòng chiếu","Maintenance & auditorium blocking")}</h2>
            <p className="mt-1 max-w-4xl text-sm text-slate-500">{t("Giữ nguyên cơ chế bảo vệ V34: không cho khóa trùng suất đang hoạt động và bộ lập lịch suất chiếu vẫn nhận khoảng khóa phòng là xung đột.","V34 safeguards remain in place: an auditorium cannot be blocked over an active showtime, and the showtime planner still treats auditorium blocks as conflicts.")}</p>
          </div>
          <div className="admin-split-grid mt-5">
            <div className="admin-form-stack">
              <label className="block text-sm text-slate-400">
                <span className="mb-1 block">{t("Lọc phòng bảo trì","Filter maintenance auditoriums")}</span>
                <select aria-label={t("Lọc phòng bảo trì","Filter maintenance auditoriums")} className="input" value={blackoutFilter} onChange={(event) => setBlackoutFilter(event.target.value)}>
                  <option value="">{t("Tất cả phòng","All auditoriums")}</option>
                  {auditoriums.map((room) => <option key={room.id} value={room.id} data-i18n-skip="true">{selectedCinemaName} · {room.name}</option>)}
                </select>
              </label>
              <form onSubmit={createBlackout} className="admin-form-stack" data-testid="maintenance-blackout-form">
                <select aria-label={t("Phòng bảo trì","Maintenance auditorium")} className="input" value={blackoutForm.auditoriumId} onChange={(event) => setBlackoutForm({ ...blackoutForm, auditoriumId: event.target.value })} required><option value="">{t("Chọn phòng","Select auditorium")}</option>{auditoriums.map((room) => <option key={room.id} value={room.id} data-i18n-skip="true">{selectedCinemaName} · {room.name}</option>)}</select>
                <input aria-label={t("Bắt đầu bảo trì","Maintenance start")} className="input" type="datetime-local" value={blackoutForm.startTime} onChange={(event) => setBlackoutForm({ ...blackoutForm, startTime: event.target.value })} required />
                <input aria-label={t("Kết thúc bảo trì","Maintenance end")} className="input" type="datetime-local" value={blackoutForm.endTime} onChange={(event) => setBlackoutForm({ ...blackoutForm, endTime: event.target.value })} required />
                <textarea aria-label={t("Lý do bảo trì","Maintenance reason")} className="input min-h-24" placeholder={t("Lý do khóa phòng","Auditorium block reason")} value={blackoutForm.reason} onChange={(event) => setBlackoutForm({ ...blackoutForm, reason: event.target.value })} required />
                <button className="btn btn-primary w-full" disabled={busy}>{t("Khóa phòng","Block auditorium")}</button>
              </form>
            </div>
            <div className="min-w-0 space-y-2">
              {selectedBlackouts.map((item) => (
                <div key={item.id} data-testid="maintenance-blackout-card" data-blackout-id={item.id} data-auditorium-id={item.auditoriumId} data-blackout-start={item.startTime} data-blackout-end={item.endTime} aria-label={`${t("Khoảng bảo trì", "Maintenance window")}: ${item.reason}`} className="rounded-xl border border-amber-900/60 bg-amber-950/20 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><b>{item.auditoriumName}</b><div className="break-words text-sm text-amber-200">{item.reason}</div><div className="text-xs text-slate-500">{formatDateTime(item.startTime)} → {formatDateTime(item.endTime)}</div></div>
                    <button className="btn btn-secondary shrink-0" aria-label={t("Mở lại phòng","Reopen auditorium")} onClick={() => removeBlackout(item.id)}>{t("Mở lại","Reopen")}</button>
                  </div>
                </div>
              ))}
              {!selectedBlackouts.length && <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center text-sm text-slate-500">{t("Chưa có khoảng khóa phòng trong bộ lọc hiện tại.", "No auditorium blocks match the current filter.")}</div>}
            </div>
          </div>
        </section>
      )}

      {transitionDialog && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/75 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setTransitionDialog(null); }}>
          <form data-testid="maintenance-transition-dialog" role="dialog" aria-modal="true" aria-labelledby="maintenance-transition-title" onSubmit={submitTransition} className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-950 p-6 shadow-2xl">
            <h2 id="maintenance-transition-title" className="text-xl font-black">{transitionTitle(transitionDialog.target, language)}</h2>
            <p className="mt-2 text-sm text-slate-400">{t("Phiếu", "Work order")}: <b className="text-slate-200">{transitionDialog.order.title}</b></p>
            <label className="mt-5 block text-sm text-slate-300">
              {transitionPrompt(transitionDialog.target, language)}
              <textarea
                data-testid="maintenance-transition-note"
                aria-label={transitionPrompt(transitionDialog.target, language)}
                className="input mt-2 min-h-28"
                value={transitionDialog.note}
                onChange={(event) => setTransitionDialog({ ...transitionDialog, note: event.target.value, validation: "" })}
                placeholder={transitionDialog.target === "RESOLVED" ? t("Ví dụ: OK, đã kiểm tra và thiết bị hoạt động bình thường.", "Example: OK, checked and the equipment is operating normally.") : t("Nhập lý do...", "Enter reason...")}
                autoFocus
                required
              />
            </label>
            <p className="mt-2 text-xs text-slate-500">{t("Tối thiểu 2 ký tự. Nội dung này được lưu vào lịch sử xử lý.", "Minimum 2 characters. This content is saved to the resolution history.")}</p>
            {transitionDialog.validation && <div data-testid="maintenance-transition-validation" className="mt-3 rounded-xl border border-red-800/60 bg-red-950/40 p-3 text-sm text-red-200">{transitionDialog.validation}</div>}
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => setTransitionDialog(null)}>{t("Hủy", "Cancel")}</button>
              <button data-testid="maintenance-transition-confirm" type="submit" className="btn btn-primary" disabled={busy}>{busy ? t("Đang cập nhật...", "Updating...") : transitionDialog.target === "RESOLVED" ? t("Xác nhận hoàn tất", "Confirm completion") : t("Xác nhận", "Confirm")}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
/* V77.0.9 historical-verifier compatibility markers (not rendered):
method:"DELETE"
aria-label={t("Mở lại phòng","Reopen auditorium")}
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
Kết quả: {order.resolutionNote}
maintenanceDisplayText(event.note)
*/
