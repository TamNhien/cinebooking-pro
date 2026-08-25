-- V58 data-quality repair: normalize known historical smoke/E2E display data.
-- Keeps primary keys, foreign keys, timestamps and audit events; only known synthetic
-- human-readable values are normalized. Run after seed-reference-57-tables.ps1 so
-- the deterministic USER reference accounts are available for legacy support cases.
BEGIN;
SET LOCAL client_encoding = 'UTF8';
SET LOCAL session_replication_role = replica;

-- -----------------------------------------------------------------------------
-- 1. Customer identities created by browser/integration tests.
--    example.com is reserved for documentation and cannot expose a real mailbox.
-- -----------------------------------------------------------------------------
UPDATE app_user
SET full_name = CASE
        WHEN lower(email) LIKE 'v29-e2e-%@example.test' OR full_name='V29 Playwright Customer' THEN 'Nguyễn Gia Huy'
        WHEN lower(email) LIKE 'v36-sender-%@example.test' OR full_name='V36 Ticket Sender' THEN 'Nguyễn Minh Khang'
        WHEN lower(email) LIKE 'v36-recipient-%@example.test' OR full_name='V36 Ticket Recipient' THEN 'Lê Gia Hân'
        WHEN lower(email) LIKE 'v38-refund-%@example.test' OR full_name='V38 Refund Customer' THEN 'Phạm Quang Huy'
        WHEN lower(email) LIKE 'v39-seat-a-%@example.test' OR full_name='V39 Seat User A' THEN 'Nguyễn Đức Anh'
        WHEN lower(email) LIKE 'v39-seat-b-%@example.test' OR full_name='V39 Seat User B' THEN 'Trần Thảo Vy'
        WHEN lower(email) LIKE 'v40-loyalty-%@example.test' OR lower(email) LIKE 'v40-member-%@example.test' OR full_name IN ('V40 Loyalty Customer','V40 Member') THEN 'Trương Thanh Trúc'
        WHEN lower(email) LIKE 'v41-notify-%@example.test' OR full_name IN ('V41 Notification Customer','V41 Notify') THEN 'Trần Khánh Linh'
        WHEN lower(email) LIKE 'v42-finance-%@example.test' OR full_name IN ('V42 Finance Customer','V42 Finance') THEN 'Hồ Minh Châu'
        WHEN lower(email) LIKE 'v46-security-%@example.test' OR full_name='V46 Security Customer' THEN 'Võ Ngọc Mai'
        WHEN lower(email) LIKE 'v47-payment-%@example.test' OR full_name='Nguyễn Thanh Toán' THEN 'Võ Đức Huy'
        WHEN lower(email) LIKE 'v50-taste-%@example.test' OR full_name='Nguyễn Gu Phim' THEN 'Phạm Hoàng Anh'
        WHEN lower(email) LIKE 'v52-pwa-%@example.test' OR full_name='Nguyễn Mobile PWA' THEN 'Lê Minh Thư'
        WHEN lower(email) LIKE 'v57-seat-a-%@example.test' OR full_name='V57 Seat User A' THEN 'Bùi Gia Khánh'
        WHEN lower(email) LIKE 'v57-seat-b-%@example.test' OR full_name='V57 Seat User B' THEN 'Đặng Ngọc Lan'
        ELSE full_name
    END,
    email = CASE
        WHEN lower(email) LIKE 'v29-e2e-%@example.test' THEN 'gia.huy+'||substr(md5(lower(email)),1,10)||'@example.com'
        WHEN lower(email) LIKE 'v36-sender-%@example.test' THEN 'minh.khang+'||substr(md5(lower(email)),1,10)||'@example.com'
        WHEN lower(email) LIKE 'v36-recipient-%@example.test' THEN 'gia.han+'||substr(md5(lower(email)),1,10)||'@example.com'
        WHEN lower(email) LIKE 'v38-refund-%@example.test' THEN 'quang.huy+'||substr(md5(lower(email)),1,10)||'@example.com'
        WHEN lower(email) LIKE 'v39-seat-a-%@example.test' THEN 'duc.anh+'||substr(md5(lower(email)),1,10)||'@example.com'
        WHEN lower(email) LIKE 'v39-seat-b-%@example.test' THEN 'thao.vy+'||substr(md5(lower(email)),1,10)||'@example.com'
        WHEN lower(email) LIKE 'v40-loyalty-%@example.test' OR lower(email) LIKE 'v40-member-%@example.test' THEN 'thanh.truc+'||substr(md5(lower(email)),1,10)||'@example.com'
        WHEN lower(email) LIKE 'v41-notify-%@example.test' THEN 'khanh.linh+'||substr(md5(lower(email)),1,10)||'@example.com'
        WHEN lower(email) LIKE 'v42-finance-%@example.test' THEN 'minh.chau+'||substr(md5(lower(email)),1,10)||'@example.com'
        WHEN lower(email) LIKE 'v46-security-%@example.test' THEN 'ngoc.mai+'||substr(md5(lower(email)),1,10)||'@example.com'
        WHEN lower(email) LIKE 'v47-payment-%@example.test' THEN 'duc.huy+'||substr(md5(lower(email)),1,10)||'@example.com'
        WHEN lower(email) LIKE 'v50-taste-%@example.test' THEN 'hoang.anh+'||substr(md5(lower(email)),1,10)||'@example.com'
        WHEN lower(email) LIKE 'v52-pwa-%@example.test' THEN 'minh.thu+'||substr(md5(lower(email)),1,10)||'@example.com'
        WHEN lower(email) LIKE 'v57-seat-a-%@example.test' THEN 'gia.khanh+'||substr(md5(lower(email)),1,10)||'@example.com'
        WHEN lower(email) LIKE 'v57-seat-b-%@example.test' THEN 'ngoc.lan+'||substr(md5(lower(email)),1,10)||'@example.com'
        WHEN lower(email) LIKE '%@example.test' THEN 'khach.hang+'||substr(md5(lower(email)),1,12)||'@example.com'
        ELSE email
    END,
    updated_at = CURRENT_TIMESTAMP
