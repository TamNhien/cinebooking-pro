param(
  [string]$ShowtimeId = ""
)

$ErrorActionPreference = "Stop"
Write-Host "=== CineBooking V17 booking/payment diagnostics ==="

Write-Host "`n=== Flyway V17 ==="
docker compose exec postgres psql -U cinebooking -d cinebooking -c "SELECT version,description,success FROM flyway_schema_history WHERE version='17';"

Write-Host "`n=== booking.created_at schema ==="
docker compose exec postgres psql -U cinebooking -d cinebooking -c "SELECT column_name,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='booking' AND column_name='created_at';"

Write-Host "`n=== created_at guard trigger ==="
docker compose exec postgres psql -U cinebooking -d cinebooking -c "SELECT tgname FROM pg_trigger WHERE tgrelid='booking'::regclass AND NOT tgisinternal AND tgname='trg_booking_created_at_guard';"

Write-Host "`n=== Existing bookings with NULL created_at (expected 0) ==="
docker compose exec postgres psql -U cinebooking -d cinebooking -c "SELECT count(*) AS null_created_at FROM booking WHERE created_at IS NULL;"

if (-not [string]::IsNullOrWhiteSpace($ShowtimeId)) {
  Write-Host "`n=== Showtime ==="
  docker compose exec postgres psql -U cinebooking -d cinebooking -c "SELECT st.id,m.title,c.name AS cinema,a.name AS auditorium,st.start_time,st.status FROM showtime st JOIN movie m ON m.id=st.movie_id JOIN auditorium a ON a.id=st.auditorium_id JOIN cinema c ON c.id=a.cinema_id WHERE st.id='$ShowtimeId';"
}

Write-Host "`nExpected: V17 success=t, trigger exists, null_created_at=0."
Write-Host "Then select a seat, hold it, and press Thanh toan. If another error appears, run:"
Write-Host 'docker compose logs --since=2m backend-1 backend-2 2>&1 | Select-String -Pattern "ERROR|Exception|constraint|SQLState|violates" -Context 5,15'
