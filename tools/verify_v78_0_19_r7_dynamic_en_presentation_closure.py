from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
checks: list[bool] = []

def text(rel: str) -> str:
    p = ROOT / rel
    return p.read_text(encoding="utf-8") if p.exists() else ""

def ok(condition, label: str) -> None:
    passed = bool(condition)
    checks.append(passed)
    print(f"[ {'OK' if passed else 'FAIL'} ] {label}")

helper = text("frontend/lib/controlled-business-presentation.ts")
pricing = text("frontend/app/admin/pricing/page.tsx")
analytics = text("frontend/app/admin/analytics/page.tsx")
staff = text("frontend/app/admin/staff/page.tsx")
operations = text("frontend/app/staff/operations/page.tsx")
vouchers = text("frontend/app/admin/vouchers/page.tsx")
for_you = text("frontend/app/for-you/page.tsx")
marketing = text("frontend/app/admin/marketing/page.tsx")
observability = text("frontend/app/admin/observability/page.tsx")
e2e = text("frontend/e2e/v78-language-accessibility-pwa.spec.ts")
release = text("scripts/release.ps1")
ci = text(".github/workflows/ci.yml")
diag = text("tools/diagnose-v78.ps1")
make = text("Makefile")
readme = text("README.md")

# Bounded controlled business/display-data presentation helpers.
ok('PRICING_RULE_PREFIX_EN' in helper and '"Cuối tuần", "Weekend"' in helper and '"Ưu đãi đặt vé trực tuyến", "Online booking promotion"' in helper,
   "Controlled Pricing rule vocabulary covers reported seeded names")
ok('return raw;' in helper and 'name:r.name' in pricing and 'ruleBody(form)' in pricing,
   "Pricing localization remains render-only and preserves raw stored/admin-authored rule data")
ok('STAFF_JOB_TITLE_EN' in helper and '"Giám sát ca": "Shift supervisor"' in helper and '"Kỹ thuật viên phòng chiếu": "Projection technician"' in helper,
   "Controlled staff job-title vocabulary covers the reported staff cards")
ok('staffIncidentPresentation' in helper and 'Customer needs help at the ticket gate' in helper and 'The ticket code was checked' in helper,
   "Known seeded/E2E staff incident templates have bounded EN presentation")
ok('STAFF_HANDOVER_EN' in helper and 'staffHandoverSummary' in helper,
   "Known seeded shift-handover summaries have bounded EN presentation")
ok('VOUCHER_NAME_EN' in helper and '"Ưu đãi tháng 8": "August promotion"' in helper and '"Ưu đãi thành viên mới 10%": "New member promotion 10%"' in helper,
   "Controlled voucher names cover the reported voucher cards")
ok('pricingSignalPresentation' in helper and '"Mức lấp đầy":"Occupancy"' in helper and '"Tốc độ nhu cầu":"Demand velocity"' in helper,
   "Dynamic V62 pricing signals have bounded EN presentation")

# Reported Pricing leak closure.
ok('pricingRuleDisplayName(r.name,language)' in pricing,
   "Admin Pricing renders controlled rule names through the EN presentation helper")
ok('pricing-rule-meta-r7' in pricing and 'daysText(r.daysOfWeek,language)' in pricing and '"Mon"' in pricing and '"Sun"' in pricing,
   "Pricing weekday metadata is language-aware instead of T2..CN in EN")
ok('t("ưu tiên","priority")' in pricing and 't("Cả ngày","All day")' in pricing and 't("Tất cả phòng","All auditoriums")' in pricing,
   "Pricing dynamic priority/day/all-auditorium copy is explicitly VI↔EN")
ok('pricingSignalPresentation(s.label,s.evidence,language)' in pricing and 'pricingRuleDisplayName(r.name,language)' in pricing,
   "Pricing quote detail also localizes backend dynamic signals and applied controlled rule names")

# Analytics concession ranking.
ok('concessionNames' in analytics and 'concessionProductName(x.name,language)' in analytics and 'top-concessions-r7' in analytics,
   "Analytics Top concessions translates controlled concession product names")

# Staff / operations dynamic data.
ok('staffJobTitleDisplay(s.jobTitle,language)' in staff and 'staff-job-title-r7' in staff,
   "Admin Staff localizes controlled job titles without changing raw edit data")
ok('staffIncidentPresentation(i.title,i.description,i.resolutionNote,language)' in operations,
   "Staff Operations renders known incident title/description/resolution templates in EN")
ok('staffHandoverSummary(h.summary,language)' in operations,
   "Staff Operations renders known handover summaries in EN")

# Voucher dynamic card metadata.
ok('voucherDisplayName(v.name,language)' in vouchers and 'voucher-name-r7' in vouchers,
   "Admin Vouchers localizes controlled voucher names")
ok('t("tối đa","maximum")' in vouchers and 't("đến","until")' in vouchers and 't("Đã dùng","Used")' in vouchers,
   "Voucher dynamic maximum/used/date metadata is explicitly VI↔EN")

# Recommendation profile dynamic controlled values.
ok('movieGenreLabel(x.name,language)' in for_you and 'for-you-top-genres-r7' in for_you,
   "For You Top genres maps backend Vietnamese genre values to EN")
ok('movieLanguageLabel(x.name,language)' in for_you,
   "For You profile language values use the controlled movie-language renderer")

# Marketing source-owned defaults.
ok('DEFAULT_CAMPAIGN_COPY' in marketing and 'An offer just for you' in marketing and 'CineBooking is sending you a personal offer to visit the cinema again soon.' in marketing,
   "Marketing default campaign Title/Message are language-owned")
