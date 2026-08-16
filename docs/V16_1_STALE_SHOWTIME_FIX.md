# V16.1 - Stale showtime / infinite booking loader fix

## Root cause
A booking URL can remain in browser history after its showtime has been deleted or replaced. Both required APIs then return HTTP 404. V16 rendered the loading card whenever `showtime` or `map` was null, so the backend error message was never visible and the page appeared to load forever.

## Fix
- Introduce `ApiError` with HTTP status.
- Booking page has explicit `loading` and `fatalError` states.
- HTTP 404 now renders "Suất chiếu không còn khả dụng" and navigation buttons.
- Optional product/profile requests no longer block the required seat map.
- Add `tools/diagnose-showtime.ps1` to inspect a stale ID and list current showtimes.

No database migration is required. Flyway remains at V16.
