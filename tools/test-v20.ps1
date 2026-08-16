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
function Get-StatusCode($ErrorRecord) { try { return [int]$ErrorRecord.Exception.Response.StatusCode } catch { return $null } }
function Assert-Percent([string]$Name, $Value) {
  $NumberValue=[double]$Value
  if($NumberValue -lt 0 -or $NumberValue -gt 100){throw "$Name must be between 0 and 100; got $NumberValue"}
}
function Wait-PublicApi([string]$Uri, [int]$MaxAttempts = 30, [int]$DelaySeconds = 2) {
  for($Attempt=1;$Attempt -le $MaxAttempts;$Attempt++) {
    try {
      return @(Invoke-RestMethod -Method Get -Uri $Uri -TimeoutSec 5)
    } catch {
      if($Attempt -eq $MaxAttempts) { throw }
      if($Attempt -eq 1) { Warn "API is not ready yet; waiting for backend/nginx startup..." }
      Start-Sleep -Seconds $DelaySeconds
    }
  }
}

Write-Host "CineBooking V20.3 Analytics V2 smoke test" -ForegroundColor Cyan
$EnvFile=Read-DotEnv (Join-Path (Get-Location) '.env')
if ([string]::IsNullOrWhiteSpace($AdminEmail)) {
  if ($EnvFile.ContainsKey('ADMIN_EMAIL') -and $EnvFile['ADMIN_EMAIL']) { $AdminEmail=$EnvFile['ADMIN_EMAIL'] } else { $AdminEmail='admin@cine.local' }
}

# Windows PowerShell 5.1 can keep a JSON array returned by Invoke-RestMethod
# as one Object[] value. Pipe it before counting/selecting to force enumeration.
$MoviesResponse=Wait-PublicApi "$BaseUrl/movies"
$Movies=@($MoviesResponse | ForEach-Object { $_ })
Pass "Public API reachable; movies=$($Movies.Count)"

$Admin=$null
for($Attempt=1;$Attempt -le 3 -and $null -eq $Admin;$Attempt++){
  if([string]::IsNullOrWhiteSpace($AdminPassword)){$Secure=Read-Host "Enter CURRENT password for $AdminEmail (hidden)" -AsSecureString;$Plain=SecureString-ToPlainText $Secure}else{$Plain=$AdminPassword}
  try{$Admin=Invoke-RestMethod -Method Post -Uri "$BaseUrl/auth/login" -ContentType "application/json" -Body (To-Json @{email=$AdminEmail;password=$Plain})}
  catch{if((Get-StatusCode $_)-eq 429){throw "Admin login rate-limited."};Warn "Admin login failed (attempt $Attempt of 3).";$Admin=$null;$AdminPassword=""}
  finally{$Plain=$null}
}
if($null -eq $Admin){throw "Admin login failed."}
if($Admin.role -ne 'ADMIN'){throw "Expected ADMIN role, got $($Admin.role)."}
$H=Headers $Admin.accessToken
Pass "Admin login"

