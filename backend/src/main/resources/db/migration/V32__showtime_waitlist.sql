CREATE TABLE IF NOT EXISTS showtime_waitlist (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    showtime_id UUID NOT NULL REFERENCES showtime(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notified_at TIMESTAMPTZ,
    last_available_count INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT uq_showtime_waitlist_user UNIQUE (user_id, showtime_id),
    CONSTRAINT ck_showtime_waitlist_status CHECK (status IN ('ACTIVE','NOTIFIED','CANCELLED','EXPIRED')),
    CONSTRAINT ck_showtime_waitlist_available_count CHECK (last_available_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_showtime_waitlist_status_showtime
    ON showtime_waitlist(status, showtime_id);

CREATE INDEX IF NOT EXISTS idx_showtime_waitlist_user_created
    ON showtime_waitlist(user_id, created_at DESC);
