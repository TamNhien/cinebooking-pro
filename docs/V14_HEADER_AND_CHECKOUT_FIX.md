# V14 - Header + checkout integrity fix

## 1. Header
The desktop header no longer renders every Admin operation as a separate item. Admin operations are grouped under `Quản trị`, navigation items use `white-space: nowrap`, the desktop container is wider, and screens below the `xl` breakpoint use the hamburger menu.

## 2. Checkout conflict after refunded seats
Older versions kept `booking_seat` rows after a refund while the UI considered `REFUNDED` seats available. The database still had `UNIQUE(showtime_id, seat_id)`, so trying to buy that seat again failed with a generic data-integrity conflict.

V14 adds `booking_seat.released_at`, converts the global unique constraint to a partial unique index for unreleased rows, backfills old refunded/cancelled/expired rows, and releases rows on cancellation/refund without deleting history.

Expected Flyway entry:

`14 | release refunded seats | t`
