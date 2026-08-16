$ErrorActionPreference = "Stop"
Write-Host "=== CineBooking V24 high-traffic booking diagnostics ===" -ForegroundColor Cyan

Write-Host "`n=== Docker services ===" -ForegroundColor Cyan
docker compose ps

Write-Host "`n=== Flyway V24 ===" -ForegroundColor Cyan
docker compose exec postgres psql -U cinebooking -d cinebooking -c "SELECT version,description,success FROM flyway_schema_history WHERE version='24';"

Write-Host "`n=== Booking idempotency columns ===" -ForegroundColor Cyan
docker compose exec postgres psql -U cinebooking -d cinebooking -c "SELECT column_name,data_type,is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='booking' AND column_name IN ('idempotency_key','request_fingerprint') ORDER BY column_name;"

Write-Host "`n=== V24 contention indexes ===" -ForegroundColor Cyan
docker compose exec postgres psql -U cinebooking -d cinebooking -c "SELECT indexname,indexdef FROM pg_indexes WHERE schemaname='public' AND indexname IN ('uq_booking_user_idempotency','idx_booking_idempotency_lookup','uq_showtime_seat_active') ORDER BY indexname;"

Write-Host "`n=== Duplicate idempotency keys (expected 0 rows) ===" -ForegroundColor Cyan
docker compose exec postgres psql -U cinebooking -d cinebooking -c "SELECT user_id,idempotency_key,count(*) FROM booking WHERE idempotency_key IS NOT NULL GROUP BY user_id,idempotency_key HAVING count(*)>1;"

Write-Host "`n=== Duplicate active seat ownership (expected 0 rows) ===" -ForegroundColor Cyan
docker compose exec postgres psql -U cinebooking -d cinebooking -c "SELECT showtime_id,seat_id,count(*) FROM booking_seat WHERE released_at IS NULL GROUP BY showtime_id,seat_id HAVING count(*)>1;"

Write-Host "`n=== Invalid V24 fingerprints (expected 0 rows) ===" -ForegroundColor Cyan
docker compose exec postgres psql -U cinebooking -d cinebooking -c "SELECT id,user_id,idempotency_key,request_fingerprint FROM booking WHERE idempotency_key IS NOT NULL AND (request_fingerprint IS NULL OR length(request_fingerprint)<>64);"

Write-Host "`nExpected: V24 success=t, all 3 indexes present, and all invariant queries return 0 rows." -ForegroundColor Yellow
Write-Host "Integration test: powershell -ExecutionPolicy Bypass -File .\tools\test-v24.ps1" -ForegroundColor Yellow
