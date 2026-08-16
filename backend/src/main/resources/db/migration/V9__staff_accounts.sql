ALTER TABLE app_user
    ADD COLUMN account_enabled BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE staff_profile (
    user_id UUID PRIMARY KEY REFERENCES app_user(id) ON DELETE CASCADE,
    employee_code VARCHAR(30) NOT NULL UNIQUE,
    cinema_id UUID REFERENCES cinema(id) ON DELETE SET NULL,
    job_title VARCHAR(100),
    employment_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
        CHECK (employment_status IN ('ACTIVE','ON_LEAVE','INACTIVE')),
    hire_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_staff_profile_cinema ON staff_profile(cinema_id);
CREATE INDEX idx_staff_profile_status ON staff_profile(employment_status);

INSERT INTO staff_profile(user_id, employee_code, job_title, employment_status, hire_date)
SELECT
    u.id,
    CASE WHEN u.role = 'MANAGER' THEN 'QL-' ELSE 'NV-' END || UPPER(SUBSTRING(REPLACE(u.id::text, '-', '') FROM 1 FOR 8)),
    CASE WHEN u.role = 'MANAGER' THEN 'Quản lý rạp' ELSE 'Nhân viên rạp' END,
    'ACTIVE',
    CURRENT_DATE
FROM app_user u
WHERE u.role IN ('STAFF','MANAGER')
  AND NOT EXISTS (SELECT 1 FROM staff_profile s WHERE s.user_id = u.id);
