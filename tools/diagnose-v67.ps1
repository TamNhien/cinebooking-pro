$ErrorActionPreference = "Stop"
Set-Location (Resolve-Path (Join-Path $PSScriptRoot ".."))

Write-Host "=== CineBooking V67 Payment Resilience & Reconciliation diagnostics ===" -ForegroundColor Cyan
python .\tools\verify_v60_payment_production_4.py
python .\tools\verify_v61_fraud_risk_intelligence.py
python .\tools\verify_v62_dynamic_pricing_4.py
python .\tools\verify_v63_recommendation_4.py
python .\tools\verify_v64_crm_marketing_automation.py
python .\tools\verify_v65_observability_reliability.py
python .\tools\verify_v65_local_https.py
python .\tools\verify_v66_booking_consistency_seat_locking.py
python .\tools\verify_v67_payment_resilience_reconciliation.py
python .\tools\verify_realistic_data_57.py
python .\tools\verify_seed_demo_57.py
Write-Host "V67 diagnostic gates PASS" -ForegroundColor Green
Write-Host "DB contract: Flyway V67 / 58 public tables (V67 changes payment/payment_webhook_event only; no new table)." -ForegroundColor Yellow
