from pathlib import Path
import re
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


support = text("frontend/app/admin/support/page.tsx")
system = text("frontend/lib/system-presentation.ts")
booking = text("frontend/app/booking/[showtimeId]/page.tsx")
bookings = text("frontend/app/bookings/page.tsx")
concession = text("frontend/lib/concession-presentation.ts")
payment = text("frontend/lib/payment-presentation.ts")
payment_page = text("frontend/app/admin/payments/page.tsx")
api = text("frontend/lib/api.ts")
e2e = text("frontend/e2e/v78-language-accessibility-pwa.spec.ts")
inv_e2e = text("frontend/e2e/inventory-operations-v48.spec.ts")
css = text("frontend/app/globals.css")
for_you = text("frontend/app/for-you/page.tsx")
release = text("scripts/release.ps1")
ci = text(".github/workflows/ci.yml")
diag = text("tools/diagnose-v78.ps1")
make = text("Makefile")
readme = text("README.md")
v6 = text("tools/verify_v78_0_6_inventory_presentation_language_business_boundaries.py")
v7 = text("tools/verify_v78_0_7_admin_v78_entry_inventory_product_boundaries.py")

# Reported Support dynamic metadata leaks.
ok('t("Hạn SLA","SLA due")' in support and 't("Phụ trách","Assignee")' in support,
   "Admin Support explicitly owns Hạn SLA / Phụ trách in VI↔EN")
ok('data-testid="admin-support-sla-r5"' in support,
   "Admin Support exposes a browser-test anchor for dynamic SLA/assignee copy")

# Auditorium controlled display vocabulary: raw DB value is preserved for filters/editing,
# but every JSX renderer uses the shared Phòng -> Room presentation helper.
ok('value.match(/^Phòng\\s+(.+)$/u)' in system and '`Room ${room[1]}`' in system,
   "Shared auditorium display helper maps controlled Phòng prefix to Room in EN")
raw_auditorium_exprs: list[str] = []
helper_auditorium_exprs = 0
for base in (ROOT / "frontend/app", ROOT / "frontend/components"):
    for path in base.rglob("*.tsx"):
        src = path.read_text(encoding="utf-8")
        for match in re.finditer(r"\{([^{}\n]{0,240}auditoriumName[^{}\n]{0,240})\}", src):
            expr = match.group(1)
            if "auditoriumDisplayName" in expr:
                helper_auditorium_exprs += 1
            elif "rules.filter" in expr or "some(v=>" in expr:
                continue
            else:
                raw_auditorium_exprs.append(f"{path.relative_to(ROOT)}:{expr[:120]}")
ok(helper_auditorium_exprs >= 20,
   f"Auditorium EN helper covers rendered runtime expressions ({helper_auditorium_exprs})")
ok(not raw_auditorium_exprs,
   f"No raw auditoriumName JSX presentation renderer remains (hits={len(raw_auditorium_exprs)})")

# Points presentation.
ok('data-testid="booking-points-conversion-r5"' in booking and '`1 point = ${currency(100)}' in booking and '`1 điểm = ${currency(100)}' in booking,
   "Booking loyalty conversion renders 1 point in EN and 1 điểm in VI")
ok('b.pointsRedeemed===1?"point":"points"' in bookings and ':"điểm"' in bookings,
   "Booking history renders point/points pluralization without leaking điểm in EN")

# Controlled concessions: cover current migration + realistic seed vocabulary while leaving unknown admin data unchanged.
seed_names = [
    "Bắp Caramel", "Nước ngọt", "Combo Couple",
    "Bắp Caramel Vừa", "Bắp Phô Mai Lớn", "Bắp Ngọt Lớn", "Coca-Cola Lớn",
    "Sprite Lớn", "Fanta Cam Lớn", "Nước Suối Dasani", "Combo Solo", "Combo Couple Plus", "Combo Family",
]
seed_descriptions = [
    "Bắp rang caramel cỡ lớn", "Nước ngọt cỡ lớn", "2 bắp + 2 nước cho hai người",
    "Bắp rang caramel cỡ vừa", "Bắp rang phủ phô mai cỡ lớn", "Bắp rang vị ngọt cỡ lớn",
    "Nước ngọt Coca-Cola cỡ lớn", "Nước ngọt Sprite cỡ lớn", "Nước ngọt Fanta cam cỡ lớn",
    "Nước suối Dasani 500 ml", "1 bắp vừa + 1 nước lớn", "1 bắp lớn + 2 nước lớn", "2 bắp lớn + 4 nước lớn",
]
ok(all(f'"{name}"' in concession for name in seed_names),
   f"Controlled concession EN catalog covers all audited product names ({len(seed_names)}/{len(seed_names)})")
