$ErrorActionPreference = "Stop"
Write-Host "=== CineBooking V20 Analytics V2 diagnostics ===" -ForegroundColor Cyan

Write-Host "`n=== Docker services ==="
docker compose ps -a

Write-Host "`n=== Flyway V20 ==="
docker compose exec postgres psql -U cinebooking -d cinebooking -c "SELECT version,description,success FROM flyway_schema_history WHERE version='20';"

Write-Host "`n=== Analytics V2 indexes ==="
docker compose exec postgres psql -U cinebooking -d cinebooking -c "SELECT indexname FROM pg_indexes WHERE schemaname='public' AND indexname IN ('idx_booking_confirmed_at_status','idx_booking_refunded_at_status','idx_payment_paid_at_status','idx_payment_created_at_status','idx_showtime_auditorium_start','idx_ticket_checkin_checked_in_at') ORDER BY indexname;"

Write-Host "`n=== Analytics source data counts ==="
docker compose exec postgres psql -U cinebooking -d cinebooking -c "SELECT (SELECT COUNT(*) FROM cinema) cinemas, (SELECT COUNT(*) FROM showtime) showtimes, (SELECT COUNT(*) FROM booking) bookings, (SELECT COUNT(*) FROM payment) payments, (SELECT COUNT(*) FROM booking_seat) booking_seats, (SELECT COUNT(*) FROM ticket_checkin_log) checkins;"

Write-Host "`n=== Seat heatmap source rows ==="
docker compose exec postgres psql -U cinebooking -d cinebooking -c "SELECT COUNT(*) AS confirmed_active_seats FROM booking_seat bs JOIN booking b ON b.id=bs.booking_id WHERE b.status='CONFIRMED' AND bs.released_at IS NULL;"

Write-Host "`n=== Public API ==="
try {
  $Movies = @(Invoke-RestMethod -Method Get -Uri "http://localhost/api/movies")
  Write-Host "OK http://localhost/api/movies reachable; movies=$($Movies.Count)" -ForegroundColor Green
} catch {
  Write-Host "FAIL public API: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Next step ==="
Write-Host "Run: powershell -ExecutionPolicy Bypass -File .\tools\test-v20.ps1"
