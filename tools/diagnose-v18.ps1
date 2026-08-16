param(
  [string]$ShowtimeId = ""
)

$ErrorActionPreference = "Stop"
Write-Host "=== CineBooking V18 dynamic pricing diagnostics ==="

Write-Host "`n=== Docker services ==="
docker compose ps -a

Write-Host "`n=== Flyway V18 ==="
docker compose exec postgres psql -U cinebooking -d cinebooking -c "SELECT version,description,success FROM flyway_schema_history WHERE version='18';"

Write-Host "`n=== pricing_rule table ==="
docker compose exec postgres psql -U cinebooking -d cinebooking -c "SELECT column_name,data_type,is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='pricing_rule' ORDER BY ordinal_position;"

Write-Host "`n=== Pricing rules ==="
docker compose exec postgres psql -U cinebooking -d cinebooking -c "SELECT name,adjustment_type,adjustment_value,days_of_week,start_time,end_time,priority,active FROM pricing_rule ORDER BY priority DESC,created_at;"

Write-Host "`n=== Pricing timezone in backend ==="
docker compose exec backend-1 sh -lc 'printenv PRICING_TIME_ZONE || true'

if (-not [string]::IsNullOrWhiteSpace($ShowtimeId)) {
  Write-Host "`n=== Requested showtime ==="
  docker compose exec postgres psql -U cinebooking -d cinebooking -c "SELECT st.id,m.title,c.name AS cinema,a.name AS auditorium,st.start_time,st.base_price,st.status FROM showtime st JOIN movie m ON m.id=st.movie_id JOIN auditorium a ON a.id=st.auditorium_id JOIN cinema c ON c.id=a.cinema_id WHERE st.id='$ShowtimeId';"
}

Write-Host "`nExpected: V18 success=t, pricing_rule exists, and PRICING_TIME_ZONE is Asia/Ho_Chi_Minh (or your configured cinema timezone)."
Write-Host "Admin UI: http://localhost/admin/pricing"
