from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
checks = []

def require(path: str, *needles: str):
    text = (ROOT / path).read_text(encoding="utf-8")
    missing = [n for n in needles if n not in text]
    checks.append((path, missing))

require(
    "backend/src/main/java/com/cinebooking/analytics/AdminAnalyticsController.java",
    '/export.csv', '/export.xlsx', 'AnalyticsExportService', 'ContentDisposition.attachment()'
)
require(
    "backend/src/main/java/com/cinebooking/analytics/AnalyticsExportService.java",
    'public byte[] csv(', 'public byte[] xlsx(', 'Tổng quan', 'Doanh thu ngày', 'Payment provider', '\\uFEFF'
)
require(
    "frontend/app/admin/analytics/page.tsx",
    'apiBlob', 'Xuất CSV', 'Xuất Excel', '/admin/analytics/export.${format}'
)
require(
    "README.md",
    '# CineBooking Pro V42.1', 'Version history / changelog', 'V42.1 - Analytics Export + Documentation Sync',
    'GET /api/admin/analytics/export.csv', 'GET /api/admin/analytics/export.xlsx'
)
require(
    "backend/src/test/java/com/cinebooking/analytics/AnalyticsExportServiceTest.java",
    'csvIsUtf8BomAndContainsVietnameseAnalyticsSections', 'xlsxIsValidOpenXmlZipWithExpectedSheets'
)

failed = False
for path, missing in checks:
    if missing:
        failed = True
        print(f"[FAIL] {path}: missing {missing}")
    else:
        print(f"[ OK ] {path}")

migration_dir = ROOT / "backend/src/main/resources/db/migration"
if any(p.name.startswith("V42_1") or p.name.startswith("V43") for p in migration_dir.glob("V*.sql")):
    print("[WARN] Unexpected new schema migration found; V42.1 is intended to be schema-neutral.")

if failed:
    sys.exit(1)
print("V42.1 Analytics export source verification passed.")
