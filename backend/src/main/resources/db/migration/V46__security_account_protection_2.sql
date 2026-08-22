-- V46 - Security & Account Protection 2.0
-- Adds trusted-device registry, risk-scored security alerts and user/admin security dashboards.

CREATE TABLE trusted_device (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    device_fingerprint VARCHAR(64) NOT NULL,
    label VARCHAR(160) NOT NULL,
    device_name VARCHAR(160) NOT NULL,
    user_agent VARCHAR(500),
    first_ip VARCHAR(80),
    last_ip VARCHAR(80),
    trusted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMPTZ,
    CONSTRAINT uq_trusted_device_user_fingerprint UNIQUE (user_id, device_fingerprint)
);

CREATE INDEX idx_trusted_device_user_active
    ON trusted_device(user_id, last_seen_at DESC)
    WHERE revoked_at IS NULL;

CREATE TABLE security_alert (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    event_type VARCHAR(32) NOT NULL,
    severity VARCHAR(16) NOT NULL,
    risk_score INTEGER NOT NULL,
    title VARCHAR(180) NOT NULL,
    details VARCHAR(1000),
    ip_address VARCHAR(80),
    device_name VARCHAR(160),
    related_session_id UUID REFERENCES auth_session(id) ON DELETE SET NULL,
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID REFERENCES app_user(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_security_alert_type CHECK (event_type IN ('NEW_DEVICE','CREDENTIAL_ATTACK','PASSWORD_CHANGED','PASSWORD_RESET','SESSION_REVOKED')),
    CONSTRAINT ck_security_alert_severity CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    CONSTRAINT ck_security_alert_risk CHECK (risk_score BETWEEN 0 AND 100)
);

CREATE INDEX idx_security_alert_user_created
    ON security_alert(user_id, created_at DESC);
CREATE INDEX idx_security_alert_unacknowledged
    ON security_alert(severity, risk_score DESC, created_at DESC)
    WHERE acknowledged_at IS NULL;
CREATE INDEX idx_security_alert_session
    ON security_alert(related_session_id)
    WHERE related_session_id IS NOT NULL;
