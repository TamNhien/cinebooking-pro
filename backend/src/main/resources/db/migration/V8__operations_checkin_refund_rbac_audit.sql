ALTER TABLE booking
    ADD COLUMN checked_in_at TIMESTAMPTZ,
    ADD COLUMN checked_in_by UUID REFERENCES app_user(id) ON DELETE SET NULL,
    ADD COLUMN refund_requested_at TIMESTAMPTZ,
    ADD COLUMN refunded_at TIMESTAMPTZ,
    ADD COLUMN refund_amount NUMERIC(12,2) CHECK (refund_amount IS NULL OR refund_amount >= 0),
    ADD COLUMN refund_reason VARCHAR(500);

CREATE INDEX idx_booking_checked_in ON booking(checked_in_at) WHERE checked_in_at IS NOT NULL;
CREATE INDEX idx_booking_refund_queue ON booking(status, refund_requested_at DESC) WHERE status = 'REFUND_REQUESTED';

CREATE TABLE audit_log (
    id UUID PRIMARY KEY,
    actor_user_id UUID REFERENCES app_user(id) ON DELETE SET NULL,
    actor_email VARCHAR(190),
    action VARCHAR(80) NOT NULL,
    entity_type VARCHAR(80),
    entity_id VARCHAR(120),
    details VARCHAR(1000),
    ip_address VARCHAR(80),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);
CREATE INDEX idx_audit_actor ON audit_log(actor_user_id, created_at DESC);
CREATE INDEX idx_audit_action ON audit_log(action, created_at DESC);

ALTER TABLE loyalty_transaction DROP CONSTRAINT IF EXISTS loyalty_transaction_transaction_type_check;
ALTER TABLE loyalty_transaction ADD CONSTRAINT loyalty_transaction_transaction_type_check
    CHECK (transaction_type IN ('EARN','REDEEM','REFUND','REVERSAL'));

ALTER TABLE app_user ALTER COLUMN password_hash TYPE VARCHAR(255);
