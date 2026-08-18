CREATE TABLE auditorium_blackout (
    id UUID PRIMARY KEY,
    auditorium_id UUID NOT NULL REFERENCES auditorium(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    reason VARCHAR(300) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_auditorium_blackout_window CHECK (end_time > start_time)
);

CREATE INDEX idx_auditorium_blackout_room_time
    ON auditorium_blackout(auditorium_id, start_time, end_time);