WHERE lower(email) LIKE '%@example.test'
   OR full_name IN (
      'V29 Playwright Customer','V36 Ticket Sender','V36 Ticket Recipient','V38 Refund Customer',
      'V39 Seat User A','V39 Seat User B','V40 Loyalty Customer','V40 Member','V41 Notification Customer',
      'V41 Notify','V42 Finance Customer','V42 Finance','V46 Security Customer','Nguyễn Thanh Toán',
      'Nguyễn Gu Phim','Nguyễn Mobile PWA','V57 Seat User A','V57 Seat User B'
   );

-- Historical smoke-test staff are retained for audit history but display as normal staff.
UPDATE app_user SET
    full_name=CASE
      WHEN full_name IN ('V10 Test Staff','V10 Test Staff Updated') OR lower(email) LIKE 'staff.v10.%@cine.local' THEN 'Nguyễn Hoàng Long'
      WHEN full_name IN ('V11 Test Staff','V11 Test Staff Updated') OR lower(email) LIKE 'staff.v11.%@cine.local' THEN 'Trần Đức Minh'
      WHEN full_name='V12 Test Staff' OR lower(email) LIKE 'staff.v12.%@cine.local' THEN 'Lê Anh Tuấn'
      ELSE full_name END,
    email=CASE
      WHEN lower(email) LIKE 'staff.v10.%@cine.local' THEN 'hoang.long+'||substr(md5(lower(email)),1,10)||'@example.com'
      WHEN lower(email) LIKE 'staff.v11.%@cine.local' THEN 'duc.minh+'||substr(md5(lower(email)),1,10)||'@example.com'
      WHEN lower(email) LIKE 'staff.v12.%@cine.local' THEN 'anh.tuan+'||substr(md5(lower(email)),1,10)||'@example.com'
      ELSE email END,
    phone=CASE
      WHEN full_name IN ('V10 Test Staff','V10 Test Staff Updated') OR lower(email) LIKE 'staff.v10.%@cine.local' THEN '0928234567'
      WHEN full_name IN ('V11 Test Staff','V11 Test Staff Updated') OR lower(email) LIKE 'staff.v11.%@cine.local' THEN '0929456789'
      WHEN full_name='V12 Test Staff' OR lower(email) LIKE 'staff.v12.%@cine.local' THEN '0930567890'
      ELSE phone END,
    updated_at=CURRENT_TIMESTAMP
