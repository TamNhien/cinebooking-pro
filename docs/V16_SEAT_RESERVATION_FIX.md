# CineBooking V16 - Seat reservation consistency fix

## Symptom
A seat could look available in the seat map, be held successfully in Redis, then fail at checkout with a PostgreSQL data-conflict error. A previously unpaid/refunded/cancelled seat could also appear stuck after Refresh.

## Root cause
V14 introduced `uq_showtime_seat_active`, which treats every `booking_seat` row with `released_at IS NULL` as a durable reservation. The seat-map query, however, additionally filtered by booking status. Therefore a stale inactive booking row could be hidden by the UI while the database unique index still blocked a new insert.

## V16 invariant
`released_at IS NULL` is now the single durable source of truth for a booked seat.

V16:
1. Repairs historical inactive booking rows.
2. Adds a database trigger to release seats whenever a booking becomes `CANCELLED`, `EXPIRED`, or `REFUNDED`.
3. Makes the seat-map reservation query match the unique index exactly.
4. Repairs stale inactive rows lazily whenever the seat map is loaded/refreshed.
5. Re-checks PostgreSQL reservations immediately before booking creation.

## Diagnostics
Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v16.ps1
```

Or for a specific showtime:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v16.ps1 -ShowtimeId "66666666-6666-6666-6666-666666666666"
```

`stale_inactive_unreleased` should be `0`.
