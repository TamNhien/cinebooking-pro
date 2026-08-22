-- V45 - Customer Support & Service Recovery 2.0
-- Adds customer support cases, SLA tracking and immutable conversation/event history.

CREATE TABLE customer_support_case (
    id UUID PRIMARY KEY,
    case_number VARCHAR(24) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES booking(id) ON DELETE SET NULL,
    cinema_id UUID REFERENCES cinema(id) ON DELETE SET NULL,
    category VARCHAR(30) NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    status VARCHAR(24) NOT NULL DEFAULT 'OPEN',
    subject VARCHAR(180) NOT NULL,
    description VARCHAR(3000) NOT NULL,
    assigned_to UUID REFERENCES app_user(id) ON DELETE SET NULL,
    sla_due_at TIMESTAMPTZ NOT NULL,
    resolution_note VARCHAR(1500),
    last_customer_message_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_staff_message_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_support_category CHECK (category IN ('BOOKING','PAYMENT','REFUND','TICKET','CINEMA_EXPERIENCE','STAFF','OTHER')),
    CONSTRAINT ck_support_priority CHECK (priority IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    CONSTRAINT ck_support_status CHECK (status IN ('OPEN','IN_PROGRESS','WAITING_CUSTOMER','RESOLVED','CLOSED'))
);

CREATE INDEX idx_support_case_user_created
    ON customer_support_case(user_id, created_at DESC);
CREATE INDEX idx_support_case_cinema_status_created
    ON customer_support_case(cinema_id, status, created_at DESC);
CREATE INDEX idx_support_case_sla
    ON customer_support_case(status, sla_due_at)
    WHERE status IN ('OPEN','IN_PROGRESS','WAITING_CUSTOMER');
CREATE INDEX idx_support_case_assignee
    ON customer_support_case(assigned_to, status, updated_at DESC)
    WHERE assigned_to IS NOT NULL;

CREATE TABLE customer_support_case_event (
    id UUID PRIMARY KEY,
    case_id UUID NOT NULL REFERENCES customer_support_case(id) ON DELETE CASCADE,
    event_type VARCHAR(32) NOT NULL,
    from_status VARCHAR(24),
    to_status VARCHAR(24),
    visibility VARCHAR(16) NOT NULL DEFAULT 'CUSTOMER',
    message VARCHAR(3000),
    actor_user_id UUID NOT NULL REFERENCES app_user(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_support_event_visibility CHECK (visibility IN ('CUSTOMER','INTERNAL'))
);

CREATE INDEX idx_support_event_case_created
    ON customer_support_case_event(case_id, created_at ASC);

CREATE OR REPLACE FUNCTION v45_reject_support_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'customer_support_case_event is append-only';
END;
$$;

CREATE TRIGGER trg_v45_support_event_immutable
BEFORE UPDATE OR DELETE ON customer_support_case_event
FOR EACH ROW EXECUTE FUNCTION v45_reject_support_event_mutation();
