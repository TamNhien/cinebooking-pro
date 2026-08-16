CREATE TABLE notification_preference (
    user_id UUID PRIMARY KEY REFERENCES app_user(id) ON DELETE CASCADE,
    in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    email_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    browser_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    booking_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    reminder_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    refund_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    staff_shift_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    promotion_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO notification_preference(user_id)
SELECT id FROM app_user
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION cinebooking_create_notification_preference()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO notification_preference(user_id) VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_app_user_notification_preference ON app_user;
CREATE TRIGGER trg_app_user_notification_preference
AFTER INSERT ON app_user
FOR EACH ROW EXECUTE FUNCTION cinebooking_create_notification_preference();

ALTER TABLE user_notification
    ADD COLUMN category VARCHAR(30) NOT NULL DEFAULT 'GENERAL',
    ADD COLUMN in_app_visible BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN email_status VARCHAR(20) NOT NULL DEFAULT 'SKIPPED',
    ADD COLUMN email_sent_at TIMESTAMPTZ,
    ADD COLUMN delivery_error VARCHAR(300),
    ADD COLUMN dedupe_key VARCHAR(180);

CREATE INDEX idx_notification_user_visible_created
    ON user_notification(user_id, in_app_visible, created_at DESC);
CREATE INDEX idx_notification_user_browser_feed
    ON user_notification(user_id, created_at DESC);
CREATE UNIQUE INDEX uq_notification_user_dedupe
    ON user_notification(user_id, dedupe_key)
    WHERE dedupe_key IS NOT NULL;
