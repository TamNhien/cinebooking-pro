param(
  [Parameter(Mandatory=$false)][string]$ShowtimeId = ""
)

Write-Host "=== CineBooking showtime diagnostics ==="
if ($ShowtimeId) {
  Write-Host "`n=== Requested showtime ==="
  docker compose exec -T postgres psql -U cinebooking -d cinebooking -c "SELECT s.id, m.title AS movie, c.name AS cinema, a.name AS auditorium, s.start_time, s.base_price FROM showtime s JOIN movie m ON m.id=s.movie_id JOIN auditorium a ON a.id=s.auditorium_id JOIN cinema c ON c.id=a.cinema_id WHERE s.id='$ShowtimeId';"
}

Write-Host "`n=== Available/upcoming showtimes ==="
docker compose exec -T postgres psql -U cinebooking -d cinebooking -c "SELECT s.id, m.title AS movie, c.name AS cinema, a.name AS auditorium, s.start_time FROM showtime s JOIN movie m ON m.id=s.movie_id JOIN auditorium a ON a.id=s.auditorium_id JOIN cinema c ON c.id=a.cinema_id ORDER BY s.start_time DESC LIMIT 30;"

Write-Host "`nIf the requested ID returns 0 rows, the old /booking/<id> URL is stale. Open /cinemas or /movies and choose an existing showtime."
