param(
  [string]$ShowtimeId = "66666666-6666-6666-6666-666666666666"
)
$ErrorActionPreference = "Stop"

Write-Host "=== CineBooking V16 seat reservation diagnostics ==="
Write-Host ""
Write-Host "=== Docker services ==="
docker compose ps -a

Write-Host ""
Write-Host "=== Flyway V16 ==="
docker compose exec -T postgres psql -U cinebooking -d cinebooking -c "SELECT version,description,success FROM flyway_schema_history WHERE version='16';"

Write-Host ""
Write-Host "=== Reservation index + trigger ==="
docker compose exec -T postgres psql -U cinebooking -d cinebooking -c "SELECT indexname FROM pg_indexes WHERE schemaname='public' AND indexname IN ('uq_showtime_seat_active','idx_booking_seat_unreleased_showtime') ORDER BY indexname; SELECT tgname FROM pg_trigger WHERE tgname='trg_release_inactive_booking_seats' AND NOT tgisinternal;"

Write-Host ""
Write-Host "=== Inactive bookings still blocking seats (expected 0) ==="
docker compose exec -T postgres psql -U cinebooking -d cinebooking -c "SELECT COUNT(*) AS stale_inactive_unreleased FROM booking_seat bs JOIN booking b ON b.id=bs.booking_id WHERE bs.released_at IS NULL AND b.status IN ('REFUNDED','CANCELLED','EXPIRED');"

Write-Host ""
Write-Host "=== Expired PENDING bookings still blocking seats (expected 0 after refresh/job) ==="
docker compose exec -T postgres psql -U cinebooking -d cinebooking -c "SELECT COUNT(*) AS expired_pending_unreleased FROM booking_seat bs JOIN booking b ON b.id=bs.booking_id WHERE bs.released_at IS NULL AND b.status='PENDING' AND b.expires_at <= CURRENT_TIMESTAMP;"

if ($ShowtimeId) {
  Write-Host ""
  Write-Host "=== Unreleased seat blockers for showtime $ShowtimeId ==="
  $sql = "SELECT s.row_label||s.seat_number AS seat,b.status,b.id AS booking_id,b.created_at,b.expires_at,bs.released_at FROM booking_seat bs JOIN booking b ON b.id=bs.booking_id JOIN seat s ON s.id=bs.seat_id WHERE bs.showtime_id='$ShowtimeId' AND bs.released_at IS NULL ORDER BY s.row_label,s.seat_number,b.created_at;"
  docker compose exec -T postgres psql -U cinebooking -d cinebooking -c $sql
}

Write-Host ""
Write-Host "Expected: stale_inactive_unreleased=0."
Write-Host "If a seat is listed above with CONFIRMED/REFUND_REQUESTED, it is legitimately reserved."
Write-Host "If a PENDING row is not expired, cancel it from the booking page or wait for its payment window to expire."