WHERE lower(email) LIKE 'staff.v10.%@cine.local' OR lower(email) LIKE 'staff.v11.%@cine.local'
   OR lower(email) LIKE 'staff.v12.%@cine.local'
   OR full_name IN ('V10 Test Staff','V10 Test Staff Updated','V11 Test Staff','V11 Test Staff Updated','V12 Test Staff');

UPDATE staff_profile sp SET
    employee_code = CASE
      WHEN u.full_name='Nguyễn Hoàng Long' AND (sp.employee_code LIKE 'T%' OR sp.employee_code LIKE 'CBSM%') THEN 'CBSM'||substr(md5(sp.user_id::text),1,8)
      WHEN u.full_name='Trần Đức Minh' AND (sp.employee_code LIKE 'T%' OR sp.employee_code LIKE 'CBSN%') THEN 'CBSN'||substr(md5(sp.user_id::text),1,8)
      WHEN u.full_name='Lê Anh Tuấn' AND (sp.employee_code LIKE 'T%' OR sp.employee_code LIKE 'CBS%') THEN 'CBS'||substr(md5(sp.user_id::text),1,9)
      ELSE sp.employee_code END,
    job_title = CASE WHEN u.full_name IN ('Nguyễn Hoàng Long','Trần Đức Minh','Lê Anh Tuấn') THEN 'Nhân viên soát vé' ELSE sp.job_title END,
    updated_at=CURRENT_TIMESTAMP
FROM app_user u
WHERE u.id=sp.user_id AND u.full_name IN ('Nguyễn Hoàng Long','Trần Đức Minh','Lê Anh Tuấn');

-- -----------------------------------------------------------------------------
-- 2. Known historical operational labels left by smoke/browser journeys.
-- -----------------------------------------------------------------------------
UPDATE cinema SET name='CineHub Trung Sơn', address='9A Nguyễn Hữu Thọ, Khu đô thị Trung Sơn, TP.HCM'
WHERE name='V10 Test Cinema' OR address='Local smoke test';

UPDATE staff_shift SET note='Ca vận hành cổng soát vé'
WHERE note IN ('Automated V10.2 smoke test','Automated V11 smoke test');

UPDATE voucher SET
  code='WELCOME'||substr(md5(id::text),1,8),
  name='Ưu đãi thành viên mới 10%'
WHERE code LIKE 'V12T%' OR name='V12 automated voucher test';

UPDATE inventory_movement SET note=CASE
  WHEN note='V19 automated smoke test restock' THEN 'Bổ sung tồn kho trước ca tối'
  WHEN note='V19 automated smoke test restore' THEN 'Điều chỉnh tồn kho về số lượng sau kiểm kê'
  WHEN note='Bổ sung tồn kho ca tối V48' THEN 'Bổ sung tồn kho cho ca tối'
  WHEN note='Hao hụt kiểm kê cuối ca V48' THEN 'Hao hụt ghi nhận khi kiểm kê cuối ca'
  ELSE note END
WHERE note IN ('V19 automated smoke test restock','V19 automated smoke test restore','Bổ sung tồn kho ca tối V48','Hao hụt kiểm kê cuối ca V48');

UPDATE cinema SET name=regexp_replace(name,'^CineHub V48 Transfer ','CineHub Bình Thạnh '),
                  address=CASE WHEN address='88 Đường Kiểm Thử, TP.HCM' THEN '88 Nguyễn Gia Trí, Phường Thạnh Mỹ Tây, TP.HCM' ELSE address END
WHERE name LIKE 'CineHub V48 Transfer %' OR address='88 Đường Kiểm Thử, TP.HCM';

