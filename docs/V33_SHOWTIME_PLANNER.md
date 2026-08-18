# V33 — Showtime Planner & Conflict Guard

V33 adds a dedicated admin scheduling workspace at `/admin/showtimes`.

## What it does

- Previews a bulk schedule before writing any showtimes.
- Generates showtimes for a date range with one or more daily start times.
- Detects room collisions using the movie runtime plus a configurable turnaround/cleaning buffer.
- Uses `Asia/Ho_Chi_Minh` by default for local schedule generation.
- Allows a safe `skipConflicts` mode so valid slots can be committed while conflicted slots are skipped.
- Serializes writes to the target auditorium with a pessimistic database lock so two admins cannot schedule the same room concurrently without rechecking conflicts.
- Protects booked showtimes: once a showtime has bookings, movie/auditorium/start time cannot be changed. Price and status remain editable.
- Keeps existing `CANCELLED` showtimes out of room-occupancy conflict checks.

## Limits and safety

- At most 62 days per bulk plan.
- At most 12 start times per day.
- At most 500 generated slots per request.
- Bulk planning cannot create `CANCELLED` showtimes.
- Default cleaning/turnaround buffer: 15 minutes (`app.showtime.turnaround-minutes`).
- Default planning timezone: `Asia/Ho_Chi_Minh` (`app.showtime.zone`).

## Endpoints

- `POST /api/admin/showtime-planner/preview`
- `POST /api/admin/showtime-planner/commit`

Both endpoints remain under `/api/admin/**`, so the existing ADMIN authorization policy applies.

## Browser release-candidate coverage

The V33 Playwright journey signs in as the test admin, opens `/admin/showtimes`, previews two slots on the seeded 2026-09-30 schedule, and verifies that the known 10:00 room collision is rejected while the 22:30 slot remains creatable. The browser test is preview-only and therefore retry-safe.
