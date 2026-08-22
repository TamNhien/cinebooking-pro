-- CineBooking demo seed/repair for the 47 tables shown in pgAdmin (V45 schema).
-- Adds/repairs 10 deterministic demo rows in every V45 application table, EXCEPT movie.
-- movie intentionally reuses the eight canonical films already shipped by V29; no "Phim Demo" rows are created.
-- flyway_schema_history is intentionally NOT modified because it is Flyway system metadata.
-- The runner copies this UTF-8 file into the PostgreSQL container and executes it there, avoiding Windows pipe/code-page corruption.
-- Re-running repairs previously corrupted DEMO45 human-readable text and does not duplicate deterministic rows.
-- Demo login users use password: Demo@123

BEGIN;
SET LOCAL client_encoding = 'UTF8';

CREATE TEMP TABLE seed45_movie_map(
    n integer PRIMARY KEY,
    movie_id uuid NOT NULL
) ON COMMIT DROP;

INSERT INTO seed45_movie_map(n, movie_id) VALUES
(1,  '11111111-1111-1111-1111-111111111111'),
(2,  '22222222-2222-2222-2222-222222222222'),
(3,  '88888888-8888-8888-8888-888888888888'),
(4,  '99999999-9999-9999-9999-999999999999'),
(5,  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
(6,  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
(7,  'cccccccc-cccc-cccc-cccc-cccccccccccc'),
(8,  'dddddddd-dddd-dddd-dddd-dddddddddddd'),
(9,  '11111111-1111-1111-1111-111111111111'),
(10, '22222222-2222-2222-2222-222222222222');

DO $$
DECLARE canonical_count integer;
BEGIN
    SELECT COUNT(DISTINCT m.movie_id)
      INTO canonical_count
      FROM seed45_movie_map m
      JOIN movie existing ON existing.id = m.movie_id;
    IF canonical_count <> 8 THEN
        RAISE EXCEPTION 'DEMO45 seed requires the eight canonical V29 movies; found %/8', canonical_count;
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 01. app_user (10)
-- -----------------------------------------------------------------------------
INSERT INTO app_user(
    id,email,password_hash,full_name,role,phone,account_enabled,
    loyalty_points,membership_tier,loyalty_lifetime_points,birth_date,created_at,updated_at
)
SELECT
    md5('seed45:user:' || n)::uuid,
    format('demo45.user%s@cinebooking.local', to_char(n,'FM00')),
    '$2y$10$ifjK2UI9mdBGHFZhXNWOJe2YcXDVTdduBvxXMsinQkZhBbeR.h97W',
    format('Nhân viên mẫu %s', to_char(n,'FM00')),
    CASE WHEN n = 1 THEN 'MANAGER' ELSE 'STAFF' END,
    format('090900%s', lpad(n::text,4,'0')),
    TRUE,
    1000 + n * 10,
    CASE WHEN n <= 2 THEN 'SILVER' ELSE 'BRONZE' END,
    1000 + n * 100,
    DATE '1995-01-01' + n,
    CURRENT_TIMESTAMP - (n || ' days')::interval,
    CURRENT_TIMESTAMP
FROM generate_series(1,10) AS g(n)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 02. cinema (10)
-- -----------------------------------------------------------------------------
INSERT INTO cinema(id,name,address)
SELECT
    md5('seed45:cinema:' || n)::uuid,
    format('CineBooking Demo %s', to_char(n,'FM00')),
    format('%s Đường Điện Ảnh, Quận %s, TP.HCM', 100 + n, ((n - 1) % 10) + 1)
FROM generate_series(1,10) AS g(n)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 03. auditorium (10)
-- -----------------------------------------------------------------------------
INSERT INTO auditorium(id,cinema_id,name)
SELECT
    md5('seed45:auditorium:' || n)::uuid,
    md5('seed45:cinema:1')::uuid,
    format('Phòng Demo %s', to_char(n,'FM00'))
FROM generate_series(1,10) AS g(n)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 04. movie (reuse the 8 canonical V29 movies; add 0 demo movies)
-- -----------------------------------------------------------------------------
-- Repair references created by the previous DEMO45 seed, then remove those old
-- synthetic "Phim Demo" movie rows. The new seed always points at the eight
-- canonical movies from V29 through seed45_movie_map.
UPDATE showtime target
SET movie_id = mapped.movie_id
FROM seed45_movie_map mapped
WHERE target.id = md5('seed45:showtime:' || mapped.n)::uuid;

UPDATE movie_favorite target
SET movie_id = mapped.movie_id
FROM seed45_movie_map mapped
WHERE target.id = md5('seed45:favorite:' || mapped.n)::uuid;

UPDATE movie_review target
SET movie_id = mapped.movie_id
FROM seed45_movie_map mapped
WHERE target.id = md5('seed45:review:' || mapped.n)::uuid;

UPDATE recommendation_event target
SET movie_id = mapped.movie_id
FROM seed45_movie_map mapped
WHERE target.id = md5('seed45:recommendation:' || mapped.n)::uuid;

UPDATE pricing_rule target
SET movie_id = mapped.movie_id
FROM seed45_movie_map mapped
WHERE target.id = md5('seed45:pricing:' || mapped.n)::uuid;

DELETE FROM movie
WHERE id IN (SELECT md5('seed45:movie:' || n)::uuid FROM generate_series(1,10) AS g(n));

-- -----------------------------------------------------------------------------
-- 05. seat (10)
-- -----------------------------------------------------------------------------
INSERT INTO seat(id,auditorium_id,row_label,seat_number,seat_type,price_modifier)
SELECT
    md5('seed45:seat:' || n)::uuid,
    md5('seed45:auditorium:' || n)::uuid,
    'A',
    n,
    CASE WHEN n % 3 = 0 THEN 'VIP' ELSE 'STANDARD' END,
    CASE WHEN n % 3 = 0 THEN 20000 ELSE 0 END
FROM generate_series(1,10) AS g(n)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 06. showtime (10)
-- -----------------------------------------------------------------------------
INSERT INTO showtime(id,movie_id,auditorium_id,start_time,base_price,status)
SELECT
    md5('seed45:showtime:' || n)::uuid,
    (SELECT movie_id FROM seed45_movie_map WHERE seed45_movie_map.n = g.n),
    md5('seed45:auditorium:' || n)::uuid,
    CURRENT_TIMESTAMP - (n || ' days')::interval + INTERVAL '19 hours',
    90000 + n * 5000,
    'OPEN'
FROM generate_series(1,10) AS g(n)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 07. staff_profile (10)
-- All demo staff are attached to cinema 01 so handovers are semantically valid.
-- -----------------------------------------------------------------------------
INSERT INTO staff_profile(
    user_id,employee_code,cinema_id,job_title,employment_status,hire_date,deleted_at,created_at,updated_at
)
SELECT
    md5('seed45:user:' || n)::uuid,
    format('DEMO45-%s', to_char(n,'FM00')),
    md5('seed45:cinema:1')::uuid,
    CASE WHEN n = 1 THEN 'Quản lý rạp mẫu' ELSE 'Nhân viên vận hành mẫu' END,
    'ACTIVE',
    CURRENT_DATE - (365 + n),
    NULL,
    CURRENT_TIMESTAMP - INTERVAL '365 days',
    CURRENT_TIMESTAMP
FROM generate_series(1,10) AS g(n)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 08. staff_shift (10)
-- -----------------------------------------------------------------------------
INSERT INTO staff_shift(
    id,staff_user_id,cinema_id,shift_date,start_time,end_time,status,note,assigned_by,created_at,updated_at
)
SELECT
    md5('seed45:shift:' || n)::uuid,
    md5('seed45:user:' || n)::uuid,
    md5('seed45:cinema:1')::uuid,
    CURRENT_DATE - n,
    TIME '16:00',
    TIME '23:00',
    'COMPLETED',
    format('Ca làm mẫu số %s', n),
    md5('seed45:user:1')::uuid,
    CURRENT_TIMESTAMP - (n || ' days')::interval,
    CURRENT_TIMESTAMP - (n || ' days')::interval
FROM generate_series(1,10) AS g(n)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 09. staff_attendance (10)
-- -----------------------------------------------------------------------------
INSERT INTO staff_attendance(
    id,shift_id,staff_user_id,cinema_id,check_in_at,check_out_at,status,
    check_in_ip,check_out_ip,late_minutes,early_leave_minutes,worked_minutes,punctuality_status,
    created_at,updated_at
)
SELECT
    md5('seed45:attendance:' || n)::uuid,
    md5('seed45:shift:' || n)::uuid,
    md5('seed45:user:' || n)::uuid,
    md5('seed45:cinema:1')::uuid,
    (CURRENT_DATE - n + TIME '16:00') AT TIME ZONE 'Asia/Ho_Chi_Minh',
    (CURRENT_DATE - n + TIME '23:00') AT TIME ZONE 'Asia/Ho_Chi_Minh',
    'COMPLETED',
    format('10.45.0.%s', n),
    format('10.45.1.%s', n),
    0,0,420,'ON_TIME',
    CURRENT_TIMESTAMP - (n || ' days')::interval,
    CURRENT_TIMESTAMP - (n || ' days')::interval
FROM generate_series(1,10) AS g(n)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 10. booking (10)
-- -----------------------------------------------------------------------------
INSERT INTO booking(
    id,user_id,purchaser_user_id,showtime_id,status,total_amount,expires_at,created_at,confirmed_at,
    seat_amount,concession_amount,discount_amount,points_redeemed,voucher_code,benefits_refunded,reminder_sent,
    checked_in_at,checked_in_by,idempotency_key,request_fingerprint,ticket_version,transfer_count,
    refund_automatic
)
SELECT
    md5('seed45:booking:' || n)::uuid,
    md5('seed45:user:' || n)::uuid,
    md5('seed45:user:' || n)::uuid,
    md5('seed45:showtime:' || n)::uuid,
    'CONFIRMED',
    140000,
    NULL,
    CURRENT_TIMESTAMP - ((n + 1) || ' days')::interval,
    CURRENT_TIMESTAMP - ((n + 1) || ' days')::interval + INTERVAL '5 minutes',
    100000,50000,10000,0,
    format('DEMO45V%s', to_char(n,'FM00')),
    FALSE,TRUE,
    CURRENT_TIMESTAMP - (n || ' days')::interval + INTERVAL '19 hours 5 minutes',
    md5('seed45:user:' || n)::uuid,
    format('seed45-booking-%s', to_char(n,'FM00')),
    md5('seed45:request:' || n) || md5('seed45:request2:' || n),
    1,0,FALSE
FROM generate_series(1,10) AS g(n)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 11. booking_seat (10)
-- -----------------------------------------------------------------------------
INSERT INTO booking_seat(id,booking_id,showtime_id,seat_id,price,released_at)
SELECT
    md5('seed45:booking-seat:' || n)::uuid,
    md5('seed45:booking:' || n)::uuid,
    md5('seed45:showtime:' || n)::uuid,
    md5('seed45:seat:' || n)::uuid,
    100000,
    NULL
FROM generate_series(1,10) AS g(n)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 12. concession_product (10)
-- -----------------------------------------------------------------------------
INSERT INTO concession_product(
    id,name,description,price,image_url,active,sort_order,inventory_enabled,
    stock_on_hand,stock_reserved,low_stock_threshold,created_at
)
SELECT
    md5('seed45:product:' || n)::uuid,
    format('Sản phẩm Demo %s', to_char(n,'FM00')),
    format('Bắp/nước mẫu số %s', n),
    50000,
    NULL,TRUE,n,TRUE,220,0,20,CURRENT_TIMESTAMP - (n || ' days')::interval
FROM generate_series(1,10) AS g(n)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 13. booking_concession (10)
-- -----------------------------------------------------------------------------
INSERT INTO booking_concession(id,booking_id,product_id,product_name,unit_price,quantity,subtotal)
SELECT
    md5('seed45:booking-concession:' || n)::uuid,
    md5('seed45:booking:' || n)::uuid,
    md5('seed45:product:' || n)::uuid,
    format('Sản phẩm Demo %s', to_char(n,'FM00')),
    50000,1,50000
FROM generate_series(1,10) AS g(n)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 14. voucher (10)
-- -----------------------------------------------------------------------------
INSERT INTO voucher(
    id,code,name,discount_type,discount_value,min_order_amount,max_discount,
    starts_at,ends_at,usage_limit,used_count,active,owner_user_id,created_at
)
SELECT
    md5('seed45:voucher:' || n)::uuid,
    format('DEMO45V%s', to_char(n,'FM00')),
    format('Voucher Demo %s', to_char(n,'FM00')),
    'FIXED',10000,100000,NULL,
    CURRENT_TIMESTAMP - INTERVAL '30 days',
    CURRENT_TIMESTAMP + INTERVAL '180 days',
    100,1,TRUE,
    md5('seed45:user:' || n)::uuid,
    CURRENT_TIMESTAMP - (n || ' days')::interval
FROM generate_series(1,10) AS g(n)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 15. voucher_redemption (10)
-- -----------------------------------------------------------------------------
INSERT INTO voucher_redemption(id,voucher_id,user_id,booking_id,discount_amount,created_at)
SELECT
    md5('seed45:voucher-redemption:' || n)::uuid,
    md5('seed45:voucher:' || n)::uuid,
    md5('seed45:user:' || n)::uuid,
    md5('seed45:booking:' || n)::uuid,
    10000,
    CURRENT_TIMESTAMP - ((n + 1) || ' days')::interval
FROM generate_series(1,10) AS g(n)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 16. payment (10)
-- -----------------------------------------------------------------------------
INSERT INTO payment(
    id,booking_id,payer_user_id,provider,status,amount,provider_transaction_id,
    provider_order_id,client_idempotency_key,provider_response_code,provider_message,
    created_at,paid_at,updated_at,loyalty_points_awarded
)
SELECT
    md5('seed45:payment:' || n)::uuid,
    md5('seed45:booking:' || n)::uuid,
    md5('seed45:user:' || n)::uuid,
    CASE WHEN n % 2 = 0 THEN 'VNPAY' ELSE 'MOMO' END,
    'SUCCESS',140000,
    format('DEMO45-TXN-%s', to_char(n,'FM00')),
    format('DEMO45-ORDER-%s', to_char(n,'FM00')),
    format('demo45-payment-%s', to_char(n,'FM00')),
    '00','Giao dịch mẫu thành công',
    CURRENT_TIMESTAMP - ((n + 1) || ' days')::interval,
    CURRENT_TIMESTAMP - ((n + 1) || ' days')::interval + INTERVAL '5 minutes',
    CURRENT_TIMESTAMP - ((n + 1) || ' days')::interval + INTERVAL '5 minutes',
    140
FROM generate_series(1,10) AS g(n)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 17. payment_webhook_event (10)
-- -----------------------------------------------------------------------------
INSERT INTO payment_webhook_event(
    id,provider,event_key,payment_id,payload_hash,signature_valid,result_code,response_code,response_message,
    received_at,processed_at
)
SELECT
    md5('seed45:webhook:' || n)::uuid,
    CASE WHEN n % 2 = 0 THEN 'VNPAY' ELSE 'MOMO' END,
    format('DEMO45-WEBHOOK-%s', to_char(n,'FM00')),
    md5('seed45:payment:' || n)::uuid,
    md5('seed45:payload:' || n) || md5('seed45:payload2:' || n),
    TRUE,'0','00','Webhook mẫu đã xử lý',
    CURRENT_TIMESTAMP - (n || ' days')::interval,
    CURRENT_TIMESTAMP - (n || ' days')::interval + INTERVAL '1 second'
FROM generate_series(1,10) AS g(n)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 18. loyalty_transaction (10)
-- -----------------------------------------------------------------------------
INSERT INTO loyalty_transaction(
    id,user_id,booking_id,transaction_type,points,description,expires_at,balance_after,reference_type,reference_id,created_at
)
SELECT
    md5('seed45:loyalty-tx:' || n)::uuid,
    md5('seed45:user:' || n)::uuid,
    md5('seed45:booking:' || n)::uuid,
    'EARN',140,
    format('Tích điểm từ booking demo %s', to_char(n,'FM00')),
    CURRENT_TIMESTAMP + INTERVAL '365 days',
    1000 + n * 10,
    'BOOKING',
    md5('seed45:booking:' || n)::uuid::text,
    CURRENT_TIMESTAMP - (n || ' days')::interval
FROM generate_series(1,10) AS g(n)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 19. loyalty_point_lot (10)
-- -----------------------------------------------------------------------------
INSERT INTO loyalty_point_lot(
    id,user_id,source_transaction_id,original_points,remaining_points,expires_at,expired_at,created_at
)
SELECT
    md5('seed45:loyalty-lot:' || n)::uuid,
    md5('seed45:user:' || n)::uuid,
    md5('seed45:loyalty-tx:' || n)::uuid,
    140,140,
    CURRENT_TIMESTAMP + INTERVAL '365 days',NULL,
    CURRENT_TIMESTAMP - (n || ' days')::interval
FROM generate_series(1,10) AS g(n)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 20. loyalty_reward (10)
-- -----------------------------------------------------------------------------
INSERT INTO loyalty_reward(
    id,code,name,description,reward_type,points_cost,discount_type,discount_value,
    min_order_amount,max_discount,validity_days,concession_product_id,concession_quantity,
    active,sort_order,created_at
)
SELECT
    md5('seed45:reward:' || n)::uuid,
    format('DEMO45R%s', to_char(n,'FM00')),
    format('Phần thưởng Demo %s', to_char(n,'FM00')),
    'Voucher đổi điểm dữ liệu mẫu',
    'VOUCHER',100 + n * 10,'FIXED',10000,
    100000,NULL,30,NULL,NULL,TRUE,n,
    CURRENT_TIMESTAMP - (n || ' days')::interval
FROM generate_series(1,10) AS g(n)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 21. loyalty_reward_redemption (10)
-- -----------------------------------------------------------------------------
INSERT INTO loyalty_reward_redemption(
    id,user_id,reward_id,voucher_id,redemption_code,points_cost,status,redeemed_at,claimed_at,claimed_by_user_id
)
SELECT
    md5('seed45:reward-redemption:' || n)::uuid,
    md5('seed45:user:' || n)::uuid,
    md5('seed45:reward:' || n)::uuid,
    md5('seed45:voucher:' || n)::uuid,
    format('DEMO45-REWARD-%s', to_char(n,'FM00')),
    100 + n * 10,
    'ISSUED',
    CURRENT_TIMESTAMP - (n || ' hours')::interval,
    NULL,NULL
FROM generate_series(1,10) AS g(n)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 22. inventory_movement (10)
-- -----------------------------------------------------------------------------
INSERT INTO inventory_movement(
    id,product_id,booking_id,movement_type,quantity_delta,reserved_delta,
    stock_after,reserved_after,actor_email,note,created_at
)
SELECT
    md5('seed45:inventory:' || n)::uuid,
    md5('seed45:product:' || n)::uuid,
    NULL,'RESTOCK',20,0,220,0,
    'demo45.user01@cinebooking.local',
    format('Nhập kho mẫu lần %s', n),
    CURRENT_TIMESTAMP - (n || ' hours')::interval
FROM generate_series(1,10) AS g(n)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 23. movie_favorite (10)
-- -----------------------------------------------------------------------------
INSERT INTO movie_favorite(id,user_id,movie_id,created_at)
SELECT
    md5('seed45:favorite:' || n)::uuid,
    md5('seed45:user:' || n)::uuid,
    (SELECT movie_id FROM seed45_movie_map WHERE seed45_movie_map.n = g.n),
    CURRENT_TIMESTAMP - (n || ' hours')::interval
FROM generate_series(1,10) AS g(n)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 24. movie_review (10)
-- -----------------------------------------------------------------------------
INSERT INTO movie_review(id,user_id,movie_id,rating,comment,created_at,updated_at)
SELECT
    md5('seed45:review:' || n)::uuid,
    md5('seed45:user:' || n)::uuid,
    (SELECT movie_id FROM seed45_movie_map WHERE seed45_movie_map.n = g.n),
    3 + (n % 3),
    format('Đánh giá mẫu cho phim số %s.', n),
    CURRENT_TIMESTAMP - (n || ' hours')::interval,
    CURRENT_TIMESTAMP - (n || ' hours')::interval
FROM generate_series(1,10) AS g(n)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 25. recommendation_event (10)
-- -----------------------------------------------------------------------------
INSERT INTO recommendation_event(id,user_id,movie_id,event_type,source,created_at)
SELECT
    md5('seed45:recommendation:' || n)::uuid,
    md5('seed45:user:' || n)::uuid,
    (SELECT movie_id FROM seed45_movie_map WHERE seed45_movie_map.n = g.n),
    CASE WHEN n % 2 = 0 THEN 'CLICK' ELSE 'VIEW' END,
    'DEMO45',
    CURRENT_TIMESTAMP - (n || ' minutes')::interval
FROM generate_series(1,10) AS g(n)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 26. pricing_rule (10)
-- -----------------------------------------------------------------------------
INSERT INTO pricing_rule(
    id,name,cinema_id,auditorium_id,movie_id,seat_type,days_of_week,start_time,end_time,
    valid_from,valid_to,adjustment_type,adjustment_value,priority,active,created_at,updated_at
)
SELECT
    md5('seed45:pricing:' || n)::uuid,
    format('Quy tắc giá Demo %s', to_char(n,'FM00')),
    md5('seed45:cinema:1')::uuid,
    md5('seed45:auditorium:' || n)::uuid,
    (SELECT movie_id FROM seed45_movie_map WHERE seed45_movie_map.n = g.n),
    NULL,'1,2,3,4,5,6,7',TIME '18:00',TIME '23:00',
    CURRENT_DATE - 30,CURRENT_DATE + 90,
    CASE WHEN n % 2 = 0 THEN 'PERCENT' ELSE 'FIXED' END,
    CASE WHEN n % 2 = 0 THEN 10 ELSE 10000 END,
    n,TRUE,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP
FROM generate_series(1,10) AS g(n)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 27. showtime_waitlist (10)
-- -----------------------------------------------------------------------------
INSERT INTO showtime_waitlist(id,user_id,showtime_id,status,created_at,notified_at,last_available_count)
SELECT
    md5('seed45:waitlist:' || n)::uuid,
    md5('seed45:user:' || n)::uuid,
    md5('seed45:showtime:' || n)::uuid,
    'EXPIRED',
    CURRENT_TIMESTAMP - ((n + 2) || ' days')::interval,
    CURRENT_TIMESTAMP - (n || ' days')::interval,
    0
FROM generate_series(1,10) AS g(n)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 28. notification_preference (10)
-- app_user trigger may already have created these rows; update them deterministically.
-- -----------------------------------------------------------------------------
INSERT INTO notification_preference(
    user_id,in_app_enabled,email_enabled,browser_enabled,booking_enabled,reminder_enabled,
    refund_enabled,staff_shift_enabled,promotion_enabled,loyalty_enabled,waitlist_enabled,updated_at
)
SELECT
    md5('seed45:user:' || n)::uuid,
    TRUE,TRUE,(n % 2 = 0),TRUE,TRUE,TRUE,TRUE,TRUE,TRUE,TRUE,CURRENT_TIMESTAMP
FROM generate_series(1,10) AS g(n)
ON CONFLICT (user_id) DO UPDATE SET
    in_app_enabled = EXCLUDED.in_app_enabled,
    email_enabled = EXCLUDED.email_enabled,
    browser_enabled = EXCLUDED.browser_enabled,
    booking_enabled = EXCLUDED.booking_enabled,
    reminder_enabled = EXCLUDED.reminder_enabled,
    refund_enabled = EXCLUDED.refund_enabled,
    staff_shift_enabled = EXCLUDED.staff_shift_enabled,
    promotion_enabled = EXCLUDED.promotion_enabled,
    loyalty_enabled = EXCLUDED.loyalty_enabled,
    waitlist_enabled = EXCLUDED.waitlist_enabled,
    updated_at = EXCLUDED.updated_at;

-- -----------------------------------------------------------------------------
-- 29. user_notification (10)
-- -----------------------------------------------------------------------------
INSERT INTO user_notification(
    id,user_id,notification_type,title,message,link_url,is_read,created_at,
    category,in_app_visible,email_status,email_sent_at,delivery_error,dedupe_key,
    priority,read_at,archived_at
)
SELECT
    md5('seed45:notification:' || n)::uuid,
    md5('seed45:user:' || n)::uuid,
    'DEMO45',
    format('Thông báo mẫu %s', to_char(n,'FM00')),
    format('Nội dung thông báo mẫu số %s.', n),
    '/bookings',
    (n % 2 = 0),
    CURRENT_TIMESTAMP - (n || ' hours')::interval,
    'GENERAL',TRUE,'SKIPPED',NULL,NULL,
    format('seed45-notification-%s', to_char(n,'FM00')),
    CASE WHEN n % 3 = 0 THEN 'HIGH' ELSE 'NORMAL' END,
    CASE WHEN n % 2 = 0 THEN CURRENT_TIMESTAMP - (n || ' hours')::interval ELSE NULL END,
    NULL
FROM generate_series(1,10) AS g(n)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 30. auth_session (10)
-- -----------------------------------------------------------------------------
INSERT INTO auth_session(
    id,user_id,refresh_token_hash,device_name,user_agent,ip_address,created_at,last_seen_at,expires_at,revoked_at,revoke_reason
)
SELECT
    md5('seed45:session:' || n)::uuid,
    md5('seed45:user:' || n)::uuid,
    md5('seed45:refresh:' || n) || md5('seed45:refresh2:' || n),
    format('Thiết bị Demo %s', to_char(n,'FM00')),
    'CineBooking Demo Seed/45',
    format('192.168.45.%s', n),
    CURRENT_TIMESTAMP - (n || ' days')::interval,
    CURRENT_TIMESTAMP - (n || ' hours')::interval,
    CURRENT_TIMESTAMP + INTERVAL '30 days',
    NULL,NULL
FROM generate_series(1,10) AS g(n)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 31. password_reset_token (10)
-- -----------------------------------------------------------------------------
INSERT INTO password_reset_token(id,user_id,token_hash,expires_at,used_at,created_at)
SELECT
    md5('seed45:reset:' || n)::uuid,
    md5('seed45:user:' || n)::uuid,
    md5('seed45:reset-hash:' || n) || md5('seed45:reset-hash2:' || n),
    CURRENT_TIMESTAMP + INTERVAL '1 day',
    NULL,
    CURRENT_TIMESTAMP - (n || ' minutes')::interval
FROM generate_series(1,10) AS g(n)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 32. staff_leave_request (10)
-- -----------------------------------------------------------------------------
INSERT INTO staff_leave_request(
    id,staff_user_id,cinema_id,from_date,to_date,leave_type,reason,status,
    reviewed_by,reviewed_at,review_note,created_at,updated_at
)
SELECT
    md5('seed45:leave:' || n)::uuid,
    md5('seed45:user:' || n)::uuid,
    md5('seed45:cinema:1')::uuid,
    CURRENT_DATE + 10 + n,
    CURRENT_DATE + 10 + n,
    CASE WHEN n % 2 = 0 THEN 'VACATION' ELSE 'PERSONAL' END,
    format('Đơn nghỉ mẫu số %s', n),
    'APPROVED',
    md5('seed45:user:1')::uuid,
    CURRENT_TIMESTAMP,
    'Dữ liệu mẫu đã duyệt',
    CURRENT_TIMESTAMP - (n || ' days')::interval,
    CURRENT_TIMESTAMP
FROM generate_series(1,10) AS g(n)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 33. ticket_checkin_log (10)
-- -----------------------------------------------------------------------------
INSERT INTO ticket_checkin_log(
    id,booking_id,shift_id,attendance_id,staff_user_id,cinema_id,checked_in_at,source,ip_address
)
SELECT
    md5('seed45:checkin:' || n)::uuid,
    md5('seed45:booking:' || n)::uuid,
    md5('seed45:shift:' || n)::uuid,
    md5('seed45:attendance:' || n)::uuid,
    md5('seed45:user:' || n)::uuid,
    md5('seed45:cinema:1')::uuid,
    CURRENT_TIMESTAMP - (n || ' days')::interval + INTERVAL '19 hours 5 minutes',
    'QR',
    format('10.45.2.%s', n)
FROM generate_series(1,10) AS g(n)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 34. audit_log (10)
-- -----------------------------------------------------------------------------
INSERT INTO audit_log(id,actor_user_id,actor_email,action,entity_type,entity_id,details,ip_address,created_at)
SELECT
    md5('seed45:audit:' || n)::uuid,
    md5('seed45:user:' || n)::uuid,
    format('demo45.user%s@cinebooking.local', to_char(n,'FM00')),
    'DEMO45_SEED',
    'BOOKING',
    md5('seed45:booking:' || n)::uuid::text,
    format('Bản ghi audit mẫu số %s', n),
    format('172.45.0.%s', n),
    CURRENT_TIMESTAMP - (n || ' hours')::interval
FROM generate_series(1,10) AS g(n)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 35. staff_incident (10)
-- -----------------------------------------------------------------------------
INSERT INTO staff_incident(
    id,cinema_id,shift_id,attendance_id,reported_by,category,severity,title,description,status,
    resolved_by,resolved_at,resolution_note,created_at,updated_at
)
SELECT
    md5('seed45:incident:' || n)::uuid,
    md5('seed45:cinema:1')::uuid,
    md5('seed45:shift:' || n)::uuid,
    md5('seed45:attendance:' || n)::uuid,
    md5('seed45:user:' || n)::uuid,
    CASE WHEN n % 3 = 0 THEN 'EQUIPMENT' WHEN n % 3 = 1 THEN 'CUSTOMER' ELSE 'SAFETY' END,
    CASE WHEN n % 4 = 0 THEN 'HIGH' ELSE 'MEDIUM' END,
    format('Sự cố mẫu %s', to_char(n,'FM00')),
    format('Mô tả sự cố vận hành mẫu số %s.', n),
    'RESOLVED',
    md5('seed45:user:1')::uuid,
    CURRENT_TIMESTAMP - (n || ' hours')::interval,
    'Đã xử lý trong dữ liệu mẫu',
    CURRENT_TIMESTAMP - ((n + 1) || ' hours')::interval,
    CURRENT_TIMESTAMP - (n || ' hours')::interval
FROM generate_series(1,10) AS g(n)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 36. staff_shift_handover (10)
-- -----------------------------------------------------------------------------
INSERT INTO staff_shift_handover(
    id,cinema_id,from_shift_id,from_attendance_id,from_staff_user_id,to_staff_user_id,
    summary,status,created_at,accepted_at,accepted_by
)
SELECT
    md5('seed45:handover:' || n)::uuid,
    md5('seed45:cinema:1')::uuid,
    md5('seed45:shift:' || n)::uuid,
    md5('seed45:attendance:' || n)::uuid,
    md5('seed45:user:' || n)::uuid,
    md5('seed45:user:' || CASE WHEN n = 10 THEN 1 ELSE n + 1 END)::uuid,
    format('Bàn giao ca mẫu số %s, không còn tồn đọng.', n),
    'ACCEPTED',
    CURRENT_TIMESTAMP - (n || ' hours')::interval,
    CURRENT_TIMESTAMP - (n || ' hours')::interval + INTERVAL '5 minutes',
    md5('seed45:user:' || CASE WHEN n = 10 THEN 1 ELSE n + 1 END)::uuid
FROM generate_series(1,10) AS g(n)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 37. auditorium_blackout (10)
-- -----------------------------------------------------------------------------
INSERT INTO auditorium_blackout(id,auditorium_id,start_time,end_time,reason,created_at)
SELECT
    md5('seed45:blackout:' || n)::uuid,
    md5('seed45:auditorium:' || n)::uuid,
    CURRENT_TIMESTAMP + (n || ' days')::interval,
    CURRENT_TIMESTAMP + (n || ' days')::interval + INTERVAL '2 hours',
    format('Bảo trì phòng mẫu %s', to_char(n,'FM00')),
    CURRENT_TIMESTAMP
FROM generate_series(1,10) AS g(n)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 38. cinema_equipment_asset (10)
-- -----------------------------------------------------------------------------
INSERT INTO cinema_equipment_asset(
    id,cinema_id,auditorium_id,asset_code,name,category,status,vendor,serial_number,
    installed_on,last_service_at,next_service_due,note,created_at,updated_at
)
SELECT
    md5('seed45:asset:' || n)::uuid,
    md5('seed45:cinema:1')::uuid,
    md5('seed45:auditorium:' || n)::uuid,
    format('DEMO45-ASSET-%s', to_char(n,'FM00')),
    format('Máy chiếu Demo %s', to_char(n,'FM00')),
    'PROJECTOR',
    CASE WHEN n % 4 = 0 THEN 'DEGRADED' ELSE 'OPERATIONAL' END,
    'CineTech Demo',
    format('SN-DEMO45-%s', lpad(n::text,4,'0')),
    CURRENT_DATE - (365 + n * 10),
    CURRENT_TIMESTAMP - INTERVAL '30 days',
    CURRENT_DATE + (10 + n),
    'Thiết bị dữ liệu mẫu',
    CURRENT_TIMESTAMP - INTERVAL '365 days',
    CURRENT_TIMESTAMP
FROM generate_series(1,10) AS g(n)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 39. maintenance_work_order (10)
-- -----------------------------------------------------------------------------
INSERT INTO maintenance_work_order(
    id,cinema_id,auditorium_id,asset_id,source_incident_id,title,description,priority,status,
    assigned_to,due_at,resolution_note,created_by,started_at,resolved_at,resolved_by,created_at,updated_at
)
SELECT
    md5('seed45:work-order:' || n)::uuid,
    md5('seed45:cinema:1')::uuid,
    md5('seed45:auditorium:' || n)::uuid,
    md5('seed45:asset:' || n)::uuid,
    NULL,
    format('Work order Demo %s', to_char(n,'FM00')),
    format('Kiểm tra định kỳ thiết bị mẫu số %s.', n),
    CASE WHEN n % 4 = 0 THEN 'HIGH' ELSE 'MEDIUM' END,
    'OPEN',
    md5('seed45:user:' || n)::uuid,
    CURRENT_TIMESTAMP + (n || ' days')::interval,
    NULL,
    md5('seed45:user:1')::uuid,
    NULL,NULL,NULL,
    CURRENT_TIMESTAMP - (n || ' hours')::interval,
    CURRENT_TIMESTAMP - (n || ' hours')::interval
FROM generate_series(1,10) AS g(n)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 40. maintenance_work_order_event (10)
-- -----------------------------------------------------------------------------
INSERT INTO maintenance_work_order_event(
    id,work_order_id,event_type,from_status,to_status,note,actor_user_id,created_at
)
SELECT
    md5('seed45:work-event:' || n)::uuid,
    md5('seed45:work-order:' || n)::uuid,
    'CREATED',NULL,'OPEN',
    format('Khởi tạo work order mẫu %s', n),
    md5('seed45:user:1')::uuid,
    CURRENT_TIMESTAMP - (n || ' hours')::interval
FROM generate_series(1,10) AS g(n)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 41. financial_ledger_entry (10)
-- -----------------------------------------------------------------------------
INSERT INTO financial_ledger_entry(
    id,event_key,event_type,booking_id,payment_id,user_id,source,description,occurred_at,created_at
)
SELECT
    md5('seed45:ledger-entry:' || n)::uuid,
    format('DEMO45:PAYMENT_CAPTURE:%s', to_char(n,'FM00')),
    'PAYMENT_CAPTURED',
    md5('seed45:booking:' || n)::uuid,
    md5('seed45:payment:' || n)::uuid,
    md5('seed45:user:' || n)::uuid,
    'DEMO45',
    format('Bút toán thanh toán mẫu %s', to_char(n,'FM00')),
    CURRENT_TIMESTAMP - (n || ' days')::interval,
    CURRENT_TIMESTAMP - (n || ' days')::interval
FROM generate_series(1,10) AS g(n)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 42. financial_ledger_line (20 = 2 balanced lines for each of 10 entries)
-- Double-entry accounting requires two lines per entry, so this table intentionally
-- gets 20 rows instead of 10 to keep all 10 demo ledger entries balanced.
-- -----------------------------------------------------------------------------
INSERT INTO financial_ledger_line(id,entry_id,account_code,direction,amount,currency,created_at)
SELECT
    md5('seed45:ledger-line:debit:' || n)::uuid,
    md5('seed45:ledger-entry:' || n)::uuid,
    'PAYMENT_CLEARING:DEMO45','DEBIT',140000,'VND',CURRENT_TIMESTAMP - (n || ' days')::interval
FROM generate_series(1,10) AS g(n)
ON CONFLICT DO NOTHING;

INSERT INTO financial_ledger_line(id,entry_id,account_code,direction,amount,currency,created_at)
SELECT
    md5('seed45:ledger-line:credit:' || n)::uuid,
    md5('seed45:ledger-entry:' || n)::uuid,
    'CUSTOMER_FUNDS_CAPTURED','CREDIT',140000,'VND',CURRENT_TIMESTAMP - (n || ' days')::interval
FROM generate_series(1,10) AS g(n)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 43. financial_reconciliation_run (10)
-- -----------------------------------------------------------------------------
INSERT INTO financial_reconciliation_run(
    id,run_key,business_date,status,payment_count,payment_amount,ledger_capture_amount,
    refund_count,refund_amount,ledger_refund_amount,loyalty_users_checked,loyalty_mismatch_count,
    issue_count,started_by,started_at,finished_at
)
SELECT
    md5('seed45:recon-run:' || n)::uuid,
    format('DEMO45-RECON-%s', to_char(n,'FM00')),
    CURRENT_DATE - n,
    'ISSUES',1,140000,140000,0,0,0,1,1,1,
    'demo45.user01@cinebooking.local',
    CURRENT_TIMESTAMP - (n || ' days')::interval,
    CURRENT_TIMESTAMP - (n || ' days')::interval + INTERVAL '1 minute'
FROM generate_series(1,10) AS g(n)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 44. financial_reconciliation_issue (10)
-- -----------------------------------------------------------------------------
INSERT INTO financial_reconciliation_issue(
    id,run_id,issue_type,severity,entity_type,entity_id,expected_value,actual_value,message,
    status,created_at,resolved_at,resolved_by
)
SELECT
    md5('seed45:recon-issue:' || n)::uuid,
    md5('seed45:recon-run:' || n)::uuid,
    'DEMO45_LOYALTY_CHECK','WARNING','USER',
    md5('seed45:user:' || n)::uuid::text,
    1000,990,
    format('Sai lệch mẫu cho user %s', to_char(n,'FM00')),
    'OPEN',CURRENT_TIMESTAMP - (n || ' days')::interval,NULL,NULL
FROM generate_series(1,10) AS g(n)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 45. customer_support_case (10)
-- V45 support cases use existing deterministic DEMO45 users/bookings/cinema.
-- -----------------------------------------------------------------------------
INSERT INTO customer_support_case(
    id,case_number,user_id,booking_id,cinema_id,category,priority,status,subject,description,
    assigned_to,sla_due_at,resolution_note,last_customer_message_at,last_staff_message_at,
    resolved_at,closed_at,created_at,updated_at
)
SELECT
    md5('seed45:support-case:' || n)::uuid,
    format('CB-DEMO45-%s', to_char(n,'FM00')),
    md5('seed45:user:' || n)::uuid,
    md5('seed45:booking:' || n)::uuid,
    md5('seed45:cinema:1')::uuid,
    (ARRAY['BOOKING','PAYMENT','REFUND','TICKET','CINEMA_EXPERIENCE','STAFF','OTHER'])[((n - 1) % 7) + 1],
    (ARRAY['LOW','MEDIUM','HIGH','CRITICAL'])[((n - 1) % 4) + 1],
    (ARRAY['OPEN','IN_PROGRESS','WAITING_CUSTOMER','RESOLVED','CLOSED'])[((n - 1) % 5) + 1],
    format('Yêu cầu hỗ trợ mẫu %s', to_char(n,'FM00')),
    format('Khách hàng cần hỗ trợ cho booking mẫu số %s. Đây là dữ liệu kiểm thử V45.', n),
    md5('seed45:user:1')::uuid,
    CURRENT_TIMESTAMP + ((12 + n * 6) || ' hours')::interval,
    CASE WHEN ((n - 1) % 5) + 1 IN (4,5) THEN format('Đã xử lý yêu cầu hỗ trợ mẫu %s', to_char(n,'FM00')) ELSE NULL END,
    CURRENT_TIMESTAMP - (n || ' hours')::interval,
    CASE WHEN ((n - 1) % 5) + 1 = 1 THEN NULL ELSE CURRENT_TIMESTAMP - ((n - 1) || ' hours')::interval END,
    CASE WHEN ((n - 1) % 5) + 1 IN (4,5) THEN CURRENT_TIMESTAMP - ((n - 2) || ' hours')::interval ELSE NULL END,
    CASE WHEN ((n - 1) % 5) + 1 = 5 THEN CURRENT_TIMESTAMP - ((n - 1) || ' hours')::interval ELSE NULL END,
    CURRENT_TIMESTAMP - (n || ' days')::interval,
    CURRENT_TIMESTAMP - (n || ' hours')::interval
FROM generate_series(1,10) AS g(n)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 46. customer_support_case_event (10)
-- One immutable representative event per seeded support case.
-- -----------------------------------------------------------------------------
INSERT INTO customer_support_case_event(
    id,case_id,event_type,from_status,to_status,visibility,message,actor_user_id,created_at
)
SELECT
    md5('seed45:support-event:' || n)::uuid,
    md5('seed45:support-case:' || n)::uuid,
    CASE WHEN ((n - 1) % 5) + 1 = 1 THEN 'CASE_CREATED' ELSE 'STATUS_CHANGED' END,
    CASE ((n - 1) % 5) + 1
        WHEN 1 THEN NULL
        WHEN 2 THEN 'OPEN'
        WHEN 3 THEN 'IN_PROGRESS'
        WHEN 4 THEN 'IN_PROGRESS'
        ELSE 'RESOLVED'
    END,
    (ARRAY['OPEN','IN_PROGRESS','WAITING_CUSTOMER','RESOLVED','CLOSED'])[((n - 1) % 5) + 1],
    'CUSTOMER',
    CASE ((n - 1) % 5) + 1
        WHEN 1 THEN format('Đã tạo yêu cầu hỗ trợ mẫu %s.', to_char(n,'FM00'))
        WHEN 2 THEN 'CineBooking đã tiếp nhận và đang xử lý yêu cầu.'
        WHEN 3 THEN 'CineBooking đang chờ khách hàng bổ sung thông tin.'
        WHEN 4 THEN 'Yêu cầu hỗ trợ đã được giải quyết.'
        ELSE 'Yêu cầu hỗ trợ đã được đóng.'
    END,
    CASE WHEN ((n - 1) % 5) + 1 = 1 THEN md5('seed45:user:' || n)::uuid ELSE md5('seed45:user:1')::uuid END,
    CURRENT_TIMESTAMP - (n || ' hours')::interval
FROM generate_series(1,10) AS g(n)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 47. flyway_schema_history
-- DO NOT INSERT FAKE ROWS HERE. This table is Flyway's source of truth and already
-- contains real migration history. Faking rows can break future migrations.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    flyway_rows BIGINT;
BEGIN
    SELECT COUNT(*) INTO flyway_rows FROM flyway_schema_history;
    RAISE NOTICE 'flyway_schema_history: % real migration rows (left untouched)', flyway_rows;
END $$;

-- -----------------------------------------------------------------------------
-- UTF-8 repair for rows created by earlier DEMO45 runs
-- -----------------------------------------------------------------------------
-- Earlier Windows PowerShell versions could transcode UTF-8 when piping SQL to
-- docker/psql, storing '?' in place of Vietnamese characters. Refresh every
-- human-readable seeded value from the UTF-8 source.
UPDATE app_user u SET full_name = format('Nhân viên mẫu %s', to_char(g.n,'FM00'))
FROM generate_series(1,10) g(n) WHERE u.id = md5('seed45:user:' || g.n)::uuid;

UPDATE cinema c SET
    name = format('CineBooking Demo %s', to_char(g.n,'FM00')),
    address = format('%s Đường Điện Ảnh, Quận %s, TP.HCM', 100 + g.n, ((g.n - 1) % 10) + 1)
FROM generate_series(1,10) g(n) WHERE c.id = md5('seed45:cinema:' || g.n)::uuid;

UPDATE auditorium a SET name = format('Phòng Demo %s', to_char(g.n,'FM00'))
FROM generate_series(1,10) g(n) WHERE a.id = md5('seed45:auditorium:' || g.n)::uuid;

UPDATE staff_profile p SET job_title = CASE WHEN g.n = 1 THEN 'Quản lý rạp mẫu' ELSE 'Nhân viên vận hành mẫu' END
FROM generate_series(1,10) g(n) WHERE p.user_id = md5('seed45:user:' || g.n)::uuid;

UPDATE staff_shift s SET note = format('Ca làm mẫu số %s', g.n)
FROM generate_series(1,10) g(n) WHERE s.id = md5('seed45:shift:' || g.n)::uuid;

UPDATE concession_product p SET
    name = format('Sản phẩm Demo %s', to_char(g.n,'FM00')),
    description = format('Bắp/nước mẫu số %s', g.n)
FROM generate_series(1,10) g(n) WHERE p.id = md5('seed45:product:' || g.n)::uuid;

UPDATE booking_concession bc SET product_name = format('Sản phẩm Demo %s', to_char(g.n,'FM00'))
FROM generate_series(1,10) g(n) WHERE bc.id = md5('seed45:booking-concession:' || g.n)::uuid;

UPDATE voucher v SET name = format('Voucher Demo %s', to_char(g.n,'FM00'))
FROM generate_series(1,10) g(n) WHERE v.id = md5('seed45:voucher:' || g.n)::uuid;

UPDATE payment p SET provider_message = 'Giao dịch mẫu thành công'
WHERE p.id IN (SELECT md5('seed45:payment:' || n)::uuid FROM generate_series(1,10) g(n));

UPDATE payment_webhook_event e SET response_message = 'Webhook mẫu đã xử lý'
WHERE e.id IN (SELECT md5('seed45:webhook:' || n)::uuid FROM generate_series(1,10) g(n));

UPDATE loyalty_transaction t SET description = format('Tích điểm từ booking demo %s', to_char(g.n,'FM00'))
FROM generate_series(1,10) g(n) WHERE t.id = md5('seed45:loyalty-tx:' || g.n)::uuid;

UPDATE loyalty_reward r SET
    name = format('Phần thưởng Demo %s', to_char(g.n,'FM00')),
    description = 'Voucher đổi điểm dữ liệu mẫu'
FROM generate_series(1,10) g(n) WHERE r.id = md5('seed45:reward:' || g.n)::uuid;

UPDATE inventory_movement i SET note = format('Nhập kho mẫu lần %s', g.n)
FROM generate_series(1,10) g(n) WHERE i.id = md5('seed45:inventory:' || g.n)::uuid;

UPDATE movie_review r SET comment = format('Đánh giá mẫu cho phim số %s.', g.n)
FROM generate_series(1,10) g(n) WHERE r.id = md5('seed45:review:' || g.n)::uuid;

UPDATE pricing_rule p SET name = format('Quy tắc giá Demo %s', to_char(g.n,'FM00'))
FROM generate_series(1,10) g(n) WHERE p.id = md5('seed45:pricing:' || g.n)::uuid;

UPDATE user_notification n SET
    title = format('Thông báo mẫu %s', to_char(g.n,'FM00')),
    message = format('Nội dung thông báo mẫu số %s.', g.n)
FROM generate_series(1,10) g(n) WHERE n.id = md5('seed45:notification:' || g.n)::uuid;

UPDATE auth_session s SET device_name = format('Thiết bị Demo %s', to_char(g.n,'FM00'))
FROM generate_series(1,10) g(n) WHERE s.id = md5('seed45:session:' || g.n)::uuid;

UPDATE staff_leave_request r SET
    reason = format('Đơn nghỉ mẫu số %s', g.n),
    review_note = 'Dữ liệu mẫu đã duyệt'
FROM generate_series(1,10) g(n) WHERE r.id = md5('seed45:leave:' || g.n)::uuid;

UPDATE audit_log a SET details = format('Bản ghi audit mẫu số %s', g.n)
FROM generate_series(1,10) g(n) WHERE a.id = md5('seed45:audit:' || g.n)::uuid;

UPDATE staff_incident i SET
    title = format('Sự cố mẫu %s', to_char(g.n,'FM00')),
    description = format('Mô tả sự cố vận hành mẫu số %s.', g.n),
    resolution_note = 'Đã xử lý trong dữ liệu mẫu'
FROM generate_series(1,10) g(n) WHERE i.id = md5('seed45:incident:' || g.n)::uuid;

UPDATE staff_shift_handover h SET summary = format('Bàn giao ca mẫu số %s, không còn tồn đọng.', g.n)
FROM generate_series(1,10) g(n) WHERE h.id = md5('seed45:handover:' || g.n)::uuid;

UPDATE auditorium_blackout b SET reason = format('Bảo trì phòng mẫu %s', to_char(g.n,'FM00'))
FROM generate_series(1,10) g(n) WHERE b.id = md5('seed45:blackout:' || g.n)::uuid;

UPDATE cinema_equipment_asset a SET
    name = format('Máy chiếu Demo %s', to_char(g.n,'FM00')),
    note = 'Thiết bị dữ liệu mẫu'
FROM generate_series(1,10) g(n) WHERE a.id = md5('seed45:asset:' || g.n)::uuid;

UPDATE maintenance_work_order w SET
    title = format('Work order Demo %s', to_char(g.n,'FM00')),
    description = format('Kiểm tra định kỳ thiết bị mẫu số %s.', g.n)
FROM generate_series(1,10) g(n) WHERE w.id = md5('seed45:work-order:' || g.n)::uuid;

UPDATE financial_reconciliation_issue i SET message = format('Sai lệch mẫu cho user %s', to_char(g.n,'FM00'))
FROM generate_series(1,10) g(n) WHERE i.id = md5('seed45:recon-issue:' || g.n)::uuid;

UPDATE customer_support_case c SET
    subject = format('Yêu cầu hỗ trợ mẫu %s', to_char(g.n,'FM00')),
    description = format('Khách hàng cần hỗ trợ cho booking mẫu số %s. Đây là dữ liệu kiểm thử V45.', g.n),
    resolution_note = CASE WHEN c.status IN ('RESOLVED','CLOSED') THEN format('Đã xử lý yêu cầu hỗ trợ mẫu %s', to_char(g.n,'FM00')) ELSE NULL END
FROM generate_series(1,10) g(n) WHERE c.id = md5('seed45:support-case:' || g.n)::uuid;

-- Immutable event/ledger tables need trigger bypass only for repair of our own deterministic demo rows.
SET LOCAL session_replication_role = replica;
UPDATE maintenance_work_order_event e SET note = format('Khởi tạo work order mẫu %s', g.n)
FROM generate_series(1,10) g(n) WHERE e.id = md5('seed45:work-event:' || g.n)::uuid;
UPDATE financial_ledger_entry e SET description = format('Bút toán thanh toán mẫu %s', to_char(g.n,'FM00'))
FROM generate_series(1,10) g(n) WHERE e.id = md5('seed45:ledger-entry:' || g.n)::uuid;
UPDATE customer_support_case_event e SET message = CASE ((g.n - 1) % 5) + 1
    WHEN 1 THEN format('Đã tạo yêu cầu hỗ trợ mẫu %s.', to_char(g.n,'FM00'))
    WHEN 2 THEN 'CineBooking đã tiếp nhận và đang xử lý yêu cầu.'
    WHEN 3 THEN 'CineBooking đang chờ khách hàng bổ sung thông tin.'
    WHEN 4 THEN 'Yêu cầu hỗ trợ đã được giải quyết.'
    ELSE 'Yêu cầu hỗ trợ đã được đóng.'
END
FROM generate_series(1,10) g(n) WHERE e.id = md5('seed45:support-event:' || g.n)::uuid;
SET LOCAL session_replication_role = origin;

-- Fail the seed if any human-readable DEMO45 field is still visibly corrupted.
DO $$
DECLARE bad_count bigint; demo_movie_count bigint;
BEGIN
    SELECT COUNT(*) INTO bad_count FROM (
        SELECT full_name AS v FROM app_user WHERE id IN (SELECT md5('seed45:user:' || n)::uuid FROM generate_series(1,10) g(n))
        UNION ALL SELECT address FROM cinema WHERE id IN (SELECT md5('seed45:cinema:' || n)::uuid FROM generate_series(1,10) g(n))
        UNION ALL SELECT name FROM auditorium WHERE id IN (SELECT md5('seed45:auditorium:' || n)::uuid FROM generate_series(1,10) g(n))
        UNION ALL SELECT job_title FROM staff_profile WHERE user_id IN (SELECT md5('seed45:user:' || n)::uuid FROM generate_series(1,10) g(n))
        UNION ALL SELECT note FROM staff_shift WHERE id IN (SELECT md5('seed45:shift:' || n)::uuid FROM generate_series(1,10) g(n))
        UNION ALL SELECT name FROM concession_product WHERE id IN (SELECT md5('seed45:product:' || n)::uuid FROM generate_series(1,10) g(n))
        UNION ALL SELECT description FROM concession_product WHERE id IN (SELECT md5('seed45:product:' || n)::uuid FROM generate_series(1,10) g(n))
        UNION ALL SELECT provider_message FROM payment WHERE id IN (SELECT md5('seed45:payment:' || n)::uuid FROM generate_series(1,10) g(n))
        UNION ALL SELECT description FROM loyalty_transaction WHERE id IN (SELECT md5('seed45:loyalty-tx:' || n)::uuid FROM generate_series(1,10) g(n))
        UNION ALL SELECT comment FROM movie_review WHERE id IN (SELECT md5('seed45:review:' || n)::uuid FROM generate_series(1,10) g(n))
        UNION ALL SELECT title FROM user_notification WHERE id IN (SELECT md5('seed45:notification:' || n)::uuid FROM generate_series(1,10) g(n))
        UNION ALL SELECT reason FROM staff_leave_request WHERE id IN (SELECT md5('seed45:leave:' || n)::uuid FROM generate_series(1,10) g(n))
        UNION ALL SELECT title FROM staff_incident WHERE id IN (SELECT md5('seed45:incident:' || n)::uuid FROM generate_series(1,10) g(n))
        UNION ALL SELECT summary FROM staff_shift_handover WHERE id IN (SELECT md5('seed45:handover:' || n)::uuid FROM generate_series(1,10) g(n))
        UNION ALL SELECT reason FROM auditorium_blackout WHERE id IN (SELECT md5('seed45:blackout:' || n)::uuid FROM generate_series(1,10) g(n))
        UNION ALL SELECT name FROM cinema_equipment_asset WHERE id IN (SELECT md5('seed45:asset:' || n)::uuid FROM generate_series(1,10) g(n))
        UNION ALL SELECT description FROM maintenance_work_order WHERE id IN (SELECT md5('seed45:work-order:' || n)::uuid FROM generate_series(1,10) g(n))
        UNION ALL SELECT note FROM maintenance_work_order_event WHERE id IN (SELECT md5('seed45:work-event:' || n)::uuid FROM generate_series(1,10) g(n))
        UNION ALL SELECT description FROM financial_ledger_entry WHERE id IN (SELECT md5('seed45:ledger-entry:' || n)::uuid FROM generate_series(1,10) g(n))
        UNION ALL SELECT message FROM financial_reconciliation_issue WHERE id IN (SELECT md5('seed45:recon-issue:' || n)::uuid FROM generate_series(1,10) g(n))
        UNION ALL SELECT subject FROM customer_support_case WHERE id IN (SELECT md5('seed45:support-case:' || n)::uuid FROM generate_series(1,10) g(n))
        UNION ALL SELECT description FROM customer_support_case WHERE id IN (SELECT md5('seed45:support-case:' || n)::uuid FROM generate_series(1,10) g(n))
        UNION ALL SELECT message FROM customer_support_case_event WHERE id IN (SELECT md5('seed45:support-event:' || n)::uuid FROM generate_series(1,10) g(n))
    ) text_values WHERE v LIKE '%?%';

    IF bad_count <> 0 THEN
        RAISE EXCEPTION 'DEMO45 UTF-8 repair failed: % human-readable values still contain ?', bad_count;
    END IF;

    SELECT COUNT(*) INTO demo_movie_count
    FROM movie
    WHERE id IN (SELECT md5('seed45:movie:' || n)::uuid FROM generate_series(1,10) g(n))
       OR title LIKE 'Phim Demo %';
    IF demo_movie_count <> 0 THEN
        RAISE EXCEPTION 'DEMO45 movie cleanup failed: % synthetic demo movies remain', demo_movie_count;
    END IF;
END $$;

COMMIT;

-- Quick verification of all 47 tables shown in pgAdmin V45.
DO $$
DECLARE
    t TEXT;
    c BIGINT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'app_user','audit_log','auditorium','auditorium_blackout','auth_session',
        'booking','booking_concession','booking_seat','cinema','cinema_equipment_asset',
        'concession_product','customer_support_case','customer_support_case_event',
        'financial_ledger_entry','financial_ledger_line',
        'financial_reconciliation_issue','financial_reconciliation_run','flyway_schema_history',
        'inventory_movement','loyalty_point_lot','loyalty_reward','loyalty_reward_redemption',
        'loyalty_transaction','maintenance_work_order','maintenance_work_order_event','movie',
        'movie_favorite','movie_review','notification_preference','password_reset_token','payment',
        'payment_webhook_event','pricing_rule','recommendation_event','seat','showtime',
        'showtime_waitlist','staff_attendance','staff_incident','staff_leave_request','staff_profile',
        'staff_shift','staff_shift_handover','ticket_checkin_log','user_notification','voucher',
        'voucher_redemption'
    ]
    LOOP
        EXECUTE format('SELECT count(*) FROM %I', t) INTO c;
        RAISE NOTICE '%: % rows', rpad(t, 36, ' '), c;
        IF c = 0 THEN
            RAISE EXCEPTION 'Seed verification failed: table % is still empty', t;
        END IF;
    END LOOP;
END $$;
