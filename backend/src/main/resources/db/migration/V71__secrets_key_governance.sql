-- V71 Secrets & Key Governance 5.0
-- Metadata-only governance. No secret values are stored in these tables.

CREATE TABLE secret_rotation_policy (
    id UUID PRIMARY KEY,
    policy_key VARCHAR(80) NOT NULL UNIQUE,
    secret_name VARCHAR(80) NOT NULL,
    secret_class VARCHAR(40) NOT NULL,
    owner_team VARCHAR(80) NOT NULL,
    rotation_days INTEGER NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    auto_rotation_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    required_when VARCHAR(200),
    note VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_secret_rotation_days CHECK (rotation_days BETWEEN 1 AND 3650),
    CONSTRAINT ck_secret_class CHECK (secret_class IN ('AUTH','MAIL','PAYMENT','PUSH','INFRA'))
);

CREATE TABLE secret_rotation_event (
    id UUID PRIMARY KEY,
    event_key VARCHAR(80) NOT NULL UNIQUE,
    policy_id UUID NOT NULL REFERENCES secret_rotation_policy(id) ON DELETE RESTRICT,
    event_type VARCHAR(20) NOT NULL,
    actor_user_id UUID REFERENCES app_user(id) ON DELETE RESTRICT,
    provider_ref VARCHAR(160),
    key_fingerprint VARCHAR(128),
    note VARCHAR(1000),
    occurred_at TIMESTAMPTZ NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_secret_rotation_event_type CHECK (event_type IN ('ROTATED','VERIFIED','REVOKED','INCIDENT')),
    CONSTRAINT ck_secret_rotation_fingerprint CHECK (key_fingerprint IS NULL OR char_length(trim(key_fingerprint)) BETWEEN 8 AND 128)
);

CREATE INDEX idx_secret_policy_enabled ON secret_rotation_policy(enabled, policy_key);
CREATE INDEX idx_secret_policy_owner ON secret_rotation_policy(owner_team, policy_key);
CREATE INDEX idx_secret_event_policy_occurred ON secret_rotation_event(policy_id, occurred_at DESC);
CREATE INDEX idx_secret_event_type_occurred ON secret_rotation_event(event_type, occurred_at DESC);
CREATE INDEX idx_secret_event_recorded ON secret_rotation_event(recorded_at DESC);

-- Operational metadata only. These rows identify secret classes but never contain credentials.
INSERT INTO secret_rotation_policy(id,policy_key,secret_name,secret_class,owner_team,rotation_days,enabled,auto_rotation_enabled,required_when,note) VALUES
('71000000-0000-0000-0000-000000000001','JWT_SIGNING_SECRET','JWT_SECRET','AUTH','PLATFORM',90,true,false,'Always required for API authentication','Rotate through the deployment secret manager; record only fingerprint/evidence here.'),
('71000000-0000-0000-0000-000000000002','SMTP_APP_PASSWORD','MAIL_PASSWORD','MAIL','PLATFORM',180,true,false,'Required only when outbound mail is enabled','Never persist the SMTP password in CineBooking tables.'),
('71000000-0000-0000-0000-000000000003','VNPAY_HASH_SECRET','VNPAY_HASH_SECRET','PAYMENT','PAYMENTS',180,true,false,'Required when VNPay production mode is configured','Record provider reference and a non-secret fingerprint only.'),
('71000000-0000-0000-0000-000000000004','MOMO_SECRET_KEY','MOMO_SECRET_KEY','PAYMENT','PAYMENTS',180,true,false,'Required when MoMo production mode is configured','Record provider reference and a non-secret fingerprint only.'),
('71000000-0000-0000-0000-000000000005','WEB_PUSH_VAPID_PRIVATE_KEY','WEB_PUSH_VAPID_PRIVATE_KEY','PUSH','PLATFORM',365,true,false,'Required only when Web Push is enabled','Private VAPID material remains outside the database.');

CREATE OR REPLACE FUNCTION v71_secret_rotation_event_immutable() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'V71 secret rotation evidence is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_v71_secret_rotation_event_immutable
BEFORE UPDATE OR DELETE ON secret_rotation_event
FOR EACH ROW EXECUTE FUNCTION v71_secret_rotation_event_immutable();
