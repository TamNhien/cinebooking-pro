$ErrorActionPreference = "Continue"

Write-Host "=== Docker services ===" -ForegroundColor Cyan
docker compose ps

Write-Host ""
Write-Host "=== Flyway migrations ===" -ForegroundColor Cyan
docker compose exec postgres psql -U cinebooking -d cinebooking -c "SELECT version,description,success FROM flyway_schema_history ORDER BY installed_rank;"

Write-Host ""
Write-Host "=== Admin account (password hash is NOT read) ===" -ForegroundColor Cyan
docker compose exec postgres psql -U cinebooking -d cinebooking -c "SELECT email,role,account_enabled,created_at,updated_at FROM app_user WHERE lower(email)=lower('admin@cine.local');"

Write-Host ""
Write-Host "=== Public API ===" -ForegroundColor Cyan
try {
  $MoviesResponse = Invoke-RestMethod -Method Get -Uri "http://localhost/api/movies" -ErrorAction Stop
  $MovieCount = ($MoviesResponse | Measure-Object).Count
  Write-Host "OK   http://localhost/api/movies reachable; movies=$MovieCount" -ForegroundColor Green
}
catch {
  Write-Host "FAIL http://localhost/api/movies : $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Container auth configuration ===" -ForegroundColor Cyan
docker compose exec backend-1 printenv MAIL_ENABLED ADMIN_EMAIL STAFF_TIME_ZONE

Write-Host ""
Write-Host "=== Next step ===" -ForegroundColor Cyan
Write-Host "Run: powershell -ExecutionPolicy Bypass -File .\tools\test-v10.ps1"
Write-Host "The V10.3 smoke test asks for the CURRENT Admin password with SecureString."
Write-Host "It does not rely on ADMIN_PASSWORD in .env unless -UseEnvAdminPassword is explicitly supplied."
