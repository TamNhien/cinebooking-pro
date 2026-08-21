ALTER TABLE user_notification
    ADD COLUMN priority VARCHAR(12) NOT NULL DEFAULT 'NORMAL',
    ADD COLUMN read_at TIMESTAMPTZ,
    ADD COLUMN archived_at TIMESTAMPTZ;

ALTER TABLE user_notification
    ADD CONSTRAINT ck_user_notification_priority
    CHECK (priority IN ('LOW','NORMAL','HIGH'));

UPDATE user_notification
SET read_at = created_at
WHERE is_read = TRUE AND read_at IS NULL;

ALTER TABLE notification_preference
    ADD COLUMN loyalty_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN waitlist_enabled BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX idx_notification_user_active_created
    ON user_notification(user_id, created_at DESC)
    WHERE in_app_visible = TRUE AND archived_at IS NULL;

CREATE INDEX idx_notification_user_archived_created
    ON user_notification(user_id, archived_at DESC)
    WHERE in_app_visible = TRUE AND archived_at IS NOT NULL;

CREATE INDEX idx_notification_user_high_unread
    ON user_notification(user_id, created_at DESC)
    WHERE in_app_visible = TRUE AND archived_at IS NULL AND is_read = FALSE AND priority = 'HIGH';
