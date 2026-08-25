$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
Set-Location $root
Write-Host "=== CineBooking V52 VAPID key generator ===" -ForegroundColor Cyan
if (-not (Get-Command java -ErrorAction SilentlyContinue)) { throw "Java 17+ is required. Install a JDK or use the project JDK before generating VAPID keys." }
$out = & java (Join-Path $PSScriptRoot 'VapidKeyGenerator.java')
if ($LASTEXITCODE -ne 0) { throw "VAPID generation failed." }
Write-Host "Generated a new P-256 VAPID key pair. Keep the private key secret." -ForegroundColor Green
Write-Output $out
Write-Host "Add both values to .env, set WEB_PUSH_ENABLED=true, and restart/recreate the backend containers." -ForegroundColor Yellow