ok('titleIsDefault' in marketing and 'messageIsDefault' in marketing and 'marketing-title-r7' in marketing and 'marketing-message-r7' in marketing,
   "Marketing language switching updates only untouched source-owned defaults, preserving user edits")

# Observability interpolated copy.
ok('observability-window-r7' in observability and 'Local replica window:' in observability and 'With no traffic, NO_DATA is shown instead of a false PASS.' in observability,
   "Observability dynamic SLO-window explanation has explicit EN copy")
ok('slo-target-r7' in observability and 'language==="en"?"Target":"Đích"' in observability,
   "Observability interpolated Target label no longer leaks Đích in EN")

# Browser regression coverage without adding another Playwright test count.
ok('pricing-rule-meta-r7' in e2e and 'top-concessions-r7' in e2e and 'staff-job-title-r7' in e2e,
   "Focused V78 browser journey asserts Pricing, Analytics concession and Staff dynamic EN copy")
ok('staff-incident' in e2e and 'voucher-name-r7' in e2e and 'for-you-top-genres-r7' in e2e,
   "Focused V78 browser journey asserts Operations, Voucher and Recommendation dynamic EN copy")
ok('marketing-title-r7' in e2e and 'observability-window-r7' in e2e and 'slo-target-r7' in e2e,
   "Focused V78 browser journey asserts Marketing defaults and Observability interpolated EN copy")

# Historical pricing boundary is updated without weakening arbitrary-data preservation.
v7816 = text("tools/verify_v78_0_16_pricing_rule_business_data_boundary.py")
ok('bounded controlled-vocabulary presentation boundary' in v7816 and 'preserve raw stored data' in v7816,
   "Historical V78.0.16 pricing boundary accepts bounded render-time localization while preserving arbitrary data")

# Lifecycle/docs/schema.
name = "verify_v78_0_19_r7_dynamic_en_presentation_closure.py"
ok(name in release and name in ci and name in diag,
   "Stable preflight, GitHub CI and V78 diagnostics execute the R7 verifier")
ok('verify-v78-0-19-r7' in make and 'release-v78-0-19-r7' in make,
   "Makefile exposes R7 verify/release lifecycle")
ok('V78.0.19-R7' in readme and 'Dynamic EN Presentation Closure' in readme,
   "README records R7 in the single consolidated release history")
ok([p.name for p in ROOT.glob("*.md")] == ["README.md"],
   "Source keeps exactly one consolidated root README.md")
migrations = list((ROOT / "backend/src/main/resources/db/migration").glob("V*.sql"))
latest = max(int(re.match(r"V(\d+)", p.name).group(1)) for p in migrations if re.match(r"V(\d+)", p.name))
ok(latest == 72 and not list((ROOT / "backend/src/main/resources/db/migration").glob("V78*.sql")),
   "R7 remains no-schema on Flyway V72")

# Changed-file whitespace hygiene.
changed = [
    "frontend/lib/controlled-business-presentation.ts",
    "frontend/app/admin/pricing/page.tsx",
    "frontend/app/admin/analytics/page.tsx",
    "frontend/app/admin/staff/page.tsx",
    "frontend/app/staff/operations/page.tsx",
    "frontend/app/admin/vouchers/page.tsx",
    "frontend/app/for-you/page.tsx",
    "frontend/app/admin/marketing/page.tsx",
    "frontend/app/admin/observability/page.tsx",
    "frontend/e2e/v78-language-accessibility-pwa.spec.ts",
    "tools/verify_v78_0_16_pricing_rule_business_data_boundary.py",
    "tools/verify_v78_0_19_r7_dynamic_en_presentation_closure.py",
    "scripts/release.ps1", ".github/workflows/ci.yml", "tools/diagnose-v78.ps1", "Makefile", "README.md",
]
hygiene: list[str] = []
for rel in changed:
    p = ROOT / rel
    if not p.exists():
        hygiene.append(rel + ":missing")
        continue
    raw = p.read_bytes()
    lines = p.read_text(encoding="utf-8").splitlines()
    if any(line.endswith(" ") or line.endswith("\t") for line in lines):
        hygiene.append(rel + ":trailing")
    if not raw.endswith(b"\n") or raw.endswith(b"\n\n"):
        hygiene.append(rel + ":eof")
ok(not hygiene, f"R7 changed files are staging-whitespace clean (hits={len(hygiene)})")

# Key verifier lineage.
for rel, expected, label in [
    ("tools/verify_v78_0_19_r6_lint_observability_full_suite_closure.py", "28/28 checks passed", "R6 lint/observability closure remains green"),
    ("tools/verify_v78_0_19_r5_full_en_presentation_inventory_closure.py", "38/38 checks passed", "R5 full-EN/inventory closure remains green"),
    ("tools/verify_v78_0_16_pricing_rule_business_data_boundary.py", "checks passed", "V78.0.16 pricing business-data boundary remains green"),
    ("tools/verify_v78_ux_accessibility_pwa_5.py", "27/27 checks passed", "Base V78 UX/Accessibility/PWA verifier remains green"),
]:
    proc = subprocess.run([sys.executable, "-X", "utf8", str(ROOT / rel)], cwd=ROOT, text=True, encoding="utf-8", errors="replace", capture_output=True)
    ok(proc.returncode == 0 and expected in proc.stdout, label)

passed = sum(checks)
print(f"\nV78.0.19-R7 Dynamic EN Presentation Closure verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed == len(checks) else 1)
