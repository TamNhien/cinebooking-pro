from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
checks: list[tuple[str, bool]] = []


def text(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def check(name: str, condition: bool) -> None:
    checks.append((name, bool(condition)))


controller = text("backend/src/main/java/com/cinebooking/analytics/AdminAnalyticsController.java")
export_service = text("backend/src/main/java/com/cinebooking/analytics/AnalyticsExportService.java")
ui = text("frontend/app/admin/analytics/page.tsx")
readme = text("README.md")
backend_test = text("backend/src/test/java/com/cinebooking/analytics/AnalyticsExportServiceTest.java")
ci = text(".github/workflows/ci.yml")
rc = text(".github/workflows/release-candidate.yml")
release = text(".github/workflows/release.yml")
makefile = text("Makefile")
diag = text("tools/diagnose-v42.1.ps1")

check(
    "Admin Analytics exposes CSV/XLSX endpoints",
    all(x in controller for x in ['/export.csv', '/export.xlsx', 'AnalyticsExportService', 'ContentDisposition.attachment()']),
)
check(
    "Export service builds CSV and XLSX reports",
    all(x in export_service for x in ['public byte[] csv(', 'public byte[] xlsx(', '\\uFEFF']),
)
check(
    "XLSX contains expected analytics sheets",
    'Tổng quan' in export_service
    and ('Doanh thu ngày' in export_service or 'Doanh thu theo ngày' in export_service)
    and ('Hiệu suất rạp' in export_service or 'Hiệu suất theo rạp' in export_service)
    and ('Payment provider' in export_service or 'Phương thức thanh toán' in export_service),
)
check(
    "Admin Analytics UI exposes both export actions",
    'apiBlob' in ui
    and 'Xuất CSV' in ui
    and 'Xuất Excel' in ui
    and (
        '/admin/analytics/export.${format}' in ui
        or ('/admin/analytics/export-csv.zip' in ui and '/admin/analytics/export.xlsx' in ui)
    ),
)
check(
    "Backend export tests cover UTF-8 CSV and OpenXML XLSX",
    'csvIsUtf8BomAndContainsVietnameseAnalyticsSections' in backend_test
    and (
        'xlsxIsValidOpenXmlZipWithExpectedSheets' in backend_test
        or 'xlsxCreatesOneDetailedWorksheetPerCsvTable' in backend_test
    ),
)
check(
    "README identifies V42.1 and documents export APIs",
    'V42.1 - Analytics Export + CI/Release Wiring + Documentation Sync' in readme
    and 'GET /api/admin/analytics/export.csv' in readme
    and 'GET /api/admin/analytics/export.xlsx' in readme,
)
check(
    "Main CI retains V42.1 in source regression",
    'python3 tools/verify_v42_1_analytics_export.py' in ci,
)
check(
    "Main CI runs V42 and V42.1 verifiers",
    'python3 tools/verify_v42_financial_ledger.py' in ci
    and 'python3 tools/verify_v42_1_analytics_export.py' in ci,
)
check(
    "Release Candidate workflow keeps a versioned source gate",
    'source gate' in rc and 'tools/verify_v' in rc and 'Run browser E2E journeys' in rc,
)
check(
    "Stable release workflow keeps a versioned source gate",
    'source gate' in release and 'tools/verify_v' in release and 'Publish stable tag and GitHub Release' in release,
)
check(
    "Stable release still requires exact main CI and publishes GitHub Release",
    'Require successful main CI for this exact commit' in release
    and 'Create immutable RC tag' in release
    and 'Publish stable tag and GitHub Release' in release
    and 'gh release create "$STABLE_TAG"' in release,
)
check(
    "Makefile exposes V42.1 verify and diagnose targets",
    'verify-v42.1:' in makefile and 'diagnose-v42.1:' in makefile,
)
check(
    "V42.1 diagnostics chains V42 before the patch verifier",
    'diagnose-v42.ps1' in diag
    and 'verify_v42_1_analytics_export.py' in diag
    and 'verify_v42_1_analytics_export.py' in diag,
)

migration_dir = ROOT / "backend/src/main/resources/db/migration"
new_schema_migrations = [
    p.name
    for p in migration_dir.glob("V*.sql")
    if p.name.startswith("V42_1")
]
check(
    "V42.1 remains schema-neutral with no V42_1 migration",
    not new_schema_migrations,
)

for name, ok in checks:
    print(f"[{' OK ' if ok else 'FAIL'}] {name}")

passed = sum(ok for _, ok in checks)
total = len(checks)
print(f"\nV42.1 verification: {passed}/{total} checks passed")

if passed != total:
    print("Failed checks:")
    for name, ok in checks:
        if not ok:
            print(f" - {name}")
    if new_schema_migrations:
        print(f" - Unexpected migrations: {', '.join(new_schema_migrations)}")
    sys.exit(1)
