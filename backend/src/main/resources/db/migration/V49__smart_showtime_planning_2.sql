-- CineBooking V49 - Smart Showtime Planning 2.0
-- Adds durable audit for smart scheduling runs and provenance on generated showtimes.

CREATE TABLE showtime_planning_run (
    id UUID PRIMARY KEY,
    cinema_id UUID NOT NULL REFERENCES cinema(id) ON DELETE RESTRICT,
    movie_id UUID NOT NULL REFERENCES movie(id) ON DELETE RESTRICT,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    target_per_day INTEGER NOT NULL CHECK (target_per_day BETWEEN 1 AND 12),
    operating_start TIME NOT NULL,
    operating_end TIME NOT NULL,
    interval_minutes INTEGER NOT NULL CHECK (interval_minutes BETWEEN 15 AND 120),
    base_price NUMERIC(12,2) NOT NULL CHECK (base_price >= 0),
    requested_slots INTEGER NOT NULL DEFAULT 0 CHECK (requested_slots >= 0),
    suggested_slots INTEGER NOT NULL DEFAULT 0 CHECK (suggested_slots >= 0),
    conflict_count INTEGER NOT NULL DEFAULT 0 CHECK (conflict_count >= 0),
    historical_samples INTEGER NOT NULL DEFAULT 0 CHECK (historical_samples >= 0),
    strategy VARCHAR(40) NOT NULL DEFAULT 'DEMAND_BALANCED',
    status VARCHAR(20) NOT NULL DEFAULT 'COMMITTED',
    created_by VARCHAR(255),
    plan_json TEXT NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    committed_at TIMESTAMPTZ,
    CONSTRAINT ck_showtime_planning_run_dates CHECK (to_date >= from_date),
    CONSTRAINT ck_showtime_planning_run_window CHECK (operating_end > operating_start),
    CONSTRAINT ck_showtime_planning_run_status CHECK (status IN ('COMMITTED','FAILED'))
);

CREATE INDEX idx_showtime_planning_run_cinema_created
    ON showtime_planning_run(cinema_id, created_at DESC);
CREATE INDEX idx_showtime_planning_run_movie_created
    ON showtime_planning_run(movie_id, created_at DESC);

ALTER TABLE showtime
    ADD COLUMN planning_source VARCHAR(16) NOT NULL DEFAULT 'MANUAL',
    ADD COLUMN planning_run_id UUID REFERENCES showtime_planning_run(id) ON DELETE SET NULL,
    ADD COLUMN planning_score NUMERIC(5,2);

ALTER TABLE showtime
    ADD CONSTRAINT ck_showtime_planning_source
    CHECK (planning_source IN ('MANUAL','BATCH','SMART'));

ALTER TABLE showtime
    ADD CONSTRAINT ck_showtime_planning_score
    CHECK (planning_score IS NULL OR (planning_score >= 0 AND planning_score <= 100));

CREATE INDEX idx_showtime_planning_run_id ON showtime(planning_run_id);
CREATE INDEX idx_showtime_planning_source_start ON showtime(planning_source, start_time DESC);
