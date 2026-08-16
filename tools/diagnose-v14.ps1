$ErrorActionPreference = "Stop"

Write-Host "=== CineBooking V14 checkout integrity diagnostics ==="

docker compose ps -a

Write-Host "`n=== Flyway ==="
docker compose exec -T postgres psql -U cinebooking -d cinebooking -c "SELECT version,description,success FROM flyway_schema_history ORDER BY installed_rank;"

Write-Host "`n=== booking_seat release column ==="
docker compose exec -T postgres psql -U cinebooking -d cinebooking -c "SELECT column_name,data_type FROM information_schema.columns WHERE table_name='booking_seat' AND column_name='released_at';"

Write-Host "`n=== Active seat unique index ==="
docker compose exec -T postgres psql -U cinebooking -d cinebooking -c "SELECT indexname,indexdef FROM pg_indexes WHERE tablename='booking_seat' AND indexname IN ('uq_showtime_seat_active','uq_showtime_seat_reserved');"

Write-Host "`n=== Stale released bookings that still reserve seats ==="
docker compose exec -T postgres psql -U cinebooking -d cinebooking -c "SELECT count(*) AS stale_rows FROM booking_seat bs JOIN booking b ON b.id=bs.booking_id WHERE b.status IN ('REFUNDED','CANCELLED','EXPIRED') AND bs.released_at IS NULL;"

Write-Host "`n=== Duplicate active seat reservations ==="
docker compose exec -T postgres psql -U cinebooking -d cinebooking -c "SELECT count(*) AS duplicate_groups FROM (SELECT showtime_id,seat_id,count(*) c FROM booking_seat WHERE released_at IS NULL GROUP BY showtime_id,seat_id HAVING count(*)>1) x;"

Write-Host "`nExpected: Flyway V14=true, released_at exists, uq_showtime_seat_active exists, stale_rows=0, duplicate_groups=0."
