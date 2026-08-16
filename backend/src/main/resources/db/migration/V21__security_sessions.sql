CREATE TABLE auth_session (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(64) NOT NULL UNIQUE,
    device_name VARCHAR(160) NOT NULL,
    user_agent VARCHAR(500),
    ip_address VARCHAR(80),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    revoke_reason VARCHAR(120)
);

CREATE INDEX idx_auth_session_user_active
    ON auth_session(user_id, last_seen_at DESC)
    WHERE revoked_at IS NULL;
CREATE INDEX idx_auth_session_expiry ON auth_session(expires_at);
CREATE INDEX idx_auth_session_refresh_hash ON auth_session(refresh_token_hash);
