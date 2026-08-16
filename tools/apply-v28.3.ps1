$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host "=== CineBooking V28.3 CI runtime hotfix apply ==="

$dynamicManifest = Join-Path (Get-Location) "frontend\app\manifest.ts"
$staticManifest = Join-Path (Get-Location) "frontend\public\manifest.webmanifest"

if (-not (Test-Path $staticManifest)) {
    throw "Static manifest is missing: $staticManifest"
}

if (Test-Path $dynamicManifest) {
    Remove-Item $dynamicManifest -Force
    Write-Host "REMOVED stale dynamic manifest route: frontend\app\manifest.ts"
} else {
    Write-Host "PASS: stale dynamic manifest route already absent"
}

$pom = Get-Content ".\backend\pom.xml" -Raw
if ($pom -notmatch "spring-boot-starter-webmvc-test") {
    throw "backend/pom.xml does not contain spring-boot-starter-webmvc-test. Re-extract the V28.3 patch with overwrite enabled."
}
Write-Host "PASS: Spring Boot Web MVC test starter present"

python .\tools\verify_v28_3_ci_runtime_fix.py
if ($LASTEXITCODE -ne 0) { throw "V28.3 runtime-fix verifier failed" }

Write-Host ""
Write-Host "V28.3 HOTFIX APPLIED"
Write-Host "Next: git add -A; git commit; git push"
