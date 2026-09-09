-- V70 - Data Governance & Privacy 5.0.
-- Adds an operator-controlled privacy request workflow and explicit retention-policy catalog.
-- No customer, booking, payment, movie, or synthetic request rows are created here.
-- Destructive retention execution remains disabled by default in application configuration.

CREATE TABLE data_retention_policy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_key VARCHAR(80) NOT NULL UNIQUE,
    data_class VARCHAR(40) NOT NULL,
    table_name VARCHAR(80) NOT NULL UNIQUE,
    retention_days INTEGER NOT NULL,
    retention_action VARCHAR(20) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    destructive_execution_enabled BOOLEAN NOT NULL DEFAULT false,
    note VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_retention_days CHECK (retention_days BETWEEN 1 AND 3650),
    CONSTRAINT ck_retention_action CHECK (retention_action IN ('REVIEW','ANONYMIZE','DELETE')),
    CONSTRAINT ck_retention_destructive_default CHECK (destructive_execution_enabled = false)
);

CREATE INDEX idx_retention_policy_enabled ON data_retention_policy(enabled, data_class, policy_key);
CREATE INDEX idx_retention_policy_action ON data_retention_policy(retention_action, enabled);

-- These are operational defaults, not sample business data and not legal/compliance claims.
INSERT INTO data_retention_policy(policy_key,data_class,table_name,retention_days,retention_action,note) VALUES
('AUTH_SESSION','SECURITY','auth_session',30,'DELETE','Operational default; automatic destructive execution is disabled.'),
('PASSWORD_RESET','SECURITY','password_reset_token',1,'DELETE','Short-lived reset tokens; automatic destructive execution is disabled.'),
('USER_NOTIFICATION','ENGAGEMENT','user_notification',180,'DELETE','Operational default; review business/legal requirements before changing.'),
('SECURITY_ALERT','SECURITY','security_alert',365,'REVIEW','Retain for security investigation review; no automatic purge in V70.'),
('AUDIT_LOG','AUDIT','audit_log',365,'REVIEW','Audit evidence is review-only in V70; no automatic purge.')
ON CONFLICT (policy_key) DO NOTHING;

CREATE TABLE privacy_request (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_key VARCHAR(80) NOT NULL UNIQUE,
    subject_user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE RESTRICT,
    request_type VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    requested_by UUID REFERENCES app_user(id) ON DELETE SET NULL,
    reviewed_by UUID REFERENCES app_user(id) ON DELETE SET NULL,
    reason VARCHAR(500) NOT NULL,
    review_note VARCHAR(1000),
    due_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    CONSTRAINT ck_privacy_request_type CHECK (request_type IN ('EXPORT','ERASURE','RECTIFICATION')),
    CONSTRAINT ck_privacy_request_status CHECK (status IN ('OPEN','APPROVED','REJECTED','COMPLETED','CANCELLED')),
    CONSTRAINT ck_privacy_request_reason CHECK (char_length(trim(reason)) >= 8),
    CONSTRAINT ck_privacy_request_times CHECK (
        due_at >= created_at AND
        (reviewed_at IS NULL OR reviewed_at >= created_at) AND
        (completed_at IS NULL OR completed_at >= created_at)
    )
);

CREATE UNIQUE INDEX uq_privacy_request_active_subject_type
    ON privacy_request(subject_user_id, request_type)
    WHERE status IN ('OPEN','APPROVED');
CREATE INDEX idx_privacy_request_status_due ON privacy_request(status, due_at, created_at);
CREATE INDEX idx_privacy_request_subject_created ON privacy_request(subject_user_id, created_at DESC);
CREATE INDEX idx_privacy_request_requested_by ON privacy_request(requested_by, created_at DESC);
