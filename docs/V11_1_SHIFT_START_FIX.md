# CineBooking Pro V11.1 - Shift start fix

## What was confusing
A shift displayed as `08:00-12:00` means 8:00 AM through 12:00 noon. It does not mean 8:00 PM through midnight.
For an evening shift from 8 PM through midnight, create `20:00-00:00`.

## Business-rule fix
V10/V11 only allowed attendance check-in from 30 minutes before scheduled start through 60 minutes after scheduled start. That was unnecessarily strict for a real cinema operation.

V11.1 allows an assigned active employee to start attendance:
- from 30 minutes before shift start;
- at any time while the shift is still running;
- never at or after the shift end.

Late check-in is preserved in attendance and audit records instead of preventing the employee from working.

## UI clarification
The Admin shift page now explains 24-hour time values:
- 08:00 = 8 AM
- 12:00 = noon
- 20:00 = 8 PM
- 00:00 = midnight on the following day

The staff schedule page also clarifies noon vs midnight.

## No database migration
This is a backend/frontend business-rule patch only. Flyway remains at V11.
