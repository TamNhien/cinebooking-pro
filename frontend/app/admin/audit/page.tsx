"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api, dateTime } from "@/lib/api";
import { getAuth } from "@/lib/auth";
import { usePresentationLanguage } from "@/lib/usePresentationLanguage";
import { auditDetailPresentation } from "@/lib/controlled-business-presentation";
import type { AuditItem } from "@/lib/types";

export default function AuditPage() {
  const { language, t } = usePresentationLanguage();
  const [items, setItems] = useState<AuditItem[]>([]);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const a = getAuth();
    if (!a || a.role !== "ADMIN") {
      window.location.assign("/login?next=/admin/audit");
      return;
    }
    api<AuditItem[]>("/admin/audit").then(setItems).catch((e) => setError(e.message));
  }, []);

  const filtered = useMemo(
    () =>
      items.filter((x) =>
        `${x.actorEmail} ${x.action} ${x.entityType} ${x.entityId} ${x.details}`
          .toLowerCase()
          .includes(q.toLowerCase()),
      ),
    [items, q],
  );

  return (
    <div className="space-y-6" data-testid="admin-audit-v7805">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="section-kicker" data-testid="admin-audit-kicker-v7805">
            {t("BẢO MẬT & KIỂM TOÁN", "SECURITY & AUDIT")}
          </p>
          <h1 className="text-3xl font-bold">{t("Nhật ký hệ thống", "System audit log")}</h1>
          <p className="mt-2 text-slate-400">
            {t("Theo dõi đăng nhập, soát vé và thao tác nghiệp vụ quan trọng.", "Track sign-ins, ticket checks, and important operational actions.")}
          </p>
        </div>
        <Link className="btn btn-secondary" href="/admin">
          {t("← Quản trị", "← Admin")}
        </Link>
      </div>

      <input
        className="input max-w-xl"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("Tìm email, hành động, đối tượng...", "Search email, action, entity...")}
      />

      {error && <div className="text-red-300">{error}</div>}

      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="p-3">{t("Thời gian", "Time")}</th>
              <th>{t("Người thực hiện", "Actor")}</th>
              <th className="min-w-[190px] whitespace-nowrap">{t("Thao tác", "Action")}</th>
              <th data-testid="admin-audit-entity-header-v7805">{t("Đối tượng", "Entity")}</th>
              <th>{t("Chi tiết", "Details")}</th>
              <th data-testid="admin-audit-ip-header-v7820r3" className="min-w-[128px] whitespace-nowrap">IP</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((x) => (
              <tr key={x.id} className="border-t border-slate-800">
                <td className="p-3 text-slate-400">{dateTime(x.createdAt)}</td>
                <td data-i18n-skip="true">{x.actorEmail || "system"}</td>
                <td className="whitespace-nowrap" data-i18n-skip="true">
                  <span className="inline-flex whitespace-nowrap rounded-lg bg-slate-800 px-2 py-1 font-bold">{x.action}</span>
                </td>
                <td data-i18n-skip="true">
                  {x.entityType || "—"}{" "}
                  {x.entityId && <span className="text-xs text-slate-500">#{x.entityId}</span>}
                </td>
                <td data-testid="audit-details-v7820r1" className="max-w-md" data-i18n-skip="true">
                  {auditDetailPresentation(x.details,language) || "—"}
                </td>
                <td className="min-w-[128px] whitespace-nowrap text-slate-500" data-i18n-skip="true">
                  <span data-testid="admin-audit-ip-v7820r3" className="inline-block whitespace-nowrap font-mono tabular-nums [overflow-wrap:normal] [word-break:normal]">{x.ipAddress || "—"}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
