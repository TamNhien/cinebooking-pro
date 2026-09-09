$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
Write-Host '=== CineBooking V68 Security & Identity 5.0 ===' -ForegroundColor Cyan
python -X utf8 .\tools\verify_v66_booking_consistency_seat_locking.py
python -X utf8 .\tools\verify_v67_payment_resilience_reconciliation.py
python -X utf8 .\tools\verify_v68_security_identity_5.py
python -X utf8 .\tools\verify_realistic_data_57.py
python -X utf8 .\tools\verify_seed_demo_57.py
Write-Host 'Expected runtime: Flyway V68, at least 59 public tables, admin_step_up_grant present.' -ForegroundColor Green
Write-Host 'Stable-only release: .\scripts\release.ps1 v68.0.0' -ForegroundColor Green
