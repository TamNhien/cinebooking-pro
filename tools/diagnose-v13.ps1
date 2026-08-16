$ErrorActionPreference = "Continue"
Write-Host "=== Docker services ===" -ForegroundColor Cyan
docker compose ps
Write-Host ""
Write-Host "=== Flyway migrations ===" -ForegroundColor Cyan
docker compose exec postgres psql -U cinebooking -d cinebooking -c "SELECT version,description,success FROM flyway_schema_history ORDER BY installed_rank;"
Write-Host ""
Write-Host "=== Booking operation indexes ===" -ForegroundColor Cyan
docker compose exec postgres psql -U cinebooking -d cinebooking -c "SELECT indexname FROM pg_indexes WHERE schemaname='public' AND indexname IN ('idx_booking_status_created_at','idx_booking_user_created_at','idx_payment_booking_created_at','idx_audit_booking_timeline','idx_showtime_start_time') ORDER BY indexname;"
Write-Host ""
Write-Host "=== Public API ===" -ForegroundColor Cyan
try { $m=Invoke-RestMethod -Method Get -Uri "http://localhost/api/movies" -ErrorAction Stop; Write-Host "OK http://localhost/api/movies reachable; movies=$(($m | Measure-Object).Count)" -ForegroundColor Green } catch { Write-Host "FAIL public API: $($_.Exception.Message)" -ForegroundColor Red }
Write-Host ""
Write-Host "=== Environment ===" -ForegroundColor Cyan
docker compose exec backend-1 printenv MAIL_ENABLED ADMIN_EMAIL TICKET_PUBLIC_BASE_URL
Write-Host ""
Write-Host "=== Next step ===" -ForegroundColor Cyan
Write-Host "Run: powershell -ExecutionPolicy Bypass -File .\tools\test-v13.ps1"
