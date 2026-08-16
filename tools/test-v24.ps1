param(
  [string]$BaseUrl = "http://localhost/api",
  [string]$AdminEmail = "",
  [string]$AdminPassword = ""
)

$ErrorActionPreference = "Stop"
function To-Json($Object) { return ($Object | ConvertTo-Json -Depth 12 -Compress) }
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
function Status-Code($ErrorRecord) {
  try { return [int]$ErrorRecord.Exception.Response.StatusCode.value__ } catch { return 0 }
}

Write-Host "CineBooking V24 High-Traffic / Idempotency smoke test" -ForegroundColor Cyan
$EnvFile=Read-DotEnv (Join-Path (Get-Location) '.env')
if([string]::IsNullOrWhiteSpace($AdminEmail)){
  if($EnvFile.ContainsKey('ADMIN_EMAIL') -and $EnvFile['ADMIN_EMAIL']){$AdminEmail=$EnvFile['ADMIN_EMAIL']}else{$AdminEmail='admin@cine.local'}
}
$null=Wait-Api "$BaseUrl/movies"
Pass "Public API reachable"

if([string]::IsNullOrWhiteSpace($AdminPassword)){
  $Secure=Read-Host "Enter CURRENT password for $AdminEmail (hidden)" -AsSecureString
  $AdminPassword=SecureString-ToPlainText $Secure
}
$Login=Invoke-RestMethod -Method Post -Uri "$BaseUrl/auth/login" -ContentType "application/json" -Body (To-Json @{email=$AdminEmail;password=$AdminPassword}) -SessionVariable Web
$AuthHeaders=@{ Authorization = "Bearer $($Login.accessToken)" }
Pass "Admin login"