ok(all(f'"{desc}"' in concession for desc in seed_descriptions),
   f"Controlled concession EN catalog covers all audited product descriptions ({len(seed_descriptions)}/{len(seed_descriptions)})")
ok('CONCESSION_EN[value]?.name ?? value' in concession and 'DESCRIPTION_EN[value] ?? value' in concession,
   "Unknown/admin-authored concession business data falls through unchanged")
concession_consumers = [
    "frontend/app/booking/[showtimeId]/page.tsx",
    "frontend/app/promotions/page.tsx",
    "frontend/app/admin/inventory/page.tsx",
    "frontend/app/admin/bookings/page.tsx",
    "frontend/app/admin/commerce/page.tsx",
    "frontend/app/admin/analytics/page.tsx",
    "frontend/app/staff/check-in/page.tsx",
    "frontend/app/bookings/page.tsx",
]
ok(all("concessionProduct" in text(rel) for rel in concession_consumers),
   f"Controlled concession presentation is used by all audited customer/admin surfaces ({len(concession_consumers)})")

# Payment readiness/provider copy from backend-owned deterministic strings.
payment_pairs = {
    "Thanh toán nội bộ (MOCK)": "Internal payment (MOCK)",
    "Không phải gateway production": "Not a production payment gateway",
    "MOCK chỉ dành cho local/CI, không phải cổng thanh toán production": "MOCK is for local/CI only; it is not a production payment gateway",
    "Sẵn sàng cho local/CI": "Ready for local/CI",
    "Chưa cấu hình merchant credentials": "Merchant credentials are not configured",
    "Gateway đang ở sandbox; chưa phải production traffic": "Gateway is in sandbox mode; it is not serving production traffic",
    "Provider không hợp lệ": "Invalid provider",
    "Chưa cấu hình VNPAY": "VNPay is not configured",
    "Chưa cấu hình MoMo": "MoMo is not configured",
}
ok(all(f'"{vi}": "{en}"' in payment for vi, en in payment_pairs.items()),
   f"Payment controlled EN catalog covers reported/readiness/API copy ({len(payment_pairs)})")
ok('raw.match(/^(.+) chưa được cấu hình merchant credentials$/u)' in payment and 'production guard chặn checkout' in payment,
   "Payment dynamic backend templates have bounded semantic EN renderers")
ok('paymentPresentationCopy(message, "en")' in api,
   "API error boundary routes payment backend-owned messages through EN presentation")
ok('paymentProviderDisplayName(g.displayName,language)' in payment_page and 'paymentPresentationCopy(x,language)' in payment_page,
   "Payment readiness cards localize provider names, blockers and warnings")
ok('paymentProviderDisplayName(p.displayName,language)' in payment_page and 'paymentPresentationCopy(p.reason,language)' in payment_page,
   "Payment provider cards localize display name and reason")

# Full-source static contract + the dynamic browser blind spots reported by screenshots.
ok('admin-support-sla-r5' in e2e and 'SLA due' in e2e and 'Phụ trách' in e2e,
   "Focused V78 browser journey asserts Support dynamic metadata in EN")
ok('booking-seat-auditorium-r5' in e2e and 'not.toHaveText(/^Phòng' in e2e,
   "Focused V78 browser journey asserts auditorium controlled vocabulary")
ok('booking-points-conversion-r5' in e2e and '1 point =' in e2e and '1 điểm' in e2e,
   "Focused V78 browser journey asserts loyalty point EN copy")
ok('promotion-concession-name-r5' in e2e and 'booking-concession-name-r5' in e2e,
   "Focused V78 browser journey exercises concession names on promotion/booking surfaces")
ok('Payment EN leak:' in e2e and 'Thanh toán nội bộ (MOCK)' in e2e and 'Internal payment (MOCK)' in e2e,
   "Focused V78 browser journey rejects reported Payment Vietnamese leaks")
ok('performanceText' in e2e and r'\d+\s+đặt vé' in e2e,
   "Focused V78 browser journey rejects dynamic Performance đặt vé leakage")
ok('{en?"Algorithm":"Thuật toán"}' in for_you and '{en?"Mode":"Chế độ"}' in for_you,
   "For You evidence footer explicitly owns Algorithm/Mode copy")

# V48 full-suite failure: deterministic two-cinema precondition at the API contract,
# rather than another timeout increase over a potentially empty database.
ok('CineHub Quận 1' in inv_e2e and 'CineHub Bình Thạnh' in inv_e2e and 'requiredBranches=[' in inv_e2e,
   "V48 Inventory E2E provisions two deterministic branch prerequisites")
