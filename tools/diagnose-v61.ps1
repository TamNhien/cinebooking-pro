$ErrorActionPreference = "Stop"
Write-Host "=== CineBooking V61 Fraud & Risk Intelligence diagnostics ==="
python .\tools\verify_v60_payment_production_4.py
python .\tools\verify_v61_fraud_risk_intelligence.py
python .\tools\verify_realistic_data_57.py
python .\tools\verify_seed_demo_57.py
Write-Host "=== Docker compose config ==="
docker compose config --quiet
Write-Host "V61 diagnostics completed. Browser E2E remains a GitHub Actions gate."
