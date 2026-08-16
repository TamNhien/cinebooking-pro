param(
  [Parameter(Mandatory=$true)][string]$Email
)
$ErrorActionPreference = "Stop"
Write-Host "=== CineBooking V17.1 staff cinema diagnostics ==="
Write-Host "Email: $Email"
$escaped = $Email.Replace("'", "''")
$sql = @"
SELECT
  u.id AS user_id,
  u.email,
  u.role,
  sp.employee_code,
  sp.employment_status,
  sp.cinema_id AS profile_cinema_id,
  pc.name AS profile_cinema,
  a.id AS active_attendance_id,
  a.shift_id,
  a.cinema_id AS active_cinema_id,
  ac.name AS active_cinema,
  a.check_in_at,
  a.check_out_at,
  ss.status AS shift_status,
  ss.shift_date,
  ss.start_time,
  ss.end_time
FROM app_user u
LEFT JOIN staff_profile sp ON sp.user_id = u.id
LEFT JOIN cinema pc ON pc.id = sp.cinema_id
LEFT JOIN LATERAL (
  SELECT * FROM staff_attendance x
  WHERE x.staff_user_id = u.id AND x.check_out_at IS NULL
  ORDER BY x.check_in_at DESC LIMIT 1
) a ON true
LEFT JOIN cinema ac ON ac.id = a.cinema_id
LEFT JOIN staff_shift ss ON ss.id = a.shift_id
WHERE lower(u.email) = lower('$escaped');
"@
docker compose exec -T postgres psql -U cinebooking -d cinebooking -c $sql
Write-Host ""
Write-Host "Interpretation:"
Write-Host "- profile_cinema = home assignment for future shifts."
Write-Host "- active_cinema = cinema of the currently checked-in shift."
Write-Host "- V17.1 uses active_cinema for QR authorization while a shift is active."
