-- V23: attendance quality metrics, leave requests and monthly timesheet support.

ALTER TABLE staff_attendance
    ADD COLUMN IF NOT EXISTS late_minutes INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS early_leave_minutes INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS worked_minutes INTEGER,
    ADD COLUMN IF NOT EXISTS punctuality_status VARCHAR(20) NOT NULL DEFAULT 'ON_TIME';

ALTER TABLE staff_attendance
    DROP CONSTRAINT IF EXISTS ck_staff_attendance_metrics_nonnegative;
ALTER TABLE staff_attendance
    ADD CONSTRAINT ck_staff_attendance_metrics_nonnegative
    CHECK (late_minutes >= 0 AND early_leave_minutes >= 0 AND (worked_minutes IS NULL OR worked_minutes >= 0));

ALTER TABLE staff_attendance
    DROP CONSTRAINT IF EXISTS ck_staff_attendance_punctuality;
ALTER TABLE staff_attendance
    ADD CONSTRAINT ck_staff_attendance_punctuality
    CHECK (punctuality_status IN ('ON_TIME','LATE','EARLY','LATE_EARLY'));

-- Backfill existing attendance rows from their immutable shift schedule.
-- V23 defaults use a 5-minute grace window for both late arrival and early leave.
WITH attendance_calc AS (
    SELECT a.id,
           GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (
               a.check_in_at - ((s.shift_date + s.start_time) AT TIME ZONE 'Asia/Ho_Chi_Minh')
           )) / 60)::INTEGER - 5) AS late_minutes_calc,
           CASE WHEN a.check_out_at IS NULL THEN 0 ELSE
               GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (
                   (((CASE WHEN s.end_time > s.start_time THEN s.shift_date ELSE s.shift_date + 1 END) + s.end_time) AT TIME ZONE 'Asia/Ho_Chi_Minh') - a.check_out_at
               )) / 60)::INTEGER - 5)
           END AS early_leave_minutes_calc,
           CASE WHEN a.check_out_at IS NULL THEN NULL ELSE
               GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (a.check_out_at - a.check_in_at)) / 60)::INTEGER)
           END AS worked_minutes_calc
    FROM staff_attendance a
    JOIN staff_shift s ON s.id = a.shift_id
)
UPDATE staff_attendance a
SET late_minutes = c.late_minutes_calc,
    early_leave_minutes = c.early_leave_minutes_calc,
    worked_minutes = c.worked_minutes_calc,
    punctuality_status = CASE
        WHEN c.late_minutes_calc > 0 AND c.early_leave_minutes_calc > 0 THEN 'LATE_EARLY'
        WHEN c.late_minutes_calc > 0 THEN 'LATE'
        WHEN c.early_leave_minutes_calc > 0 THEN 'EARLY'
        ELSE 'ON_TIME'
    END
FROM attendance_calc c
WHERE a.id = c.id;

CREATE TABLE IF NOT EXISTS staff_leave_request (
    id UUID PRIMARY KEY,
    staff_user_id UUID NOT NULL REFERENCES staff_profile(user_id) ON DELETE CASCADE,
    cinema_id UUID NOT NULL REFERENCES cinema(id) ON DELETE RESTRICT,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    leave_type VARCHAR(20) NOT NULL CHECK (leave_type IN ('VACATION','SICK','PERSONAL','OTHER')),
    reason VARCHAR(500) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED','CANCELLED')),
    reviewed_by UUID REFERENCES app_user(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    review_note VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_staff_leave_date_range CHECK (to_date >= from_date),
    CONSTRAINT ck_staff_leave_max_range CHECK (to_date <= from_date + 30)
);

CREATE INDEX IF NOT EXISTS idx_staff_leave_staff_dates
    ON staff_leave_request(staff_user_id, from_date, to_date);
CREATE INDEX IF NOT EXISTS idx_staff_leave_cinema_status
    ON staff_leave_request(cinema_id, status, from_date);
CREATE INDEX IF NOT EXISTS idx_staff_leave_status_created
    ON staff_leave_request(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_staff_checkout
    ON staff_attendance(staff_user_id, check_out_at DESC);
