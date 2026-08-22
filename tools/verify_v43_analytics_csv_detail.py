from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
checks = []

def text(path):
    return (ROOT / path).read_text(encoding="utf-8")

def check(name, condition):
    checks.append((name, bool(condition)))

svc = text("backend/src/main/java/com/cinebooking/analytics/AnalyticsExportService.java")
controller = text("backend/src/main/java/com/cinebooking/analytics/AdminAnalyticsController.java")
test = text("backend/src/test/java/com/cinebooking/analytics/AnalyticsExportServiceTest.java")
ui = text("frontend/app/admin/analytics/page.tsx")
readme = text("README.md")
ci = text(".github/workflows/ci.yml")
rc = text(".github/workflows/release-candidate.yml")
release = text(".github/workflows/release.yml")
diag = text("tools/diagnose-v43.ps1")
make = text("Makefile")

filenames = [
    "01-tong-quan.csv",
    "02-doanh-thu-theo-ngay.csv",
    "03-hieu-suat-theo-rap.csv",
    "04-top-phim.csv",
    "05-top-suat-chieu.csv",
    "06-nhu-cau-theo-gio.csv",
    "07-heatmap-ghe.csv",
    "08-hieu-suat-nhan-vien.csv",
    "09-trang-thai-booking.csv",
    "10-trang-thai-payment.csv",
    "11-top-bap-nuoc.csv",
    "12-phuong-thuc-thanh-toan.csv",
]

titles = [
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

check("Service exposes detailed CSV ZIP export", "public byte[] csvZip(" in svc)
check("CSV ZIP uses a dedicated table descriptor", "record CsvTable(" in svc and "List<CsvTable> tables" in svc)
check("CSV ZIP contains exactly the 12 named table files in source", all(name in svc for name in filenames))
check("CSV ZIP mirrors all 12 Analytics table titles", all(title in svc for title in titles))
check("Every detailed CSV starts with UTF-8 BOM", "out.append('\\uFEFF')" in svc and "detailedCsv(" in svc)
check("Every detailed CSV repeats report period", 'csvRow(out, "Khoảng dữ liệu", days + " ngày")' in svc)
check("Every detailed CSV repeats cinema filter", 'csvRow(out, "Rạp", cinema)' in svc)
check("Every detailed CSV records export timestamp", 'csvRow(out, "Ngày xuất", generatedAt)' in svc)
check("ZIP is written with UTF-8 entry names", "new ZipOutputStream(bytes, StandardCharsets.UTF_8)" in svc)
check("Controller exposes CSV table ZIP endpoint", '@GetMapping(value = "/export-csv.zip", produces = "application/zip")' in controller)
check("Controller returns CSV table ZIP from export service", "exportService.csvZip(dashboard, days, cinemaId)" in controller)
check("Controller uses a clear CSV tables download filename", "-csv-tables.zip" in controller)
check("Legacy single CSV endpoint remains available", '@GetMapping(value = "/export.csv"' in controller)
check("Admin UI downloads the CSV tables ZIP", '"/admin/analytics/export-csv.zip"' in ui)
check("Admin UI labels CSV export clearly", "Xuất CSV theo từng bảng" in ui and "một file CSV UTF-8 riêng cho từng bảng" in ui)
check("Admin UI keeps detailed Excel export", "Xuất Excel chi tiết" in ui)
check("Unit test requires exactly 12 CSV files", "csvZipCreatesOneUtf8CsvPerAnalyticsTable" in test and ".hasSize(12)" in test)
check("Unit test validates all CSV filenames", all(name in test for name in filenames))
check("Unit test validates BOM on every CSV", "0xEF" in test and "0xBB" in test and "0xBF" in test)
check("Unit test validates per-file report metadata", all(x in test for x in [r'\"Khoảng dữ liệu\",\"30 ngày\"', r'\"Rạp\",\"Tất cả rạp\"', 'Ngày xuất']))
check("Unit test validates detailed daily revenue CSV", "02-doanh-thu-theo-ngay.csv" in test and r'\"Ngày\",\"Doanh thu\",\"Booking\",\"Vé\",\"Check-in\"' in test)
check("Unit test validates detailed payment provider CSV", "12-phuong-thuc-thanh-toan.csv" in test and r'\"Provider\",\"Doanh thu\",\"Giao dịch\"' in test)
check("README documents CSV ZIP table-per-file export", "CSV chi tiết theo từng bảng" in readme and "export-csv.zip" in readme)
check("Main CI runs V43 detailed CSV verifier", "python3 tools/verify_v43_analytics_csv_detail.py" in ci)
check("Standalone RC runs V43 detailed CSV verifier", "python3 tools/verify_v43_analytics_csv_detail.py" in rc)
check("Stable release gate runs V43 detailed CSV verifier", "python3 tools/verify_v43_analytics_csv_detail.py" in release)
check("V43 diagnostics chains detailed CSV verifier", "verify_v43_analytics_csv_detail.py" in diag)
check("Make verify-v43 chains detailed CSV verifier", "verify-v43:" in make and "python tools/verify_v43_analytics_csv_detail.py" in make)

for name, ok in checks:
    print(f"[{' OK ' if ok else 'FAIL'}] {name}")

passed = sum(ok for _, ok in checks)
total = len(checks)
print(f"\nV43 Analytics CSV detail verification: {passed}/{total} checks passed")
if passed != total:
    print("Failed checks:")
    for name, ok in checks:
        if not ok:
            print(" -", name)
    sys.exit(1)
