CREATE INDEX IF NOT EXISTS idx_booking_status_created_at ON booking(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_booking_user_created_at ON booking(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_booking_created_at ON payment(booking_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_booking_timeline ON audit_log(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_showtime_start_time ON showtime(start_time);
