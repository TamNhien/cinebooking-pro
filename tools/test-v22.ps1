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
    catch { if($i -eq $MaxAttempts){throw}; if($i -eq 1){Warn "API not ready; waiting..."}; Start-Sleep -Seconds 2 }
  }
}
function PrefBody($P,[bool]$InApp,[bool]$Email,[bool]$Browser) {
  return To-Json @{
    inAppEnabled=$InApp; emailEnabled=$Email; browserEnabled=$Browser;
    bookingEnabled=[bool]$P.bookingEnabled; reminderEnabled=[bool]$P.reminderEnabled;
    refundEnabled=[bool]$P.refundEnabled; staffShiftEnabled=[bool]$P.staffShiftEnabled;
    promotionEnabled=[bool]$P.promotionEnabled
  }
}

Write-Host "CineBooking V22 Notification Center smoke test" -ForegroundColor Cyan
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
$Login=Invoke-RestMethod -Method Post -Uri "$BaseUrl/auth/login" -ContentType "application/json" -Body (To-Json @{email=$AdminEmail;password=$AdminPassword}) -SessionVariable Web
$H=Headers $Login.accessToken
Pass "Admin login"

$Original=$null; $TestId=$null
try {
  $Original=Invoke-RestMethod -Method Get -Uri "$BaseUrl/notifications/preferences" -Headers $H -WebSession $Web
  if($null -eq $Original.inAppEnabled -or $null -eq $Original.bookingEnabled){throw "Preference payload is incomplete."}
  Pass "Notification preferences endpoint reachable"

  $Forced=Invoke-RestMethod -Method Put -Uri "$BaseUrl/notifications/preferences" -Headers $H -WebSession $Web -ContentType "application/json" -Body (PrefBody $Original $true $false $false)
  if(-not $Forced.inAppEnabled -or $Forced.emailEnabled -or $Forced.browserEnabled){throw "Preference update did not persist forced test channels."}
  Pass "Preference update persists channel settings"

  $Test=Invoke-RestMethod -Method Post -Uri "$BaseUrl/notifications/test" -Headers $H -WebSession $Web
  $TestId=[string]$Test.id
  if(-not $TestId -or $Test.category -ne 'GENERAL' -or $Test.emailStatus -ne 'SKIPPED'){throw "Test notification payload is invalid."}
  Pass "Test notification created in-app without sending email"

  $Items=@(Invoke-RestMethod -Method Get -Uri "$BaseUrl/notifications" -Headers $H -WebSession $Web | ForEach-Object { $_ })
  if(@($Items | Where-Object { $_.id -eq $TestId }).Count -ne 1){throw "Created notification is missing from in-app list."}
  Pass "In-app notification list contains the test message"

  $Since=[Uri]::EscapeDataString(([DateTimeOffset]::Parse($Test.createdAt).AddSeconds(-2).ToString('o')))
  $FeedOff=@(Invoke-RestMethod -Method Get -Uri "$BaseUrl/notifications/browser-feed?after=$Since" -Headers $H -WebSession $Web | ForEach-Object { $_ })
  if($FeedOff.Count -ne 0){throw "Browser feed must be empty while browser channel is disabled."}
  Pass "Browser feed respects disabled channel"

  $BrowserOn=Invoke-RestMethod -Method Put -Uri "$BaseUrl/notifications/preferences" -Headers $H -WebSession $Web -ContentType "application/json" -Body (PrefBody $Original $true $false $true)
  if(-not $BrowserOn.browserEnabled){throw "Could not enable browser notification preference."}
  $FeedOn=@(Invoke-RestMethod -Method Get -Uri "$BaseUrl/notifications/browser-feed?after=$Since" -Headers $H -WebSession $Web | ForEach-Object { $_ })
  if(@($FeedOn | Where-Object { $_.id -eq $TestId }).Count -ne 1){throw "Browser feed did not expose the recent test notification after enabling the channel."}
  Pass "Browser feed exposes recent notification when enabled"

  Invoke-RestMethod -Method Post -Uri "$BaseUrl/notifications/$TestId/read" -Headers $H -WebSession $Web | Out-Null
  $Items2=@(Invoke-RestMethod -Method Get -Uri "$BaseUrl/notifications" -Headers $H -WebSession $Web | ForEach-Object { $_ })
  if(@($Items2 | Where-Object { $_.id -eq $TestId -and $_.read -eq $true }).Count -ne 1){throw "Read state did not persist."}
  Pass "Read state persists"

  Invoke-RestMethod -Method Delete -Uri "$BaseUrl/notifications/$TestId" -Headers $H -WebSession $Web | Out-Null
  $TestId=$null
  Pass "Temporary test notification deleted"
}
finally {
  if($TestId){try{Invoke-RestMethod -Method Delete -Uri "$BaseUrl/notifications/$TestId" -Headers $H -WebSession $Web | Out-Null}catch{}}
  if($Original){
    try {
      $Restore=To-Json @{
        inAppEnabled=[bool]$Original.inAppEnabled;emailEnabled=[bool]$Original.emailEnabled;browserEnabled=[bool]$Original.browserEnabled;
        bookingEnabled=[bool]$Original.bookingEnabled;reminderEnabled=[bool]$Original.reminderEnabled;refundEnabled=[bool]$Original.refundEnabled;
        staffShiftEnabled=[bool]$Original.staffShiftEnabled;promotionEnabled=[bool]$Original.promotionEnabled
      }
      Invoke-RestMethod -Method Put -Uri "$BaseUrl/notifications/preferences" -Headers $H -WebSession $Web -ContentType "application/json" -Body $Restore | Out-Null
    } catch { Warn "Could not restore original notification preferences: $($_.Exception.Message)" }
  }
  try{Invoke-RestMethod -Method Post -Uri "$BaseUrl/auth/logout" -WebSession $Web | Out-Null}catch{}
  $AdminPassword=$null
}

Pass "Original notification preferences restored"
Write-Host "ALL V22 NOTIFICATION CENTER SMOKE TESTS PASSED" -ForegroundColor Green
Write-Host "The smoke test sends no email, deletes its temporary notification, restores preferences, and logs out the temporary session." -ForegroundColor Yellow
