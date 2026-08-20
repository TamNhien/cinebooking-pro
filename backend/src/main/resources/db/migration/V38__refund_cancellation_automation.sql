ALTER TABLE booking
    ADD COLUMN refund_rate_percent NUMERIC(5,2),
    ADD COLUMN refund_fee_amount NUMERIC(12,2),
    ADD COLUMN refund_policy_code VARCHAR(40),
    ADD COLUMN refund_automatic BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN refund_processed_at TIMESTAMPTZ,
    ADD COLUMN refund_processed_by VARCHAR(190),
    ADD COLUMN refund_provider_reference VARCHAR(200);

ALTER TABLE payment
    ADD COLUMN refunded_amount NUMERIC(12,2),
    ADD COLUMN refunded_at TIMESTAMPTZ,
    ADD COLUMN refund_reference VARCHAR(200);

CREATE INDEX idx_booking_refund_processed
    ON booking(refund_processed_at DESC)
    WHERE refund_processed_at IS NOT NULL;