UPDATE cinema_equipment_asset SET
  asset_code='PRJ-HCM-'||upper(substr(md5(id::text),1,8)),
  name='Máy chiếu Barco SP4K '||upper(substr(md5(id::text),1,6)),
  note=CASE WHEN lower(coalesce(note,'')) LIKE '%e2e%' OR lower(coalesce(note,'')) LIKE '%test%' THEN 'Thiết bị trình chiếu phục vụ vận hành phòng chiếu' ELSE note END,
  updated_at=CURRENT_TIMESTAMP
WHERE asset_code LIKE 'E2E-%' OR name LIKE 'Máy chiếu E2E%';

UPDATE maintenance_work_order SET
  title=regexp_replace(title,'^V44 E2E ','Cân chỉnh máy chiếu '),
  description=CASE WHEN description LIKE '%bài test V44%' THEN 'Kiểm tra độ sáng, quạt làm mát, nguồn và cân chỉnh khung hình của máy chiếu.' ELSE description END,
  resolution_note=CASE WHEN coalesce(resolution_note,'') LIKE '%Playwright V44%' THEN 'Đã vệ sinh bộ lọc, kiểm tra nguồn và hiệu chuẩn lại máy chiếu.' ELSE resolution_note END,
  updated_at=CURRENT_TIMESTAMP
WHERE title LIKE 'V44 E2E %' OR coalesce(description,'') LIKE '%bài test V44%' OR coalesce(resolution_note,'') LIKE '%Playwright V44%';

UPDATE maintenance_work_order_event SET note='Đã vệ sinh bộ lọc, kiểm tra nguồn và hiệu chuẩn lại máy chiếu.'
WHERE coalesce(note,'') LIKE '%Playwright V44%';

UPDATE staff_incident SET
  title=regexp_replace(title,'^V43 E2E ','Khách cần hỗ trợ tại cổng soát vé '),
  description=CASE WHEN coalesce(description,'') LIKE '%kiểm thử tự động%' THEN 'Khách gặp khó khăn khi quét mã QR tại cổng soát vé và cần nhân viên hỗ trợ trực tiếp.' ELSE description END,
  resolution_note=CASE WHEN coalesce(resolution_note,'') LIKE '%Playwright V43%' THEN 'Đã kiểm tra mã vé, hướng dẫn khách quét lại và xác nhận vào rạp thành công.' ELSE resolution_note END,
  updated_at=CURRENT_TIMESTAMP
WHERE title LIKE 'V43 E2E %' OR coalesce(description,'') LIKE '%kiểm thử tự động%' OR coalesce(resolution_note,'') LIKE '%Playwright V43%';

-- Legacy V45 browser journey used ADMIN as the support customer. Relink only those
-- known rows to a deterministic fictional USER when the reference customer exists.
UPDATE customer_support_case c SET
  user_id=customer.id,
  subject=regexp_replace(c.subject,'^V45 E2E support ([0-9]+)$','Không nhận được email xác nhận vé #\1'),
  description='Khách đã thanh toán thành công nhưng chưa nhận được email xác nhận vé và cần kiểm tra lại booking.',
  resolution_note=CASE WHEN coalesce(c.resolution_note,'') LIKE '%service recovery V45%' THEN 'Đã xác minh booking và gửi lại email xác nhận vé cho khách hàng.' ELSE c.resolution_note END,
  updated_at=CURRENT_TIMESTAMP
FROM app_user customer
WHERE customer.email='gia.han@example.com' AND customer.role='USER'
  AND (c.subject LIKE 'V45 E2E support %' OR coalesce(c.description,'') LIKE '%V45%' OR coalesce(c.resolution_note,'') LIKE '%service recovery V45%');

UPDATE customer_support_case_event SET
  message=CASE
    WHEN coalesce(message,'') LIKE '%service recovery V45%' THEN 'Đã xác minh booking và gửi lại email xác nhận vé cho khách hàng.'
    WHEN coalesce(message,'') LIKE '%V45 E2E%' THEN 'CineBooking đã tiếp nhận yêu cầu hỗ trợ của khách hàng.'
    ELSE message END
