-- V72 Software Supply Chain Integrity 5.0
-- Append-only metadata evidence for release artifacts and dependency/security scan posture.
-- No artifact binaries, package contents, credentials, or scanner reports are stored in these tables.

CREATE TABLE software_artifact_evidence (
    id UUID PRIMARY KEY,
    artifact_key VARCHAR(100) NOT NULL UNIQUE,
    artifact_type VARCHAR(40) NOT NULL,
    version_label VARCHAR(80) NOT NULL,
    sha256 VARCHAR(64) NOT NULL,
    source_commit VARCHAR(64),
    build_ref VARCHAR(160),
    sbom_ref VARCHAR(200),
    actor_user_id UUID REFERENCES app_user(id) ON DELETE RESTRICT,
    note VARCHAR(1000),
    artifact_created_at TIMESTAMPTZ NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_software_artifact_type CHECK (artifact_type IN ('BACKEND_JAR','FRONTEND_BUNDLE','CONTAINER_IMAGE','DEPENDENCY_INVENTORY')),
    CONSTRAINT ck_software_artifact_sha256 CHECK (sha256 ~ '^[a-f0-9]{64}$')
);

CREATE TABLE software_supply_chain_scan (
    id UUID PRIMARY KEY,
    scan_key VARCHAR(100) NOT NULL UNIQUE,
    artifact_id UUID NOT NULL REFERENCES software_artifact_evidence(id) ON DELETE RESTRICT,
    scanner VARCHAR(80) NOT NULL,
    scanner_version VARCHAR(80),
    report_fingerprint VARCHAR(128) NOT NULL,
    critical_count INTEGER NOT NULL DEFAULT 0,
    high_count INTEGER NOT NULL DEFAULT 0,
    medium_count INTEGER NOT NULL DEFAULT 0,
    low_count INTEGER NOT NULL DEFAULT 0,
    decision VARCHAR(16) NOT NULL,
    actor_user_id UUID REFERENCES app_user(id) ON DELETE RESTRICT,
    note VARCHAR(1000),
    scanned_at TIMESTAMPTZ NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_supply_chain_scan_counts CHECK (critical_count >= 0 AND high_count >= 0 AND medium_count >= 0 AND low_count >= 0),
    CONSTRAINT ck_supply_chain_scan_decision CHECK (decision IN ('PASS','WARN','FAIL')),
    CONSTRAINT ck_supply_chain_report_fingerprint CHECK (char_length(trim(report_fingerprint)) BETWEEN 8 AND 128)
);

CREATE INDEX idx_software_artifact_recorded ON software_artifact_evidence(recorded_at DESC);
CREATE INDEX idx_software_artifact_type_created ON software_artifact_evidence(artifact_type, artifact_created_at DESC);
CREATE INDEX idx_software_artifact_version ON software_artifact_evidence(version_label, recorded_at DESC);
CREATE INDEX idx_supply_chain_scan_artifact_scanned ON software_supply_chain_scan(artifact_id, scanned_at DESC);
CREATE INDEX idx_supply_chain_scan_decision_scanned ON software_supply_chain_scan(decision, scanned_at DESC);
CREATE INDEX idx_supply_chain_scan_recorded ON software_supply_chain_scan(recorded_at DESC);

CREATE OR REPLACE FUNCTION v72_supply_chain_evidence_immutable() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'V72 software supply-chain evidence is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_v72_software_artifact_immutable
BEFORE UPDATE OR DELETE ON software_artifact_evidence
FOR EACH ROW EXECUTE FUNCTION v72_supply_chain_evidence_immutable();

CREATE TRIGGER trg_v72_supply_chain_scan_immutable
BEFORE UPDATE OR DELETE ON software_supply_chain_scan
FOR EACH ROW EXECUTE FUNCTION v72_supply_chain_evidence_immutable();
