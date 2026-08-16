# Seat map fix

This build fixes the booking page when a showtime points to an auditorium that has no seats.

## Changes

- Added Flyway `V5__backfill_default_seats.sql`.
  - Every auditorium with zero seats receives 80 seats automatically.
  - Rows A-D: STANDARD.
  - Rows E-G: VIP (+20,000 VND).
  - Row H: COUPLE (+50,000 VND).
- New auditoriums automatically receive the same 80-seat layout.
- Admin can manually generate the default layout for an empty auditorium with `POST /api/admin/auditoriums/{id}/generate-seats`.
- Admin Room screen shows seat count and a `Tạo sơ đồ 80 ghế` action when a room has no seats.
- Booking page now displays a clear empty-seat message instead of a blank area.
- Booking seat map was improved with STANDARD / VIP / COUPLE / selected / booked visual states.
- VN/EN switch remains enabled in the header and the booking page supports both languages.

## Upgrade existing local database

Do NOT delete your database volume.

```powershell
docker compose up -d --build --force-recreate backend-1 backend-2 frontend nginx
```

Flyway will automatically apply migration V5 to the existing database.

Verify:

```powershell
docker compose exec postgres psql -U cinebooking -d cinebooking -c "SELECT version,description,success FROM flyway_schema_history ORDER BY installed_rank;"
```

You should see version 5.

Check seats per room:

```powershell
docker compose exec postgres psql -U cinebooking -d cinebooking -c "SELECT a.name, COUNT(s.id) AS seats FROM auditorium a LEFT JOIN seat s ON s.auditorium_id=a.id GROUP BY a.id,a.name ORDER BY a.name;"
```
