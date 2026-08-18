# V32 - Sold-out Waitlist & Seat Availability Alerts

V32 closes a customer-experience gap: a sold-out showtime no longer becomes a dead end.

## Flow
1. Customer opens a showtime whose seat map has zero `AVAILABLE` seats.
2. Customer selects **Báo khi có ghế**.
3. CineBooking stores one active waitlist row per user/showtime.
4. Both backend replicas may run the scanner, but an atomic database claim ensures only one can claim a row for notification.
5. When at least one live seat becomes `AVAILABLE`, CineBooking creates a deduplicated `WAITLIST_SEAT_AVAILABLE` notification linking directly to the booking page.
6. If the user's enabled notification channels cannot accept the notification, the row is reactivated instead of being silently lost.
7. Customer can manage subscriptions at `/waitlist`.

Live availability reuses the existing seat-map consistency rules, so released bookings, expired pending bookings and Redis seat holds are respected.
