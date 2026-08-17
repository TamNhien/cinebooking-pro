$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host "=== CineBooking V28.8 CI/Testcontainers diagnostics ==="

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
Write-Host "=== V28.7 frontend lint baseline ==="
python .\tools\verify_v28_7_lint_baseline.py
if($LASTEXITCODE -ne 0){ throw "V28.7 lint-baseline verifier failed" }

Write-Host ""
Write-Host "=== V28.8 Testcontainers upload-storage isolation ==="
python .\tools\verify_v28_8_test_storage.py
if($LASTEXITCODE -ne 0){ throw "V28.8 test-storage verifier failed" }

Write-Host ""
Write-Host "=== Docker Compose validation ==="
docker compose config --quiet
if($LASTEXITCODE -ne 0){ throw "docker compose config failed" }
Write-Host "PASS: docker compose config"

Write-Host ""
Write-Host "V28.8 DIAGNOSTICS PASSED"
Write-Host "Frontend legacy lint debt remains visible as warnings; new non-baselined lint errors still fail CI."
Write-Host "Next: git add -A, commit/push V28.8, then watch the 'CineBooking CI' workflow."
