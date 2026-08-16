ALTER TABLE staff_profile
    ADD COLUMN deleted_at TIMESTAMPTZ;

CREATE INDEX idx_staff_profile_deleted_at ON staff_profile(deleted_at);
CREATE INDEX idx_staff_profile_active_list ON staff_profile(employee_code) WHERE deleted_at IS NULL;
