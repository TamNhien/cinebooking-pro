-- V68 - Security & Identity 5.0
-- Adds durable, short-lived admin step-up grants. Raw step-up tokens are never persisted.

CREATE TABLE admin_step_up_grant (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES auth_session(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL,
    last_used_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    revoke_reason VARCHAR(120),
    CONSTRAINT ck_admin_step_up_expiry CHECK (expires_at > issued_at)
);

CREATE INDEX idx_admin_step_up_active_session
    ON admin_step_up_grant(session_id, expires_at DESC)
    WHERE revoked_at IS NULL;

CREATE INDEX idx_admin_step_up_active_user
    ON admin_step_up_grant(user_id, expires_at DESC)
    WHERE revoked_at IS NULL;

CREATE INDEX idx_admin_step_up_expiry
    ON admin_step_up_grant(expires_at, id)
    WHERE revoked_at IS NULL;
