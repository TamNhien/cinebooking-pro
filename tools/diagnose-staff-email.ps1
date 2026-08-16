param(
  [string]$Email = ""
)
$ErrorActionPreference = "Stop"
if ([string]::IsNullOrWhiteSpace($Email)) {
  $Email = Read-Host "Email to check"
}
$escaped = $Email.Replace("'", "''")
Write-Host "=== app_user ==="
docker compose exec postgres psql -U cinebooking -d cinebooking -c "SELECT id,email,full_name,role,account_enabled FROM app_user WHERE lower(email)=lower('$escaped');"
Write-Host "=== staff_profile ==="
docker compose exec postgres psql -U cinebooking -d cinebooking -c "SELECT sp.user_id,sp.employee_code,sp.employment_status,sp.deleted_at,c.name AS cinema FROM staff_profile sp LEFT JOIN cinema c ON c.id=sp.cinema_id JOIN app_user u ON u.id=sp.user_id WHERE lower(u.email)=lower('$escaped');"
