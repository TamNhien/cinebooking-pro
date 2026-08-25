-- V52 - PWA / Mobile Experience 3.0
-- Tracks browser/app installations without fabricating push credentials.
-- A device may exist with push disabled; endpoint/key material is only populated by a real browser PushSubscription.

CREATE TABLE pwa_device (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    device_key VARCHAR(80) NOT NULL,
    device_label VARCHAR(160) NOT NULL,
    platform VARCHAR(40) NOT NULL DEFAULT 'WEB',
    user_agent VARCHAR(500),
    standalone BOOLEAN NOT NULL DEFAULT FALSE,
    push_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    push_endpoint TEXT,
    p256dh TEXT,
    auth_secret TEXT,
    failure_count INTEGER NOT NULL DEFAULT 0 CHECK (failure_count >= 0),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_push_at TIMESTAMPTZ,
    last_failure_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_pwa_device_key UNIQUE (device_key),
    CONSTRAINT ck_pwa_device_push_credentials CHECK (
        (push_enabled = FALSE)
        OR (push_endpoint IS NOT NULL AND p256dh IS NOT NULL AND auth_secret IS NOT NULL)
    )
);

CREATE UNIQUE INDEX uq_pwa_device_push_endpoint
    ON pwa_device(push_endpoint)
    WHERE push_endpoint IS NOT NULL;

CREATE INDEX idx_pwa_device_user_seen
    ON pwa_device(user_id, last_seen_at DESC);

CREATE INDEX idx_pwa_device_user_push
    ON pwa_device(user_id, push_enabled, last_seen_at DESC);
