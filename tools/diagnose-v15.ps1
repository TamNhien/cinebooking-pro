$ErrorActionPreference = "Stop"

Write-Host "=== CineBooking V15 diagnostics ==="
Write-Host ""
Write-Host "=== Docker services ==="
docker compose ps -a

Write-Host ""
Write-Host "=== Flyway V15 ==="
docker compose exec -T postgres psql -U cinebooking -d cinebooking -c "SELECT version,description,success FROM flyway_schema_history WHERE version='15';"

Write-Host ""
Write-Host "=== Pending booking timeout ==="
docker compose exec -T backend-1 sh -c 'printf "%s\n" "$PAYMENT_WINDOW_SECONDS"'

Write-Host ""
Write-Host "=== PENDING bookings ==="
docker compose exec -T postgres psql -U cinebooking -d cinebooking -c "SELECT id,user_id,showtime_id,status,created_at,expires_at,(expires_at <= CURRENT_TIMESTAMP) AS expired FROM booking WHERE status='PENDING' ORDER BY created_at DESC LIMIT 20;"

Write-Host ""
Write-Host "=== Stale active seat rows (expected 0 after refresh/job) ==="
docker compose exec -T postgres psql -U cinebooking -d cinebooking -c "SELECT COUNT(*) AS stale_active_seat_rows FROM booking_seat bs JOIN booking b ON b.id=bs.booking_id WHERE bs.released_at IS NULL AND b.status='PENDING' AND b.expires_at <= CURRENT_TIMESTAMP;"

Write-Host ""
Write-Host "If stale_active_seat_rows is not 0, open the affected showtime seat page once or wait about 30 seconds for BookingExpiryJob, then run this script again."
