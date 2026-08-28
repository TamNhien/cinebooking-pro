$ErrorActionPreference = "Stop"
Write-Host "=== CineBooking V63 Recommendation 4.0 diagnose ===" -ForegroundColor Cyan

python .\tools\verify_v50_recommendation_intelligence_2.py
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
python .\tools\verify_v60_payment_production_4.py
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
python .\tools\verify_v61_fraud_risk_intelligence.py
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
python .\tools\verify_v62_dynamic_pricing_4.py
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
python .\tools\verify_v63_recommendation_4.py
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
python .\tools\verify_realistic_data_57.py
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
python .\tools\verify_seed_demo_57.py
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "PASS: V63 source gates + 57-table real-data policy" -ForegroundColor Green
Write-Host "DB contract remains Flyway V52 / 57 public tables; V63 adds no migration or synthetic movie/taste data." -ForegroundColor Yellow