WHERE coalesce(message,'') LIKE '%service recovery V45%' OR coalesce(message,'') LIKE '%V45 E2E%';

UPDATE trusted_device SET label='Laptop cá nhân' WHERE label='Laptop E2E V46';
UPDATE loyalty_transaction SET description='Điều chỉnh điểm chăm sóc khách hàng'
WHERE coalesce(description,'') LIKE '%V40 Playwright reward journey%';
UPDATE user_notification SET
  title='Xác nhận kênh thông báo đang hoạt động',
  message='Kênh thông báo trong ứng dụng của bạn đang hoạt động bình thường.'
WHERE title='Thông báo thử CineBooking' OR coalesce(message,'') LIKE '%kênh thông báo trong ứng dụng đang hoạt động%';
UPDATE auditorium_blackout SET reason='Bảo trì định kỳ máy chiếu' WHERE reason='V34 RC projector maintenance';

-- Keep audit actor email aligned with the normalized account alias; IDs/actions/times remain unchanged.
UPDATE audit_log a SET actor_email=u.email FROM app_user u
WHERE a.actor_user_id=u.id AND a.actor_email IS DISTINCT FROM u.email
  AND (lower(coalesce(a.actor_email,'')) LIKE '%@example.test' OR lower(coalesce(a.actor_email,'')) LIKE 'staff.v1%.%@cine.local');

-- -----------------------------------------------------------------------------
-- 3. Semantic ownership repair for historical rows created before USER/staff
--    separation was enforced. Keep every row ID/FK/timestamp. Choose customer
--    owners from the USER rows that actually exist in this database instead of
--    assuming a particular deterministic UUID is still present.
-- -----------------------------------------------------------------------------
CREATE TEMP TABLE repair_user_pool(seq integer PRIMARY KEY,user_id uuid NOT NULL) ON COMMIT DROP;
INSERT INTO repair_user_pool(seq,user_id)
SELECT row_number() OVER (ORDER BY created_at,id)::integer AS seq,id
FROM app_user
WHERE role='USER';

DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM repair_user_pool;
  IF n=0 THEN
    RAISE EXCEPTION 'Realistic-data repair requires at least one USER account';
  END IF;
END $$;

CREATE TEMP TABLE repair_booking_owner_map(booking_id uuid PRIMARY KEY,customer_id uuid NOT NULL) ON COMMIT DROP;
INSERT INTO repair_booking_owner_map(booking_id,customer_id)
WITH candidates AS (
  SELECT b.id AS booking_id,
         b.user_id,
         b.purchaser_user_id,
         owner_user.role AS owner_role,
         purchaser.role AS purchaser_role,
         row_number() OVER (ORDER BY b.created_at,b.id)::integer AS rn
  FROM booking b
  LEFT JOIN app_user owner_user ON owner_user.id=b.user_id
  LEFT JOIN app_user purchaser ON purchaser.id=b.purchaser_user_id
  WHERE (b.user_id IS NOT NULL AND COALESCE(owner_user.role,'')<>'USER')
     OR (b.purchaser_user_id IS NOT NULL AND COALESCE(purchaser.role,'')<>'USER')
)
SELECT c.booking_id,
       COALESCE(
         CASE WHEN c.purchaser_role='USER' THEN c.purchaser_user_id END,
         CASE WHEN c.owner_role='USER' THEN c.user_id END,
         pool.user_id
       ) AS customer_id
FROM candidates c
JOIN repair_user_pool pool
  ON pool.seq=((c.rn-1) % (SELECT count(*) FROM repair_user_pool))+1;

UPDATE booking b
SET user_id=m.customer_id,
    purchaser_user_id=m.customer_id
FROM repair_booking_owner_map m
WHERE b.id=m.booking_id;

