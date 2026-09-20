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
layout = text("frontend/app/layout.tsx")
modality = text("frontend/components/InputModalityManager.tsx")
analytics = text("frontend/app/admin/analytics/page.tsx")
system = text("frontend/lib/system-presentation.ts")
support = text("frontend/app/admin/support/page.tsx")
maintenance = text("frontend/app/admin/maintenance/page.tsx")
command = text("frontend/app/admin/command-center/page.tsx")
checkin = text("frontend/app/staff/check-in/page.tsx")
catalog = text("frontend/lib/presentation-ui-translations-v78-0-13.ts")
cinema = text("backend/src/main/java/com/cinebooking/domain/Cinema.java")
cinema_test = text("backend/src/test/java/com/cinebooking/domain/CinemaDisplayNameTest.java")
forecasting = text("backend/src/main/java/com/cinebooking/analytics/AnalyticsForecastingService.java")
admin_analytics = text("backend/src/main/java/com/cinebooking/analytics/AdminAnalyticsService.java")
analytics_bi = text("backend/src/main/java/com/cinebooking/analyticsbi/AnalyticsBiService.java")
performance = text("backend/src/main/java/com/cinebooking/performance/PerformanceBenchmarkService.java")
historical = text("tools/verify_v77_0_9_vietnamese_ui_maintenance_completion.py")
historical_movies = text("tools/verify_v77_0_41_movies_language_surface_fix.py")
v7805 = text("tools/verify_v78_0_5_admin_audit_presentation_language_ownership.py")
v7806 = text("tools/verify_v78_0_6_inventory_presentation_language_business_boundaries.py")
release = text("scripts/release.ps1")
ci = text(".github/workflows/ci.yml")
diag = text("tools/diagnose-v78.ps1")
make = text("Makefile")
readme = text("README.md")

# Source-wide table contract.
table_files = []
table_tags = 0
for base in (ROOT / "frontend/app", ROOT / "frontend/components"):
    for path in base.rglob("*.tsx"):
        source = path.read_text(encoding="utf-8")
        count = source.count("<table")
        if count:
            table_files.append(path)
            table_tags += count
ok(len(table_files) >= 32, f"Source-wide table inventory covers at least 32 TSX files ({len(table_files)})")
ok(table_tags >= 45, f"Source-wide table inventory covers at least 45 table instances ({table_tags})")
ok('.app-main table {' in css and 'table-layout:auto !important;' in css,
   "All app tables use content-driven auto layout instead of forced fixed columns")
ok('.app-main table th,' in css and 'padding-left:.75rem;' in css and 'padding-right:.75rem;' in css,
   "All table cells receive readable horizontal gutters")
ok('.app-main table thead th {' in css and 'text-align:center !important;' in css,
   "All source table headers are centered by the global table contract")
ok('analytics-snapshot-table-v7819-r2' in analytics and 'overflow-x-auto' in analytics,
   "Analytics snapshots opt into the R2 readable-table contract with horizontal overflow fallback")
ok('cb-table-period' in analytics and '.cb-table-period {' in css and 'width:1%;' in css and 'min-width:max-content;' in css,
   "Analytics PERIOD column shrinks to content width")
ok('cb-table-range' in analytics and '.cb-table-range {' in css and 'min-width:13rem;' in css and 'white-space:nowrap;' in css,
   "Analytics RANGE column stays readable without date fragmentation")

# Pointer-vs-keyboard focus modality.
ok('pointerdown' in modality and 'dataset.inputModality = "pointer"' in modality,
   "Input modality manager marks pointer interactions before native control focus")
ok('keydown' in modality and 'dataset.inputModality = "keyboard"' in modality and '"Tab"' in modality,
   "Input modality manager restores keyboard modality for keyboard navigation")
ok('<InputModalityManager />' in layout,
   "Root layout installs input modality tracking once for all routes")
ok('html[data-input-modality="pointer"] .input:focus-visible' in css and 'box-shadow:none;' in css,
   "Pointer-clicked native inputs/selects no longer keep the rose focus ring")
ok('html[data-input-modality="keyboard"] .input:focus-visible' in css and 'rgba(244,63,94,.12)' in css,
   "Keyboard focus retains the accessible rose indicator")

# Cinema name pollution closure.
ok('TEST_TIMESTAMP_SUFFIX' in cinema and r'\\d{10,}' in cinema and 'cleanDisplayName' in cinema,
   "Cinema entity strips only long historical timestamp suffixes")
ok('Landmark 81' in cinema_test and 'Cinema 2026' in cinema_test and '1789224302149' in cinema_test,
   "Cinema display-name tests prove timestamp removal without removing legitimate numeric names")
ok('Cinema.cleanDisplayName(rs.getString("cinema_name"))' in forecasting,
   "Analytics snapshots/forecasting sanitize direct JDBC cinema labels")
ok('Cinema.cleanDisplayName(rs.getString("cinema"))' in admin_analytics,
   "Admin analytics sanitizes direct JDBC cinema labels")
ok('Cinema.cleanDisplayName(rs.getString("cinema_name"))' in analytics_bi and 'Cinema.cleanDisplayName(rs.getString("cinema_name"))' in performance,
   "Analytics BI and performance direct JDBC paths use the same cinema display contract")
