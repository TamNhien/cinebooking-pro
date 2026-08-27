$ErrorActionPreference = 'Stop'

Write-Host '=== CineBooking V60 source diagnostics ===' -ForegroundColor Cyan

python .\tools\verify_v47_payment_gateway_operations.py
if ($LASTEXITCODE -ne 0) { throw 'V47 payment gate failed' }

python .\tools\verify_v58_operations_control_center.py
if ($LASTEXITCODE -ne 0) { throw 'V58 operations gate failed' }

python .\tools\verify_v59_realtime_operations_4.py
if ($LASTEXITCODE -ne 0) { throw 'V59 realtime operations gate failed' }

python .\tools\verify_v60_payment_production_4.py
if ($LASTEXITCODE -ne 0) { throw 'V60 payment production gate failed' }

python .\tools\verify_realistic_data_57.py
if ($LASTEXITCODE -ne 0) { throw '57-table realistic data gate failed' }

python .\tools\verify_seed_demo_57.py
if ($LASTEXITCODE -ne 0) { throw '57-table seed source gate failed' }

Write-Host 'V60 source diagnostics passed.' -ForegroundColor Green