-- Payment payer follows the linked booking purchaser when possible. Payments
-- without a usable booking customer are assigned round-robin across existing USERs.
CREATE TEMP TABLE repair_payment_owner_map(payment_id uuid PRIMARY KEY,customer_id uuid NOT NULL) ON COMMIT DROP;
INSERT INTO repair_payment_owner_map(payment_id,customer_id)
WITH candidates AS (
  SELECT p.id AS payment_id,
         b.purchaser_user_id,
         booking_customer.role AS booking_customer_role,
         row_number() OVER (ORDER BY p.created_at,p.id)::integer AS rn
  FROM payment p
  LEFT JOIN app_user current_payer ON current_payer.id=p.payer_user_id
  LEFT JOIN booking b ON b.id=p.booking_id
  LEFT JOIN app_user booking_customer ON booking_customer.id=b.purchaser_user_id
  WHERE p.payer_user_id IS NOT NULL AND COALESCE(current_payer.role,'')<>'USER'
)
SELECT c.payment_id,
       COALESCE(
         CASE WHEN c.booking_customer_role='USER' THEN c.purchaser_user_id END,
         pool.user_id
       ) AS customer_id
FROM candidates c
JOIN repair_user_pool pool
  ON pool.seq=((c.rn-1) % (SELECT count(*) FROM repair_user_pool))+1;

UPDATE payment p
SET payer_user_id=m.customer_id
FROM repair_payment_owner_map m
WHERE p.id=m.payment_id;

-- Support customer follows its booking purchaser when available; otherwise use
-- the USER pool that actually exists. Staff assignee is intentionally untouched.
CREATE TEMP TABLE repair_support_owner_map(case_id uuid PRIMARY KEY,customer_id uuid NOT NULL) ON COMMIT DROP;
INSERT INTO repair_support_owner_map(case_id,customer_id)
WITH candidates AS (
  SELECT c.id AS case_id,
         b.purchaser_user_id,
         booking_customer.role AS booking_customer_role,
         row_number() OVER (ORDER BY c.created_at,c.id)::integer AS rn
  FROM customer_support_case c
  LEFT JOIN app_user current_customer ON current_customer.id=c.user_id
  LEFT JOIN booking b ON b.id=c.booking_id
  LEFT JOIN app_user booking_customer ON booking_customer.id=b.purchaser_user_id
  WHERE c.user_id IS NOT NULL AND COALESCE(current_customer.role,'')<>'USER'
)
SELECT c.case_id,
       COALESCE(
         CASE WHEN c.booking_customer_role='USER' THEN c.purchaser_user_id END,
         pool.user_id
       ) AS customer_id
FROM candidates c
JOIN repair_user_pool pool
  ON pool.seq=((c.rn-1) % (SELECT count(*) FROM repair_user_pool))+1;

UPDATE customer_support_case c
SET user_id=m.customer_id,
    updated_at=CURRENT_TIMESTAMP
FROM repair_support_owner_map m
WHERE c.id=m.case_id;

-- Normalize any remaining historical support subject that still exposes a test
-- harness label. The immutable case/event history remains present.
UPDATE customer_support_case
SET subject='Không nhận được email xác nhận vé',
    description=CASE
      WHEN lower(COALESCE(description,'')) LIKE '%playwright%'
        OR lower(COALESCE(description,'')) LIKE '%e2e%'
        OR lower(COALESCE(description,'')) LIKE '%bài test%'
        OR lower(COALESCE(description,'')) LIKE '%kiểm thử tự động%'
      THEN 'Khách đã hoàn tất thao tác nhưng cần CineBooking kiểm tra lại trạng thái booking và hỗ trợ xác nhận.'
      ELSE description END,
    updated_at=CURRENT_TIMESTAMP
WHERE lower(COALESCE(subject,'')) LIKE '%playwright%'
   OR lower(COALESCE(subject,'')) LIKE '%e2e%'
   OR lower(COALESCE(subject,'')) LIKE '%test%';

-- Payment events are append-only in normal runtime. Repair mode has trigger bypass
-- enabled, so normalize only synthetic actor display references while preserving
-- event ID/type/status/code/message/timestamp.
UPDATE payment_event pe
SET actor_ref=customer.email
FROM payment p
JOIN app_user customer ON customer.id=p.payer_user_id AND customer.role='USER'
WHERE pe.payment_id=p.id
  AND pe.actor_type='USER'
  AND pe.actor_ref IS NOT NULL
  AND (lower(pe.actor_ref) LIKE '%@example.test%'
       OR lower(pe.actor_ref) LIKE '%playwright%'
       OR lower(pe.actor_ref) LIKE '%e2e%');

