ALTER TABLE booking
    ADD COLUMN purchaser_user_id UUID REFERENCES app_user(id),
    ADD COLUMN ticket_version INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN transfer_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN transferred_at TIMESTAMPTZ,
    ADD COLUMN transferred_from_user_id UUID REFERENCES app_user(id) ON DELETE SET NULL;

UPDATE booking
SET purchaser_user_id = user_id
WHERE purchaser_user_id IS NULL;

ALTER TABLE booking
    ALTER COLUMN purchaser_user_id SET NOT NULL,
    ADD CONSTRAINT chk_booking_ticket_version_positive CHECK (ticket_version >= 1),
    ADD CONSTRAINT chk_booking_transfer_count_nonnegative CHECK (transfer_count >= 0);

CREATE INDEX idx_booking_purchaser_user ON booking(purchaser_user_id);
CREATE INDEX idx_booking_transferred_from ON booking(transferred_from_user_id) WHERE transferred_from_user_id IS NOT NULL;
