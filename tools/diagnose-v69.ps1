$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
Write-Host '=== CineBooking V69 Backup & Disaster Recovery 5.0 ===' -ForegroundColor Cyan
python -X utf8 .\tools\verify_v66_booking_consistency_seat_locking.py
python -X utf8 .\tools\verify_v67_payment_resilience_reconciliation.py
python -X utf8 .\tools\verify_v68_security_identity_5.py
python -X utf8 .\tools\verify_v69_backup_disaster_recovery_5.py
python -X utf8 .\tools\verify_realistic_data_57.py
python -X utf8 .\tools\verify_seed_demo_57.py
Write-Host 'Expected runtime: Flyway V69, at least 61 public tables, dr_backup_record + dr_restore_drill present.' -ForegroundColor Green
Write-Host 'Backup: powershell -ExecutionPolicy Bypass -File .\tools\backup-dr-v69.ps1' -ForegroundColor Green
Write-Host 'Restore drill: powershell -ExecutionPolicy Bypass -File .\tools\dr-restore-drill-v69.ps1 -BackupFile .\backups\cinebooking-v69-YYYYMMDD-HHMMSS.dump' -ForegroundColor Green
Write-Host 'Stable-only release: .\scripts\release.ps1 v69.0.0' -ForegroundColor Green
