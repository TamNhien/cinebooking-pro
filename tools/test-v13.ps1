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

Write-Host "CineBooking V13 booking operations smoke test" -ForegroundColor Cyan
$EnvFile=Read-DotEnv (Join-Path (Get-Location) '.env')
if ([string]::IsNullOrWhiteSpace($AdminEmail)) {
  if ($EnvFile.ContainsKey('ADMIN_EMAIL') -and $EnvFile['ADMIN_EMAIL']) { $AdminEmail=$EnvFile['ADMIN_EMAIL'] } else { $AdminEmail='admin@cine.local' }
}

$Movies=@(Invoke-RestMethod -Method Get -Uri "$BaseUrl/movies")
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

$ListResponse=Invoke-RestMethod -Method Get -Uri "$BaseUrl/admin/booking-ops" -Headers $H
$Bookings=@($ListResponse)
# PowerShell 5.1 can wrap JSON arrays oddly; normalize by pipeline when needed.
if($Bookings.Count -eq 1 -and $Bookings[0] -is [System.Array]){$Bookings=@($Bookings[0])}
Pass "Admin booking operations list reachable; bookings=$($Bookings.Count)"

if($Bookings.Count -eq 0){Warn "No booking exists, so detail/QR checks are skipped.";exit 0}
$First=$Bookings | Select-Object -First 1
$Detail=Invoke-RestMethod -Method Get -Uri "$BaseUrl/admin/booking-ops/$($First.id)" -Headers $H
if([string]::IsNullOrWhiteSpace([string]$Detail.customerEmail)){throw "Booking detail missing customerEmail."}
if([string]::IsNullOrWhiteSpace([string]$Detail.movieTitle)){throw "Booking detail missing movieTitle."}
if($null -eq $Detail.payments){throw "Booking detail missing payments collection."}
if($null -eq $Detail.timeline){throw "Booking detail missing timeline collection."}
Pass "Booking detail includes customer, cinema, payment and audit timeline"

$Confirmed=$Bookings | Where-Object { $_.status -eq 'CONFIRMED' } | Select-Object -First 1
if($null -ne $Confirmed){
  $Ticket=Invoke-RestMethod -Method Get -Uri "$BaseUrl/admin/booking-ops/$($Confirmed.id)/ticket" -Headers $H
  if(-not ([string]$Ticket.qrImageDataUrl).StartsWith('data:image/png;base64,')){throw "Admin ticket did not return PNG data URL."}
  if(-not ([string]$Ticket.qrUrl).Contains('/staff/check-in?ticket=')){throw "Admin ticket QR URL is invalid."}
  Pass "Admin QR ticket endpoint works for CONFIRMED booking"
}else{Warn "No CONFIRMED booking available; QR test skipped."}

$Refunds=@(Invoke-RestMethod -Method Get -Uri "$BaseUrl/admin/refunds" -Headers $H)
Pass "Refund queue reachable; pending=$($Refunds.Count)"
$Audit=@(Invoke-RestMethod -Method Get -Uri "$BaseUrl/admin/audit" -Headers $H)
Pass "Audit endpoint reachable; recent=$($Audit.Count)"

Write-Host "ALL V13 READ-ONLY SMOKE TESTS PASSED" -ForegroundColor Green
Write-Host "Manual actions (cancel/refund/check-in/resend email) are intentionally not executed by this script because they change real booking state." -ForegroundColor Yellow