try {
  $Dashboard=Invoke-RestMethod -Method Get -Uri "$BaseUrl/admin/analytics?days=30" -Headers $H
} catch {
  Write-Host "FAIL: Analytics dashboard request returned an error." -ForegroundColor Red
  try {
    $Status=[int]$_.Exception.Response.StatusCode
    Write-Host "HTTP status: $Status" -ForegroundColor Yellow
  } catch {}
  try {
    $Body=$_.ErrorDetails.Message
    if(-not [string]::IsNullOrWhiteSpace($Body)){ Write-Host "Response body: $Body" -ForegroundColor Yellow }
  } catch {}
  Write-Host "`nRecent backend exception lines:" -ForegroundColor Cyan
  try {
    $LogLines = docker compose logs --since=3m backend-1 backend-2 2>&1
    $Matches = $LogLines | Select-String -Pattern 'Unhandled exception|BadSqlGrammarException|PSQLException|DataAccessException|ERROR:' -Context 2,18
    if($Matches){ $Matches | ForEach-Object { Write-Host $_.ToString() } }
    else { Write-Host "No matching exception lines found. Run: docker compose logs --since=5m backend-1 backend-2" -ForegroundColor Yellow }
  } catch {
    Write-Host "Could not read Docker logs automatically: $($_.Exception.Message)" -ForegroundColor Yellow
  }
  throw "Analytics V2 dashboard failed. Copy the exception block above so the failing SQL can be fixed precisely."
}
if($null -eq $Dashboard.kpi){throw "Analytics response missing kpi."}
if($null -eq $Dashboard.cinemaPerformance){throw "Analytics response missing cinemaPerformance."}
if($null -eq $Dashboard.topShowtimes){throw "Analytics response missing topShowtimes."}
if($null -eq $Dashboard.seatHeatmap){throw "Analytics response missing seatHeatmap."}
if($null -eq $Dashboard.hourlyDemand){throw "Analytics response missing hourlyDemand."}
if($null -eq $Dashboard.staffPerformance){throw "Analytics response missing staffPerformance."}
if($null -eq $Dashboard.bookingStatuses){throw "Analytics response missing bookingStatuses."}
if($null -eq $Dashboard.paymentStatuses){throw "Analytics response missing paymentStatuses."}
Pass "Analytics V2 dashboard payload contains all sections"

Assert-Percent "occupancyRate" $Dashboard.kpi.occupancyRate
Assert-Percent "paymentSuccessRate" $Dashboard.kpi.paymentSuccessRate
Assert-Percent "refundRate" $Dashboard.kpi.refundRate
Pass "KPI percentages are within 0..100"

if([double]$Dashboard.kpi.revenue -lt 0){throw "Revenue cannot be negative."}
if([double]$Dashboard.kpi.averageOrderValue -lt 0){throw "Average order value cannot be negative."}
if([int64]$Dashboard.kpi.tickets -lt 0){throw "Tickets cannot be negative."}
Pass "Revenue, AOV and ticket metrics are non-negative"

# Do not wrap Invoke-RestMethod directly with @() on Windows PowerShell 5.1.
# That can preserve the whole JSON array as one element and make .id an array of UUIDs.
$CinemasResponse=Invoke-RestMethod -Method Get -Uri "$BaseUrl/cinemas"
$FirstCinema=$CinemasResponse | Select-Object -First 1
if($null -ne $FirstCinema){
  $CinemaIdText=[string]$FirstCinema.id
  $ParsedCinemaId=[Guid]::Empty
  if([string]::IsNullOrWhiteSpace($CinemaIdText) -or -not [Guid]::TryParse($CinemaIdText,[ref]$ParsedCinemaId)){
    throw "Cinema API did not yield one scalar UUID. Raw cinemaId='$CinemaIdText'."
  }
  $EncodedCinemaId=[Uri]::EscapeDataString($CinemaIdText)
  try {
    $Filtered=Invoke-RestMethod -Method Get -Uri "$BaseUrl/admin/analytics?days=30&cinemaId=$EncodedCinemaId" -Headers $H
  } catch {
    Write-Host "FAIL: Cinema-filtered Analytics request returned an error for cinemaId=$CinemaIdText" -ForegroundColor Red
    throw
  }
  $CinemaRows=@($Filtered.cinemaPerformance | ForEach-Object { $_ })
  if($CinemaRows.Count -gt 1){throw "Cinema filter returned more than one cinema row."}
  if($CinemaRows.Count -eq 1 -and [string]$CinemaRows[0].cinemaId -ne $CinemaIdText){throw "Cinema filter returned a different cinema."}
  Pass "Cinema filter works for $($FirstCinema.name)"
}else{
  Warn "No cinema exists; cinema filter test skipped."
}

$Days7=Invoke-RestMethod -Method Get -Uri "$BaseUrl/admin/analytics?days=7" -Headers $H
if($null -eq $Days7.dailyRevenue){throw "7-day analytics missing dailyRevenue."}
Pass "7-day analytics endpoint works"

Write-Host "ALL V20 ANALYTICS V2 SMOKE TESTS PASSED" -ForegroundColor Green
Write-Host "This test is read-only and does not modify bookings, payments, staff, pricing or inventory." -ForegroundColor Yellow
