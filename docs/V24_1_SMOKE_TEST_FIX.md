# CineBooking V24.1 - deterministic V24 smoke test

V24.1 fixes a false negative in `tools/test-v24.ps1`.

The old test searched current public showtimes and silently skipped/ignored seats that could not be held. It therefore failed with `Could not find and hold an AVAILABLE seat` when all real showtimes were past, full, held, blocked, or had an existing pending booking for the test account.

The new test creates an isolated temporary auditorium, seat, and future showtime in PostgreSQL using an existing movie and cinema. It runs the idempotency checks against that fixture and deletes the fixture in `finally`. Real bookings/showtimes/seats are not changed.

No Flyway migration is added. Database version remains V24.
