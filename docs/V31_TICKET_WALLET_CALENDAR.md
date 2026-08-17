# V31 - Ticket Wallet & Calendar

V31 upgrades the customer booking-history experience into a practical ticket wallet without changing the database schema.

## Customer features

- `/bookings` now provides Upcoming / Past / All views.
- Search by movie title, booking id, or seat code.
- Filter by booking status and sort by showtime or booking creation time.
- Summary cards show upcoming confirmed tickets, pending payments, refund requests, and total bookings.
- Confirmed tickets can download a standards-based `.ics` calendar event.
- Booking ids can be copied from the wallet.
- `/ticket/[bookingId]` adds calendar, copy-booking-id, and print actions.
- Print CSS hides navigation/actions and produces a clean e-ticket layout.

## Calendar security and portability

`GET /api/bookings/{id}/calendar.ics` is authenticated. The backend verifies that the booking belongs to the current user and only emits calendar files for `CONFIRMED` bookings. The event uses UTC `DTSTART`/`DTEND`, movie runtime, cinema/auditorium location, seat codes, and a stable booking UID.

No database migration is required for V31.

## Verification

```powershell
python .\tools\verify_v31_ticket_wallet.py
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v31.ps1
```

The manual Release Candidate workflow additionally exercises the calendar download through Playwright after a real browser booking/payment flow.
