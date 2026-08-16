# CineBooking Pro V24 — High-Traffic Booking & Idempotent Checkout

V24 hardens the most concurrency-sensitive path of CineBooking: **seat hold -> booking creation -> payment start**.

## 1. Idempotent booking creation

`POST /api/bookings` accepts an optional HTTP header:

```text
Idempotency-Key: checkout-<unique-key>
```

The web booking page generates one key for each checkout attempt. The key is stored with the booking together with a SHA-256 fingerprint of the normalized request.

Behavior:

- first request: `201 Created`, `Idempotency-Replayed: false`;
- retry with the same key and same payload: returns the original booking with `200 OK`, `Idempotency-Replayed: true`;
- same key with a different payload: `409 Conflict`;
- old clients without the header continue to work.

This protects against double-clicks, browser retries, proxy retries and the case where the server commits a booking but the client loses the response.

## 2. Two backend instances remain consistent

The user row is locked during booking creation. Therefore two retries from the same account can land on `backend-1` and `backend-2` and still serialize before the idempotency lookup/create sequence.

PostgreSQL also has:

```sql
UNIQUE(user_id, idempotency_key) WHERE idempotency_key IS NOT NULL
```

so the invariant is durable across process restarts.

## 3. Seat race protection

The booking path now explicitly documents and enforces three layers:

1. Redis Lua multi-seat hold — atomic short-lived ownership.
2. PostgreSQL pre-check — friendly conflict response before insert.
3. `uq_showtime_seat_active` — final durable unique index for unreleased booking seats.

If a race still reaches the database unique index, V24 translates that known seat-contention violation to HTTP `409` instead of exposing a generic `500`.

## 4. Migration

```text
V24__booking_idempotency_and_contention.sql
```

Adds:

- `booking.idempotency_key varchar(80)`;
- `booking.request_fingerprint varchar(64)`;
- `uq_booking_user_idempotency`;
- `idx_booking_idempotency_lookup`;
- re-asserts `uq_showtime_seat_active` after repairing inactive historical rows.

No booking/payment history is deleted.

## 5. Tests

### Integration smoke test

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\test-v24.ps1
```

It temporarily holds one available seat with the current Admin account, creates one PENDING booking, replays the same request, verifies key misuse returns `409`, checks PostgreSQL invariants, then cancels the temporary booking and releases the seat.

### Diagnostics

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v24.ps1
```

Expected duplicate-key and duplicate-active-seat queries: `0 rows`.

### k6 idempotency retry

```bash
k6 run -e BASE_URL=http://localhost/api -e SHOWTIME_ID=<showtime-uuid> -e SEAT_ID=<seat-uuid> loadtest/idempotency-retry.js
```

### k6 same-seat contention

```bash
k6 run -e BASE_URL=http://localhost/api -e SHOWTIME_ID=<showtime-uuid> -e SEAT_ID=<seat-uuid> -e VUS=100 loadtest/contention.js
```

The contention threshold requires exactly one successful hold and exactly one successful booking for the target seat. The winning booking remains PENDING, so cancel it or use a different free seat before the next contention run.

## 6. Recommended demo explanation

```text
Client checkout
   |
   +-- Idempotency-Key ----------------------------+
   |                                               |
   v                                               v
backend-1 / backend-2 -> lock user -> replay check / create
                                  |
                                  v
                            Redis seat hold
                                  |
                                  v
                       PostgreSQL active-seat UNIQUE
                                  |
                                  v
                           one durable booking
```

This is the V24 answer to the common defense question: **"What happens if the user double-clicks Pay or 100 users compete for the same seat?"**
