-- V42 - immutable double-entry financial ledger and reconciliation operations.

CREATE TABLE financial_ledger_entry (
    id UUID PRIMARY KEY,
    event_key VARCHAR(180) NOT NULL UNIQUE,
    event_type VARCHAR(40) NOT NULL,
    booking_id UUID REFERENCES booking(id),
    payment_id UUID REFERENCES payment(id),
    user_id UUID REFERENCES app_user(id),
    source VARCHAR(30) NOT NULL DEFAULT 'CINEBOOKING',
    description TEXT,
    occurred_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_financial_ledger_event_type CHECK (event_type IN ('PAYMENT_CAPTURED','REFUND_SETTLED'))
);

CREATE TABLE financial_ledger_line (
    id UUID PRIMARY KEY,
    entry_id UUID NOT NULL REFERENCES financial_ledger_entry(id) ON DELETE RESTRICT,
    account_code VARCHAR(80) NOT NULL,
    direction VARCHAR(6) NOT NULL,
    amount NUMERIC(14,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'VND',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_financial_ledger_direction CHECK (direction IN ('DEBIT','CREDIT')),
    CONSTRAINT ck_financial_ledger_amount CHECK (amount > 0),
    CONSTRAINT ck_financial_ledger_currency CHECK (currency = 'VND')
);

CREATE INDEX idx_financial_ledger_entry_occurred ON financial_ledger_entry(occurred_at DESC);
CREATE INDEX idx_financial_ledger_entry_payment ON financial_ledger_entry(payment_id, occurred_at DESC);
CREATE INDEX idx_financial_ledger_entry_booking ON financial_ledger_entry(booking_id, occurred_at DESC);
CREATE INDEX idx_financial_ledger_line_entry ON financial_ledger_line(entry_id);
CREATE INDEX idx_financial_ledger_line_account ON financial_ledger_line(account_code, created_at DESC);

-- Backfill every gateway-confirmed historical capture so V42 starts with a complete ledger.
INSERT INTO financial_ledger_entry(id,event_key,event_type,booking_id,payment_id,user_id,source,description,occurred_at,created_at)
SELECT gen_random_uuid(), 'PAYMENT_CAPTURE:' || p.id, 'PAYMENT_CAPTURED', p.booking_id, p.id, p.payer_user_id,
       'V42_BACKFILL', 'Historical payment capture backfill', p.paid_at, now()
FROM payment p
WHERE p.status IN ('SUCCESS','REFUNDED','REVIEW') AND p.paid_at IS NOT NULL
ON CONFLICT (event_key) DO NOTHING;

INSERT INTO financial_ledger_line(id,entry_id,account_code,direction,amount,currency,created_at)
SELECT gen_random_uuid(), e.id,
       'PAYMENT_CLEARING:' || LEFT(regexp_replace(upper(p.provider),'[^A-Z0-9_]','_','g'),50),
       'DEBIT', p.amount, 'VND', now()
FROM payment p
JOIN financial_ledger_entry e ON e.event_key='PAYMENT_CAPTURE:' || p.id
WHERE p.status IN ('SUCCESS','REFUNDED','REVIEW') AND p.paid_at IS NOT NULL AND p.amount > 0;

INSERT INTO financial_ledger_line(id,entry_id,account_code,direction,amount,currency,created_at)
SELECT gen_random_uuid(), e.id, 'CUSTOMER_FUNDS_CAPTURED', 'CREDIT', p.amount, 'VND', now()
FROM payment p
JOIN financial_ledger_entry e ON e.event_key='PAYMENT_CAPTURE:' || p.id
WHERE p.status IN ('SUCCESS','REFUNDED','REVIEW') AND p.paid_at IS NOT NULL AND p.amount > 0;

INSERT INTO financial_ledger_entry(id,event_key,event_type,booking_id,payment_id,user_id,source,description,occurred_at,created_at)
SELECT gen_random_uuid(), 'REFUND:' || p.id, 'REFUND_SETTLED', p.booking_id, p.id, p.payer_user_id,
       'V42_BACKFILL', 'Historical refund settlement backfill', p.refunded_at, now()
FROM payment p
WHERE p.status='REFUNDED' AND p.refunded_at IS NOT NULL AND COALESCE(p.refunded_amount,0) > 0
ON CONFLICT (event_key) DO NOTHING;

INSERT INTO financial_ledger_line(id,entry_id,account_code,direction,amount,currency,created_at)
SELECT gen_random_uuid(), e.id, 'CUSTOMER_FUNDS_REFUNDED', 'DEBIT', p.refunded_amount, 'VND', now()
FROM payment p
JOIN financial_ledger_entry e ON e.event_key='REFUND:' || p.id
WHERE p.status='REFUNDED' AND p.refunded_at IS NOT NULL AND COALESCE(p.refunded_amount,0) > 0;

DO $$
BEGIN
    IF EXISTS (
        SELECT entry_id
        FROM financial_ledger_line
        GROUP BY entry_id
        HAVING SUM(CASE WHEN direction='DEBIT' THEN amount ELSE 0 END)
             <> SUM(CASE WHEN direction='CREDIT' THEN amount ELSE 0 END)
    ) THEN
        RAISE EXCEPTION 'V42 backfill produced an unbalanced financial ledger entry';
    END IF;
END;
$$;

INSERT INTO financial_ledger_line(id,entry_id,account_code,direction,amount,currency,created_at)
SELECT gen_random_uuid(), e.id,
       'PAYMENT_CLEARING:' || LEFT(regexp_replace(upper(p.provider),'[^A-Z0-9_]','_','g'),50),
       'CREDIT', p.refunded_amount, 'VND', now()
FROM payment p
JOIN financial_ledger_entry e ON e.event_key='REFUND:' || p.id
WHERE p.status='REFUNDED' AND p.refunded_at IS NOT NULL AND COALESCE(p.refunded_amount,0) > 0;

DO $$
BEGIN
    IF EXISTS (
        SELECT entry_id
        FROM financial_ledger_line
        GROUP BY entry_id
        HAVING SUM(CASE WHEN direction='DEBIT' THEN amount ELSE 0 END)
             <> SUM(CASE WHEN direction='CREDIT' THEN amount ELSE 0 END)
    ) THEN
        RAISE EXCEPTION 'V42 backfill produced an unbalanced financial ledger entry';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION v42_block_financial_ledger_mutation()
RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'V42 financial ledger is append-only; % is not allowed on %', TG_OP, TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_v42_financial_ledger_entry_immutable
BEFORE UPDATE OR DELETE ON financial_ledger_entry
FOR EACH ROW EXECUTE FUNCTION v42_block_financial_ledger_mutation();

CREATE TRIGGER trg_v42_financial_ledger_line_immutable
BEFORE UPDATE OR DELETE ON financial_ledger_line
FOR EACH ROW EXECUTE FUNCTION v42_block_financial_ledger_mutation();

CREATE OR REPLACE FUNCTION v42_assert_financial_entry_balanced()
RETURNS trigger AS $$
DECLARE
    debit_total NUMERIC(14,2);
    credit_total NUMERIC(14,2);
BEGIN
    SELECT COALESCE(SUM(CASE WHEN direction='DEBIT' THEN amount ELSE 0 END),0),
           COALESCE(SUM(CASE WHEN direction='CREDIT' THEN amount ELSE 0 END),0)
      INTO debit_total, credit_total
      FROM financial_ledger_line
     WHERE entry_id = NEW.entry_id;

    IF debit_total <> credit_total THEN
        RAISE EXCEPTION 'Unbalanced financial ledger entry %: debit %, credit %', NEW.entry_id, debit_total, credit_total;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER trg_v42_financial_ledger_balanced
AFTER INSERT ON financial_ledger_line
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION v42_assert_financial_entry_balanced();

CREATE TABLE financial_reconciliation_run (
    id UUID PRIMARY KEY,
    run_key VARCHAR(120) NOT NULL UNIQUE,
    business_date DATE NOT NULL,
    status VARCHAR(12) NOT NULL,
    payment_count INTEGER NOT NULL DEFAULT 0,
    payment_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    ledger_capture_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    refund_count INTEGER NOT NULL DEFAULT 0,
    refund_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    ledger_refund_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    loyalty_users_checked INTEGER NOT NULL DEFAULT 0,
    loyalty_mismatch_count INTEGER NOT NULL DEFAULT 0,
    issue_count INTEGER NOT NULL DEFAULT 0,
    started_by VARCHAR(190) NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    finished_at TIMESTAMPTZ,
    CONSTRAINT ck_financial_reconciliation_status CHECK (status IN ('RUNNING','CLEAN','ISSUES','FAILED')),
    CONSTRAINT ck_financial_reconciliation_counts CHECK (payment_count >= 0 AND refund_count >= 0 AND loyalty_users_checked >= 0 AND loyalty_mismatch_count >= 0 AND issue_count >= 0)
);

CREATE INDEX idx_financial_reconciliation_run_date ON financial_reconciliation_run(business_date DESC, started_at DESC);

CREATE TABLE financial_reconciliation_issue (
    id UUID PRIMARY KEY,
    run_id UUID NOT NULL REFERENCES financial_reconciliation_run(id) ON DELETE CASCADE,
    issue_type VARCHAR(50) NOT NULL,
    severity VARCHAR(10) NOT NULL,
    entity_type VARCHAR(30) NOT NULL,
    entity_id VARCHAR(100),
    expected_value NUMERIC(14,2),
    actual_value NUMERIC(14,2),
    message TEXT NOT NULL,
    status VARCHAR(12) NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ,
    resolved_by VARCHAR(190),
    CONSTRAINT ck_financial_reconciliation_issue_severity CHECK (severity IN ('INFO','WARNING','CRITICAL')),
    CONSTRAINT ck_financial_reconciliation_issue_status CHECK (status IN ('OPEN','RESOLVED'))
);

CREATE INDEX idx_financial_reconciliation_issue_run ON financial_reconciliation_issue(run_id, created_at ASC);
CREATE INDEX idx_financial_reconciliation_issue_open ON financial_reconciliation_issue(status, severity, created_at DESC) WHERE status='OPEN';
