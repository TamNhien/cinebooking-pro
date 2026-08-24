-- V51 - Analytics & Forecasting 3.0
-- Adds branch-specific concession cost basis and durable analytics snapshots.
-- Cost basis is intentionally NOT fabricated by migration: an absent row means the cost is unknown.

CREATE TABLE cinema_concession_cost_basis (
    id UUID PRIMARY KEY,
    cinema_id UUID NOT NULL REFERENCES cinema(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES concession_product(id) ON DELETE CASCADE,
    unit_cost NUMERIC(12,2) NOT NULL CHECK (unit_cost >= 0),
    source VARCHAR(40) NOT NULL DEFAULT 'MANUAL',
    updated_by VARCHAR(190),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_cinema_concession_cost_basis UNIQUE (cinema_id, product_id),
    CONSTRAINT ck_cinema_concession_cost_source CHECK (source IN ('MANUAL','REFERENCE','IMPORT'))
);

CREATE INDEX idx_cinema_concession_cost_basis_product
    ON cinema_concession_cost_basis(product_id, cinema_id);

CREATE TABLE analytics_snapshot (
    id UUID PRIMARY KEY,
    cinema_id UUID NOT NULL REFERENCES cinema(id) ON DELETE CASCADE,
    period_kind VARCHAR(12) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    revenue NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (revenue >= 0),
    ticket_revenue NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (ticket_revenue >= 0),
    concession_revenue NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (concession_revenue >= 0),
    concession_cost NUMERIC(14,2),
    gross_margin NUMERIC(14,2),
    bookings BIGINT NOT NULL DEFAULT 0 CHECK (bookings >= 0),
    tickets BIGINT NOT NULL DEFAULT 0 CHECK (tickets >= 0),
    capacity BIGINT NOT NULL DEFAULT 0 CHECK (capacity >= 0),
    occupancy_rate NUMERIC(7,3) NOT NULL DEFAULT 0 CHECK (occupancy_rate >= 0 AND occupancy_rate <= 100),
    cost_coverage_rate NUMERIC(7,3) NOT NULL DEFAULT 100 CHECK (cost_coverage_rate >= 0 AND cost_coverage_rate <= 100),
    forecast_next_7d NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (forecast_next_7d >= 0),
    forecast_algorithm VARCHAR(80) NOT NULL DEFAULT 'V51-WEEKDAY-WEIGHTED-MA-1',
    generated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_analytics_snapshot_period_kind CHECK (period_kind IN ('DAILY','WEEKLY','MONTHLY')),
    CONSTRAINT ck_analytics_snapshot_period_range CHECK (period_end >= period_start),
    CONSTRAINT ck_analytics_snapshot_cost_pair CHECK (
        (concession_cost IS NULL AND gross_margin IS NULL) OR
        (concession_cost IS NOT NULL AND concession_cost >= 0 AND gross_margin IS NOT NULL)
    ),
    CONSTRAINT uq_analytics_snapshot_period UNIQUE (cinema_id, period_kind, period_start)
);

CREATE INDEX idx_analytics_snapshot_cinema_period
    ON analytics_snapshot(cinema_id, period_kind, period_start DESC);
CREATE INDEX idx_analytics_snapshot_generated
    ON analytics_snapshot(generated_at DESC);
