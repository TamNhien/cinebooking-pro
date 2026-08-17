# CineBooking Pro V29.3 - Demo catalog and September 2026 showtimes

V29.3 expands the deterministic demo catalog used by local development, CI, and the V29 Playwright release-candidate flow.

## Catalog target

The home page renders four movie cards per row on desktop and caps the section at eight cards. V29.3 therefore keeps eight active movies with release dates on or before 2026-08-17, producing two complete desktop rows.

Existing demo movies are retained and refreshed:

- Hành Trình Sao Hỏa
- Thành Phố Sau Cơn Mưa

Six fictional sample movies are added:

- Mật Mã Đại Dương
- Đêm Sài Gòn 2088
- Vệt Nắng Cuối Trời
- Khu Rừng Thức Giấc
- Chuyến Tàu 0 Giờ
- Hồ Sơ Bóng Tối

## Showtime coverage

Migration `V29__demo_movies_and_showtimes_september_2026.sql` creates showtimes from 2026-08-18 through 2026-09-30 inclusive.

- 8 movies
- 2 showtimes per movie per day
- 16 showtimes per day
- 44 days
- 704 generated showtimes
- local cinema times are interpreted in `Asia/Ho_Chi_Minh`

Four demo auditoriums (Phòng 02-05) are added with 40 seats each. The migration does not reuse the legacy Room 01 schedule, avoiding overlaps with earlier seed data.

## Flyway safety

V1-V25 are left unchanged. V29.3 adds a new Flyway migration at version `29`, so existing databases can upgrade without checksum changes to applied migrations.

The Testcontainers integration gate now requires the latest successful Flyway version to be `29` and verifies that all eight movies have open showtimes on 2026-09-30.

## Verification

```powershell
python .\tools\verify_v29_3_demo_schedule.py
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v29.ps1
```

After the migration is applied, `GET /api/movies` should expose at least eight active movies and `GET /api/showtimes` should contain future schedules through 2026-09-30 while that date remains in the future.
