$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
Set-Location $root
python .\tools\verify_v46_security_account_protection.py
if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}
python .\tools\verify_v47_payment_gateway_operations.py
if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}
python .\tools\verify_v48_concession_inventory_2.py
if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}
python .\tools\verify_seed_demo_52.py
if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}
Write-Host 'V48 source diagnostics passed.' -ForegroundColor Green
