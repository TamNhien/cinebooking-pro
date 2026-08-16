# CineBooking Pro V11.2 - Check-in diagnostics fix

## Fixed

- 403 responses now preserve the backend business reason instead of always showing a generic permission error.
- Check-in mismatch errors explicitly name the ticket cinema and the staff/active-shift cinema.
- Added `POST /api/staff/check-in/preview` to validate a QR without consuming the ticket.
- The staff check-in page displays movie, cinema, auditorium, showtime and whether the ticket is eligible before final check-in.
- Existing V11 signed URL QR and raw QR payloads remain compatible.

## Important business rule

A STAFF/MANAGER can only scan tickets for the cinema assigned to that staff profile and active attendance shift. ADMIN keeps emergency override access.

The demo showtime `55555555-5555-5555-5555-555555555555` belongs to `CineHub Quận 1`. A staff member assigned to `CineHub Củ Chi` must not check in that ticket.

## No migration

V11.2 does not change the database schema. Flyway remains at V11.
