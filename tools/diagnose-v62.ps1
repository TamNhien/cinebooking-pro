$ErrorActionPreference = "Stop"
Write-Host "=== CineBooking V62 Dynamic Pricing 4.0 diagnose ===" -ForegroundColor Cyan
python .\tools\verify_v60_payment_production_4.py
python .\tools\verify_v61_fraud_risk_intelligence.py
python .\tools\verify_v62_dynamic_pricing_4.py
python .\tools\verify_realistic_data_57.py
python .\tools\verify_seed_demo_57.py
Write-Host "PASS: V62 source gates" -ForegroundColor Green
Write-Host "DB contract remains Flyway V52 / 57 public tables; no V62 migration is expected." -ForegroundColor Yellow
