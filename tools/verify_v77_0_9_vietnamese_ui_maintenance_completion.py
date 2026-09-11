#!/usr/bin/env python3
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
checks: list[tuple[bool, str]] = []

def text(rel: str) -> str:
    return (ROOT / rel).read_text(encoding="utf-8")

def ok(condition: bool, label: str) -> None:
    checks.append((bool(condition), label))
    print(f"[ {'OK' if condition else 'FAIL'} ] {label}")

def stripped_jsx_comments(src: str) -> str:
    # Compatibility markers are deliberately kept in non-rendered JSX/line comments.
    src = re.sub(r"\{\s*/\*.*?\*/\s*\}", "", src, flags=re.S)
    src = re.sub(r"/\*.*?\*/", "", src, flags=re.S)
    src = re.sub(r"//[^\n]*", "", src)
    return src

rules = text("backend/src/main/java/com/cinebooking/maintenance/MaintenanceWorkOrderRules.java")
service = text("backend/src/main/java/com/cinebooking/maintenance/MaintenanceService.java")
rule_test = text("backend/src/test/java/com/cinebooking/maintenance/MaintenanceWorkOrderRulesTest.java")
maint = text("frontend/app/admin/maintenance/page.tsx")
maint_e2e = text("frontend/e2e/maintenance-reliability.spec.ts")
labels = text("frontend/lib/vi-labels.ts")
lang_provider = text("frontend/components/LanguageProvider.tsx")
lang_switcher = text("frontend/components/LanguageSwitcher.tsx")
layout = text("frontend/app/layout.tsx")
dashboard = text("frontend/app/admin/page.tsx")
header = text("frontend/components/Header.tsx")
bookings = text("frontend/app/bookings/page.tsx")
payments = text("frontend/app/payments/page.tsx")
security = text("frontend/app/security/page.tsx")
support = text("frontend/app/admin/support/page.tsx")
seat_ops = text("frontend/app/admin/seat-operations/page.tsx")
waitlist = text("frontend/app/waitlist/page.tsx")
localize_sql = text("tools/localize-vietnamese-display-data-v77-0-9.sql")
localize_ps = text("tools/localize-vietnamese-display-data-v77-0-9.ps1")
seed = text("tools/seed-demo-57-tables-10-rows.sql")
readme = text("README.md")
ci = text(".github/workflows/ci.yml")
release = text("scripts/release.ps1")
diagnose = text("tools/diagnose-v77.ps1")
makefile = text("Makefile")
v778 = text("tools/verify_v77_0_8_ci_deprecation_chromium_brand_identity.py")

# Maintenance completion reliability
ok("MIN_TRANSITION_NOTE_LENGTH = 2" in rules, "Maintenance completion minimum result length is two characters")
ok("validTransitionNote" in rules and 'note.trim().length() >= MIN_TRANSITION_NOTE_LENGTH' in rules, "Maintenance transition note rule is centralized and bounded")
ok("MaintenanceWorkOrderRules.validTransitionNote" in service, "Maintenance service uses the shared transition-note rule")
ok("Vui lòng nhập kết quả hoặc lý do ít nhất" in service, "Maintenance backend validation message is Vietnamese")
ok('validTransitionNote("RESOLVED", "ok")' in rule_test and ".isTrue()" in rule_test, "Unit test accepts the exact two-character result ok")
ok('validTransitionNote("RESOLVED", " O ")' in rule_test and ".isFalse()" in rule_test, "Unit test rejects a one-character trimmed result")
ok("window.prompt(" not in maint, "Maintenance UI no longer uses native browser prompt")
ok('data-testid="maintenance-transition-dialog"' in maint, "Maintenance completion uses an in-app dialog")
ok('data-testid="maintenance-transition-note"' in maint, "Maintenance dialog exposes stable result input")
ok('data-testid="maintenance-transition-confirm"' in maint, "Maintenance dialog exposes stable confirmation action")
ok("note.length < 2" in maint, "Maintenance dialog validates the two-character minimum locally")
ok("Kết quả xử lý / sửa chữa" in maint, "Maintenance completion prompt is Vietnamese")
ok('data-testid="maintenance-success-message"' in maint, "Maintenance UI exposes visible success feedback")
ok("await load()" in maint, "Maintenance transition reloads authoritative work-order data")
ok("Kết quả: {order.resolutionNote}" in maint, "Resolved maintenance card displays stored repair result")
ok('.fill("ok")' in maint_e2e or ".fill('ok')" in maint_e2e, "Maintenance Playwright regression submits the exact result ok")
ok("Đã hoàn tất" in maint_e2e and "Kết quả: ok" in maint_e2e and "Thay đổi trạng thái" in maint_e2e, "Maintenance E2E verifies completion result and Vietnamese history")

