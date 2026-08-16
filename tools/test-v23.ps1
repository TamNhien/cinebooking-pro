param(
  [string]$BaseUrl = "http://localhost/api",
  [string]$AdminEmail = "",
  [string]$AdminPassword = ""
)

$ErrorActionPreference = "Stop"
function To-Json($Object) { return ($Object | ConvertTo-Json -Depth 12 -Compress) }
function Headers([string]$Token) { return @{ Authorization = "Bearer $Token" } }
function Pass([string]$Message) { Write-Host "PASS: $Message" -ForegroundColor Green }
function Warn([string]$Message) { Write-Host "WARN: $Message" -ForegroundColor Yellow }
function Read-DotEnv([string]$Path) {
  $Result = @{}
  if (-not (Test-Path $Path)) { return $Result }
  foreach ($Line in Get-Content $Path) {
    $Trimmed = $Line.Trim(); if (-not $Trimmed -or $Trimmed.StartsWith('#')) { continue }
    $Index = $Trimmed.IndexOf('='); if ($Index -le 0) { continue }
    $Key = $Trimmed.Substring(0,$Index).Trim(); $Value = $Trimmed.Substring($Index+1).Trim()
    if (($Value.StartsWith('"') -and $Value.EndsWith('"')) -or ($Value.StartsWith("'") -and $Value.EndsWith("'"))) { $Value=$Value.Substring(1,$Value.Length-2) }
    $Result[$Key]=$Value
  }
  return $Result
}
function SecureString-ToPlainText([Security.SecureString]$SecureString) {
  $Bstr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureString)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($Bstr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($Bstr) }
}
function Wait-Api([string]$Uri, [int]$MaxAttempts = 30) {
  for($i=1;$i -le $MaxAttempts;$i++){
    try { return Invoke-RestMethod -Method Get -Uri $Uri -TimeoutSec 5 }
    catch { if($i -eq $MaxAttempts){throw}; if($i -eq 1){Warn "API not ready; waiting for backend/nginx startup..."}; Start-Sleep -Seconds 2 }
  }
}

Write-Host "CineBooking V23 Attendance V2 smoke test" -ForegroundColor Cyan
$EnvFile=Read-DotEnv (Join-Path (Get-Location) '.env')
if([string]::IsNullOrWhiteSpace($AdminEmail)){
  if($EnvFile.ContainsKey('ADMIN_EMAIL') -and $EnvFile['ADMIN_EMAIL']){$AdminEmail=$EnvFile['ADMIN_EMAIL']}else{$AdminEmail='admin@cine.local'}
}
$Movies=@(Wait-Api "$BaseUrl/movies" | ForEach-Object { $_ })
Pass "Public API reachable"

if([string]::IsNullOrWhiteSpace($AdminPassword)){
  $Secure=Read-Host "Enter CURRENT password for $AdminEmail (hidden)" -AsSecureString
  $AdminPassword=SecureString-ToPlainText $Secure
}
$Login=Invoke-RestMethod -Method Post -Uri "$BaseUrl/auth/login" -ContentType "application/json" -Body (To-Json @{email=$AdminEmail;password=$AdminPassword}) -SessionVariable Web
$H=Headers $Login.accessToken
Pass "Admin login"

try {
  $Month=(Get-Date).ToString('yyyy-MM')
  $Report=Invoke-RestMethod -Method Get -Uri "$BaseUrl/admin/attendance/timesheet?month=$Month" -Headers $H -WebSession $Web
  if($null -eq $Report.rows -or $null -eq $Report.totalWorkedMinutes -or $null -eq $Report.totalAbsentShifts){throw "Timesheet payload is incomplete."}
  if([double]$Report.totalWorkedMinutes -lt 0 -or [double]$Report.totalLateMinutes -lt 0 -or [double]$Report.totalEarlyLeaveMinutes -lt 0){throw "Timesheet totals must be non-negative."}
  Pass "Monthly timesheet endpoint returns attendance KPIs"

  $Leaves=@(Invoke-RestMethod -Method Get -Uri "$BaseUrl/admin/attendance/leaves?status=ALL" -Headers $H -WebSession $Web | ForEach-Object { $_ })
  Pass "Leave review endpoint reachable; requests=$($Leaves.Count)"

  $Cinemas=@(Invoke-RestMethod -Method Get -Uri "$BaseUrl/admin/shifts/cinema-options" -Headers $H -WebSession $Web | ForEach-Object { $_ })
  if($Cinemas.Count -gt 0){
    $CinemaId=[string]$Cinemas[0].id
    $Filtered=Invoke-RestMethod -Method Get -Uri "$BaseUrl/admin/attendance/timesheet?month=$Month&cinemaId=$([Uri]::EscapeDataString($CinemaId))" -Headers $H -WebSession $Web
    if([string]$Filtered.cinemaId -ne $CinemaId){throw "Cinema filter did not return the requested cinema."}
    Pass "Timesheet cinema filter works"
  } else { Warn "No cinemas available; cinema filter test skipped." }

  $Staff=@(Invoke-RestMethod -Method Get -Uri "$BaseUrl/admin/shifts/staff-options" -Headers $H -WebSession $Web | ForEach-Object { $_ })
  if($Staff.Count -gt 0){
    Pass "Staff roster is available for shift/leave integration; staff=$($Staff.Count)"
  } else { Warn "No active staff found; shift/leave integration has no roster to exercise." }

  # Database-level V23 sanity checks are read-only.
  $Flyway = docker compose exec -T postgres psql -U cinebooking -d cinebooking -Atc "SELECT success FROM flyway_schema_history WHERE version='23' ORDER BY installed_rank DESC LIMIT 1;"
  if(($Flyway | Out-String).Trim() -ne 't'){throw "Flyway V23 is not successful."}
  Pass "Flyway V23 applied successfully"

  $Broken = docker compose exec -T postgres psql -U cinebooking -d cinebooking -Atc "SELECT count(*) FROM staff_attendance WHERE late_minutes<0 OR early_leave_minutes<0 OR worked_minutes<0 OR punctuality_status NOT IN ('ON_TIME','LATE','EARLY','LATE_EARLY');"
  if([int](($Broken | Out-String).Trim()) -ne 0){throw "Broken attendance metric invariants found."}
  Pass "Attendance metric invariants are valid"

  $ApprovedConflict = docker compose exec -T postgres psql -U cinebooking -d cinebooking -Atc "SELECT count(*) FROM staff_leave_request l JOIN staff_shift s ON s.staff_user_id=l.staff_user_id AND s.shift_date BETWEEN l.from_date AND l.to_date WHERE l.status='APPROVED' AND s.status='SCHEDULED';"
  if([int](($ApprovedConflict | Out-String).Trim()) -ne 0){throw "Approved leave still overlaps a SCHEDULED shift."}
  Pass "Approved leave has no scheduled-shift conflicts"
}
finally {
  try{Invoke-RestMethod -Method Post -Uri "$BaseUrl/auth/logout" -WebSession $Web | Out-Null}catch{}
  $AdminPassword=$null
}

Write-Host "ALL V23 ATTENDANCE V2 SMOKE TESTS PASSED" -ForegroundColor Green
Write-Host "This smoke test is read-only for staff/leave/business data; it only creates and logs out the temporary admin auth session." -ForegroundColor Yellow