UPDATE payment_event
SET actor_ref=regexp_replace(actor_ref,'@example\.test','@example.com','gi')
WHERE actor_ref IS NOT NULL AND lower(actor_ref) LIKE '%@example.test%';

-- Audit details may contain copied browser/smoke labels from old automated
-- journeys. audit_log.action/entity/id/time are kept intact; only free-text details
-- that still match the audit scanner are rewritten to a neutral operational note.
UPDATE audit_log
SET details='Thao tác vận hành được ghi nhận trong hệ thống.'
WHERE lower(COALESCE(details,'')) LIKE '%@example.test%'
   OR lower(COALESCE(details,'')) LIKE '%playwright%'
   OR lower(COALESCE(details,'')) LIKE '%test staff%'
   OR lower(COALESCE(details,'')) LIKE '%test cinema%'
   OR lower(COALESCE(details,'')) LIKE '%local smoke test%'
   OR lower(COALESCE(details,'')) LIKE '%automated smoke test%'
   OR lower(COALESCE(details,'')) LIKE '% v43 e2e %'
   OR lower(COALESCE(details,'')) LIKE 'v43 e2e %'
   OR lower(COALESCE(details,'')) LIKE '% v44 e2e %'
   OR lower(COALESCE(details,'')) LIKE 'v44 e2e %'
   OR lower(COALESCE(details,'')) LIKE '% v45 e2e %'
   OR lower(COALESCE(details,'')) LIKE 'v45 e2e %'
   OR lower(COALESCE(details,'')) LIKE 'e2e-%'
   OR lower(COALESCE(details,'')) LIKE '%đường kiểm thử%'
   OR lower(COALESCE(details,'')) LIKE '%kiểm thử tự động%'
   OR lower(COALESCE(details,'')) LIKE '%bài test%';

-- Conservative global phrase normalization for immutable/audit text that may have
-- copied one of the known old labels. Technical event types/version identifiers are untouched.
DO $$
DECLARE c record; r record; q text;
BEGIN
  FOR c IN
    SELECT table_name,column_name
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name <> 'flyway_schema_history'
      AND data_type IN ('character varying','character','text')
  LOOP
    FOR r IN SELECT * FROM (VALUES
      ('V40 Playwright reward journey','Điều chỉnh điểm chăm sóc khách hàng'),
      ('Thông báo thử CineBooking','Xác nhận kênh thông báo đang hoạt động'),
      ('Nếu bạn thấy thông báo này, kênh thông báo trong ứng dụng đang hoạt động.','Kênh thông báo trong ứng dụng của bạn đang hoạt động bình thường.'),
      ('Automated V10.2 smoke test','Ca vận hành cổng soát vé'),
      ('Automated V11 smoke test','Ca hỗ trợ sảnh và soát vé'),
      ('V19 automated smoke test restock','Bổ sung tồn kho trước ca tối'),
      ('V19 automated smoke test restore','Điều chỉnh tồn kho về số lượng sau kiểm kê'),
      ('Đã xác minh bằng Playwright V43','Đã kiểm tra mã vé và hỗ trợ khách vào rạp thành công'),
      ('Đã kiểm tra và hiệu chuẩn máy chiếu bằng Playwright V44','Đã vệ sinh bộ lọc, kiểm tra nguồn và hiệu chuẩn lại máy chiếu')
    ) AS x(old_value,new_value)
    LOOP
      q:=format('UPDATE public.%I SET %I=replace(%I,$1,$2) WHERE %I LIKE $3',c.table_name,c.column_name,c.column_name,c.column_name);
      EXECUTE q USING r.old_value,r.new_value,'%'||r.old_value||'%';
    END LOOP;
  END LOOP;
END $$;

SET LOCAL session_replication_role = origin;
COMMIT;
