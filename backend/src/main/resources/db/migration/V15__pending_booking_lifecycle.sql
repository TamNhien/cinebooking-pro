-- V15: align unpaid-booking lifetime with the 5-minute seat-hold UX.
-- Existing PENDING rows created with the old 10-minute window are clamped to 5 minutes.
-- The application expiry job/lazy cleanup will then release booking_seat rows and refund voucher/points safely.

UPDATE booking
SET expires_at = LEAST(expires_at, created_at + INTERVAL '5 minutes')
WHERE status = 'PENDING'
  AND expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_booking_pending_expiry
    ON booking(expires_at)
    WHERE status = 'PENDING';
