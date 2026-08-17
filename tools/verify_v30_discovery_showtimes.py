from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
checks = []

def check(name: str, ok: bool):
    checks.append((name, ok))
    print(("PASS" if ok else "FAIL") + f": {name}")

movies = (ROOT / "frontend/app/movies/page.tsx").read_text(encoding="utf-8")
cinemas = (ROOT / "frontend/app/cinemas/page.tsx").read_text(encoding="utf-8")
detail = (ROOT / "frontend/app/movies/[id]/page.tsx").read_text(encoding="utf-8")
ci = (ROOT / ".github/workflows/ci.yml").read_text(encoding="utf-8")
rc = (ROOT / ".github/workflows/release-candidate.yml").read_text(encoding="utf-8")
e2e_path = ROOT / "frontend/e2e/discovery-calendar.spec.ts"
e2e = e2e_path.read_text(encoding="utf-8") if e2e_path.exists() else ""
makefile = (ROOT / "Makefile").read_text(encoding="utf-8")
migration = ROOT / "backend/src/main/resources/db/migration/V29__demo_movies_and_showtimes_september_2026.sql"

check("movies page keeps status tabs", 'tab==="now"' in movies and 'tab==="soon"' in movies and 'tab==="all"' in movies)
check("movies page filters genre", 'genreMatch' in movies and 'Tất cả thể loại' in movies)
check("movies page filters language", 'languageMatch' in movies and 'Tất cả ngôn ngữ' in movies)
check("movies page filters age rating", 'ratingMatch' in movies and 'Tất cả phân loại' in movies)
check("movies page supports rating sort", 'sort==="rating"' in movies and 'Đánh giá cao' in movies)
check("movies page supports release sort", 'sort==="release"' in movies and 'Ngày khởi chiếu mới nhất' in movies)
check("movies page supports duration sort", 'sort==="duration"' in movies and 'Thời lượng ngắn trước' in movies)
check("movies page supports title sort", 'sort==="title"' in movies and 'Tên A → Z' in movies)
check("movies page shows result count", 'phim phù hợp' in movies and 'filtered.length' in movies)
check("movies page can reset filters", 'resetFilters' in movies and 'Đặt lại' in movies)

check("cinema page no longer truncates schedule to 14 days", '.slice(0,14)' not in cinemas and '.slice(0, 14)' not in cinemas)
check("cinema page derives month list", 'const months=useMemo' in cinemas and 'dates.map(d=>d.slice(0,7))' in cinemas)
check("cinema page provides month navigation", 'chooseMonth' in cinemas and 'monthLabel' in cinemas)
check("cinema page provides exact date picker", 'type="date"' in cinemas and 'min={dates[0]}' in cinemas and 'max={dates[dates.length-1]}' in cinemas)
check("cinema page scrolls full month date chips", 'monthDates.map' in cinemas and 'overflow-x-auto' in cinemas)
check("cinema page reports selected showtime count", 'selectedCount' in cinemas and 'suất của' in cinemas)

check("movie detail derives all showtime dates", 'showtimeDates=useMemo' in detail)
check("movie detail keeps selected date state", 'selectedDate' in detail and 'setSelectedDate' in detail)
check("movie detail filters showtimes by date", 'selectedShows=useMemo' in detail and 'localDateKey(s.startTime)===selectedDate' in detail)
check("movie detail provides date picker", 'type="date"' in detail and 'min={showtimeDates[0]}' in detail)
check("movie detail provides horizontal date navigator", 'showtimeDates.map' in detail and 'date-chip shrink-0' in detail)
check("movie detail groups only selected-day cinemas", 'selectedShows.forEach' in detail)

check("V30 browser E2E spec exists", bool(e2e))
check("V30 E2E verifies movie discovery filters", 'Khoa học viễn tưởng' in e2e and '8 phim phù hợp' in e2e)
check("V30 E2E navigates to September 30", '2026-09-30' in e2e and '16 suất của 8 phim' in e2e)
check("V30 E2E verifies selected-day movie detail", 'toHaveCount(2)' in e2e and 'Hành Trình Sao Hỏa' in e2e)
check("release candidate runs all Playwright specs", 'Run browser E2E journeys (V29.2 + V30)' in rc and 'bash tools/e2e-v29.2.sh' in rc)

check("V29 demo schedule migration remains intact", migration.exists())
if migration.exists():
    text = migration.read_text(encoding="utf-8")
    check("V29 schedule still reaches 2026-09-30", '2026-09-30' in text)
else:
    check("V29 schedule still reaches 2026-09-30", False)

check("CI runs V30 verifier", 'python3 tools/verify_v30_discovery_showtimes.py' in ci)
check("V29.2 Playwright gate remains in CI", 'python3 tools/verify_v29_2_playwright_e2e.py' in ci)
check("V29.3 demo schedule gate remains in CI", 'python3 tools/verify_v29_3_demo_schedule.py' in ci)
check("Makefile exposes V30 verifier", "verify-v30:" in makefile and "verify_v30_discovery_showtimes.py" in makefile)
check("Makefile exposes V30 diagnostics", "diagnose-v30:" in makefile and "diagnose-v30.ps1" in makefile)
check("release-candidate default advances to V30", 'default: "v30-rc1"' in rc)

passed = sum(1 for _, ok in checks if ok)
print(f"\n{passed}/{len(checks)} checks passed")
failed = [name for name, ok in checks if not ok]
if failed:
    print("Failed checks:")
    for name in failed:
        print(" -", name)
    raise SystemExit(1)
