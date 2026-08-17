from pathlib import Path
from collections import Counter
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
checks = []


def check(name, ok):
    ok = bool(ok)
    checks.append((name, ok))
    print(("PASS" if ok else "FAIL") + f": {name}")


def text(rel):
    p = ROOT / rel
    return p.read_text(encoding="utf-8") if p.exists() else ""

migration_path = "backend/src/main/resources/db/migration/V29__demo_movies_and_showtimes_september_2026.sql"
migration = text(migration_path)
it = text("backend/src/test/java/com/cinebooking/integration/CineBookingIntegrationIT.java")
home = text("frontend/app/page.tsx")
css = text("frontend/app/globals.css")
ci = text(".github/workflows/ci.yml")
rc = text(".github/workflows/release-candidate.yml")
diag = text("tools/diagnose-v29.ps1")
makefile = text("Makefile")
v28 = text("tools/verify_v28_ci.py")

movie_ids = [
    "11111111-1111-1111-1111-111111111111",
    "22222222-2222-2222-2222-222222222222",
    "88888888-8888-8888-8888-888888888888",
    "99999999-9999-9999-9999-999999999999",
    "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    "cccccccc-cccc-cccc-cccc-cccccccccccc",
    "dddddddd-dddd-dddd-dddd-dddddddddddd",
]
new_titles = [
    "Mật Mã Đại Dương",
    "Đêm Sài Gòn 2088",
    "Vệt Nắng Cuối Trời",
    "Khu Rừng Thức Giấc",
    "Chuyến Tàu 0 Giờ",
    "Hồ Sơ Bóng Tối",
]
room_ids = [
    "44444444-4444-4444-4444-444444444445",
    "44444444-4444-4444-4444-444444444446",
    "44444444-4444-4444-4444-444444444447",
    "44444444-4444-4444-4444-444444444448",
]

check("V29 demo catalog migration exists", bool(migration))
check("migration preserves both original demo movies", "Hành Trình Sao Hỏa" in migration and "Thành Phố Sau Cơn Mưa" in migration)
check("migration adds six new sample movies", all(title in migration for title in new_titles))
check("migration manages exactly eight demo movie IDs", all(mid in migration for mid in movie_ids) and len(movie_ids) == 8)
check("all eight movies are active now-showing candidates", migration.count("    TRUE\n") >= 8 and "DATE '2026-08-15'" in migration)
check("existing movie metadata is upgraded idempotently", "ON CONFLICT (id) DO UPDATE SET" in migration and "movie_language = EXCLUDED.movie_language" in migration)

check("homepage still caps movie section at eight cards", ".slice(0,8)" in home)
check("desktop movie grid remains four columns", "@media (min-width:1024px){ .movie-grid{grid-template-columns:repeat(4" in css)

check("migration adds four non-legacy auditoriums", all(rid in migration for rid in room_ids) and all(f"Phòng 0{i}" in migration for i in range(2, 6)))
check("new auditoriums receive demo seats", "CROSS JOIN (VALUES ('A'), ('B'), ('C'), ('D'), ('E'))" in migration and "generate_series(1, 8)" in migration)
check("seat creation is idempotent", "ON CONFLICT (auditorium_id, row_label, seat_number) DO NOTHING" in migration)

check("showtime calendar starts on 2026-08-18", "DATE '2026-08-18'" in migration)
check("showtime calendar reaches end of September 2026", "DATE '2026-09-30'" in migration)
check("showtime timestamps use Vietnam cinema timezone", "AT TIME ZONE 'Asia/Ho_Chi_Minh'" in migration)
check("showtime generation uses OPEN status", "'OPEN'" in migration)
check("generated showtimes avoid duplicate movie-room-start tuples", "WHERE NOT EXISTS" in migration and "existing.start_time = expanded.start_time" in migration)

slot_section = migration.split("WITH daily_slots", 1)[1].split("),\ndemo_days", 1)[0] if "WITH daily_slots" in migration and "),\ndemo_days" in migration else ""
slot_counts = Counter(re.findall(r"'([0-9a-f]{8}-[0-9a-f-]{27})'::uuid", slot_section, flags=re.I))
check("daily schedule contains sixteen showtime slots", len(re.findall(r"TIME '[0-9]{2}:[0-9]{2}'", slot_section)) == 16)
check("each of the eight movies receives two showtimes per day", all(slot_counts[mid] == 2 for mid in movie_ids))
check("schedule documents expected 704 generated showtimes", "= 704 deterministic demo showtimes" in migration)

check("integration test expects current Flyway V29", 'isEqualTo("29")' in it and "flywayMigratesRealPostgresToV29DemoCatalog" in it)
check("integration test requires at least eight active movies", "assertThat(activeMovies).isGreaterThanOrEqualTo(8)" in it)
check("integration test verifies September 30 coverage", "2026-09-30 00:00:00+07" in it and "assertThat(september30Movies).isGreaterThanOrEqualTo(8)" in it)
check("integration test verifies at least sixteen shows on September 30", "assertThat(september30Showtimes).isGreaterThanOrEqualTo(16)" in it)
check("V28 compatibility verifier follows current Flyway V29", "Integration test validates current Flyway V29" in v28 and 'isEqualTo("29")' in v28)

check("main CI runs V29.3 demo schedule verifier", "run: python3 tools/verify_v29_3_demo_schedule.py" in ci)
check("V29 diagnostics include V29.3 verifier", "verify_v29_3_demo_schedule.py" in diag)
check("Makefile exposes V29.3 verifier", "verify-v29.3:" in makefile and "python tools/verify_v29_3_demo_schedule.py" in makefile)
check("release-candidate default remains V29.3-compatible or newer", re.search(r'default: "(?:v29\.3|v(?:3[0-9]|[4-9][0-9])(?:\.\d+)*)-rc1"', rc) is not None)

failed = [name for name, ok in checks if not ok]
print(f"\n{len(checks)-len(failed)}/{len(checks)} checks passed")
if failed:
    print("Failed checks:")
    for name in failed:
        print(f" - {name}")
    sys.exit(1)
