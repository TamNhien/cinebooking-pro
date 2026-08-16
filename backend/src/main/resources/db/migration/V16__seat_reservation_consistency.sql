-- V16: make UI seat availability and PostgreSQL reservation enforcement use the same truth.
--
-- Root cause fixed:
--   uq_showtime_seat_active blocks every booking_seat row with released_at IS NULL,
--   while older seat-map code ignored rows whose booking status was already inactive.
--   A stale inactive row could therefore look AVAILABLE in the UI but fail at checkout.

-- 1) Repair every historical inactive booking seat that is still marked active.
UPDATE booking_seat bs
SET released_at = COALESCE(b.refunded_at, b.expires_at, CURRENT_TIMESTAMP)
FROM booking b
WHERE b.id = bs.booking_id
  AND bs.released_at IS NULL
  AND b.status IN ('REFUNDED', 'CANCELLED', 'EXPIRED');

-- 2) Keep the invariant correct even if a future code path forgets to release seats.
CREATE OR REPLACE FUNCTION cinebooking_release_inactive_booking_seats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IN ('REFUNDED', 'CANCELLED', 'EXPIRED')
       AND (OLD.status IS DISTINCT FROM NEW.status) THEN
        UPDATE booking_seat
        SET released_at = COALESCE(NEW.refunded_at, NEW.expires_at, CURRENT_TIMESTAMP)
        WHERE booking_id = NEW.id
          AND released_at IS NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_release_inactive_booking_seats ON booking;
CREATE TRIGGER trg_release_inactive_booking_seats
AFTER UPDATE OF status ON booking
FOR EACH ROW
EXECUTE FUNCTION cinebooking_release_inactive_booking_seats();

-- 3) Re-assert the durable seat ownership index.
DROP INDEX IF EXISTS uq_showtime_seat_active;
CREATE UNIQUE INDEX uq_showtime_seat_active
    ON booking_seat(showtime_id, seat_id)
    WHERE released_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_booking_seat_unreleased_showtime
    ON booking_seat(showtime_id, seat_id)
    WHERE released_at IS NULL;
