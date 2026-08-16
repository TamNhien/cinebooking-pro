# CineBooking Pro V15 - Pending booking and seat refresh fix

V15 fixes the case where a customer creates a booking but does not finish payment, then sees the old seat remain unavailable and cannot easily recover from a payment-start error.

## Behaviour changes

- Seat hold and unpaid booking window are aligned to 5 minutes by default.
- Existing PENDING bookings created with the old 10-minute window are clamped to 5 minutes by Flyway V15.
- Loading or holding a seat lazily expires stale PENDING bookings for that showtime, in addition to the scheduled expiry job.
- The booking page detects the current user's PENDING booking for the showtime.
- The customer can continue payment or cancel the unpaid booking and immediately release its seats.
- Refresh seats now releases the current Redis hold owned by the user, clears local selection, reloads the seat map, and asks the backend to clean expired pending bookings.
- Payment start is idempotent for an existing PENDING payment session using the same provider.
- If booking creation succeeds but opening the payment session fails, the page keeps the booking visible instead of losing its ID. The customer can retry payment or cancel it.
- Backend blocks a second PENDING booking for the same user and showtime until the previous one is paid, cancelled, or expired.

## Flyway

`V15__pending_booking_lifecycle.sql`

The migration only adjusts the expiry timestamp and adds an index. Voucher/loyalty refund and seat release remain in application business logic.

## Default timeout

`PAYMENT_WINDOW_SECONDS=300`

This can be overridden in `.env` if required.
