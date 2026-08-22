-- V43: Staff Operations 2.0
-- Adds auditable shift handover and incident management. Existing ticket check-in
-- duplicate protection remains enforced by booking.checked_in_at + uq_ticket_checkin_booking.

CREATE TABLE IF NOT EXISTS staff_shift_handover (
    id UUID PRIMARY KEY,
    cinema_id UUID NOT NULL REFERENCES cinema(id) ON DELETE RESTRICT,
    from_shift_id UUID NOT NULL REFERENCES staff_shift(id) ON DELETE RESTRICT,
    from_attendance_id UUID NOT NULL REFERENCES staff_attendance(id) ON DELETE RESTRICT,
    from_staff_user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE RESTRICT,
    to_staff_user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE RESTRICT,
    summary VARCHAR(1000) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING','ACCEPTED','CANCELLED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMPTZ,
    accepted_by UUID REFERENCES app_user(id) ON DELETE SET NULL,
    CONSTRAINT ck_staff_handover_distinct_staff CHECK (from_staff_user_id <> to_staff_user_id)
);

CREATE INDEX IF NOT EXISTS idx_staff_handover_cinema_created
    ON staff_shift_handover(cinema_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_staff_handover_recipient_status
    ON staff_shift_handover(to_staff_user_id, status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_staff_handover_pending_attendance
    ON staff_shift_handover(from_attendance_id)
    WHERE status = 'PENDING';

CREATE TABLE IF NOT EXISTS staff_incident (
    id UUID PRIMARY KEY,
    cinema_id UUID NOT NULL REFERENCES cinema(id) ON DELETE RESTRICT,
    shift_id UUID REFERENCES staff_shift(id) ON DELETE SET NULL,
    attendance_id UUID REFERENCES staff_attendance(id) ON DELETE SET NULL,
    reported_by UUID NOT NULL REFERENCES app_user(id) ON DELETE RESTRICT,
    category VARCHAR(30) NOT NULL
        CHECK (category IN ('CUSTOMER','EQUIPMENT','SAFETY','SECURITY','PAYMENT','OTHER')),
    severity VARCHAR(20) NOT NULL
        CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    title VARCHAR(160) NOT NULL,
    description VARCHAR(2000) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN'
        CHECK (status IN ('OPEN','RESOLVED')),
    resolved_by UUID REFERENCES app_user(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    resolution_note VARCHAR(1000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_staff_incident_cinema_status_created
    ON staff_incident(cinema_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_staff_incident_reporter_created
    ON staff_incident(reported_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_staff_incident_shift
    ON staff_incident(shift_id, created_at DESC);
