# CineBooking Pro V13 - Booking Operations Center

V13 turns Admin > Booking from a read-only table into an operations center.

## Admin booking page

Route: `/admin/bookings`

Features:
- Search by booking id, customer, email, phone, movie, cinema and seat.
- Filter booking status, payment status and cinema.
- View customer, movie, cinema, auditorium, showtime and seats.
- Financial breakdown: ticket, concessions, voucher/discount, redeemed points and total.
- Payment history and latest provider status.
- Audit timeline per booking.
- Admin QR preview for CONFIRMED tickets.
- Resend ticket email.
- Manual emergency check-in (still validates ticket status and check-in time window).
- Cancel PENDING booking and release seats/benefits.
- Create refund request for CONFIRMED booking.
- Approve/reject refund from the booking detail screen.

## Data integrity

V13 deliberately does not expose hard-delete booking in the new UI. Payment, refund, check-in and audit records remain available for reconciliation.

## Flyway V13

`V13__booking_operations_indexes.sql` adds read-path indexes only. No destructive schema changes are introduced.

## Test

After rebuilding:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\test-v13.ps1
```

The script is read-only for booking business state. It tests authentication, booking operations listing/detail, QR generation, refund queue and audit access.
