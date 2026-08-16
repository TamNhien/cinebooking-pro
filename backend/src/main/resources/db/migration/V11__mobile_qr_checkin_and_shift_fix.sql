-- V11 fixes cancelled-shift recreation and adds an auditable per-shift ticket scan log.

-- V10 used a plain UNIQUE constraint on (staff_user_id, shift_date, start_time).
-- A CANCELLED shift therefore still blocked recreating the same slot. Replace it
-- with a partial unique index that only protects non-cancelled shifts.
ALTER TABLE staff_shift DROP CONSTRAINT IF EXISTS uq_staff_shift_start;
DROP INDEX IF EXISTS uq_staff_shift_start;
CREATE UNIQUE INDEX IF NOT EXISTS uq_staff_shift_start_active
    ON staff_shift(staff_user_id, shift_date, start_time)
    WHERE status <> 'CANCELLED';

CREATE TABLE IF NOT EXISTS ticket_checkin_log (
    id UUID PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES booking(id) ON DELETE CASCADE,
    shift_id UUID REFERENCES staff_shift(id) ON DELETE SET NULL,
    attendance_id UUID REFERENCES staff_attendance(id) ON DELETE SET NULL,
    staff_user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE RESTRICT,
    cinema_id UUID NOT NULL REFERENCES cinema(id) ON DELETE RESTRICT,
    checked_in_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    source VARCHAR(20) NOT NULL DEFAULT 'QR'
        CHECK (source IN ('QR','URL','MANUAL')),
    ip_address VARCHAR(64)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ticket_checkin_booking ON ticket_checkin_log(booking_id);
CREATE INDEX IF NOT EXISTS idx_ticket_checkin_shift ON ticket_checkin_log(shift_id, checked_in_at DESC);
CREATE INDEX IF NOT EXISTS idx_ticket_checkin_staff ON ticket_checkin_log(staff_user_id, checked_in_at DESC);
CREATE INDEX IF NOT EXISTS idx_ticket_checkin_cinema ON ticket_checkin_log(cinema_id, checked_in_at DESC);
