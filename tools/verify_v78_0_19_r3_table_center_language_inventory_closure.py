from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
checks = []


def text(rel: str) -> str:
    path = ROOT / rel
    return path.read_text(encoding="utf-8") if path.exists() else ""


def ok(condition, label: str) -> None:
    passed = bool(condition)
    checks.append(passed)
    print(f"[ {'OK' if passed else 'FAIL'} ] {label}")


css = text("frontend/app/globals.css")
home = text("frontend/app/page.tsx")
recommendation = text("frontend/lib/recommendation-presentation.ts")
movie_presentation = text("frontend/lib/movie-presentation.ts")
system = text("frontend/lib/system-presentation.ts")
maintenance = text("frontend/app/admin/maintenance/page.tsx")
performance = text("frontend/app/admin/performance/page.tsx")
bookings = text("frontend/app/admin/bookings/page.tsx")
showtimes = text("frontend/app/admin/showtimes/page.tsx")
inventory = text("frontend/app/admin/inventory/page.tsx")
inventory_e2e = text("frontend/e2e/inventory-operations-v48.spec.ts")
release = text("scripts/release.ps1")
ci = text(".github/workflows/ci.yml")
diag = text("tools/diagnose-v78.ps1")
make = text("Makefile")
readme = text("README.md")

# All table headers and contents must center globally.
ok('.app-main table th,' in css and '.app-main table td {' in css,
   "Global table contract covers both TH and TD cells")
cell_block = re.search(r'\.app-main table th,\s*\n\.app-main table td \{(?P<body>.*?)\n\}', css, re.S)
ok(cell_block and 'text-align:center !important;' in cell_block.group('body'),
   "All table body/header cells are centered by the shared contract")
ok('.app-main table thead th {' in css and 'text-align:center !important;' in css,
   "Table header centering remains explicit")

# Home recommendation dynamic EN closure.
ok(('recommendationProfileSummary(recommendations.profile,recommendations.profileSummary,language)' in home) or ('recommendationProfileSummary' not in home and 'profileSummary' not in home),
   "Home personalized profile line is semantic or intentionally omitted by a later patch")
ok('recommendationReason(item.reason,language)' in home,
   "Home recommendation reasons translate dynamic backend-owned templates")
ok('movieGenreLabel(value,language)' in home,
   "Home matched genres use controlled vocabulary localization")
ok('movieGenreLabel(x.name, "en")' in recommendation and 'movieLanguageLabel(profile.topLanguages[0].name, "en")' in recommendation,
   "Recommendation profile localizes genres and movie language in EN")
ok(('movieGenreLabel(match[1], "en")' in recommendation or 'recommendationGenreListLabel(match[1], "en")' in recommendation) and 'movieLanguageLabel(match[2], "en")' in recommendation,
   "Recommendation reason templates localize controlled genre/language captures")
ok('"Phiêu lưu": "Adventure"' in movie_presentation and '"Khoa học viễn tưởng": "Science fiction"' in movie_presentation and '"Tiếng Việt": "Vietnamese"' in movie_presentation,
   "Controlled movie vocabulary covers the reported Vietnamese recommendation values")

# Maintenance work-order semantic EN closure.
ok('MAINTENANCE_WORK_DESCRIPTION_EN' in system and 'MAINTENANCE_WORK_TITLE_PREFIX_EN' in system,
   "Known maintenance work-order templates have bounded EN ownership")
ok('"Cân chỉnh máy chiếu ", "Calibrate projector "' in system and 'Check brightness, cooling fans, power, and projector image alignment.' in system,
   "Reported maintenance title/description translate deterministically")
ok('maintenanceWorkOrderPresentation(order.title, order.description, language)' in maintenance,
   "Maintenance page renders work-order semantic copy")
ok('{orderCopy.title}' in maintenance and '{orderCopy.description}' in maintenance,
   "Maintenance cards no longer render raw known Vietnamese work-order copy in EN")

# Controlled auditorium labels, while movie/cinema/customer names remain business data.
ok('export function auditoriumDisplayName' in system and r'^Phòng\s+(.+)$' in system,
   "Controlled auditorium prefix Phòng -> Room is language aware")
