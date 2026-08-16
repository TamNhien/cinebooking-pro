$ErrorActionPreference = "Stop"
Write-Host "=== CineBooking V21 Security & Session diagnostics ===" -ForegroundColor Cyan

Write-Host "`n=== Docker services ==="
docker compose ps -a

Write-Host "`n=== Flyway V21 ==="
docker compose exec postgres psql -U cinebooking -d cinebooking -c "SELECT version,description,success FROM flyway_schema_history WHERE version='21';"

Write-Host "`n=== auth_session columns ==="
docker compose exec postgres psql -U cinebooking -d cinebooking -c "SELECT column_name,data_type,is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='auth_session' ORDER BY ordinal_position;"

Write-Host "`n=== Session integrity ==="
docker compose exec postgres psql -U cinebooking -d cinebooking -c "SELECT COUNT(*) AS invalid_sessions FROM auth_session WHERE user_id IS NULL OR refresh_token_hash IS NULL OR expires_at IS NULL OR created_at IS NULL OR last_seen_at IS NULL;"

Write-Host "`n=== Session summary ==="
docker compose exec postgres psql -U cinebooking -d cinebooking -c "SELECT COUNT(*) total, COUNT(*) FILTER (WHERE revoked_at IS NULL AND expires_at > now()) active, COUNT(*) FILTER (WHERE revoked_at IS NOT NULL) revoked, COUNT(*) FILTER (WHERE revoked_at IS NULL AND expires_at <= now()) expired FROM auth_session;"

Write-Host "`n=== Recent auth audit ==="
docker compose exec postgres psql -U cinebooking -d cinebooking -c "SELECT actor_email,action,ip_address,created_at FROM audit_log WHERE action IN ('LOGIN_SUCCESS','LOGIN_FAILED','LOGIN_BLOCKED','SESSION_LOGOUT','SESSION_REVOKED','SESSIONS_REVOKED') ORDER BY created_at DESC LIMIT 12;"

Write-Host "`nExpected: V21 success=t and invalid_sessions=0." -ForegroundColor Yellow
Write-Host "Next: powershell -ExecutionPolicy Bypass -File .\tools\test-v21.ps1" -ForegroundColor Yellow