ok('context.request.get(apiUrl("/api/admin/inventory/branches")' in inv_e2e and 'context.request.post(apiUrl("/api/admin/cinemas")' in inv_e2e,
   "V48 Inventory E2E verifies/provisions branches through real admin APIs")
ok('requiredBranches.every(branch=>snapshot.some(item=>item.cinemaName===branch.name))' in inv_e2e,
   "V48 Inventory E2E waits for the actual branch API contract before navigation")
ok('cinema.locator("option").count()' in inv_e2e and '.toBeGreaterThan(1)' in inv_e2e,
   "V48 Inventory E2E keeps the original UI transfer prerequisite assertion")

# Preserve R4 source-wide table geometry contract.
ok('.app-main table th *,' in css and '.app-main table td * {' in css and 'text-align:center !important;' in css,
   "All table headers and descendant body text remain globally centered")
ok('.app-main table td :where(.flex,.inline-flex)' in css and 'justify-content:center !important;' in css,
   "Nested flex content inside table cells remains geometrically centered")
table_files: set[Path] = set()
table_tags = 0
alignment_overrides: list[str] = []
for base in (ROOT / "frontend/app", ROOT / "frontend/components"):
    for path in base.rglob("*.tsx"):
        source = path.read_text(encoding="utf-8")
        for m in re.finditer(r"<table\b.*?</table>", source, re.S):
            table_tags += 1
            table_files.add(path)
            block = m.group(0)
            if "text-left" in block or "text-right" in block:
                alignment_overrides.append(str(path.relative_to(ROOT)))
ok(len(table_files) >= 32 and table_tags >= 45,
   f"Source-wide table inventory remains comprehensive ({len(table_files)} files / {table_tags} tables)")
ok(not alignment_overrides,
   f"No table-local text-left/text-right override remains (hits={len(alignment_overrides)})")

# Historical inventory business-data verifiers were made forward-compatible with
# controlled known-catalog localization, without weakening arbitrary fallback boundaries.
ok('concessionProductName' in v6 and 'concessionProductName' in v7,
   "Historical V78.0.6/V78.0.7 inventory gates understand controlled concession localization")

# R5 lifecycle / schema / hygiene.
name = "verify_v78_0_19_r5_full_en_presentation_inventory_closure.py"
ok(name in release and name in ci and name in diag,
   "Stable preflight, GitHub CI and V78 diagnostics execute the R5 verifier")
ok("verify-v78-0-19-r5" in make and "release-v78-0-19-r5" in make,
   "Makefile exposes R5 verify/release lifecycle")
ok("V78.0.19-R5" in readme and "Full EN Presentation / Inventory E2E Closure" in readme,
   "README records R5 in the single consolidated release history")
ok([p.name for p in ROOT.glob("*.md")] == ["README.md"],
   "Source keeps exactly one consolidated root README.md")
migrations = list((ROOT / "backend/src/main/resources/db/migration").glob("V*.sql"))
latest = max(int(re.match(r"V(\d+)", p.name).group(1)) for p in migrations if re.match(r"V(\d+)", p.name))
ok(latest == 72 and not list((ROOT / "backend/src/main/resources/db/migration").glob("V78*.sql")),
   "R5 remains no-schema on Flyway V72")

# Changed presentation/runtime files must be exact-EOF/trailing-whitespace clean.
changed = [
    "frontend/lib/concession-presentation.ts", "frontend/lib/payment-presentation.ts", "frontend/lib/api.ts",
    "frontend/app/admin/support/page.tsx", "frontend/app/admin/payments/page.tsx", "frontend/app/booking/[showtimeId]/page.tsx",
    "frontend/app/promotions/page.tsx", "frontend/app/admin/inventory/page.tsx", "frontend/e2e/inventory-operations-v48.spec.ts",
    "frontend/e2e/v78-language-accessibility-pwa.spec.ts", "tools/verify_v78_0_19_r5_full_en_presentation_inventory_closure.py",
]
hygiene: list[str] = []
for rel in changed:
    p = ROOT / rel
    if not p.exists():
        hygiene.append(rel + ":missing")
        continue
    lines = p.read_text(encoding="utf-8").splitlines()
    if any(line.endswith(" ") or line.endswith("\t") for line in lines):
        hygiene.append(rel + ":trailing")
    raw = p.read_bytes()
    if not raw.endswith(b"\n") or raw.endswith(b"\n\n"):
        hygiene.append(rel + ":eof")
ok(not hygiene, f"R5 presentation/runtime files are staging-whitespace clean (hits={len(hygiene)})")

passed = sum(checks)
print(f"\nV78.0.19-R5 Full EN Presentation / Inventory E2E Closure verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed == len(checks) else 1)
