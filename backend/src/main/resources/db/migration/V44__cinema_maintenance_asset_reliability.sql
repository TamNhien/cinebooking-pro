-- V44 - Cinema Maintenance & Asset Reliability 2.0
-- Adds equipment registry, work-order lifecycle and immutable maintenance history.

CREATE TABLE cinema_equipment_asset (
    id UUID PRIMARY KEY,
    cinema_id UUID NOT NULL REFERENCES cinema(id) ON DELETE CASCADE,
    auditorium_id UUID REFERENCES auditorium(id) ON DELETE SET NULL,
    asset_code VARCHAR(40) NOT NULL UNIQUE,
    name VARCHAR(160) NOT NULL,
    category VARCHAR(30) NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'OPERATIONAL',
    vendor VARCHAR(120),
    serial_number VARCHAR(120),
    installed_on DATE,
    last_service_at TIMESTAMPTZ,
    next_service_due DATE,
    note VARCHAR(1000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_equipment_category CHECK (category IN ('PROJECTOR','AUDIO','HVAC','SCREEN','POS','NETWORK','POWER','SAFETY','OTHER')),
    CONSTRAINT ck_equipment_status CHECK (status IN ('OPERATIONAL','DEGRADED','OUT_OF_SERVICE','MAINTENANCE'))
);

CREATE INDEX idx_equipment_cinema_status
    ON cinema_equipment_asset(cinema_id, status, category);
CREATE INDEX idx_equipment_service_due
    ON cinema_equipment_asset(cinema_id, next_service_due)
    WHERE next_service_due IS NOT NULL;
CREATE INDEX idx_equipment_auditorium
    ON cinema_equipment_asset(auditorium_id)
    WHERE auditorium_id IS NOT NULL;

CREATE TABLE maintenance_work_order (
    id UUID PRIMARY KEY,
    cinema_id UUID NOT NULL REFERENCES cinema(id) ON DELETE CASCADE,
    auditorium_id UUID REFERENCES auditorium(id) ON DELETE SET NULL,
    asset_id UUID REFERENCES cinema_equipment_asset(id) ON DELETE SET NULL,
    source_incident_id UUID REFERENCES staff_incident(id) ON DELETE SET NULL,
    title VARCHAR(160) NOT NULL,
    description VARCHAR(2000) NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    status VARCHAR(24) NOT NULL DEFAULT 'OPEN',
    assigned_to UUID REFERENCES app_user(id) ON DELETE SET NULL,
    due_at TIMESTAMPTZ,
    resolution_note VARCHAR(1200),
    created_by UUID NOT NULL REFERENCES app_user(id),
    started_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES app_user(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_maintenance_priority CHECK (priority IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    CONSTRAINT ck_maintenance_status CHECK (status IN ('OPEN','IN_PROGRESS','BLOCKED','RESOLVED','CANCELLED'))
);

CREATE INDEX idx_maintenance_work_order_cinema_status_created
    ON maintenance_work_order(cinema_id, status, created_at DESC);
CREATE INDEX idx_maintenance_work_order_assignee_status
    ON maintenance_work_order(assigned_to, status, due_at)
    WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_maintenance_work_order_due
    ON maintenance_work_order(cinema_id, due_at)
    WHERE status IN ('OPEN','IN_PROGRESS','BLOCKED') AND due_at IS NOT NULL;
CREATE INDEX idx_maintenance_work_order_asset
    ON maintenance_work_order(asset_id, created_at DESC)
    WHERE asset_id IS NOT NULL;

CREATE TABLE maintenance_work_order_event (
    id UUID PRIMARY KEY,
    work_order_id UUID NOT NULL REFERENCES maintenance_work_order(id) ON DELETE CASCADE,
    event_type VARCHAR(30) NOT NULL,
    from_status VARCHAR(24),
    to_status VARCHAR(24),
    note VARCHAR(1200),
    actor_user_id UUID NOT NULL REFERENCES app_user(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_maintenance_event_order_created
    ON maintenance_work_order_event(work_order_id, created_at ASC);

CREATE OR REPLACE FUNCTION v44_reject_maintenance_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'maintenance_work_order_event is append-only';
END;
$$;

CREATE TRIGGER trg_v44_maintenance_event_immutable
BEFORE UPDATE OR DELETE ON maintenance_work_order_event
FOR EACH ROW EXECUTE FUNCTION v44_reject_maintenance_event_mutation();
