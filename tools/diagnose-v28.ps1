$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $Root

Write-Host "=== CineBooking V28.1 CI/Testcontainers diagnostics ==="

$required = @(
  ".github\workflows\ci.yml",
  ".github\dependabot.yml",
  "backend\pom.xml",
  "backend\src\test\java\com\cinebooking\integration\CineBookingIntegrationIT.java",
  "tools\verify_v28_ci.py",
  "docs\V28_CI_CD_TESTCONTAINERS.md"
)
foreach($file in $required){
  if(-not (Test-Path $file)){ throw "Missing V28 file: $file" }
  Write-Host "PASS: $file"
}

if(-not (Get-Command python -ErrorAction SilentlyContinue) -and -not (Get-Command python3 -ErrorAction SilentlyContinue)){
  throw "Python 3 is required to run the V28 structural verifier"
}
$python = if(Get-Command python -ErrorAction SilentlyContinue){ "python" } else { "python3" }
& $python ".\tools\verify_v28_ci.py"
if($LASTEXITCODE -ne 0){ throw "V28.1 source verifier failed" }

if(Get-Command docker -ErrorAction SilentlyContinue){
  Write-Host "`n=== Docker Compose validation ==="
  $old = $env:JWT_SECRET
  if([string]::IsNullOrWhiteSpace($env:JWT_SECRET)){
    $env:JWT_SECRET = "v28-local-diagnostic-secret-0123456789-ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  }
  try {
    docker compose config --quiet
    if($LASTEXITCODE -ne 0){ throw "docker compose config failed" }
    Write-Host "PASS: docker compose config"
  } finally {
    if($null -eq $old){ Remove-Item Env:JWT_SECRET -ErrorAction SilentlyContinue } else { $env:JWT_SECRET = $old }
  }
} else {
  Write-Host "WARN: Docker CLI not found; Compose validation skipped"
}

Write-Host "`nV28.1 DIAGNOSTICS PASSED"
Write-Host "Local .env and backups/*.dump are allowed; they must remain untracked by Git."
Write-Host "Next: git status --ignored, then commit/push V28 files and watch the 'CineBooking CI' workflow."
