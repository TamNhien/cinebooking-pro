$ErrorActionPreference = "Stop"
Write-Host "=== CineBooking V25 Recommendation Engine diagnostics ===" -ForegroundColor Cyan

Write-Host "`n=== Docker services ===" -ForegroundColor Cyan
docker compose ps -a

Write-Host "`n=== Flyway V25 ===" -ForegroundColor Cyan
docker compose exec -T postgres psql -U cinebooking -d cinebooking -c "SELECT version,description,success FROM flyway_schema_history WHERE version='25' ORDER BY installed_rank;"

Write-Host "`n=== Movie recommendation metadata columns ===" -ForegroundColor Cyan
docker compose exec -T postgres psql -U cinebooking -d cinebooking -c "SELECT column_name,data_type,is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='movie' AND column_name IN ('genre','movie_language','trailer_url') ORDER BY column_name;"

Write-Host "`n=== Recommendation event table/indexes ===" -ForegroundColor Cyan
docker compose exec -T postgres psql -U cinebooking -d cinebooking -c "SELECT indexname FROM pg_indexes WHERE schemaname='public' AND tablename='recommendation_event' ORDER BY indexname;"

Write-Host "`n=== Movies and metadata ===" -ForegroundColor Cyan
docker compose exec -T postgres psql -U cinebooking -d cinebooking -c "SELECT title,genre,movie_language,active FROM movie ORDER BY created_at DESC;"

Write-Host "`n=== Recommendation signal counts ===" -ForegroundColor Cyan
docker compose exec -T postgres psql -U cinebooking -d cinebooking -c "SELECT (SELECT count(*) FROM movie_favorite) favorites,(SELECT count(*) FROM movie_review) reviews,(SELECT count(*) FROM booking WHERE status='CONFIRMED') confirmed_bookings,(SELECT count(*) FROM recommendation_event) recommendation_events;"

Write-Host "`n=== Invalid recommendation events (expected 0 rows) ===" -ForegroundColor Cyan
docker compose exec -T postgres psql -U cinebooking -d cinebooking -c "SELECT id,user_id,movie_id,event_type,source FROM recommendation_event WHERE event_type NOT IN ('CLICK','VIEW') OR user_id IS NULL OR movie_id IS NULL;"

Write-Host "`nExpected: V25 success=t, 3 movie metadata columns, recommendation_event indexes present, invalid events=0 rows." -ForegroundColor Yellow
Write-Host "Public endpoint: http://localhost/api/recommendations/trending" -ForegroundColor Yellow
