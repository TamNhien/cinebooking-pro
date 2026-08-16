$ErrorActionPreference = "Stop"
Write-Host "=== CineBooking V22 Notification Center diagnostics ===" -ForegroundColor Cyan

Write-Host "`n=== Docker services ==="
docker compose ps -a

Write-Host "`n=== Flyway V22 ==="
docker compose exec postgres psql -U cinebooking -d cinebooking -c "SELECT version,description,success FROM flyway_schema_history WHERE version='22';"

Write-Host "`n=== notification_preference columns ==="
docker compose exec postgres psql -U cinebooking -d cinebooking -c "SELECT column_name,data_type,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='notification_preference' ORDER BY ordinal_position;"

Write-Host "`n=== user_notification V22 columns ==="
docker compose exec postgres psql -U cinebooking -d cinebooking -c "SELECT column_name,data_type,is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='user_notification' AND column_name IN ('category','in_app_visible','email_status','email_sent_at','delivery_error','dedupe_key') ORDER BY column_name;"

Write-Host "`n=== Notification preference coverage ==="
docker compose exec postgres psql -U cinebooking -d cinebooking -c "SELECT (SELECT COUNT(*) FROM app_user) users, (SELECT COUNT(*) FROM notification_preference) preferences, (SELECT COUNT(*) FROM app_user u LEFT JOIN notification_preference p ON p.user_id=u.id WHERE p.user_id IS NULL) missing_preferences;"

Write-Host "`n=== Duplicate dedupe keys (expected 0 rows) ==="
docker compose exec postgres psql -U cinebooking -d cinebooking -c "SELECT user_id,dedupe_key,COUNT(*) FROM user_notification WHERE dedupe_key IS NOT NULL GROUP BY user_id,dedupe_key HAVING COUNT(*)>1;"

Write-Host "`n=== Recent notification delivery status ==="
docker compose exec postgres psql -U cinebooking -d cinebooking -c "SELECT notification_type,category,in_app_visible,email_status,created_at FROM user_notification ORDER BY created_at DESC LIMIT 12;"

Write-Host "`nExpected: V22 success=t, missing_preferences=0, duplicate dedupe keys returns 0 rows." -ForegroundColor Yellow
Write-Host "Next: powershell -ExecutionPolicy Bypass -File .\tools\test-v22.ps1" -ForegroundColor Yellow
