-- CineBooking V47 - Payment Gateway & Operations 2.0
-- Adds payment-attempt lineage, cancellation/reconciliation metadata and an append-only event timeline.

ALTER TABLE payment
    ADD COLUMN attempt_no INTEGER,
    ADD COLUMN retry_of_payment_id UUID REFERENCES payment(id) ON DELETE SET NULL,
    ADD COLUMN cancelled_at TIMESTAMPTZ,
    ADD COLUMN last_reconciled_at TIMESTAMPTZ,
    ADD COLUMN next_reconcile_at TIMESTAMPTZ,
    ADD COLUMN reconciliation_failures INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN last_reconcile_message VARCHAR(500);

WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY booking_id ORDER BY created_at, id) AS rn
    FROM payment
)
UPDATE payment p
SET attempt_no = ranked.rn
FROM ranked
WHERE ranked.id = p.id;

ALTER TABLE payment
    ALTER COLUMN attempt_no SET NOT NULL,
    ALTER COLUMN attempt_no SET DEFAULT 1,
    ADD CONSTRAINT ck_payment_attempt_no CHECK (attempt_no >= 1),
    ADD CONSTRAINT ck_payment_reconciliation_failures CHECK (reconciliation_failures >= 0);

CREATE UNIQUE INDEX uq_payment_booking_attempt_no
    ON payment(booking_id, attempt_no);
CREATE INDEX idx_payment_retry_parent
    ON payment(retry_of_payment_id)
    WHERE retry_of_payment_id IS NOT NULL;
CREATE INDEX idx_payment_reconcile_due
    ON payment(next_reconcile_at)
    WHERE next_reconcile_at IS NOT NULL
      AND status IN ('PENDING','REVIEW')
      AND provider IN ('VNPAY','VNPAY_QR','MOMO','MOMO_QR');

CREATE TABLE payment_event (
    id UUID PRIMARY KEY,
    payment_id UUID NOT NULL REFERENCES payment(id) ON DELETE CASCADE,
    event_type VARCHAR(60) NOT NULL,
    actor_type VARCHAR(20) NOT NULL,
    actor_ref VARCHAR(160),
    from_status VARCHAR(30),
    to_status VARCHAR(30),
    code VARCHAR(80),
    message VARCHAR(500),
    details_json TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_payment_event_actor CHECK (actor_type IN ('USER','ADMIN','SYSTEM','GATEWAY','MIGRATION'))
);

CREATE INDEX idx_payment_event_payment_created
    ON payment_event(payment_id, created_at DESC);
CREATE INDEX idx_payment_event_type_created
    ON payment_event(event_type, created_at DESC);

-- Preserve an honest migration audit marker for existing rows without fabricating gateway activity.
INSERT INTO payment_event(id,payment_id,event_type,actor_type,from_status,to_status,code,message,details_json,created_at)
SELECT md5('v47:migrated:' || p.id::text)::uuid,
       p.id,
       'MIGRATED_TO_V47',
       'MIGRATION',
       p.status,
       p.status,
       'V47',
       'Payment row upgraded to V47 attempt lineage and event timeline',
       '{"source":"flyway"}',
       CURRENT_TIMESTAMP
FROM payment p
ON CONFLICT (id) DO NOTHING;