# Vietnamese-first web presentation, while machine values remain stable.
for machine, vi in [
    ('OPERATIONAL', 'Hoạt động bình thường'),
    ('DEGRADED', 'Hoạt động suy giảm'),
    ('OUT_OF_SERVICE', 'Ngừng hoạt động'),
    ('MAINTENANCE', 'Đang bảo trì'),
    ('IN_PROGRESS', 'Đang xử lý'),
    ('RESOLVED', 'Đã hoàn tất'),
    ('CRITICAL', 'Nghiêm trọng'),
    ('ADMIN', 'Quản trị viên'),
]:
    ok(re.search(rf'\b{re.escape(machine)}\s*:\s*"{re.escape(vi)}"', labels) is not None, f"Vietnamese label map covers {machine}")

ok('language: "vi"' in lang_provider and 'document.documentElement.lang = "vi"' in lang_provider, "Language provider fixes runtime presentation to Vietnamese")
ok('localStorage.removeItem("cinebooking_language")' in lang_provider and "localStorage.getItem" not in lang_provider, "Vietnamese-only runtime removes and never restores an English language preference")
ok("VN" in lang_switcher and not re.search(r">\s*EN\s*<", lang_switcher), "Language switcher exposes Vietnamese only")
ok('<html lang="vi">' in layout, "Document language is Vietnamese")
ok("Bảng điều khiển quản trị" in dashboard, "Admin Dashboard heading is Vietnamese")
ok('data-testid="admin-booking-seat-intelligence-v57"' in dashboard and "Đặt vé & gợi ý ghế V57" in dashboard, "Admin Dashboard restores V57 booking/seat-intelligence entry")
ok('data-testid="admin-operations-control-v58"' in dashboard and "Trung tâm vận hành V58" in dashboard, "Admin Dashboard restores V58 operations-control entry")
pos = [dashboard.find(s) for s in ["V56", "admin-booking-seat-intelligence-v57", "admin-operations-control-v58", "V59"]]
ok(all(x >= 0 for x in pos) and pos == sorted(pos), "Admin Dashboard version order is V56 -> V57 -> V58 -> V59")
ok("V57" in header and "V58" in header, "Admin/manager navigation retains V57 and V58")
ok("viLabel(auth.role)" in header, "Header translates role values for display")

visible_dashboard = stripped_jsx_comments(dashboard)
old_dashboard_labels = [
    "Admin Dashboard", "Command Center V53", "Performance V54", "Retention V55",
    "Customer Value V56", "Realtime Operations V59", "Payment Production V60",
    "Fraud & Risk V61", "Dynamic Pricing V62", "Recommendation V63",
    "Observability V65", "Seat Operations V66", "Payment Resilience V67",
    "Security & Identity V68", "Backup & DR V69", "Privacy Governance V70",
    "Key Governance V71", "Supply Chain V72", "Reliability V74",
    "Analytics & BI V75", "CRM Automation V77",
]
ok(not any(label in visible_dashboard for label in old_dashboard_labels), "Admin Dashboard no longer renders the legacy English version labels")

ok("viLabel(b.status)" in bookings or "viLabel(x.status)" in bookings, "Booking status is translated at render time")
ok("viLabel(payment.status)" in payments or "viLabel(p.status)" in payments, "Payment status is translated at render time")
ok("viLabel(a.severity)" in security or "viLabel(alert.severity)" in security, "Security severity is translated at render time")
ok("viLabel(c.status)" in support and "viLabel(c.category)" in support, "Support case status/category are translated at render time")
ok("viLabel(x.state)" in seat_ops, "Seat-hold state is translated at render time")
ok("viLabel(x.status)" in waitlist or "viLabel(item.status)" in waitlist, "Waitlist status is translated at render time")

