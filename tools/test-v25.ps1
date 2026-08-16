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

Write-Host "CineBooking V25 Recommendation Engine smoke test" -ForegroundColor Cyan
$EnvFile=Read-DotEnv (Join-Path (Get-Location) '.env')
if([string]::IsNullOrWhiteSpace($AdminEmail)){
  if($EnvFile.ContainsKey('ADMIN_EMAIL') -and $EnvFile['ADMIN_EMAIL']){$AdminEmail=$EnvFile['ADMIN_EMAIL']}else{$AdminEmail='admin@cine.local'}
}

$MoviesResponse=Wait-Api "$BaseUrl/movies"
$Movies=@($MoviesResponse | ForEach-Object { $_ })
if($Movies.Count -lt 1){throw "At least one movie is required for V25 smoke test."}
$FirstMovie=$Movies | Select-Object -First 1
if(-not ($FirstMovie.PSObject.Properties.Name -contains 'genre')){throw "Movie API does not expose V25 genre metadata."}
Pass "Movie API exposes recommendation metadata; movies=$($Movies.Count)"

$TrendingResponse=Invoke-RestMethod -Method Get -Uri "$BaseUrl/recommendations/trending?limit=4"
$Trending=@($TrendingResponse | ForEach-Object { $_ })
if($Trending.Count -lt 1){throw "Trending recommendation list is empty."}
if($null -eq $Trending[0].movie -or [string]::IsNullOrWhiteSpace([string]$Trending[0].reason)){throw "Trending payload is missing movie/reason."}
Pass "Public trending recommendations work; items=$($Trending.Count)"

$MovieId=[string]$FirstMovie.id
$SimilarResponse=Invoke-RestMethod -Method Get -Uri "$BaseUrl/recommendations/similar/$([Uri]::EscapeDataString($MovieId))?limit=4"
$Similar=@($SimilarResponse | ForEach-Object { $_ })
if($Movies.Count -gt 1 -and $Similar.Count -lt 1){throw "Similar recommendations should return at least one item when multiple movies exist."}
if($Similar | Where-Object { [string]$_.movie.id -eq $MovieId }){throw "Similar endpoint returned the source movie itself."}
Pass "Similar-movie recommendation endpoint works; items=$($Similar.Count)"

if([string]::IsNullOrWhiteSpace($AdminPassword)){
  $Secure=Read-Host "Enter CURRENT password for $AdminEmail (hidden)" -AsSecureString
  $AdminPassword=SecureString-ToPlainText $Secure
}
$Login=Invoke-RestMethod -Method Post -Uri "$BaseUrl/auth/login" -ContentType "application/json" -Body (To-Json @{email=$AdminEmail;password=$AdminPassword}) -SessionVariable Web
$Headers=@{Authorization="Bearer $($Login.accessToken)"}
Pass "Admin login"

$Source="SMOKE_V25_$([Guid]::NewGuid().ToString('N'))"
try {
  $Home=Invoke-RestMethod -Method Get -Uri "$BaseUrl/recommendations/home?limit=4" -Headers $Headers -WebSession $Web
  if([string]$Home.algorithmVersion -notlike 'V25-*'){throw "Unexpected recommendation algorithm version '$($Home.algorithmVersion)'."}
  if($null -eq $Home.personalizedMovies -or $null -eq $Home.trendingMovies){throw "Home recommendation payload is incomplete."}
  if([string]::IsNullOrWhiteSpace([string]$Home.profileSummary)){throw "Home recommendation profile summary is missing."}
  Pass "Authenticated recommendation home payload works; personalized=$($Home.personalized)"

  Invoke-RestMethod -Method Post -Uri "$BaseUrl/recommendations/events" -Headers $Headers -WebSession $Web -ContentType "application/json" -Body (To-Json @{movieId=$MovieId;eventType='CLICK';source=$Source}) | Out-Null
  $EventCount=(docker compose exec -T postgres psql -U cinebooking -d cinebooking -Atc "SELECT count(*) FROM recommendation_event WHERE source='$Source';" | Out-String).Trim()
  if([int]$EventCount -ne 1){throw "Recommendation click event was not persisted exactly once."}
  Pass "Recommendation click tracking persists to PostgreSQL"

  $Flyway=(docker compose exec -T postgres psql -U cinebooking -d cinebooking -Atc "SELECT success FROM flyway_schema_history WHERE version='25' ORDER BY installed_rank DESC LIMIT 1;" | Out-String).Trim()
  if($Flyway -ne 't'){throw "Flyway V25 is not successful."}
  Pass "Flyway V25 applied successfully"

  $Columns=(docker compose exec -T postgres psql -U cinebooking -d cinebooking -Atc "SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='movie' AND column_name IN ('genre','movie_language','trailer_url');" | Out-String).Trim()
  if([int]$Columns -ne 3){throw "Expected 3 V25 movie metadata columns, found $Columns."}
  Pass "Movie genre/language/trailer schema is present"
}
finally {
  try { docker compose exec -T postgres psql -U cinebooking -d cinebooking -c "DELETE FROM recommendation_event WHERE source='$Source';" | Out-Null } catch {}
  try { Invoke-RestMethod -Method Post -Uri "$BaseUrl/auth/logout" -WebSession $Web | Out-Null } catch {}
  $AdminPassword=$null
}

Write-Host "ALL V25 RECOMMENDATION ENGINE SMOKE TESTS PASSED" -ForegroundColor Green
Write-Host "The temporary recommendation event is deleted at the end; booking/payment data is not modified." -ForegroundColor Yellow
