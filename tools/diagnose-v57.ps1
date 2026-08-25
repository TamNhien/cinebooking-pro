$ErrorActionPreference = 'Stop'
Write-Host '=== CineBooking V57 Booking & Seat Intelligence source diagnostics ===' -ForegroundColor Cyan

$checks = @(
  '.\tools\verify_v39_seat_map_ux.py',
  '.\tools\verify_v46_security_account_protection.py',
  '.\tools\verify_v52_pwa_mobile_3.py',
  '.\tools\verify_v56_customer_value_rfm.py',
  '.\tools\verify_v57_booking_seat_intelligence.py',
  '.\tools\verify_seed_demo_57.py'
)
foreach($check in $checks){
  Write-Host "`n>>> python $check" -ForegroundColor DarkCyan
  python $check
  if($LASTEXITCODE -ne 0){throw "V57 diagnostic failed: $check"}
}
Write-Host "`nV57 source diagnostics passed." -ForegroundColor Green