$HeldShowtimeId=$null
$HeldSeatId=$null
$BookingId=$null
try {
  $ShowtimesResponse=Invoke-RestMethod -Method Get -Uri "$BaseUrl/showtimes"
  $Showtimes=@($ShowtimesResponse | ForEach-Object { $_ })
  foreach($Showtime in $Showtimes){
    $Sid=[string]$Showtime.id
    if([string]::IsNullOrWhiteSpace($Sid)){continue}
    try {
      $Pending=Invoke-RestMethod -Method Get -Uri "$BaseUrl/bookings/pending?showtimeId=$([Uri]::EscapeDataString($Sid))" -Headers $AuthHeaders -WebSession $Web
      if($null -ne $Pending -and $Pending.id){continue}
    } catch { continue }
    try {
      $Map=Invoke-RestMethod -Method Get -Uri "$BaseUrl/showtimes/$Sid/seats" -Headers $AuthHeaders -WebSession $Web
      $Available=@($Map.seats | Where-Object { $_.status -eq 'AVAILABLE' })
      foreach($Seat in $Available){
        $SeatId=[string]$Seat.id
        try {
          Invoke-RestMethod -Method Post -Uri "$BaseUrl/showtimes/$Sid/holds" -Headers $AuthHeaders -WebSession $Web -ContentType "application/json" -Body (To-Json @{seatIds=@($SeatId)}) | Out-Null
          $HeldShowtimeId=$Sid; $HeldSeatId=$SeatId; break
        } catch {}
      }
      if($HeldSeatId){break}
    } catch {}
  }
  if(-not $HeldSeatId){throw "Could not find and hold an AVAILABLE seat for the V24 smoke test."}
  Pass "Acquired one temporary seat hold"

  $Key="v24-smoke-$([Guid]::NewGuid().ToString('N'))"
  $Payload=@{showtimeId=$HeldShowtimeId;seatIds=@($HeldSeatId);concessions=@();voucherCode=$null;redeemPoints=0}
  $Body=To-Json $Payload
  $CreateHeaders=@{ Authorization=$AuthHeaders.Authorization; 'Idempotency-Key'=$Key }

  $First=Invoke-WebRequest -UseBasicParsing -Method Post -Uri "$BaseUrl/bookings" -Headers $CreateHeaders -WebSession $Web -ContentType "application/json" -Body $Body
  if([int]$First.StatusCode -ne 201){throw "First booking request should return 201, got $($First.StatusCode)."}
  $FirstBody=$First.Content | ConvertFrom-Json
  $BookingId=[string]$FirstBody.id
  if([string]::IsNullOrWhiteSpace($BookingId)){throw "First booking response has no id."}
  if([string]$First.Headers['Idempotency-Replayed'] -ne 'false'){throw "First booking response must have Idempotency-Replayed=false."}
  Pass "First checkout created exactly one booking"

  $Replay=Invoke-WebRequest -UseBasicParsing -Method Post -Uri "$BaseUrl/bookings" -Headers $CreateHeaders -WebSession $Web -ContentType "application/json" -Body $Body
  if([int]$Replay.StatusCode -ne 200){throw "Idempotent replay should return 200, got $($Replay.StatusCode)."}
  $ReplayBody=$Replay.Content | ConvertFrom-Json
  if([string]$ReplayBody.id -ne $BookingId){throw "Replay returned a different booking id."}
  if([string]$Replay.Headers['Idempotency-Replayed'] -ne 'true'){throw "Replay must have Idempotency-Replayed=true."}
  Pass "Same Idempotency-Key + same payload replays the original booking"

  $Different=@{showtimeId=$HeldShowtimeId;seatIds=@($HeldSeatId);concessions=@();voucherCode=$null;redeemPoints=1}
  $ConflictStatus=0
  try {
    Invoke-WebRequest -UseBasicParsing -Method Post -Uri "$BaseUrl/bookings" -Headers $CreateHeaders -WebSession $Web -ContentType "application/json" -Body (To-Json $Different) | Out-Null
  } catch { $ConflictStatus=Status-Code $_ }
  if($ConflictStatus -ne 409){throw "Reusing an idempotency key for a different payload should return 409, got $ConflictStatus."}
  Pass "Same Idempotency-Key + different payload is rejected with 409"

  $DbCount=(docker compose exec -T postgres psql -U cinebooking -d cinebooking -Atc "SELECT count(*) FROM booking WHERE idempotency_key='$Key';" | Out-String).Trim()
  if([int]$DbCount -ne 1){throw "Expected exactly one booking row for the idempotency key, found $DbCount."}
  $Fp=(docker compose exec -T postgres psql -U cinebooking -d cinebooking -Atc "SELECT length(request_fingerprint) FROM booking WHERE id='$BookingId';" | Out-String).Trim()
  if([int]$Fp -ne 64){throw "Stored request fingerprint should be 64 hex characters."}
  Pass "Database stores one key and one SHA-256 request fingerprint"

  $Duplicates=(docker compose exec -T postgres psql -U cinebooking -d cinebooking -Atc "SELECT count(*) FROM (SELECT showtime_id,seat_id FROM booking_seat WHERE released_at IS NULL GROUP BY showtime_id,seat_id HAVING count(*)>1) x;" | Out-String).Trim()
  if([int]$Duplicates -ne 0){throw "Duplicate active seat ownership detected."}
  Pass "PostgreSQL active-seat invariant has no duplicates"

  Invoke-RestMethod -Method Post -Uri "$BaseUrl/bookings/$BookingId/cancel" -Headers $AuthHeaders -WebSession $Web | Out-Null
  $ActiveAfterCancel=(docker compose exec -T postgres psql -U cinebooking -d cinebooking -Atc "SELECT count(*) FROM booking_seat WHERE booking_id='$BookingId' AND released_at IS NULL;" | Out-String).Trim()
  if([int]$ActiveAfterCancel -ne 0){throw "Temporary booking seats were not released after cancellation."}
  Pass "Temporary booking cancelled and its seat released"
  $HeldSeatId=$null

  $Flyway=(docker compose exec -T postgres psql -U cinebooking -d cinebooking -Atc "SELECT success FROM flyway_schema_history WHERE version='24' ORDER BY installed_rank DESC LIMIT 1;" | Out-String).Trim()
  if($Flyway -ne 't'){throw "Flyway V24 is not successful."}
  Pass "Flyway V24 applied successfully"
}
finally {
  if($HeldSeatId -and $HeldShowtimeId){
    try{Invoke-RestMethod -Method Delete -Uri "$BaseUrl/showtimes/$HeldShowtimeId/holds" -Headers $AuthHeaders -WebSession $Web -ContentType "application/json" -Body (To-Json @{seatIds=@($HeldSeatId)}) | Out-Null}catch{}
  }
  try{Invoke-RestMethod -Method Post -Uri "$BaseUrl/auth/logout" -WebSession $Web | Out-Null}catch{}
  $AdminPassword=$null
}

Write-Host "ALL V24 HIGH-TRAFFIC BOOKING SMOKE TESTS PASSED" -ForegroundColor Green
Write-Host "The temporary booking is cancelled at the end; no seat stays reserved." -ForegroundColor Yellow
