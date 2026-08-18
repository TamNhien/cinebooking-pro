# CineBooking Pro V32 - Sold-out Waitlist & Seat Availability Alerts

## What changed

V32 adds a real sold-out waitlist. When a showtime has no `AVAILABLE` seats, an authenticated customer can subscribe from the booking page. A scheduled backend scanner checks live seat state (including active holds and repaired booking reservations) and emits a deduplicated notification as soon as seats reopen.

### Customer UX
- `Báo khi có ghế` on a sold-out booking page.
- Cancel/re-arm a seat alert without creating duplicate rows.
- `/waitlist` page for active and historical alerts.
- Direct link from an alert back to `/booking/{showtimeId}`.
- Header/footer navigation to the waitlist.

### Backend
- Flyway `V32__showtime_waitlist.sql`.
- Unique `(user_id, showtime_id)` subscription.
- Atomic notification claim for multi-replica safety.
- Configurable scan interval: `app.waitlist.scan-ms`, default 60 seconds.
- Past showtimes become `EXPIRED`.
- Alert notification is categorized as `BOOKING`, so existing notification preferences still apply.

## Upgrade

```powershell
python .\tools\verify_v32_waitlist.py
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v32.ps1
```

Expected verifier result: `28/28 checks passed`.

Start/update the stack normally:

```powershell
docker compose up -d --build
docker compose ps
```

Do **not** use `docker compose down -v` for a normal upgrade.

After CI is green, run the manual `CineBooking Release Candidate` workflow with version `v32-rc1`.
