-- CineBooking V67 - Payment Resilience & Reconciliation 5.0
-- Durable recovery metadata for gateway webhooks and refund settlement state.

ALTER TABLE payment
    ADD COLUMN refund_state VARCHAR(24) NOT NULL DEFAULT 'NONE',
    ADD COLUMN refund_requested_at TIMESTAMPTZ,
    ADD COLUMN refund_settled_at TIMESTAMPTZ,
    ADD COLUMN refund_attempts INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN refund_operation_key VARCHAR(120),
    ADD COLUMN refund_last_error VARCHAR(500),
    ADD CONSTRAINT ck_payment_refund_state CHECK (refund_state IN ('NONE','REQUESTED','EVIDENCE_REQUIRED','SETTLED','REJECTED','FAILED')),
    ADD CONSTRAINT ck_payment_refund_attempts CHECK (refund_attempts >= 0);

UPDATE payment
SET refund_state = 'SETTLED',
    refund_requested_at = COALESCE(refunded_at, updated_at, created_at),
    refund_settled_at = COALESCE(refunded_at, updated_at, created_at),
    refund_operation_key = COALESCE(refund_operation_key, 'legacy:' || id::text)
WHERE status = 'REFUNDED';

CREATE UNIQUE INDEX uq_payment_refund_operation_key
    ON payment(refund_operation_key)
    WHERE refund_operation_key IS NOT NULL;

CREATE INDEX idx_payment_refund_state_updated
    ON payment(refund_state, updated_at DESC);

CREATE INDEX idx_payment_refund_reference
    ON payment(provider, refund_reference)
    WHERE refund_reference IS NOT NULL;

ALTER TABLE payment_webhook_event
    ADD COLUMN delivery_state VARCHAR(24) NOT NULL DEFAULT 'RECEIVED',
    ADD COLUMN recovery_attempts INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN last_recovery_at TIMESTAMPTZ,
    ADD COLUMN recovered_at TIMESTAMPTZ,
    ADD COLUMN recovery_message VARCHAR(500),
    ADD CONSTRAINT ck_payment_webhook_delivery_state CHECK (delivery_state IN ('RECEIVED','PROCESSED','REJECTED','ORPHANED','RECOVERY_PENDING','RECOVERED','DEAD_LETTER')),
    ADD CONSTRAINT ck_payment_webhook_recovery_attempts CHECK (recovery_attempts >= 0);

UPDATE payment_webhook_event
SET delivery_state = CASE
    WHEN signature_valid = FALSE THEN 'REJECTED'
    WHEN payment_id IS NULL THEN 'ORPHANED'
    WHEN processed_at IS NOT NULL THEN 'PROCESSED'
    ELSE 'RECOVERY_PENDING'
END;

CREATE INDEX idx_payment_webhook_recovery_queue
    ON payment_webhook_event(delivery_state, received_at)
    WHERE delivery_state IN ('ORPHANED','RECOVERY_PENDING');

CREATE INDEX idx_payment_webhook_recovered
    ON payment_webhook_event(recovered_at DESC)
    WHERE recovered_at IS NOT NULL;