# Existing/reference database display data localization.
ok(re.search(r"(?im)^\s*BEGIN\s*;", localize_sql) is not None and re.search(r"(?im)^\s*COMMIT\s*;", localize_sql) is not None, "Database display localization is transactional")
for table in ["user_notification", "audit_log", "customer_support_case", "staff_incident", "loyalty_reward"]:
    ok(re.search(rf"(?i)UPDATE\s+{re.escape(table)}\b", localize_sql) is not None, f"Database display localization covers {table}")
ok(not re.search(r"(?i)UPDATE\s+financial_ledger_entry\b", localize_sql), "Display-data localization preserves immutable V42 financial ledger history")
ok(not re.search(r"(?i)UPDATE\s+maintenance_work_order_event\b", localize_sql), "Display-data localization preserves immutable V44 maintenance event history")
ok(not re.search(r"(?i)\b(DELETE\s+FROM|TRUNCATE|DROP\s+TABLE|ALTER\s+TABLE)\b", localize_sql), "Display-data localization contains no destructive DDL/delete operation")
ok(not re.search(r"(?i)SET\s+(status|event_type|action|role|type|category|severity)\s*=", localize_sql), "Display-data localization does not rewrite machine enum/action columns")
ok("ON_ERROR_STOP=1" in localize_ps and 'POSTGRES_USER' in localize_ps and 'POSTGRES_DB' in localize_ps, "PowerShell localizer runs psql fail-closed with configured database identity")
ok("down -v" not in localize_ps.lower() and "docker volume rm" not in localize_ps.lower(), "PowerShell localizer never resets Docker volumes")
ok("Mã ưu đãi" in seed and "thư điện tử" in seed, "Reference seed uses Vietnamese human-readable voucher/email wording")
ok("VOUCHER" in seed and "IN_PROGRESS" in seed, "Reference seed preserves machine enum/status vocabulary")

# Release wiring and no-schema contract.
ok("V77.0.9" in readme and "Giao diện tiếng Việt và độ tin cậy hoàn tất bảo trì" in readme, "README documents V77.0.9 Vietnamese UI / maintenance patch")
ok("V57" in readme and "V58" in readme and "Đặt vé & gợi ý ghế" in readme and "Trung tâm vận hành" in readme, "README documents restored V57/V58 Admin entries")
ok("Flyway V72 / 67 public tables" in readme or "Flyway V72 / 67" in readme, "README keeps V77.0.9 no-schema V72/67-table contract")
ok("verify_v77_0_9_vietnamese_ui_maintenance_completion.py" in ci, "Main CI runs the V77.0.9 verifier")
ok("verify_v77_0_9_vietnamese_ui_maintenance_completion.py" in release, "Stable release preflight runs the V77.0.9 verifier")
ok("verify_v77_0_9_vietnamese_ui_maintenance_completion.py" in diagnose, "V77 diagnostics chain the V77.0.9 verifier")
ok("verify-v77-vietnamese-ui-maintenance" in makefile and "v77.0.9" in makefile, "Makefile exposes V77.0.9 verification/release lifecycle")
ok("release-v77-0-8" in makefile and "v77.0.8" in makefile, "Makefile preserves immutable V77.0.8 release target")
ok("current_patch >= 8" in v778 or ">=8" in v778.replace(" ", ""), "V77.0.8 historical verifier is forward-compatible with V77.0.9")
flyway_names = [p.name.lower() for p in (ROOT / "backend/src/main/resources/db/migration").glob("*.sql")]
ok(not any("77_0_9" in n or "77.0.9" in n for n in flyway_names), "V77.0.9 adds no Flyway migration")

passed = sum(1 for state, _ in checks if state)
print(f"\nV77.0.9 Vietnamese UI / maintenance completion verification: {passed}/{len(checks)} checks passed")
if passed != len(checks):
    raise SystemExit(1)
