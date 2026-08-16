-- V14: keep historical booking-seat rows while allowing refunded/cancelled seats to be sold again.
-- Previously uq_showtime_seat_reserved blocked a seat forever even after a REFUNDED booking.

ALTER TABLE booking_seat
    ADD COLUMN IF NOT EXISTS released_at TIMESTAMPTZ;

-- Repair historical rows that should no longer reserve a seat.
UPDATE booking_seat bs
SET released_at = COALESCE(b.refunded_at, b.created_at, CURRENT_TIMESTAMP)
FROM booking b
WHERE b.id = bs.booking_id
  AND bs.released_at IS NULL
  AND b.status IN ('REFUNDED', 'CANCELLED', 'EXPIRED');

-- The old constraint did not understand booking lifecycle.
ALTER TABLE booking_seat DROP CONSTRAINT IF EXISTS uq_showtime_seat_reserved;
DROP INDEX IF EXISTS uq_showtime_seat_reserved;
DROP INDEX IF EXISTS uq_showtime_seat_active;

-- Only an unreleased seat row owns the seat. Historical rows remain for audit/reporting.
CREATE UNIQUE INDEX uq_showtime_seat_active
    ON booking_seat(showtime_id, seat_id)
    WHERE released_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_booking_seat_active_showtime
    ON booking_seat(showtime_id, seat_id)
    WHERE released_at IS NULL;