ok('auditoriumDisplayName(x.auditoriumName, language)' in bookings,
   "Admin Bookings localizes auditorium display names")
ok('auditoriumDisplayName(a.name, language)' in showtimes and 'auditoriumDisplayName(s.auditoriumName, language)' in showtimes,
   "Admin Showtimes localizes controlled auditorium display names")
ok('auditoriumDisplayName(order.auditoriumName, language)' in maintenance,
   "Maintenance localizes controlled auditorium display names")

# Performance dynamic counters were mixed VI/EN because the number and noun shared a dynamic text node.
ok('{number(b.bookings)} {t("đặt vé","bookings")} · {number(b.tickets)} {t("vé","tickets")}' in performance,
   "Performance branch row explicitly owns bookings/tickets EN nouns")
ok('{number(m.tickets)} {t("vé","tickets")}' in performance,
   "Performance top-movie ticket count explicitly owns EN noun")

# V48 full-suite failure closure.
ok('SUSTAINED_OPERATIONAL_READ_OPTIONS' in inventory,
   "Inventory branch bootstrap opts into sustained operational-read retry")
ok('throw new ApiError(503,"Inventory branch list is not ready yet.")' in inventory,
   "Inventory bootstrap retries transient empty branch snapshots instead of committing an empty select")
ok('option").count(),{timeout:30000}' in inventory_e2e,
   "V48 inventory E2E allows the bounded sustained-read window before declaring branch/product failure")

# Source-wide table inventory remains comprehensive.
table_files = []
table_tags = 0
for base in (ROOT / "frontend/app", ROOT / "frontend/components"):
    for path in base.rglob("*.tsx"):
        source = path.read_text(encoding="utf-8")
        count = source.count("<table")
        if count:
            table_files.append(path)
            table_tags += count
ok(len(table_files) >= 32, f"Source-wide table inventory still covers at least 32 TSX files ({len(table_files)})")
ok(table_tags >= 45, f"Source-wide table inventory still covers at least 45 tables ({table_tags})")

# Release wiring + no schema.
name = "verify_v78_0_19_r3_table_center_language_inventory_closure.py"
ok(name in release and name in ci and name in diag,
   "Stable preflight, GitHub CI and V78 diagnostics execute the R3 verifier")
ok('verify-v78-0-19-r3' in make and 'release-v78-0-19-r3' in make,
   "Makefile exposes R3 verify/release lifecycle")
ok('V78.0.19-R3' in readme and 'Table Center / EN Dynamic Copy / Inventory E2E Closure' in readme,
   "README records R3 in the single consolidated change history")
ok([p.name for p in ROOT.glob("*.md")] == ["README.md"],
   "Source keeps exactly one consolidated root README.md")

migrations = list((ROOT / "backend/src/main/resources/db/migration").glob("V*.sql"))
latest = max(int(re.match(r"V(\d+)", p.name).group(1)) for p in migrations if re.match(r"V(\d+)", p.name))
ok(latest == 72 and not list((ROOT / "backend/src/main/resources/db/migration").glob("V78*.sql")),
   "R3 remains no-schema on Flyway V72")

# Preserve previous closure wiring without recursively re-running the large historical matrix here.
# Full release preflight still executes R2/V78.0.19/V78.0.18 as separate gates.
r2 = text("tools/verify_v78_0_19_r2_table_language_release_closure.py")
v7819 = text("tools/verify_v78_0_19_language_focus_currency_closure.py")
v7818 = text("tools/verify_v78_0_18_full_suite_operational_read_stability.py")
ok("V78.0.19-R2 Table / Presentation / Release Closure verification" in r2 and "verify_v78_0_19_r2_table_language_release_closure.py" in release,
   "R2 table/presentation/release lineage remains wired")
ok("27/27 checks passed" in v7819 and "verify_v78_0_19_language_focus_currency_closure.py" in release,
   "V78.0.19 language/focus/currency lineage remains wired")
ok("27/27 checks passed" in v7818 and "verify_v78_0_18_full_suite_operational_read_stability.py" in release,
   "V78.0.18 operational-read lineage remains wired")

passed = sum(checks)
print(f"\nV78.0.19-R3 Table Center / EN Dynamic Copy / Inventory E2E Closure verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed == len(checks) else 1)
