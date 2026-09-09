-- V69 - Backup & Disaster Recovery 5.0 evidence catalog.
-- Backup archives remain outside PostgreSQL under ./backups; these tables keep
-- append-only verification/drill evidence so the admin control plane can measure
-- RPO/RTO readiness without storing database dumps or secrets in the database.

CREATE TABLE dr_backup_record (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_key VARCHAR(160) NOT NULL UNIQUE,
    storage_name VARCHAR(255) NOT NULL,
    checksum_sha256 CHAR(64) NOT NULL,
    size_bytes BIGINT NOT NULL,
    latest_flyway_version INTEGER NOT NULL,
    public_table_count INTEGER NOT NULL,
    source_commit VARCHAR(64),
    strategy_version VARCHAR(64) NOT NULL DEFAULT 'V69-BACKUP-DR-5',
    created_at TIMESTAMPTZ NOT NULL,
    verified_at TIMESTAMPTZ NOT NULL,
    retention_until TIMESTAMPTZ,
    manifest_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_dr_backup_checksum CHECK (checksum_sha256 ~ '^[0-9a-f]{64}$'),
    CONSTRAINT ck_dr_backup_size CHECK (size_bytes > 0),
    CONSTRAINT ck_dr_backup_schema CHECK (latest_flyway_version >= 1 AND public_table_count >= 1),
    CONSTRAINT ck_dr_backup_times CHECK (verified_at >= created_at),
    CONSTRAINT ck_dr_backup_strategy CHECK (strategy_version = 'V69-BACKUP-DR-5')
);

CREATE INDEX idx_dr_backup_verified ON dr_backup_record(verified_at DESC);
CREATE INDEX idx_dr_backup_created ON dr_backup_record(created_at DESC);
CREATE INDEX idx_dr_backup_retention ON dr_backup_record(retention_until) WHERE retention_until IS NOT NULL;
CREATE INDEX idx_dr_backup_checksum ON dr_backup_record(checksum_sha256);

CREATE TABLE dr_restore_drill (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drill_key VARCHAR(160) NOT NULL UNIQUE,
    backup_id UUID NOT NULL REFERENCES dr_backup_record(id) ON DELETE RESTRICT,
    status VARCHAR(16) NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL,
    restore_duration_seconds NUMERIC(12,3),
    rpo_seconds BIGINT,
    restored_flyway_version INTEGER,
    restored_public_table_count INTEGER,
    checksum_verified BOOLEAN NOT NULL DEFAULT false,
    critical_catalog_verified BOOLEAN NOT NULL DEFAULT false,
    message TEXT,
    evidence_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_dr_drill_status CHECK (status IN ('SUCCESS','FAILED')),
    CONSTRAINT ck_dr_drill_times CHECK (completed_at >= started_at),
    CONSTRAINT ck_dr_drill_duration CHECK (restore_duration_seconds IS NULL OR restore_duration_seconds >= 0),
    CONSTRAINT ck_dr_drill_rpo CHECK (rpo_seconds IS NULL OR rpo_seconds >= 0),
    CONSTRAINT ck_dr_drill_success_evidence CHECK (
        status = 'FAILED' OR (
            restore_duration_seconds IS NOT NULL AND
            rpo_seconds IS NOT NULL AND
            restored_flyway_version IS NOT NULL AND
            restored_public_table_count IS NOT NULL AND
            checksum_verified = true AND
            critical_catalog_verified = true
        )
    )
);

CREATE INDEX idx_dr_drill_completed ON dr_restore_drill(completed_at DESC);
CREATE INDEX idx_dr_drill_status_completed ON dr_restore_drill(status, completed_at DESC);
CREATE INDEX idx_dr_drill_backup ON dr_restore_drill(backup_id, completed_at DESC);

CREATE OR REPLACE FUNCTION v69_block_dr_evidence_mutation()
RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'V69 DR evidence is append-only; % is not allowed on %', TG_OP, TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_v69_dr_backup_immutable
BEFORE UPDATE OR DELETE ON dr_backup_record
FOR EACH ROW EXECUTE FUNCTION v69_block_dr_evidence_mutation();

CREATE TRIGGER trg_v69_dr_drill_immutable
BEFORE UPDATE OR DELETE ON dr_restore_drill
FOR EACH ROW EXECUTE FUNCTION v69_block_dr_evidence_mutation();
