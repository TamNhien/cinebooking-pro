from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
checks = []

def text(path):
    return (ROOT / path).read_text(encoding="utf-8")

def check(name, condition):
    checks.append((name, bool(condition)))

svc = text("backend/src/main/java/com/cinebooking/analytics/AnalyticsExportService.java")
test = text("backend/src/test/java/com/cinebooking/analytics/AnalyticsExportServiceTest.java")
ui = text("frontend/app/admin/analytics/page.tsx")
readme = text("README.md")
ci = text(".github/workflows/ci.yml")
rc = text(".github/workflows/release-candidate.yml")
release = text(".github/workflows/release.yml")
diag = text("tools/diagnose-v43.ps1")
make = text("Makefile")

sheet_names = [
    "Tổng quan",
    "Doanh thu theo ngày",
    "Hiệu suất theo rạp",
    "Top phim",
    "Top suất chiếu",
    "Nhu cầu theo giờ",
    "Heatmap ghế",
    "Hiệu suất nhân viên",
    "Trạng thái booking",
    "Trạng thái payment",
    "Top bắp nước",
    "Phương thức thanh toán",
]
section_titles = [
    "TỔNG QUAN",
    "DOANH THU THEO NGÀY",
    "HIỆU SUẤT THEO RẠP",
    "TOP PHIM",
    "TOP SUẤT CHIẾU",
    "NHU CẦU THEO GIỜ",
    "HEATMAP GHẾ",
    "HIỆU SUẤT NHÂN VIÊN",
    "TRẠNG THÁI BOOKING",
    "TRẠNG THÁI PAYMENT",
    "TOP BẮP NƯỚC",
    "PHƯƠNG THỨC THANH TOÁN",
]

check("Excel export keeps one worksheet per CSV table", all(f'reportSheet("{name}"' in svc for name in sheet_names))
check("Excel section titles mirror CSV report sections", all(title in svc for title in section_titles))
check("Every worksheet repeats report period", 'rows.add(row("Khoảng dữ liệu", days + " ngày"))' in svc)
check("Every worksheet repeats cinema filter", 'rows.add(row("Rạp", cinema))' in svc)
check("Every worksheet records export timestamp", 'rows.add(row("Ngày xuất", generatedAt))' in svc and 'DATE_TIME.format(Instant.now())' in svc)
check("Detailed table header is fixed at row 6", 'REPORT_HEADER_ROW = 6' in svc and 'return new Sheet(sheetName, rows, REPORT_HEADER_ROW)' in svc)
check("Workbook freezes through the detail header", 'ySplit=\\\"' in svc and 'topLeftCell=\\\"A' in svc and 'headerRow + 1' in svc)
check("Workbook autofilter spans header and all data rows", 'autoFilter ref=\\\"A' in svc and 'append(lastRow)' in svc)
check("Workbook retains numeric money formatting", 'private StyledValue money' in svc and 'numFmtId=\\\"3\\\"' in svc)
check("Workbook retains percentage formatting", 'private StyledValue percent' in svc and 'numFmtId=\\\"10\\\"' in svc)
check("Admin UI labels the richer export clearly", 'Xuất Excel chi tiết' in ui and 'worksheet riêng' in ui)
check("Unit test requires exactly 12 worksheets", 'isEqualTo(12)' in test and 'xlsxCreatesOneDetailedWorksheetPerCsvTable' in test)
check("Unit test validates per-sheet report metadata", all(x in test for x in ['Khoảng dữ liệu', 'Tất cả rạp', 'Ngày xuất']))
check("Unit test validates frozen row and full autofilter", 'ySplit=\\\"6\\\"' in test and 'A6:E7' in test and 'A6:H7' in test)
check("Unit test validates detailed provider sheet", 'PHƯƠNG THỨC THANH TOÁN' in test and 'sheet12.xml' in test)
check("README documents detailed sheet-per-table export", 'Analytics Excel chi tiết theo từng bảng' in readme and 'AutoFilter' in readme)
check("Main CI runs V43 analytics Excel verifier", 'python3 tools/verify_v43_analytics_excel_detail.py' in ci)
check("Standalone RC runs V43 analytics Excel verifier", 'python3 tools/verify_v43_analytics_excel_detail.py' in rc)
check("Stable release gate runs V43 analytics Excel verifier", 'python3 tools/verify_v43_analytics_excel_detail.py' in release)
check("V43 diagnostics chains analytics Excel verifier", 'verify_v43_analytics_excel_detail.py' in diag)
check("Make verify-v43 chains analytics Excel verifier", 'verify-v43:' in make and 'python tools/verify_v43_analytics_excel_detail.py' in make)

for name, ok in checks:
    print(f"[{' OK ' if ok else 'FAIL'}] {name}")

passed = sum(ok for _, ok in checks)
total = len(checks)
print(f"\nV43 Analytics Excel verification: {passed}/{total} checks passed")
if passed != total:
    print("Failed checks:")
    for name, ok in checks:
        if not ok:
            print(" -", name)
    sys.exit(1)
