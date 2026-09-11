-- CineBooking V77.0.9/V77.0.10 compatibility localizer.
-- Normalize only mutable human-readable display text to Vietnamese.
-- Machine-safe enum/status/action codes are intentionally preserved.
-- IMPORTANT: V42 financial_ledger_entry is append-only. Existing ledger rows are
-- never UPDATEd here; new ledger descriptions are written in Vietnamese and legacy
-- descriptions are localized by the API presentation layer.
BEGIN;

UPDATE user_notification
SET title = 'Mã ưu đãi sắp hết hạn'
WHERE title = 'Voucher sắp hết hạn';

UPDATE user_notification
SET title = 'Vé đã sẵn sàng để soát vé'
WHERE title = 'Vé đã sẵn sàng để check-in';

UPDATE user_notification
SET message = 'Bạn có mã ưu đãi sắp hết hạn, hãy sử dụng trước thời hạn.'
WHERE message = 'Bạn có voucher sắp hết hạn, hãy sử dụng trước thời hạn.';

UPDATE user_notification
SET message = 'Lượt đặt vé của bạn đã được xác nhận.'
WHERE message = 'Booking của bạn đã được xác nhận.';

UPDATE audit_log
SET details = regexp_replace(details, '^Booking ([0-9]+) đã được xác nhận và ghi nhận thanh toán\.$', 'Lượt đặt vé \1 đã được xác nhận và ghi nhận thanh toán.')
WHERE action = 'BOOKING_CONFIRMED'
  AND details ~ '^Booking [0-9]+ đã được xác nhận và ghi nhận thanh toán\.$';

-- financial_ledger_entry is immutable by V42 design. Do not update it.

UPDATE customer_support_case
SET description = 'Ứng dụng không hiển thị mã QR của lượt đặt vé đã xác nhận.'
WHERE description = 'Ứng dụng không hiển thị mã QR của booking đã xác nhận.';

UPDATE staff_incident
SET description = 'Máy quét QR tại cổng phản hồi chậm khi soát vé.'
WHERE description = 'Máy quét QR tại cổng phản hồi chậm khi check-in.';

-- maintenance_work_order_event is immutable by V44 design. Do not update it.

UPDATE loyalty_reward
SET name = replace(name, 'Voucher', 'Mã ưu đãi')
WHERE name LIKE 'Voucher %';

UPDATE loyalty_reward
SET description = 'Mã ưu đãi đổi bằng điểm thành viên'
WHERE description = 'Voucher đổi bằng điểm thành viên';

UPDATE customer_support_case
SET subject = replace(subject, 'email', 'thư điện tử')
WHERE subject ILIKE '%email%';

UPDATE customer_support_case
SET description = replace(description, 'email', 'thư điện tử')
WHERE description ILIKE '%email%';

COMMIT;
