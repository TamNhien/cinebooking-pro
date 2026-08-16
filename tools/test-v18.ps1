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
function SecureString-ToPlainText([Security.SecureString]$SecureString) {
  $Bstr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureString)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($Bstr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($Bstr) }
}
function Read-DotEnv([string]$Path) {
  $Result=@{}; if(-not (Test-Path $Path)){return $Result}
  foreach($Line in Get-Content $Path){$T=$Line.Trim();if(-not $T -or $T.StartsWith('#')){continue};$I=$T.IndexOf('=');if($I -le 0){continue};$K=$T.Substring(0,$I).Trim();$V=$T.Substring($I+1).Trim();$Result[$K]=$V}
  return $Result
}

Write-Host "CineBooking V18 dynamic pricing smoke test" -ForegroundColor Cyan
$EnvFile=Read-DotEnv (Join-Path (Get-Location) '.env')
if([string]::IsNullOrWhiteSpace($AdminEmail)){$AdminEmail=if($EnvFile.ContainsKey('ADMIN_EMAIL') -and $EnvFile['ADMIN_EMAIL']){$EnvFile['ADMIN_EMAIL']}else{'admin@cine.local'}}
if([string]::IsNullOrWhiteSpace($AdminPassword)){$Secure=Read-Host "Enter CURRENT password for $AdminEmail (hidden)" -AsSecureString;$Plain=SecureString-ToPlainText $Secure}else{$Plain=$AdminPassword}
try{$Admin=Invoke-RestMethod -Method Post -Uri "$BaseUrl/auth/login" -ContentType 'application/json' -Body (To-Json @{email=$AdminEmail;password=$Plain})}finally{$Plain=$null}
if($Admin.role -ne 'ADMIN'){throw "Expected ADMIN role."}
$H=Headers $Admin.accessToken
Pass "Admin login"

$Rules=@(Invoke-RestMethod -Method Get -Uri "$BaseUrl/admin/pricing/rules" -Headers $H)
if($Rules.Count -eq 1 -and $Rules[0] -is [System.Array]){$Rules=@($Rules[0])}
Pass "Pricing rules endpoint reachable; rules=$($Rules.Count)"
$Shows=@(Invoke-RestMethod -Method Get -Uri "$BaseUrl/admin/showtimes" -Headers $H)
if($Shows.Count -eq 1 -and $Shows[0] -is [System.Array]){$Shows=@($Shows[0])}
if($Shows.Count -eq 0){Warn "No showtime exists; preview test skipped.";exit 0}
$Show=$Shows | Where-Object { $_.status -eq 'OPEN' } | Select-Object -First 1
if($null -eq $Show){$Show=$Shows | Select-Object -First 1}
$Seats=@(Invoke-RestMethod -Method Get -Uri "$BaseUrl/admin/seats?auditoriumId=$($Show.auditoriumId)" -Headers $H)
if($Seats.Count -eq 1 -and $Seats[0] -is [System.Array]){$Seats=@($Seats[0])}
$Seat=$Seats | Where-Object { $_.seatType -ne 'BLOCKED' } | Select-Object -First 1
if($null -eq $Seat){Warn "Selected showtime auditorium has no usable seat; preview test skipped.";exit 0}

$Before=Invoke-RestMethod -Method Post -Uri "$BaseUrl/admin/pricing/preview" -Headers $H -ContentType 'application/json' -Body (To-Json @{showtimeId=$Show.id;seatId=$Seat.id})
Pass "Baseline preview works; finalPrice=$($Before.finalPrice)"

$Name="V18_SMOKE_" + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$Body=@{
  name=$Name; cinemaId=$Show.cinemaId; auditoriumId=$Show.auditoriumId; movieId=$Show.movieId; seatType=$Seat.seatType;
  daysOfWeek=@(); startTime=$null; endTime=$null; validFrom=$null; validTo=$null;
  adjustmentType='FIXED'; adjustmentValue=1234; priority=9999; active=$true
}
$Created=$null
try {
  $Created=Invoke-RestMethod -Method Post -Uri "$BaseUrl/admin/pricing/rules" -Headers $H -ContentType 'application/json' -Body (To-Json $Body)
  Pass "Created temporary pricing rule"
  $After=Invoke-RestMethod -Method Post -Uri "$BaseUrl/admin/pricing/preview" -Headers $H -ContentType 'application/json' -Body (To-Json @{showtimeId=$Show.id;seatId=$Seat.id})
  $Delta=[decimal]$After.finalPrice-[decimal]$Before.finalPrice
  if($Delta -ne 1234){throw "Expected preview delta 1234, got $Delta"}
  Pass "Dynamic rule changes preview by exactly +1234"
}
finally {
  if($null -ne $Created){
    Invoke-RestMethod -Method Delete -Uri "$BaseUrl/admin/pricing/rules/$($Created.id)" -Headers $H | Out-Null
    Pass "Temporary pricing rule deleted"
  }
}
$Restored=Invoke-RestMethod -Method Post -Uri "$BaseUrl/admin/pricing/preview" -Headers $H -ContentType 'application/json' -Body (To-Json @{showtimeId=$Show.id;seatId=$Seat.id})
if([decimal]$Restored.finalPrice -ne [decimal]$Before.finalPrice){throw "Price was not restored after deleting the temporary rule."}
Pass "Price restored after rule deletion"
Write-Host "ALL V18 DYNAMIC PRICING SMOKE TESTS PASSED" -ForegroundColor Green
