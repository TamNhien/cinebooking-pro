param(
  [string]$EnvPath = ".env",
  [string]$IpAddress = ""
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($IpAddress)) {
  $Candidates = Get-NetIPConfiguration | Where-Object {
    $_.IPv4DefaultGateway -and $_.IPv4Address -and $_.NetAdapter.Status -eq 'Up'
  }
  $IpAddress = [string](($Candidates | ForEach-Object { $_.IPv4Address.IPAddress } | Select-Object -First 1))
}

if ([string]::IsNullOrWhiteSpace($IpAddress)) {
  throw "Could not detect a LAN IPv4 address. Re-run with -IpAddress 192.168.x.x"
}

$Url = "http://$IpAddress"
$Lines = @()
if (Test-Path $EnvPath) { $Lines = @(Get-Content $EnvPath) }
$Found = $false
for ($i = 0; $i -lt $Lines.Count; $i++) {
  if ($Lines[$i] -match '^\s*TICKET_PUBLIC_BASE_URL\s*=') {
    $Lines[$i] = "TICKET_PUBLIC_BASE_URL=$Url"
    $Found = $true
  }
}
if (-not $Found) {
  $Lines += ""
  $Lines += "TICKET_PUBLIC_BASE_URL=$Url"
}
Set-Content -Path $EnvPath -Value $Lines -Encoding UTF8

Write-Host "PASS: TICKET_PUBLIC_BASE_URL=$Url" -ForegroundColor Green
Write-Host "Phone URL: $Url" -ForegroundColor Cyan
Write-Host "Recreate backend so the new environment value is loaded:" -ForegroundColor Yellow
Write-Host "docker compose up -d --force-recreate backend-1 backend-2" -ForegroundColor White
Write-Host "Then open $Url on the phone. Windows Firewall must allow inbound TCP port 80." -ForegroundColor Yellow
