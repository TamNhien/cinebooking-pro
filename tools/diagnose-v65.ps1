$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

Write-Host "=== CineBooking V65 Observability & Reliability diagnostics ===" -ForegroundColor Cyan
python .\tools\verify_v60_payment_production_4.py
python .\tools\verify_v61_fraud_risk_intelligence.py
python .\tools\verify_v62_dynamic_pricing_4.py
python .\tools\verify_v63_recommendation_4.py
python .\tools\verify_v64_crm_marketing_automation.py
python .\tools\verify_v65_observability_reliability.py
python .\tools\verify_realistic_data_57.py
python .\tools\verify_seed_demo_57.py

Write-Host "V65 diagnostic gates PASS" -ForegroundColor Green
