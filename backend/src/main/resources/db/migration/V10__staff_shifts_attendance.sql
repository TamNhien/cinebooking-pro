CREATE TABLE staff_shift (
    id UUID PRIMARY KEY,
    staff_user_id UUID NOT NULL REFERENCES staff_profile(user_id) ON DELETE CASCADE,
    cinema_id UUID NOT NULL REFERENCES cinema(id) ON DELETE CASCADE,
    shift_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED'
        CHECK (status IN ('SCHEDULED','CANCELLED','COMPLETED')),
    note VARCHAR(300),
    assigned_by UUID REFERENCES app_user(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_staff_shift_start UNIQUE (staff_user_id, shift_date, start_time)
);

CREATE INDEX idx_staff_shift_staff_date ON staff_shift(staff_user_id, shift_date);
CREATE INDEX idx_staff_shift_cinema_date ON staff_shift(cinema_id, shift_date);
CREATE INDEX idx_staff_shift_status ON staff_shift(status);

CREATE TABLE staff_attendance (
    id UUID PRIMARY KEY,
    shift_id UUID NOT NULL UNIQUE REFERENCES staff_shift(id) ON DELETE CASCADE,
    staff_user_id UUID NOT NULL REFERENCES staff_profile(user_id) ON DELETE CASCADE,
    cinema_id UUID NOT NULL REFERENCES cinema(id) ON DELETE CASCADE,
    check_in_at TIMESTAMPTZ NOT NULL,
    check_out_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'WORKING'
        CHECK (status IN ('WORKING','COMPLETED')),
    check_in_ip VARCHAR(64),
    check_out_ip VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_staff_attendance_staff ON staff_attendance(staff_user_id, check_in_at DESC);
CREATE INDEX idx_staff_attendance_cinema ON staff_attendance(cinema_id, check_in_at DESC);
CREATE UNIQUE INDEX uq_staff_active_attendance
    ON staff_attendance(staff_user_id)
    WHERE check_out_at IS NULL;
