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
function Wait-Api([string]$Uri, [int]$MaxAttempts = 30) {
  for($i=1;$i -le $MaxAttempts;$i++){
    try { return Invoke-RestMethod -Method Get -Uri $Uri -TimeoutSec 5 }
    catch { if($i -eq $MaxAttempts){throw}; if($i -eq 1){Warn "API not ready; waiting..."}; Start-Sleep -Seconds 2 }
  }
}
function Expect-Unauthorized([scriptblock]$Call,[string]$Label){
  try { & $Call | Out-Null; throw "$Label unexpectedly succeeded." }
  catch {
    $Code=Get-StatusCode $_
    if($Code -eq 401){Pass "$Label rejected with 401 after revocation"; return}
    if($_.Exception.Message -like "*unexpectedly succeeded*"){throw}
    throw "$Label expected HTTP 401 but got '$Code': $($_.Exception.Message)"
  }
}

Write-Host "CineBooking V21 Security & Session smoke test" -ForegroundColor Cyan
$EnvFile=Read-DotEnv (Join-Path (Get-Location) '.env')
if([string]::IsNullOrWhiteSpace($AdminEmail)){
  if($EnvFile.ContainsKey('ADMIN_EMAIL') -and $EnvFile['ADMIN_EMAIL']){$AdminEmail=$EnvFile['ADMIN_EMAIL']}else{$AdminEmail='admin@cine.local'}
}
Wait-Api "$BaseUrl/movies" | Out-Null
Pass "Public API reachable"

if([string]::IsNullOrWhiteSpace($AdminPassword)){
  $Secure=Read-Host "Enter CURRENT password for $AdminEmail (hidden)" -AsSecureString
  $AdminPassword=SecureString-ToPlainText $Secure
}
$Body=To-Json @{email=$AdminEmail;password=$AdminPassword}

$A=Invoke-RestMethod -Method Post -Uri "$BaseUrl/auth/login" -ContentType "application/json" -Body $Body -SessionVariable WebA
if(-not $A.sessionId -or -not $A.accessExpiresAt){throw "Login response missing V21 session fields."}
$HA=Headers $A.accessToken
$CookieUri=[Uri]("$BaseUrl/auth/refresh")
$RefreshCookie=@($WebA.Cookies.GetCookies($CookieUri) | Where-Object { $_.Name -eq 'cinebooking_refresh' } | Select-Object -First 1)
if($RefreshCookie.Count -ne 1 -or -not $RefreshCookie[0].HttpOnly){throw "Refresh cookie missing or not HttpOnly."}
Pass "Login A created session $($A.sessionId) with HttpOnly refresh cookie"

$B=Invoke-RestMethod -Method Post -Uri "$BaseUrl/auth/login" -ContentType "application/json" -Body $Body -SessionVariable WebB
if($A.sessionId -eq $B.sessionId){throw "Two logins must create distinct sessions."}
Pass "Login B created a second device session"

$SessionsA=@(Invoke-RestMethod -Method Get -Uri "$BaseUrl/me/security/sessions" -Headers $HA -WebSession $WebA | ForEach-Object { $_ })
$CurrentA=@($SessionsA | Where-Object { $_.id -eq $A.sessionId -and $_.current -eq $true -and $_.active -eq $true })
$ActiveB=@($SessionsA | Where-Object { $_.id -eq $B.sessionId -and $_.active -eq $true })
if($CurrentA.Count -ne 1 -or $ActiveB.Count -ne 1){throw "Session listing did not contain both active test sessions/current marker."}
Pass "Session management lists current and other device sessions"

$AdminSessions=@(Invoke-RestMethod -Method Get -Uri "$BaseUrl/admin/security/users/$($A.userId)/sessions" -Headers $HA -WebSession $WebA | ForEach-Object { $_ })
if(@($AdminSessions | Where-Object {$_.id -eq $A.sessionId}).Count -ne 1){throw "Admin security session endpoint did not return the target user session."}
Pass "Admin can inspect a user's session list"

$OldBToken=$B.accessToken
$B2=Invoke-RestMethod -Method Post -Uri "$BaseUrl/auth/refresh" -WebSession $WebB
if($B2.sessionId -ne $B.sessionId){throw "Refresh must preserve sessionId."}
if($B2.accessToken -eq $OldBToken){throw "Refresh did not rotate access token."}
Pass "Refresh token cookie rotated and issued a new access token"

Invoke-RestMethod -Method Delete -Uri "$BaseUrl/me/security/sessions/$($B.sessionId)" -Headers $HA -WebSession $WebA | Out-Null
Pass "Session A revoked Session B"
try { Invoke-RestMethod -Method Post -Uri "$BaseUrl/auth/refresh" -WebSession $WebB | Out-Null; throw "Revoked refresh token unexpectedly succeeded." }
catch { if((Get-StatusCode $_)-ne 401 -and $_.Exception.Message -notlike "*unexpectedly succeeded*"){throw}; if($_.Exception.Message -like "*unexpectedly succeeded*"){throw} }
Pass "Revoked refresh token is rejected"
$HB2=Headers $B2.accessToken
Expect-Unauthorized { Invoke-RestMethod -Method Get -Uri "$BaseUrl/me" -Headers $HB2 -WebSession $WebB } "Revoked session B"

$Events=@(Invoke-RestMethod -Method Get -Uri "$BaseUrl/me/security/events" -Headers $HA -WebSession $WebA | ForEach-Object { $_ })
if(@($Events | Where-Object {$_.action -eq 'LOGIN_SUCCESS'}).Count -lt 1){throw "Login event history missing LOGIN_SUCCESS."}
Pass "Recent login security events are available"

Invoke-RestMethod -Method Post -Uri "$BaseUrl/auth/logout" -WebSession $WebA | Out-Null
Pass "Logout revoked Session A using HttpOnly refresh cookie"
Expect-Unauthorized { Invoke-RestMethod -Method Get -Uri "$BaseUrl/me" -Headers $HA -WebSession $WebA } "Logged-out session A"

Write-Host "ALL V21 SECURITY & SESSION SMOKE TESTS PASSED" -ForegroundColor Green
Write-Host "Test created two temporary auth sessions and revoked both; no booking/payment/inventory data was changed." -ForegroundColor Yellow
$AdminPassword=$null