jdbc_sources = [forecasting, admin_analytics, analytics_bi, performance]
remaining = []
for idx, source in enumerate(jdbc_sources):
    for match in re.finditer(r'rs\.getString\("cinema(?:_name)?"\)', source):
        start = max(0, match.start() - 40)
        before = source[start:match.start()]
        if 'Cinema.cleanDisplayName(' not in before:
            remaining.append((idx, match.group(0)))
ok(not remaining, f"Audited JDBC cinema-name getters are all sanitized (unwrapped={len(remaining)})")

# EN presentation closure for reported screenshots while preserving arbitrary data.
ok('Booking confirmation email not received #${numbered[1]}' in system and 'SUPPORT_DESCRIPTION_EN' in system,
   "Known seeded support subjects/descriptions shown in the report have deterministic EN copy")
ok('SUPPORT_SUBJECT_EN[subject] ?? subject' in system and 'SUPPORT_DESCRIPTION_EN[description] ?? description' in system,
   "Arbitrary customer-authored support payloads still fall through unchanged")
ok('supportCasePresentation(c.subject,c.description,language)' in support and '{copy.subject}' in support and '{copy.description}' in support,
   "Admin Support renders the bounded semantic support presentation helper")
ok('MAINTENANCE_ASSET_PREFIX_EN' in system and '["Máy chiếu ", "Projector "]' in system and 'return value;' in system,
   "Known seeded maintenance equipment prefixes translate in EN with unknown-name fallback")
ok('maintenanceAssetName(asset.name,language)' in maintenance and 'name: asset.name' in maintenance,
   "Maintenance renders known labels in EN while the editor keeps the raw business name")
ok('Only signals with a count above 0 are shown; no synthetic alerts are created.' in command,
   "Command Center source-owned explanatory line switches to EN")
ok('"Check-in thủ công thành công.": "Manual check-in completed successfully."' in catalog,
   "Backend-owned manual check-in success message is language-owned")
ok('t("Soát vé thành công.","Check-in completed successfully.")' in checkin and 'Soát vé vé thành công.' not in checkin,
   "Staff check-in success is source-localized and the duplicated-word typo is removed")

# Attached release failure closure.
ok('localizedLabel(a.severity,language)' in historical and 'Security severity is translated at render time' in historical,
   "Historical V77.0.9 security-severity gate accepts the modern language-aware renderer")
ok('language:uiLanguage' in historical_movies and 'movieGenreLabel(x,uiLanguage)' in historical_movies,
   "Historical V77.0.41 movie-language gate accepts controlled-vocabulary localization")
ok(all('Current release:** V78.0.20' in x or 'Current release:** V78.0.19' in x for x in (v7805,v7806)),
   "Historical V78.0.5/V78.0.6 release-metadata gates accept V78.0.19 or V78.0.20")

# Release wiring and no-schema lineage.
migrations = list((ROOT / "backend/src/main/resources/db/migration").glob("V*.sql"))
latest = max(int(re.match(r"V(\d+)", p.name).group(1)) for p in migrations if re.match(r"V(\d+)", p.name))
ok(latest == 72 and not list((ROOT / "backend/src/main/resources/db/migration").glob("V78*.sql")),
   "R2 remains no-schema on Flyway V72")
name = "verify_v78_0_19_r2_table_language_release_closure.py"
ok(name in release and name in ci and name in diag,
   "Stable preflight, GitHub CI and V78 diagnostics run the R2 verifier")
ok('verify-v78-0-19-r2' in make and 'release-v78-0-19-r2' in make,
   "Makefile exposes R2 verify/release lifecycle")
ok('V78.0.19-R2' in readme and 'Table / Presentation / Release Closure' in readme,
   "README consolidates the R2 correction without adding a second root change log")
ok([p.name for p in ROOT.glob("*.md")] == ["README.md"],
   "Source keeps exactly one consolidated root README.md")

# Execute the gates that regressed or were deliberately updated.
for script, marker, label in [
    ("tools/verify_v77_0_9_vietnamese_ui_maintenance_completion.py", "66/66 checks passed", "Attached V77.0.9 release blocker is green"),
    ("tools/verify_v77_0_41_movies_language_surface_fix.py", "24/24 checks passed", "Historical V77.0.41 movie-language gate is green"),
    ("tools/verify_v78_0_5_admin_audit_presentation_language_ownership.py", "17/17 checks passed", "Historical V78.0.5 release metadata gate is green"),
    ("tools/verify_v78_0_6_inventory_presentation_language_business_boundaries.py", "18/18 checks passed", "Historical V78.0.6 release metadata/lineage gate is green"),
    ("tools/verify_v78_0_12_maintenance_asset_business_data_boundaries.py", "17/17 checks passed", "V78.0.12 maintenance lineage remains green"),
    ("tools/verify_v78_0_19_language_focus_currency_closure.py", "27/27 checks passed", "V78.0.19 language/focus/currency lineage remains green"),
]:
    proc = subprocess.run([sys.executable, "-X", "utf8", str(ROOT / script)], cwd=ROOT, text=True, encoding="utf-8", errors="replace", capture_output=True)
    ok(proc.returncode == 0 and marker in proc.stdout, label)

passed = sum(checks)
print(f"\nV78.0.19-R2 Table / Presentation / Release Closure verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed == len(checks) else 1)
