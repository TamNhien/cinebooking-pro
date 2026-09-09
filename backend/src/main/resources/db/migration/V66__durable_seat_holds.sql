-- V66 Booking Consistency & Seat Locking 4.0
-- PostgreSQL becomes the durable authority for short-lived seat holds.
-- Redis remains a TTL mirror/acceleration layer only; losing Redis must not lose ownership state.

CREATE TABLE IF NOT EXISTS seat_hold (
    id UUID PRIMARY KEY,
    showtime_id UUID NOT NULL REFERENCES showtime(id) ON DELETE CASCADE,
    seat_id UUID NOT NULL REFERENCES seat(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    hold_token UUID NOT NULL,
    state VARCHAR(16) NOT NULL DEFAULT 'HELD',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    refreshed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL,
    released_at TIMESTAMPTZ,
    converted_booking_id UUID REFERENCES booking(id) ON DELETE SET NULL,
    last_event VARCHAR(48) NOT NULL DEFAULT 'SEAT_HOLD_CREATED',
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT ck_seat_hold_state CHECK (state IN ('HELD','RELEASED','EXPIRED','CONVERTED')),
    CONSTRAINT ck_seat_hold_expiry CHECK (expires_at > created_at)
);

-- Exactly one durable active owner for a seat/showtime. Expired records are first transitioned
-- out of HELD inside the same seat-row lock before a replacement hold can be inserted.
CREATE UNIQUE INDEX IF NOT EXISTS uq_seat_hold_active
    ON seat_hold(showtime_id, seat_id)
    WHERE state='HELD';

CREATE INDEX IF NOT EXISTS idx_seat_hold_active_showtime
    ON seat_hold(showtime_id, expires_at)
    WHERE state='HELD';

CREATE INDEX IF NOT EXISTS idx_seat_hold_active_user
    ON seat_hold(user_id, showtime_id, expires_at)
    WHERE state='HELD';

CREATE INDEX IF NOT EXISTS idx_seat_hold_token
    ON seat_hold(hold_token, state);

CREATE INDEX IF NOT EXISTS idx_seat_hold_expiry_scan
    ON seat_hold(expires_at, id)
    WHERE state='HELD';

CREATE INDEX IF NOT EXISTS idx_seat_hold_recent
    ON seat_hold(created_at DESC);

COMMENT ON TABLE seat_hold IS 'V66 durable seat-hold authority. Redis mirrors active rows but is not authoritative.';
COMMENT ON COLUMN seat_hold.hold_token IS 'One logical token may cover multiple seats in the same hold request.';
COMMENT ON COLUMN seat_hold.state IS 'HELD, RELEASED, EXPIRED, or CONVERTED.';
COMMENT ON COLUMN seat_hold.converted_booking_id IS 'Booking created from this hold after checkout wins the DB seat invariant.';
