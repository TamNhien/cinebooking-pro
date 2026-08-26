$ErrorActionPreference = 'Stop'
Write-Host '=== CineBooking V59 Realtime Operations 4.0 source diagnostics ===' -ForegroundColor Cyan

$checks = @(
  '.\tools\verify_v43_staff_operations.py',
  '.\tools\verify_v44_maintenance_reliability.py',
  '.\tools\verify_v45_customer_support.py',
  '.\tools\verify_v48_concession_inventory_2.py',
  '.\tools\verify_v49_smart_showtime_planning_2.py',
  '.\tools\verify_v53_operations_command_center.py',
  '.\tools\verify_v57_booking_seat_intelligence.py',
  '.\tools\verify_v58_operations_control_center.py',
  '.\tools\verify_v59_realtime_operations_4.py',
  '.\tools\verify_seed_demo_57.py',
  '.\tools\verify_realistic_data_57.py'
)
foreach($check in $checks){
  Write-Host "`n>>> python $check" -ForegroundColor DarkCyan
  python $check
  if($LASTEXITCODE -ne 0){throw "V59 diagnostic failed: $check"}
}
Write-Host "`nV59 source diagnostics passed." -ForegroundColor Green
