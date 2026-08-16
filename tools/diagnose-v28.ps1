$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host "=== CineBooking V28.6 CI/Testcontainers diagnostics ==="

python .\tools\verify_v28_ci.py
if($LASTEXITCODE -ne 0){ throw "V28 source verifier failed" }

Write-Host ""
Write-Host "=== V28.3 CI runtime hotfix ==="
python .\tools\verify_v28_3_ci_runtime_fix.py
if($LASTEXITCODE -ne 0){ throw "V28.3 runtime-fix verifier failed" }

Write-Host ""
Write-Host "=== V28.6 V27 Git/local-artifact compatibility ==="
python .\tools\verify_v27_data_safety.py
if($LASTEXITCODE -ne 0){ throw "V28.6 V27 data-safety regression verifier failed" }

Write-Host ""
Write-Host "=== Docker Compose validation ==="
docker compose config --quiet
if($LASTEXITCODE -ne 0){ throw "docker compose config failed" }
Write-Host "PASS: docker compose config"

Write-Host ""
Write-Host "V28.6 DIAGNOSTICS PASSED"
Write-Host "Local .env and backups/*.dump are allowed; they must remain untracked by Git."
Write-Host "Next: git add -A, commit/push V28.6, then watch the 'CineBooking CI' workflow."
