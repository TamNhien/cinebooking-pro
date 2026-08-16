-- V20 adds read-optimized indexes for Analytics V2. No business data is modified.
CREATE INDEX IF NOT EXISTS idx_booking_confirmed_at_status
    ON booking(confirmed_at DESC, status)
    WHERE confirmed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_booking_refunded_at_status
    ON booking(refunded_at DESC, status)
    WHERE refunded_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_paid_at_status
    ON payment(paid_at DESC, status)
    WHERE paid_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_created_at_status
    ON payment(created_at DESC, status);

CREATE INDEX IF NOT EXISTS idx_showtime_auditorium_start
    ON showtime(auditorium_id, start_time DESC);

CREATE INDEX IF NOT EXISTS idx_ticket_checkin_checked_in_at
    ON ticket_checkin_log(checked_in_at DESC);
