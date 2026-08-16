# CineBooking Pro V20 - Analytics V2

V20 turns the existing revenue page into an operations dashboard designed for cinema managers and administrators.

## Added metrics

- Revenue, confirmed bookings, tickets sold and concession revenue.
- Average order value (AOV).
- Seat occupancy rate for showtimes that have already started.
- Payment success rate.
- Refund rate.
- Check-in count and new-user count.
- Daily revenue with booking, ticket and check-in counts.
- Cinema performance: revenue, bookings, tickets, capacity and occupancy.
- Top showtimes by tickets and revenue.
- Seat-position heatmap.
- Demand by showtime hour in Asia/Ho_Chi_Minh.
- Staff check-in performance.
- Booking and payment status distributions.
- Existing top-movie, payment-provider and concession rankings remain available.

## Filtering

The page supports 7, 30, 90 and 365 day ranges and an optional cinema filter.

## Database

`V20__analytics_v2_indexes.sql` only adds read-optimized indexes. It does not alter business data.

## Validation

Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v20.ps1
powershell -ExecutionPolicy Bypass -File .\tools\test-v20.ps1
```

The smoke test is read-only.
