# CineBooking Pro V12 - Staff delete + Admin voucher management

## Staff deletion

Admin can now delete a STAFF/MANAGER profile from `/admin/staff`.
The operation is a safe soft-delete: login is disabled, future scheduled shifts are cancelled, an active attendance is closed, and the profile disappears from the staff list. Historical shift, attendance, QR check-in and audit data are retained.

Database migration: `V12__staff_soft_delete.sql`.

## Dedicated voucher administration

New route: `/admin/vouchers`.

Admin can:
- create promotion codes;
- choose percent or fixed-value discount;
- configure minimum order amount and maximum discount;
- set start/end time;
- set total usage limit or leave it unlimited;
- activate/pause a code;
- edit and search codes;
- test a code against an order amount before publishing;
- copy the code for marketing/demo use.

Voucher codes are normalized to uppercase and validated as 3-30 characters containing only `A-Z`, `0-9`, `_` and `-`. Duplicate codes return HTTP 409 with a clear message.

The existing booking flow still uses `/commerce/vouchers/quote` and validates the voucher again transactionally when a booking is created.

## Booking UX

If a customer tries to apply a voucher before selecting a seat, the booking page now explains that at least one seat must be selected first instead of silently disabling the action.

## Smoke test

After rebuilding V12, run:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\test-v12.ps1
```

The test checks Admin login, Admin voucher creation, voucher quote calculation, voucher pause/rejection, staff creation, staff deletion and removal from the active staff list.
