-- V17: Booking creation integrity.
-- Hibernate includes booking.created_at in INSERT statements, so a database DEFAULT
-- alone cannot protect against an explicit NULL. Keep the default and add a small
-- BEFORE INSERT guard as a second line of defence.
ALTER TABLE booking
    ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP;

CREATE OR REPLACE FUNCTION cinebooking_fill_booking_created_at()
RETURNS trigger AS $$
BEGIN
    IF NEW.created_at IS NULL THEN
        NEW.created_at := CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_booking_created_at_guard ON booking;
CREATE TRIGGER trg_booking_created_at_guard
BEFORE INSERT ON booking
FOR EACH ROW
EXECUTE FUNCTION cinebooking_fill_booking_created_at();
