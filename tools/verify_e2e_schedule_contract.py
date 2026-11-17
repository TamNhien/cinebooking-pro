from pathlib import Path
import sys

root = Path(__file__).resolve().parents[1]
read = lambda rel: (root / rel).read_text(encoding="utf-8")
release = read("scripts/release.ps1")
seed = read("tools/seed-demo-e2e-showtimes.sql")
seed_cmd = read("tools/seed-demo-e2e-showtimes.ps1")
e2e = read("frontend/e2e/discovery-calendar.spec.ts")
preflight = read("tools/verify-e2e-readiness.ps1")
checks = {
    "release keeps full browser E2E mandatory": "npx playwright test --project=chromium" in release,
    "preflight runs before browser E2E": "Validate real upcoming showtimes for booking E2E" in release and release.index("Validate real upcoming showtimes for booking E2E") < release.index("Browser E2E release gate: FULL e2e suite"),
    "preflight checks actual future OPEN movie screenings": "start_time > now()" in preflight and "status = 'OPEN'" in preflight and "11111111-1111-1111-1111-111111111111" in preflight,
    "demo insert requires explicit consent": "-not $ConfirmDemoOnly" in seed_cmd,
    "demo seed refuses wrong movie/schedule dataset": "demo_movies <> 8 OR demo_slots <> 16" in seed,
    "demo seed never updates or deletes existing records": "UPDATE showtime" not in seed and "DELETE FROM" not in seed,
    "demo seed never creates fabricated booking/payment rows": "INSERT INTO booking" not in seed and "INSERT INTO payment" not in seed,
    "demo seed prevents duplicate showtimes": "WHERE NOT EXISTS" in seed and "existing.start_time=f.start_time" in seed,
    "demo seed uses upcoming Asia/Ho_Chi_Minh days": "current_date + offset_days" in seed and "Asia/Ho_Chi_Minh" in seed,
    "browser discovery uses real API schedule": 'request.get("/api/showtimes")' in e2e and "selectedDay" in e2e and "uniqueMovies" in e2e,
    "browser discovery checks real date against UI": "cinemaShows.length" in e2e and "selectedMovieShows.length" in e2e,
    "browser discovery neither mocks API nor skips tests": "page.route(" not in e2e and "test.skip" not in e2e,
    "original September 2026 migration is untouched": "DATE '2026-09-30'" in read("backend/src/main/resources/db/migration/V29__demo_movies_and_showtimes_september_2026.sql"),
}
for name, result in checks.items(): print(("[ OK ]" if result else "[ FAIL ]") + " " + name)
print(f"E2E schedule source checks: {sum(checks.values())}/{len(checks)}")
sys.exit(0 if all(checks.values()) else 1)
