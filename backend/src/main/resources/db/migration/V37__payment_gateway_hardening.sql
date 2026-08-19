ALTER TABLE payment
    ADD COLUMN payer_user_id UUID REFERENCES app_user(id),
    ADD COLUMN client_idempotency_key VARCHAR(120),
    ADD COLUMN provider_order_id VARCHAR(200),
    ADD COLUMN merchant_request_id VARCHAR(100),
    ADD COLUMN provider_created_at VARCHAR(32),
    ADD COLUMN provider_response_code VARCHAR(80),
    ADD COLUMN provider_message VARCHAR(500),
    ADD COLUMN expires_at TIMESTAMPTZ,
    ADD COLUMN failed_at TIMESTAMPTZ,
    ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN last_webhook_at TIMESTAMPTZ;

-- Payment ownership follows the payer, not the current ticket holder. This is
-- important after V36 ticket transfer: the recipient owns the ticket while the
-- purchaser keeps payment/refund/loyalty ownership.
UPDATE payment p
SET payer_user_id = COALESCE(b.purchaser_user_id, b.user_id)
FROM booking b
WHERE p.booking_id = b.id
  AND p.payer_user_id IS NULL;

ALTER TABLE payment ALTER COLUMN payer_user_id SET NOT NULL;

-- Before V37 provider_transaction_id stored CineBooking's outbound order reference.
-- Preserve that reference separately; from V37 onward provider_transaction_id stores
-- the gateway's transaction identifier after a successful payment.
UPDATE payment
SET provider_order_id = provider_transaction_id
WHERE provider_order_id IS NULL
  AND provider_transaction_id IS NOT NULL
  AND provider IN ('VNPAY','VNPAY_QR','MOMO','MOMO_QR');

CREATE UNIQUE INDEX uq_payment_booking_client_idempotency
    ON payment(booking_id, client_idempotency_key)
    WHERE client_idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX uq_payment_provider_order
    ON payment(provider, provider_order_id)
    WHERE provider_order_id IS NOT NULL;

CREATE INDEX idx_payment_payer_created
    ON payment(payer_user_id, created_at DESC);

CREATE INDEX idx_payment_status_created
    ON payment(status, created_at DESC);

CREATE INDEX idx_payment_provider_created
    ON payment(provider, created_at DESC);

CREATE TABLE payment_webhook_event (
    id UUID PRIMARY KEY,
    provider VARCHAR(30) NOT NULL,
    event_key VARCHAR(240) NOT NULL,
    payment_id UUID REFERENCES payment(id) ON DELETE SET NULL,
    payload_hash VARCHAR(64) NOT NULL,
    signature_valid BOOLEAN NOT NULL DEFAULT FALSE,
    result_code VARCHAR(80),
    response_code VARCHAR(80),
    response_message VARCHAR(500),
    received_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMPTZ,
    CONSTRAINT uq_payment_webhook_provider_event UNIQUE(provider, event_key)
);

CREATE INDEX idx_payment_webhook_received
    ON payment_webhook_event(received_at DESC);
CREATE INDEX idx_payment_webhook_payment
    ON payment_webhook_event(payment_id, received_at DESC);
