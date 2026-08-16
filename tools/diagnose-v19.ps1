param()
$ErrorActionPreference = "Stop"
Write-Host "=== CineBooking V19 concession inventory diagnostics ==="

Write-Host "`n=== Docker services ==="
docker compose ps -a

Write-Host "`n=== Flyway V19 ==="
docker compose exec postgres psql -U cinebooking -d cinebooking -c "SELECT version,description,success FROM flyway_schema_history WHERE version='19';"

Write-Host "`n=== Inventory columns ==="
docker compose exec postgres psql -U cinebooking -d cinebooking -c "SELECT column_name,data_type,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='concession_product' AND column_name IN ('inventory_enabled','stock_on_hand','stock_reserved','low_stock_threshold') ORDER BY column_name;"

Write-Host "`n=== Inventory products ==="
docker compose exec postgres psql -U cinebooking -d cinebooking -c "SELECT name,active,inventory_enabled,stock_on_hand,stock_reserved,(stock_on_hand-stock_reserved) AS available,low_stock_threshold FROM concession_product ORDER BY sort_order,name;"

Write-Host "`n=== Broken stock invariants (expected 0 rows) ==="
docker compose exec postgres psql -U cinebooking -d cinebooking -c "SELECT id,name,stock_on_hand,stock_reserved FROM concession_product WHERE stock_on_hand < 0 OR stock_reserved < 0 OR stock_reserved > stock_on_hand;"

Write-Host "`n=== Low / sold-out products ==="
docker compose exec postgres psql -U cinebooking -d cinebooking -c "SELECT name,(stock_on_hand-stock_reserved) AS available,low_stock_threshold FROM concession_product WHERE inventory_enabled=TRUE AND (stock_on_hand-stock_reserved) <= low_stock_threshold ORDER BY available,name;"

Write-Host "`n=== Recent inventory movements ==="
docker compose exec postgres psql -U cinebooking -d cinebooking -c "SELECT movement_type,quantity_delta,reserved_delta,stock_after,reserved_after,booking_id,actor_email,created_at FROM inventory_movement ORDER BY created_at DESC LIMIT 20;"

Write-Host "`nExpected: V19 success=t, broken stock invariants returns 0 rows."
Write-Host "Admin UI: http://localhost/admin/inventory"
