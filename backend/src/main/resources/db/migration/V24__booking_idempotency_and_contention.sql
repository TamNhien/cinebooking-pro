-- V24: make checkout retries safe and expose durable contention invariants.
--
-- The active seat unique index from V14/V16 remains the final authority for seat ownership.
-- V24 adds a per-user idempotency key so browser/network retries cannot create duplicate bookings.

ALTER TABLE booking
    ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(80),
    ADD COLUMN IF NOT EXISTS request_fingerprint VARCHAR(64);

-- A key is scoped to one authenticated user. Historical rows keep NULL and are unaffected.
CREATE UNIQUE INDEX IF NOT EXISTS uq_booking_user_idempotency
    ON booking(user_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_booking_idempotency_lookup
    ON booking(user_id, idempotency_key, created_at DESC)
    WHERE idempotency_key IS NOT NULL;

-- Re-assert the high-contention seat invariant in case an older environment missed V16 repair.
UPDATE booking_seat bs
SET released_at = COALESCE(b.refunded_at, b.expires_at, CURRENT_TIMESTAMP)
FROM booking b
WHERE b.id = bs.booking_id
  AND bs.released_at IS NULL
  AND b.status IN ('REFUNDED', 'CANCELLED', 'EXPIRED');

DROP INDEX IF EXISTS uq_showtime_seat_active;
CREATE UNIQUE INDEX uq_showtime_seat_active
    ON booking_seat(showtime_id, seat_id)
    WHERE released_at IS NULL;

COMMENT ON COLUMN booking.idempotency_key IS 'Client retry key. Unique per user when present.';
COMMENT ON COLUMN booking.request_fingerprint IS 'SHA-256 of normalized checkout payload used to reject key reuse with a different request.';
