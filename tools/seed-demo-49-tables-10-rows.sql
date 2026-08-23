-- CineBooking realistic reference-data seed/repair for the 49 tables shown in pgAdmin (V46 schema).
-- Adds/repairs 10 deterministic realistic rows in every V46 application table, EXCEPT movie.
-- movie intentionally reuses the eight canonical films already shipped by V29; no synthetic movie rows are created.
-- flyway_schema_history is intentionally NOT modified because it is Flyway system metadata.
-- The runner copies this UTF-8 file into the PostgreSQL container and executes it there, avoiding Windows pipe/code-page corruption.
-- Re-running repairs prior placeholder/encoding data and does not duplicate deterministic rows.
-- Reference accounts use the shared password CineBooking@123.

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


CREATE TEMP TABLE seed_real_people(
    n integer PRIMARY KEY,
    email text NOT NULL,
    full_name text NOT NULL,
    phone text NOT NULL,
    employee_code text NOT NULL,
    job_title text NOT NULL
) ON COMMIT DROP;
INSERT INTO seed_real_people VALUES
(1,'an.nguyen@cinebooking.local','Nguyễn Minh An','0903123456','CBM001','Quản lý rạp'),
(2,'bao.tran@cinebooking.local','Trần Quốc Bảo','0904234567','CBS002','Giám sát ca'),
(3,'nam.le@cinebooking.local','Lê Hoàng Nam','0905345678','CBS003','Nhân viên soát vé'),
(4,'ha.pham@cinebooking.local','Phạm Thu Hà','0906456789','CBS004','Nhân viên quầy vé'),
(5,'huy.vo@cinebooking.local','Võ Đức Huy','0907567890','CBS005','Nhân viên bắp nước'),
(6,'lan.dang@cinebooking.local','Đặng Ngọc Lan','0908678901','CBS006','Nhân viên chăm sóc khách hàng'),
(7,'khanh.bui@cinebooking.local','Bùi Gia Khánh','0909789012','CBS007','Kỹ thuật viên phòng chiếu'),
(8,'vy.nguyen@cinebooking.local','Nguyễn Thảo Vy','0910890123','CBS008','Nhân viên vận hành'),
(9,'phong.truong@cinebooking.local','Trương Quốc Phong','0911901234','CBS009','Nhân viên kho'),
(10,'chau.ho@cinebooking.local','Hồ Minh Châu','0912012345','CBS010','Nhân viên hỗ trợ sảnh');

CREATE TEMP TABLE seed_real_cinema(n integer PRIMARY KEY,name text NOT NULL,address text NOT NULL) ON COMMIT DROP;
INSERT INTO seed_real_cinema VALUES
(1,'CineHub Nguyễn Huệ','72 Nguyễn Huệ, Bến Nghé, Quận 1, TP.HCM'),
(2,'CineHub Landmark 81','720A Điện Biên Phủ, Phường Thạnh Mỹ Tây, TP.HCM'),
(3,'CineHub Thảo Điền','159 Võ Nguyên Giáp, Phường An Khánh, TP.HCM'),
(4,'CineHub Crescent Mall','101 Tôn Dật Tiên, Phường Tân Mỹ, TP.HCM'),
(5,'CineHub Emart Gò Vấp','366 Phan Văn Trị, Phường An Nhơn, TP.HCM'),
(6,'CineHub Cộng Hòa','20 Cộng Hòa, Phường Bảy Hiền, TP.HCM'),
(7,'CineHub Aeon Bình Tân','1 Đường số 17A, Phường Bình Trị Đông, TP.HCM'),
(8,'CineHub Vạn Hạnh','11 Sư Vạn Hạnh, Phường Hòa Hưng, TP.HCM'),
(9,'CineHub Gigamall','240 Phạm Văn Đồng, Phường Hiệp Bình, TP.HCM'),
(10,'CineHub Nguyễn Trãi','190 Hồng Bàng, Phường Chợ Lớn, TP.HCM');

CREATE TEMP TABLE seed_real_auditorium(n integer PRIMARY KEY,name text NOT NULL) ON COMMIT DROP;
INSERT INTO seed_real_auditorium VALUES
(1,'Phòng 01 - Standard'),(2,'Phòng 02 - Standard'),(3,'Phòng 03 - VIP'),
(4,'Phòng 04 - Dolby Atmos'),(5,'Phòng 05 - Standard'),(6,'Phòng 06 - Couple'),
(7,'Phòng 07 - VIP'),(8,'Phòng 08 - Standard'),(9,'Phòng 09 - Premium'),(10,'Phòng 10 - Standard');

CREATE TEMP TABLE seed_real_product(n integer PRIMARY KEY,name text NOT NULL,description text NOT NULL,price numeric(12,2) NOT NULL) ON COMMIT DROP;
INSERT INTO seed_real_product VALUES
(1,'Bắp Caramel Vừa','Bắp rang caramel cỡ vừa',49000),
(2,'Bắp Phô Mai Lớn','Bắp rang phủ phô mai cỡ lớn',69000),
(3,'Bắp Ngọt Lớn','Bắp rang vị ngọt cỡ lớn',55000),
(4,'Coca-Cola Lớn','Nước ngọt Coca-Cola cỡ lớn',39000),
(5,'Sprite Lớn','Nước ngọt Sprite cỡ lớn',39000),
(6,'Fanta Cam Lớn','Nước ngọt Fanta cam cỡ lớn',39000),
(7,'Nước Suối Dasani','Nước suối Dasani 500 ml',25000),
(8,'Combo Solo','1 bắp vừa + 1 nước lớn',89000),
(9,'Combo Couple Plus','1 bắp lớn + 2 nước lớn',149000),
(10,'Combo Family','2 bắp lớn + 4 nước lớn',219000);

CREATE TEMP TABLE seed_real_voucher(n integer PRIMARY KEY,code text NOT NULL,name text NOT NULL) ON COMMIT DROP;
INSERT INTO seed_real_voucher VALUES
(1,'CBMEMBER10K','Ưu đãi thành viên 10.000đ'),
(2,'CBWEEKEND10K','Ưu đãi cuối tuần 10.000đ'),
(3,'CBBIRTHDAY10K','Quà sinh nhật 10.000đ'),
(4,'CBMOVIE10K','Ưu đãi vé xem phim 10.000đ'),
(5,'CBCOMBO10K','Ưu đãi bắp nước 10.000đ'),
(6,'CBAPP10K','Ưu đãi đặt vé trực tuyến 10.000đ'),
(7,'CBLOYAL10K','Ưu đãi khách hàng thân thiết 10.000đ'),
(8,'CBEVENING10K','Ưu đãi suất tối 10.000đ'),
(9,'CBSTUDENT10K','Ưu đãi học sinh sinh viên 10.000đ'),
(10,'CBFAMILY10K','Ưu đãi gia đình 10.000đ');

CREATE TEMP TABLE seed_real_asset(
    n integer PRIMARY KEY,asset_code text NOT NULL,name text NOT NULL,category text NOT NULL,
    vendor text NOT NULL,serial_number text NOT NULL,note text NOT NULL,work_title text NOT NULL,work_description text NOT NULL
) ON COMMIT DROP;
INSERT INTO seed_real_asset VALUES
(1,'PRJ-NH-001','Máy chiếu Barco SP4K-15','PROJECTOR','Barco','BARCO-SP4K-15001','Thiết bị trình chiếu chính của Phòng 01','Vệ sinh và cân chỉnh máy chiếu Barco','Kiểm tra bộ lọc, độ sáng, màu sắc và cân chỉnh khung hình.'),
(2,'AUD-LM81-001','Bộ xử lý âm thanh Dolby CP950','AUDIO','Dolby Laboratories','DOLBY-CP950-002','Bộ xử lý âm thanh trung tâm của Phòng 02','Kiểm tra hệ thống âm thanh Dolby','Đo mức âm lượng, kiểm tra kênh loa và cấu hình Dolby CP950.'),
(3,'HVAC-TD-001','Dàn lạnh Daikin VRV','HVAC','Daikin','DAIKIN-VRV-003','Điều hòa không khí khu vực Phòng 03','Bảo dưỡng dàn lạnh Daikin VRV','Vệ sinh lưới lọc, kiểm tra nhiệt độ gió và đường thoát nước.'),
(4,'SCR-CM-001','Màn chiếu Harkness Perlux 180+','SCREEN','Harkness','HARKNESS-004','Màn chiếu chính của Phòng 04','Kiểm tra bề mặt màn chiếu','Kiểm tra độ phẳng, vết bẩn và hệ thống căng màn.'),
(5,'POS-GV-001','Máy POS Sunmi T2','POS','Sunmi','SUNMI-T2-005','Thiết bị thanh toán tại quầy vé','Kiểm tra máy POS quầy vé','Kiểm tra kết nối mạng, máy in hóa đơn và nguồn điện.'),
(6,'NET-CH-001','Switch Cisco CBS350','NETWORK','Cisco','CBS350-006','Switch mạng nội bộ khu vực phòng chiếu','Kiểm tra switch mạng Cisco','Rà soát cổng mạng, lỗi CRC và trạng thái uplink.'),
(7,'PWR-ABT-001','UPS APC Smart-UPS SRT','POWER','APC','APC-SRT-007','Nguồn dự phòng cho hệ thống trình chiếu','Kiểm tra UPS phòng kỹ thuật','Kiểm tra pin, tải sử dụng và thời gian lưu điện.'),
(8,'PRJ-VH-001','Máy chiếu Christie CP4415-RGB','PROJECTOR','Christie','CHR-CP4415-008','Máy chiếu laser của Phòng 08','Cân chỉnh máy chiếu Christie','Kiểm tra quang học, độ hội tụ và cân chỉnh màu RGB.'),
(9,'AUD-GM-001','Amplifier Crown DCi 4|300N','AUDIO','Crown','CROWN-DCI-009','Amplifier công suất của Phòng 09','Kiểm tra amplifier Crown','Kiểm tra nhiệt độ, tín hiệu đầu vào và tải loa.'),
(10,'SAFE-NT-001','Tủ trung tâm báo cháy Hochiki','SAFETY','Hochiki','HCH-FACP-010','Tủ báo cháy khu vực phòng chiếu','Kiểm tra hệ thống báo cháy','Kiểm tra nguồn dự phòng, đầu báo và lịch sử cảnh báo.');

CREATE TEMP TABLE seed_real_device(n integer PRIMARY KEY,label text NOT NULL,device_name text NOT NULL,user_agent text NOT NULL) ON COMMIT DROP;
INSERT INTO seed_real_device VALUES
(1,'Laptop cá nhân','Brave · Windows','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151.0 Safari/537.36'),
(2,'Máy tính văn phòng','Edge · Windows','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151.0 Safari/537.36 Edg/151.0'),
(3,'Điện thoại cá nhân','Chrome · Android','Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/151.0 Mobile Safari/537.36'),
(4,'MacBook cá nhân','Safari · macOS','Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15'),
(5,'iPhone cá nhân','Safari · iPhone','Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'),
(6,'Máy tính kỹ thuật','Firefox · Windows','Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:142.0) Gecko/20100101 Firefox/142.0'),
(7,'Máy tính quầy vé','Chrome · Windows','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151.0 Safari/537.36'),
(8,'Máy tính quản lý','Brave · Windows','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151.0 Safari/537.36'),
(9,'Điện thoại công việc','Samsung Internet · Android','Mozilla/5.0 (Linux; Android 15; SM-S928B) AppleWebKit/537.36 Chrome/151.0 Mobile Safari/537.36 SamsungBrowser/28.0'),
(10,'Laptop dự phòng','Edge · Windows','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151.0 Safari/537.36 Edg/151.0');

DO $$
DECLARE canonical_count integer;
BEGIN
    SELECT COUNT(DISTINCT m.movie_id)
      INTO canonical_count
      FROM seed45_movie_map m
      JOIN movie existing ON existing.id = m.movie_id;
    IF canonical_count <> 8 THEN
        RAISE EXCEPTION 'Reference seed requires the eight canonical V29 movies; found %/8', canonical_count;
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
    (SELECT email FROM seed_real_people WHERE seed_real_people.n = g.n),
    '$2y$10$GksacykuFocj5yooeWTBMeY3bP2REUlBAMk9JI22HrJMC4almiuxe',
    (SELECT full_name FROM seed_real_people WHERE seed_real_people.n = g.n),
    CASE WHEN n = 1 THEN 'MANAGER' ELSE 'STAFF' END,
    (SELECT phone FROM seed_real_people WHERE seed_real_people.n = g.n),
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
    (SELECT name FROM seed_real_cinema WHERE seed_real_cinema.n = g.n),
    (SELECT address FROM seed_real_cinema WHERE seed_real_cinema.n = g.n)
FROM generate_series(1,10) AS g(n)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 03. auditorium (10)
-- -----------------------------------------------------------------------------
INSERT INTO auditorium(id,cinema_id,name)
SELECT
    md5('seed45:auditorium:' || n)::uuid,
    md5('seed45:cinema:' || n)::uuid,
    (SELECT name FROM seed_real_auditorium WHERE seed_real_auditorium.n = g.n)
FROM generate_series(1,10) AS g(n)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 04. movie (reuse the 8 canonical V29 movies; add 0 demo movies)
-- -----------------------------------------------------------------------------
-- Repair references created by earlier placeholder seed runs, then remove those old
-- synthetic placeholder movie rows. The current seed always points at the eight
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
-- All reference staff are attached to cinema 01 so handovers are semantically valid.
-- -----------------------------------------------------------------------------
INSERT INTO staff_profile(
    user_id,employee_code,cinema_id,job_title,employment_status,hire_date,deleted_at,created_at,updated_at
)
SELECT
    md5('seed45:user:' || n)::uuid,
    (SELECT employee_code FROM seed_real_people WHERE seed_real_people.n = g.n),
    md5('seed45:cinema:1')::uuid,
    (SELECT job_title FROM seed_real_people WHERE seed_real_people.n = g.n),
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
    (ARRAY['Ca tối - sảnh chính','Ca tối - quầy vé','Ca tối - cổng soát vé','Ca tối - quầy bắp nước','Ca tối - khu vực chờ','Ca tối - chăm sóc khách hàng','Ca tối - phòng kỹ thuật','Ca tối - vận hành rạp','Ca tối - kho hàng','Ca tối - hỗ trợ sảnh'])[n],
    md5('seed45:user:1')::uuid,
    CURRENT_TIMESTAMP - (n || ' days')::interval,
    CURRENT_TIMESTAMP - (n || ' days')::interval
FROM generate_series(1,10) AS g(n)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 08B. staff_shift upcoming schedule (10 visible in the default 14-day admin window)
-- Keep the historical completed shifts above for attendance/audit data, and add
-- a separate deterministic upcoming roster so /admin/shifts is populated.
-- -----------------------------------------------------------------------------
INSERT INTO staff_shift(
    id,staff_user_id,cinema_id,shift_date,start_time,end_time,status,note,assigned_by,created_at,updated_at
)
SELECT
    md5('seed46:planned-shift:' || n)::uuid,
    md5('seed45:user:' || n)::uuid,
    md5('seed45:cinema:1')::uuid,
    CURRENT_DATE + (n - 1),
    (ARRAY[TIME '08:00',TIME '09:00',TIME '12:00',TIME '14:00',TIME '16:00',TIME '17:00',TIME '10:00',TIME '13:00',TIME '15:00',TIME '18:00'])[n],
    (ARRAY[TIME '14:00',TIME '15:00',TIME '18:00',TIME '20:00',TIME '22:00',TIME '23:00',TIME '16:00',TIME '19:00',TIME '21:00',TIME '23:00'])[n],
    'SCHEDULED',
    (ARRAY['Quầy vé và hỗ trợ khách hàng','Cổng soát vé và hướng dẫn khách','Vận hành sảnh và kiểm tra phòng chiếu','Quầy bắp nước ca chiều','Hỗ trợ suất chiếu buổi tối','Kiểm tra kỹ thuật trước suất tối','Kiểm kê kho và bổ sung hàng','Chăm sóc khách hàng tại sảnh','Điều phối khách và kiểm tra vé','Hỗ trợ đóng ca và bàn giao'])[n],
    md5('seed45:user:1')::uuid,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
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
    (SELECT code FROM seed_real_voucher WHERE seed_real_voucher.n = g.n),
    FALSE,TRUE,
    CURRENT_TIMESTAMP - (n || ' days')::interval + INTERVAL '19 hours 5 minutes',
    md5('seed45:user:' || n)::uuid,
    format('cb-booking-202608-%s', to_char(n,'FM00')),
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
    (SELECT name FROM seed_real_product WHERE seed_real_product.n = g.n),
    (SELECT description FROM seed_real_product WHERE seed_real_product.n = g.n),
    (SELECT price FROM seed_real_product WHERE seed_real_product.n = g.n),
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
    (SELECT name FROM seed_real_product WHERE seed_real_product.n = g.n),
    (SELECT price FROM seed_real_product WHERE seed_real_product.n = g.n),1,(SELECT price FROM seed_real_product WHERE seed_real_product.n = g.n)
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
    (SELECT code FROM seed_real_voucher WHERE seed_real_voucher.n = g.n),
    (SELECT name FROM seed_real_voucher WHERE seed_real_voucher.n = g.n),
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
    'MOCK',
    'SUCCESS',140000,
    format('MOCK-TXN-20260822-%s', to_char(n,'FM00')),
    format('CB-ORD-20260822-%s', to_char(n,'FM00')),
    format('cb-payment-20260822-%s', to_char(n,'FM00')),
    '00','Thanh toán MOCK thành công',
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
    'MOCK',
    format('MOCK-EVENT-20260822-%s', to_char(n,'FM00')),
    md5('seed45:payment:' || n)::uuid,
    md5('seed45:payload:' || n) || md5('seed45:payload2:' || n),
    TRUE,'0','00','Xác nhận thanh toán nội bộ đã xử lý',
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
    format('Tích điểm từ giao dịch vé %s', to_char(n,'FM00')),
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
    format('CBRWD%s', to_char(n,'FM000')),
    (ARRAY['Voucher thành viên 10.000đ','Voucher cuối tuần 10.000đ','Voucher sinh nhật 10.000đ','Voucher đặt vé trực tuyến 10.000đ','Voucher bắp nước 10.000đ','Voucher suất tối 10.000đ','Voucher khách hàng thân thiết 10.000đ','Voucher gia đình 10.000đ','Voucher học sinh sinh viên 10.000đ','Voucher tri ân 10.000đ'])[n],
    'Voucher đổi bằng điểm thành viên',
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
    format('CB-REWARD-%s', to_char(n,'FM000')),
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
    'an.nguyen@cinebooking.local',
    (ARRAY['Nhập bắp caramel','Nhập bắp phô mai','Nhập bắp ngọt','Nhập Coca-Cola','Nhập Sprite','Nhập Fanta cam','Nhập nước suối','Bổ sung Combo Solo','Bổ sung Combo Couple Plus','Bổ sung Combo Family'])[n],
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
    (ARRAY['Nội dung cuốn hút, nhịp phim tốt.','Hình ảnh đẹp và âm thanh ấn tượng.','Diễn xuất tự nhiên, câu chuyện dễ theo dõi.','Phim phù hợp để xem cùng gia đình.','Phần âm nhạc tạo cảm xúc tốt.','Kịch bản có nhiều chi tiết thú vị.','Trải nghiệm phòng chiếu rất tốt.','Phim có tiết tấu ổn và kết thúc hợp lý.','Hình ảnh điện ảnh, đáng xem tại rạp.','Một lựa chọn giải trí tốt cho cuối tuần.'])[n],
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
    'HOME_RECOMMENDATION',
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
    (ARRAY['Ưu đãi suất tối thứ Hai','Ưu đãi suất tối thứ Ba','Khung giờ vàng giữa tuần','Phụ thu ghế VIP buổi tối','Ưu đãi suất sớm','Giá cuối tuần buổi tối','Ưu đãi thành viên buổi tối','Khung giờ thấp điểm','Phụ thu suất công chiếu','Ưu đãi đặt vé trực tuyến'])[n],
    md5('seed45:cinema:' || n)::uuid,
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
    'BOOKING_UPDATE',
    (ARRAY['Đặt vé thành công','Sắp đến giờ chiếu','Điểm thành viên vừa được cộng','Voucher sắp hết hạn','Cập nhật lịch chiếu','Ưu đãi bắp nước hôm nay','Vé đã sẵn sàng để check-in','Thông tin phòng chiếu','Nhắc lịch xem phim','Cập nhật tài khoản'])[n],
    (ARRAY['Booking của bạn đã được xác nhận.','Suất chiếu của bạn sẽ bắt đầu trong thời gian tới.','Điểm thành viên từ giao dịch gần nhất đã được ghi nhận.','Bạn có voucher sắp hết hạn, hãy sử dụng trước thời hạn.','Lịch chiếu của phim bạn quan tâm vừa được cập nhật.','Một số combo bắp nước đang có ưu đãi tại rạp.','Mã QR vé của bạn đã sẵn sàng để sử dụng tại cổng.','Vui lòng kiểm tra đúng phòng chiếu trên vé trước khi vào rạp.','CineBooking nhắc bạn về lịch xem phim đã đặt.','Thông tin tài khoản của bạn vừa được cập nhật.'])[n],
    '/bookings',
    (n % 2 = 0),
    CURRENT_TIMESTAMP - (n || ' hours')::interval,
    'GENERAL',TRUE,'SKIPPED',NULL,NULL,
    format('booking-notification-%s', to_char(n,'FM00')),
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
    (SELECT device_name FROM seed_real_device WHERE seed_real_device.n = g.n),
    (SELECT user_agent FROM seed_real_device WHERE seed_real_device.n = g.n),
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
    (ARRAY['Nghỉ phép gia đình','Khám sức khỏe định kỳ','Giải quyết việc cá nhân','Nghỉ phép năm','Chăm sóc người thân','Tham gia khóa học','Nghỉ bù sau ca lễ','Làm thủ tục hành chính','Nghỉ phép cá nhân','Khám sức khỏe'])[n],
    'APPROVED',
    md5('seed45:user:1')::uuid,
    CURRENT_TIMESTAMP,
    'Đã duyệt theo lịch nhân sự của rạp',
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
    md5('seed45:cinema:' || n)::uuid,
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
    (SELECT email FROM seed_real_people WHERE seed_real_people.n = g.n),
    'BOOKING_CONFIRMED',
    'BOOKING',
    md5('seed45:booking:' || n)::uuid::text,
    format('Booking %s đã được xác nhận và ghi nhận thanh toán.', to_char(n,'FM00')),
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
    (ARRAY['Máy POS mất kết nối','Khách để quên tài sản','Cửa thoát hiểm khó đóng','Máy chiếu giảm độ sáng','Quầy bắp nước mất điện tạm thời','Khách cần hỗ trợ đổi vị trí ghế','Nhiệt độ phòng chiếu cao','Âm thanh kênh trái bị nhỏ','Máy quét QR phản hồi chậm','Lối đi có vật cản'])[n],
    (ARRAY['Máy POS tại quầy vé không kết nối được mạng nội bộ.','Khách báo để quên ví tại khu vực ghế chờ.','Nhân viên phát hiện cửa thoát hiểm cần kiểm tra bản lề.','Độ sáng máy chiếu thấp hơn mức vận hành thông thường.','Nguồn điện tại quầy bắp nước gián đoạn trong vài phút.','Khách cần hỗ trợ kiểm tra lại vị trí ghế trên vé.','Nhiệt độ phòng chiếu tăng cao trong suất tối.','Kênh loa bên trái có âm lượng thấp hơn các kênh còn lại.','Máy quét QR tại cổng phản hồi chậm khi check-in.','Nhân viên phát hiện vật cản tại lối đi và xử lý ngay.'])[n],
    'RESOLVED',
    md5('seed45:user:1')::uuid,
    CURRENT_TIMESTAMP - (n || ' hours')::interval,
    'Sự cố đã được xử lý và ghi nhận trong ca trực',
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
    (ARRAY['Bàn giao quầy vé, không còn giao dịch chờ.','Bàn giao cổng soát vé, thiết bị hoạt động bình thường.','Bàn giao quầy bắp nước, tồn kho đã đối chiếu.','Bàn giao phòng kỹ thuật, hệ thống ổn định.','Bàn giao khu vực sảnh, không còn yêu cầu tồn đọng.','Bàn giao chăm sóc khách hàng, các trường hợp đã cập nhật.','Bàn giao phòng chiếu, lịch suất tiếp theo đã kiểm tra.','Bàn giao vận hành, checklist cuối ca đã hoàn tất.','Bàn giao kho, số lượng hàng đã đối soát.','Bàn giao ca tối, không còn công việc khẩn cấp.'])[n],
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
    (ARRAY['Vệ sinh máy chiếu định kỳ','Kiểm tra hệ thống âm thanh','Bảo dưỡng điều hòa phòng chiếu','Vệ sinh màn chiếu','Kiểm tra nguồn điện phòng chiếu','Kiểm tra mạng nội bộ','Bảo trì ghế và lối đi','Cân chỉnh máy chiếu laser','Đo kiểm âm thanh định kỳ','Kiểm tra hệ thống an toàn'])[n],
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
    md5('seed45:cinema:' || n)::uuid,
    md5('seed45:auditorium:' || n)::uuid,
    (SELECT asset_code FROM seed_real_asset WHERE seed_real_asset.n = g.n),
    (SELECT name FROM seed_real_asset WHERE seed_real_asset.n = g.n),
    (SELECT category FROM seed_real_asset WHERE seed_real_asset.n = g.n),
    CASE WHEN n % 4 = 0 THEN 'DEGRADED' ELSE 'OPERATIONAL' END,
    (SELECT vendor FROM seed_real_asset WHERE seed_real_asset.n = g.n),
    (SELECT serial_number FROM seed_real_asset WHERE seed_real_asset.n = g.n),
    CURRENT_DATE - (365 + n * 10),
    CURRENT_TIMESTAMP - INTERVAL '30 days',
    CURRENT_DATE + (10 + n),
    (SELECT note FROM seed_real_asset WHERE seed_real_asset.n = g.n),
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
    md5('seed45:cinema:' || n)::uuid,
    md5('seed45:auditorium:' || n)::uuid,
    md5('seed45:asset:' || n)::uuid,
    NULL,
    (SELECT work_title FROM seed_real_asset WHERE seed_real_asset.n = g.n),
    (SELECT work_description FROM seed_real_asset WHERE seed_real_asset.n = g.n),
    CASE WHEN n % 4 = 0 THEN 'HIGH' ELSE 'MEDIUM' END,
    'OPEN',
    CASE WHEN n = 1 THEN md5('seed45:user:1')::uuid ELSE NULL END,
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
    format('Khởi tạo phiếu bảo trì thiết bị %s', to_char(n,'FM00')),
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
    format('PAYMENT_CAPTURE:20260822:%s', to_char(n,'FM00')),
    'PAYMENT_CAPTURED',
    md5('seed45:booking:' || n)::uuid,
    md5('seed45:payment:' || n)::uuid,
    md5('seed45:user:' || n)::uuid,
    'PAYMENT_SERVICE',
    format('Ghi nhận thanh toán booking %s', to_char(n,'FM00')),
    CURRENT_TIMESTAMP - (n || ' days')::interval,
    CURRENT_TIMESTAMP - (n || ' days')::interval
FROM generate_series(1,10) AS g(n)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 42. financial_ledger_line (20 = 2 balanced lines for each of 10 entries)
-- Double-entry accounting requires two lines per entry, so this table intentionally
-- gets 20 rows instead of 10 to keep all 10 reference ledger entries balanced.
-- -----------------------------------------------------------------------------
INSERT INTO financial_ledger_line(id,entry_id,account_code,direction,amount,currency,created_at)
SELECT
    md5('seed45:ledger-line:debit:' || n)::uuid,
    md5('seed45:ledger-entry:' || n)::uuid,
    'PAYMENT_CLEARING:MOCK','DEBIT',140000,'VND',CURRENT_TIMESTAMP - (n || ' days')::interval
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
    format('RECON-202608-%s', to_char(n,'FM00')),
    CURRENT_DATE - n,
    'ISSUES',1,140000,140000,0,0,0,1,1,1,
    'an.nguyen@cinebooking.local',
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
    'LOYALTY_BALANCE_MISMATCH','WARNING','USER',
    md5('seed45:user:' || n)::uuid::text,
    1000,990,
    format('Chênh lệch điểm thành viên cần đối soát cho tài khoản %s', to_char(n,'FM00')),
    'OPEN',CURRENT_TIMESTAMP - (n || ' days')::interval,NULL,NULL
FROM generate_series(1,10) AS g(n)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 45. customer_support_case (10)
-- V45 support cases use the existing deterministic reference users/bookings/cinema.
-- -----------------------------------------------------------------------------
INSERT INTO customer_support_case(
    id,case_number,user_id,booking_id,cinema_id,category,priority,status,subject,description,
    assigned_to,sla_due_at,resolution_note,last_customer_message_at,last_staff_message_at,
    resolved_at,closed_at,created_at,updated_at
)
SELECT
    md5('seed45:support-case:' || n)::uuid,
    format('CB-SUP-202608-%s', to_char(n,'FM0000')),
    md5('seed45:user:' || n)::uuid,
    md5('seed45:booking:' || n)::uuid,
    md5('seed45:cinema:' || n)::uuid,
    (ARRAY['BOOKING','PAYMENT','REFUND','TICKET','CINEMA_EXPERIENCE','STAFF','OTHER'])[((n - 1) % 7) + 1],
    (ARRAY['LOW','MEDIUM','HIGH','CRITICAL'])[((n - 1) % 4) + 1],
    (ARRAY['OPEN','IN_PROGRESS','WAITING_CUSTOMER','RESOLVED','CLOSED'])[((n - 1) % 5) + 1],
    (ARRAY['Không nhận được email xác nhận vé','Thanh toán thành công nhưng vé chưa cập nhật','Cần kiểm tra trạng thái hoàn tiền','Mã QR vé không hiển thị','Âm thanh phòng chiếu quá nhỏ','Cần hỗ trợ từ nhân viên tại rạp','Thay đổi thông tin liên hệ','Ghế đã chọn không đúng vị trí','Giao dịch thanh toán bị treo','Muốn xác nhận chính sách hoàn vé'])[n],
    (ARRAY['Khách chưa nhận được email xác nhận sau khi hoàn tất đặt vé.','Khách thấy giao dịch thành công nhưng trạng thái vé chưa cập nhật.','Khách muốn biết thời điểm khoản hoàn tiền được ghi nhận.','Ứng dụng không hiển thị mã QR của booking đã xác nhận.','Khách phản ánh âm lượng tại phòng chiếu thấp hơn bình thường.','Khách cần nhân viên rạp hỗ trợ tại khu vực sảnh.','Khách muốn cập nhật số điện thoại liên hệ của tài khoản.','Khách cần kiểm tra vị trí ghế đã chọn trên sơ đồ.','Trang thanh toán đang hiển thị giao dịch ở trạng thái chờ.','Khách cần được giải thích điều kiện và thời hạn hoàn vé.'])[n],
    md5('seed45:user:' || n)::uuid,
    CURRENT_TIMESTAMP + ((12 + n * 6) || ' hours')::interval,
    CASE WHEN ((n - 1) % 5) + 1 IN (4,5) THEN format('Yêu cầu hỗ trợ %s đã được xử lý', to_char(n,'FM00')) ELSE NULL END,
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
        WHEN 1 THEN format('Đã tạo yêu cầu hỗ trợ %s.', to_char(n,'FM00'))
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
-- 47. trusted_device (10)
-- V46 account-protection devices for the deterministic reference users.
-- -----------------------------------------------------------------------------
INSERT INTO trusted_device(
    id,user_id,device_fingerprint,label,device_name,user_agent,first_ip,last_ip,trusted_at,last_seen_at,revoked_at
)
SELECT
    md5('seed46:trusted-device:' || n)::uuid,
    md5('seed45:user:' || n)::uuid,
    md5('seed46:fingerprint:a:' || n) || md5('seed46:fingerprint:b:' || n),
    (SELECT label FROM seed_real_device WHERE seed_real_device.n = g.n),
    (SELECT device_name FROM seed_real_device WHERE seed_real_device.n = g.n),
    (SELECT user_agent FROM seed_real_device WHERE seed_real_device.n = g.n),
    format('10.46.0.%s', n),
    format('10.46.1.%s', n),
    CURRENT_TIMESTAMP - (n || ' days')::interval,
    CURRENT_TIMESTAMP - (n || ' hours')::interval,
    CASE WHEN n = 10 THEN CURRENT_TIMESTAMP - INTERVAL '1 hour' ELSE NULL END
FROM generate_series(1,10) AS g(n)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 48. security_alert (10)
-- Risk-scored V46 alerts covering new-device, brute-force and password events.
-- -----------------------------------------------------------------------------
INSERT INTO security_alert(
    id,user_id,event_type,severity,risk_score,title,details,ip_address,device_name,related_session_id,acknowledged_at,acknowledged_by,created_at
)
SELECT
    md5('seed46:security-alert:' || n)::uuid,
    md5('seed45:user:' || n)::uuid,
    (ARRAY['NEW_DEVICE','CREDENTIAL_ATTACK','PASSWORD_CHANGED','PASSWORD_RESET','SESSION_REVOKED'])[((n - 1) % 5) + 1],
    (ARRAY['MEDIUM','HIGH','MEDIUM','HIGH','LOW'])[((n - 1) % 5) + 1],
    (ARRAY[45,80,50,75,35])[((n - 1) % 5) + 1],
    (ARRAY['Đăng nhập từ thiết bị chưa tin cậy','Phát hiện nhiều lần đăng nhập thất bại','Mật khẩu tài khoản vừa được thay đổi','Mật khẩu đã được đặt lại','Phiên đăng nhập đã bị thu hồi','Đăng nhập từ thiết bị mới','Phát hiện đăng nhập thất bại liên tiếp','Mật khẩu vừa được cập nhật','Yêu cầu đặt lại mật khẩu đã hoàn tất','Một phiên đăng nhập đã bị thu hồi'])[n],
    (ARRAY['Hệ thống ghi nhận đăng nhập từ một thiết bị chưa nằm trong danh sách tin cậy.','Hệ thống phát hiện nhiều lần nhập sai mật khẩu trong thời gian ngắn.','Mật khẩu tài khoản đã được thay đổi sau khi xác thực thành công.','Quy trình đặt lại mật khẩu đã hoàn tất và các phiên cũ được rà soát.','Một phiên đăng nhập đã bị thu hồi theo yêu cầu của người dùng.','Hệ thống ghi nhận phiên đăng nhập mới cần được xác nhận.','Nhiều yêu cầu đăng nhập thất bại đã bị giới hạn theo chính sách bảo mật.','Mật khẩu tài khoản vừa được cập nhật từ trang bảo mật.','Mật khẩu mới đã được thiết lập từ liên kết khôi phục hợp lệ.','Người dùng đã thu hồi một phiên không còn sử dụng.'])[n],
    format('10.46.2.%s', n),
    (SELECT device_name FROM seed_real_device WHERE seed_real_device.n = g.n),
    md5('seed45:session:' || n)::uuid,
    CASE WHEN n % 3 = 0 THEN CURRENT_TIMESTAMP - (n || ' minutes')::interval ELSE NULL END,
    CASE WHEN n % 3 = 0 THEN md5('seed45:user:' || n)::uuid ELSE NULL END,
    CURRENT_TIMESTAMP - (n || ' hours')::interval
FROM generate_series(1,10) AS g(n)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 49. flyway_schema_history
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
-- UTF-8 and reference-data refresh for rows created by earlier seed runs
-- -----------------------------------------------------------------------------
-- Existing deterministic rows are refreshed in place so previously inserted
-- placeholder labels and unconfigured gateway providers disappear without
-- deleting user data or rebuilding the PostgreSQL volume.
UPDATE app_user u SET email=p.email, full_name=p.full_name, phone=p.phone, password_hash='$2y$10$GksacykuFocj5yooeWTBMeY3bP2REUlBAMk9JI22HrJMC4almiuxe'
FROM seed_real_people p WHERE u.id = md5('seed45:user:' || p.n)::uuid;

UPDATE cinema c SET name=m.name, address=m.address
FROM seed_real_cinema m WHERE c.id = md5('seed45:cinema:' || m.n)::uuid;

UPDATE auditorium a SET name=m.name
FROM seed_real_auditorium m WHERE a.id = md5('seed45:auditorium:' || m.n)::uuid;

UPDATE staff_profile sp SET employee_code=p.employee_code, job_title=p.job_title
FROM seed_real_people p WHERE sp.user_id = md5('seed45:user:' || p.n)::uuid;

UPDATE staff_shift s SET note=(ARRAY['Ca tối - sảnh chính','Ca tối - quầy vé','Ca tối - cổng soát vé','Ca tối - quầy bắp nước','Ca tối - khu vực chờ','Ca tối - chăm sóc khách hàng','Ca tối - phòng kỹ thuật','Ca tối - vận hành rạp','Ca tối - kho hàng','Ca tối - hỗ trợ sảnh'])[g.n]
FROM generate_series(1,10) g(n) WHERE s.id = md5('seed45:shift:' || g.n)::uuid;

-- Refresh the deterministic upcoming roster on every reference-data run so the
-- default admin filter (today through +14 days) always has realistic shifts.
UPDATE staff_shift s SET
    shift_date=CURRENT_DATE + (g.n - 1),
    start_time=(ARRAY[TIME '08:00',TIME '09:00',TIME '12:00',TIME '14:00',TIME '16:00',TIME '17:00',TIME '10:00',TIME '13:00',TIME '15:00',TIME '18:00'])[g.n],
    end_time=(ARRAY[TIME '14:00',TIME '15:00',TIME '18:00',TIME '20:00',TIME '22:00',TIME '23:00',TIME '16:00',TIME '19:00',TIME '21:00',TIME '23:00'])[g.n],
    status='SCHEDULED',
    note=(ARRAY['Quầy vé và hỗ trợ khách hàng','Cổng soát vé và hướng dẫn khách','Vận hành sảnh và kiểm tra phòng chiếu','Quầy bắp nước ca chiều','Hỗ trợ suất chiếu buổi tối','Kiểm tra kỹ thuật trước suất tối','Kiểm kê kho và bổ sung hàng','Chăm sóc khách hàng tại sảnh','Điều phối khách và kiểm tra vé','Hỗ trợ đóng ca và bàn giao'])[g.n],
    updated_at=CURRENT_TIMESTAMP
FROM generate_series(1,10) g(n)
WHERE s.id = md5('seed46:planned-shift:' || g.n)::uuid
  AND NOT EXISTS (SELECT 1 FROM staff_attendance a WHERE a.shift_id=s.id);

UPDATE booking b SET
    voucher_code=v.code,
    idempotency_key=format('cb-booking-202608-%s', to_char(v.n,'FM00'))
FROM seed_real_voucher v WHERE b.id = md5('seed45:booking:' || v.n)::uuid;

UPDATE concession_product p SET name=m.name, description=m.description, price=m.price
FROM seed_real_product m WHERE p.id = md5('seed45:product:' || m.n)::uuid;
UPDATE booking_concession bc SET product_name=m.name, unit_price=m.price, subtotal=m.price
FROM seed_real_product m WHERE bc.id = md5('seed45:booking-concession:' || m.n)::uuid;

UPDATE voucher v SET code=m.code, name=m.name
FROM seed_real_voucher m WHERE v.id = md5('seed45:voucher:' || m.n)::uuid;

UPDATE payment p SET
    provider='MOCK',
    provider_transaction_id=format('MOCK-TXN-20260822-%s', to_char(g.n,'FM00')),
    provider_order_id=format('CB-ORD-20260822-%s', to_char(g.n,'FM00')),
    client_idempotency_key=format('cb-payment-20260822-%s', to_char(g.n,'FM00')),
    provider_response_code='00',
    provider_message='Thanh toán MOCK thành công'
FROM generate_series(1,10) g(n) WHERE p.id = md5('seed45:payment:' || g.n)::uuid;

UPDATE payment_webhook_event e SET
    provider='MOCK',
    event_key=format('MOCK-EVENT-20260822-%s', to_char(g.n,'FM00')),
    result_code='0',response_code='00',response_message='Xác nhận thanh toán nội bộ đã xử lý'
FROM generate_series(1,10) g(n) WHERE e.id = md5('seed45:webhook:' || g.n)::uuid;

UPDATE loyalty_transaction t SET description=format('Tích điểm từ giao dịch vé %s', to_char(g.n,'FM00'))
FROM generate_series(1,10) g(n) WHERE t.id = md5('seed45:loyalty-tx:' || g.n)::uuid;

UPDATE loyalty_reward r SET
    code=format('CBRWD%s', to_char(g.n,'FM000')),
    name=(ARRAY['Voucher thành viên 10.000đ','Voucher cuối tuần 10.000đ','Voucher sinh nhật 10.000đ','Voucher đặt vé trực tuyến 10.000đ','Voucher bắp nước 10.000đ','Voucher suất tối 10.000đ','Voucher khách hàng thân thiết 10.000đ','Voucher gia đình 10.000đ','Voucher học sinh sinh viên 10.000đ','Voucher tri ân 10.000đ'])[g.n],
    description='Voucher đổi bằng điểm thành viên'
FROM generate_series(1,10) g(n) WHERE r.id = md5('seed45:reward:' || g.n)::uuid;
UPDATE loyalty_reward_redemption r SET redemption_code=format('CB-REWARD-%s', to_char(g.n,'FM000'))
FROM generate_series(1,10) g(n) WHERE r.id = md5('seed45:reward-redemption:' || g.n)::uuid;

UPDATE inventory_movement i SET actor_email='an.nguyen@cinebooking.local', note=(ARRAY['Nhập bắp caramel','Nhập bắp phô mai','Nhập bắp ngọt','Nhập Coca-Cola','Nhập Sprite','Nhập Fanta cam','Nhập nước suối','Bổ sung Combo Solo','Bổ sung Combo Couple Plus','Bổ sung Combo Family'])[g.n]
FROM generate_series(1,10) g(n) WHERE i.id = md5('seed45:inventory:' || g.n)::uuid;

UPDATE movie_review r SET comment=(ARRAY['Nội dung cuốn hút, nhịp phim tốt.','Hình ảnh đẹp và âm thanh ấn tượng.','Diễn xuất tự nhiên, câu chuyện dễ theo dõi.','Phim phù hợp để xem cùng gia đình.','Phần âm nhạc tạo cảm xúc tốt.','Kịch bản có nhiều chi tiết thú vị.','Trải nghiệm phòng chiếu rất tốt.','Phim có tiết tấu ổn và kết thúc hợp lý.','Hình ảnh điện ảnh, đáng xem tại rạp.','Một lựa chọn giải trí tốt cho cuối tuần.'])[g.n]
FROM generate_series(1,10) g(n) WHERE r.id = md5('seed45:review:' || g.n)::uuid;
UPDATE recommendation_event r SET source='HOME_RECOMMENDATION'
FROM generate_series(1,10) g(n) WHERE r.id = md5('seed45:recommendation:' || g.n)::uuid;
UPDATE pricing_rule p SET name=(ARRAY['Ưu đãi suất tối thứ Hai','Ưu đãi suất tối thứ Ba','Khung giờ vàng giữa tuần','Phụ thu ghế VIP buổi tối','Ưu đãi suất sớm','Giá cuối tuần buổi tối','Ưu đãi thành viên buổi tối','Khung giờ thấp điểm','Phụ thu suất công chiếu','Ưu đãi đặt vé trực tuyến'])[g.n]
FROM generate_series(1,10) g(n) WHERE p.id = md5('seed45:pricing:' || g.n)::uuid;

-- Keep branch-scoped reference data aligned so every cinema can be inspected from the admin UI.
UPDATE auditorium a SET cinema_id=md5('seed45:cinema:' || g.n)::uuid
FROM generate_series(1,10) g(n) WHERE a.id=md5('seed45:auditorium:' || g.n)::uuid;
UPDATE pricing_rule p SET cinema_id=md5('seed45:cinema:' || g.n)::uuid, auditorium_id=md5('seed45:auditorium:' || g.n)::uuid
FROM generate_series(1,10) g(n) WHERE p.id=md5('seed45:pricing:' || g.n)::uuid;
UPDATE ticket_checkin_log t SET cinema_id=md5('seed45:cinema:' || g.n)::uuid
FROM generate_series(1,10) g(n) WHERE t.id=md5('seed45:checkin:' || g.n)::uuid;
UPDATE customer_support_case c SET cinema_id=md5('seed45:cinema:' || g.n)::uuid
FROM generate_series(1,10) g(n) WHERE c.id=md5('seed45:support-case:' || g.n)::uuid;

UPDATE user_notification n SET
    notification_type='BOOKING_UPDATE',
    title=(ARRAY['Đặt vé thành công','Sắp đến giờ chiếu','Điểm thành viên vừa được cộng','Voucher sắp hết hạn','Cập nhật lịch chiếu','Ưu đãi bắp nước hôm nay','Vé đã sẵn sàng để check-in','Thông tin phòng chiếu','Nhắc lịch xem phim','Cập nhật tài khoản'])[g.n],
    message=(ARRAY['Booking của bạn đã được xác nhận.','Suất chiếu của bạn sẽ bắt đầu trong thời gian tới.','Điểm thành viên từ giao dịch gần nhất đã được ghi nhận.','Bạn có voucher sắp hết hạn, hãy sử dụng trước thời hạn.','Lịch chiếu của phim bạn quan tâm vừa được cập nhật.','Một số combo bắp nước đang có ưu đãi tại rạp.','Mã QR vé của bạn đã sẵn sàng để sử dụng tại cổng.','Vui lòng kiểm tra đúng phòng chiếu trên vé trước khi vào rạp.','CineBooking nhắc bạn về lịch xem phim đã đặt.','Thông tin tài khoản của bạn vừa được cập nhật.'])[g.n],
    dedupe_key=format('booking-notification-%s', to_char(g.n,'FM00'))
FROM generate_series(1,10) g(n) WHERE n.id = md5('seed45:notification:' || g.n)::uuid;

UPDATE auth_session s SET device_name=d.device_name, user_agent=d.user_agent
FROM seed_real_device d WHERE s.id = md5('seed45:session:' || d.n)::uuid;

UPDATE staff_leave_request r SET
    reason=(ARRAY['Nghỉ phép gia đình','Khám sức khỏe định kỳ','Giải quyết việc cá nhân','Nghỉ phép năm','Chăm sóc người thân','Tham gia khóa học','Nghỉ bù sau ca lễ','Làm thủ tục hành chính','Nghỉ phép cá nhân','Khám sức khỏe'])[g.n],
    review_note='Đã duyệt theo lịch nhân sự của rạp'
FROM generate_series(1,10) g(n) WHERE r.id = md5('seed45:leave:' || g.n)::uuid;

UPDATE audit_log a SET actor_email=p.email, action='BOOKING_CONFIRMED', details=format('Booking %s đã được xác nhận và ghi nhận thanh toán.', to_char(p.n,'FM00'))
FROM seed_real_people p WHERE a.id = md5('seed45:audit:' || p.n)::uuid;

UPDATE staff_incident i SET
    title=(ARRAY['Máy POS mất kết nối','Khách để quên tài sản','Cửa thoát hiểm khó đóng','Máy chiếu giảm độ sáng','Quầy bắp nước mất điện tạm thời','Khách cần hỗ trợ đổi vị trí ghế','Nhiệt độ phòng chiếu cao','Âm thanh kênh trái bị nhỏ','Máy quét QR phản hồi chậm','Lối đi có vật cản'])[g.n],
    description=(ARRAY['Máy POS tại quầy vé không kết nối được mạng nội bộ.','Khách báo để quên ví tại khu vực ghế chờ.','Nhân viên phát hiện cửa thoát hiểm cần kiểm tra bản lề.','Độ sáng máy chiếu thấp hơn mức vận hành thông thường.','Nguồn điện tại quầy bắp nước gián đoạn trong vài phút.','Khách cần hỗ trợ kiểm tra lại vị trí ghế trên vé.','Nhiệt độ phòng chiếu tăng cao trong suất tối.','Kênh loa bên trái có âm lượng thấp hơn các kênh còn lại.','Máy quét QR tại cổng phản hồi chậm khi check-in.','Nhân viên phát hiện vật cản tại lối đi và xử lý ngay.'])[g.n],
    resolution_note='Sự cố đã được xử lý và ghi nhận trong ca trực'
FROM generate_series(1,10) g(n) WHERE i.id = md5('seed45:incident:' || g.n)::uuid;

UPDATE staff_shift_handover h SET summary=(ARRAY['Bàn giao quầy vé, không còn giao dịch chờ.','Bàn giao cổng soát vé, thiết bị hoạt động bình thường.','Bàn giao quầy bắp nước, tồn kho đã đối chiếu.','Bàn giao phòng kỹ thuật, hệ thống ổn định.','Bàn giao khu vực sảnh, không còn yêu cầu tồn đọng.','Bàn giao chăm sóc khách hàng, các trường hợp đã cập nhật.','Bàn giao phòng chiếu, lịch suất tiếp theo đã kiểm tra.','Bàn giao vận hành, checklist cuối ca đã hoàn tất.','Bàn giao kho, số lượng hàng đã đối soát.','Bàn giao ca tối, không còn công việc khẩn cấp.'])[g.n]
FROM generate_series(1,10) g(n) WHERE h.id = md5('seed45:handover:' || g.n)::uuid;

UPDATE auditorium_blackout b SET reason=(ARRAY['Vệ sinh máy chiếu định kỳ','Kiểm tra hệ thống âm thanh','Bảo dưỡng điều hòa phòng chiếu','Vệ sinh màn chiếu','Kiểm tra nguồn điện phòng chiếu','Kiểm tra mạng nội bộ','Bảo trì ghế và lối đi','Cân chỉnh máy chiếu laser','Đo kiểm âm thanh định kỳ','Kiểm tra hệ thống an toàn'])[g.n]
FROM generate_series(1,10) g(n) WHERE b.id = md5('seed45:blackout:' || g.n)::uuid;

UPDATE cinema_equipment_asset a SET
    cinema_id=md5('seed45:cinema:' || m.n)::uuid,
    auditorium_id=md5('seed45:auditorium:' || m.n)::uuid,
    asset_code=m.asset_code,name=m.name,category=m.category,vendor=m.vendor,serial_number=m.serial_number,note=m.note
FROM seed_real_asset m WHERE a.id = md5('seed45:asset:' || m.n)::uuid;
UPDATE maintenance_work_order w SET
    cinema_id=md5('seed45:cinema:' || m.n)::uuid,
    auditorium_id=md5('seed45:auditorium:' || m.n)::uuid,
    asset_id=md5('seed45:asset:' || m.n)::uuid,
    assigned_to=CASE WHEN m.n=1 THEN md5('seed45:user:1')::uuid ELSE NULL END,
    title=m.work_title,description=m.work_description
FROM seed_real_asset m WHERE w.id = md5('seed45:work-order:' || m.n)::uuid;

UPDATE financial_reconciliation_run r SET run_key=format('RECON-202608-%s', to_char(g.n,'FM00')), started_by='an.nguyen@cinebooking.local'
FROM generate_series(1,10) g(n) WHERE r.id = md5('seed45:recon-run:' || g.n)::uuid;
UPDATE financial_reconciliation_issue i SET issue_type='LOYALTY_BALANCE_MISMATCH', message=format('Chênh lệch điểm thành viên cần đối soát cho tài khoản %s', to_char(g.n,'FM00'))
FROM generate_series(1,10) g(n) WHERE i.id = md5('seed45:recon-issue:' || g.n)::uuid;

UPDATE customer_support_case c SET
    assigned_to=md5('seed45:user:' || g.n)::uuid,
    case_number=format('CB-SUP-202608-%s', to_char(g.n,'FM0000')),
    subject=(ARRAY['Không nhận được email xác nhận vé','Thanh toán thành công nhưng vé chưa cập nhật','Cần kiểm tra trạng thái hoàn tiền','Mã QR vé không hiển thị','Âm thanh phòng chiếu quá nhỏ','Cần hỗ trợ từ nhân viên tại rạp','Thay đổi thông tin liên hệ','Ghế đã chọn không đúng vị trí','Giao dịch thanh toán bị treo','Muốn xác nhận chính sách hoàn vé'])[g.n],
    description=(ARRAY['Khách chưa nhận được email xác nhận sau khi hoàn tất đặt vé.','Khách thấy giao dịch thành công nhưng trạng thái vé chưa cập nhật.','Khách muốn biết thời điểm khoản hoàn tiền được ghi nhận.','Ứng dụng không hiển thị mã QR của booking đã xác nhận.','Khách phản ánh âm lượng tại phòng chiếu thấp hơn bình thường.','Khách cần nhân viên rạp hỗ trợ tại khu vực sảnh.','Khách muốn cập nhật số điện thoại liên hệ của tài khoản.','Khách cần kiểm tra vị trí ghế đã chọn trên sơ đồ.','Trang thanh toán đang hiển thị giao dịch ở trạng thái chờ.','Khách cần được giải thích điều kiện và thời hạn hoàn vé.'])[g.n],
    resolution_note=CASE WHEN c.status IN ('RESOLVED','CLOSED') THEN format('Yêu cầu hỗ trợ %s đã được xử lý', to_char(g.n,'FM00')) ELSE NULL END
FROM generate_series(1,10) g(n) WHERE c.id = md5('seed45:support-case:' || g.n)::uuid;

UPDATE trusted_device d SET label=m.label,device_name=m.device_name,user_agent=m.user_agent
FROM seed_real_device m WHERE d.id = md5('seed46:trusted-device:' || m.n)::uuid;
UPDATE security_alert a SET
    title=(ARRAY['Đăng nhập từ thiết bị chưa tin cậy','Phát hiện nhiều lần đăng nhập thất bại','Mật khẩu tài khoản vừa được thay đổi','Mật khẩu đã được đặt lại','Phiên đăng nhập đã bị thu hồi','Đăng nhập từ thiết bị mới','Phát hiện đăng nhập thất bại liên tiếp','Mật khẩu vừa được cập nhật','Yêu cầu đặt lại mật khẩu đã hoàn tất','Một phiên đăng nhập đã bị thu hồi'])[g.n],
    details=(ARRAY['Hệ thống ghi nhận đăng nhập từ một thiết bị chưa nằm trong danh sách tin cậy.','Hệ thống phát hiện nhiều lần nhập sai mật khẩu trong thời gian ngắn.','Mật khẩu tài khoản đã được thay đổi sau khi xác thực thành công.','Quy trình đặt lại mật khẩu đã hoàn tất và các phiên cũ được rà soát.','Một phiên đăng nhập đã bị thu hồi theo yêu cầu của người dùng.','Hệ thống ghi nhận phiên đăng nhập mới cần được xác nhận.','Nhiều yêu cầu đăng nhập thất bại đã bị giới hạn theo chính sách bảo mật.','Mật khẩu tài khoản vừa được cập nhật từ trang bảo mật.','Mật khẩu mới đã được thiết lập từ liên kết khôi phục hợp lệ.','Người dùng đã thu hồi một phiên không còn sử dụng.'])[g.n],
    device_name=m.device_name
FROM generate_series(1,10) g(n) JOIN seed_real_device m ON m.n=g.n
WHERE a.id = md5('seed46:security-alert:' || g.n)::uuid;

-- Immutable event/ledger tables need trigger bypass only for refresh of our own deterministic reference rows.
SET LOCAL session_replication_role = replica;
UPDATE maintenance_work_order_event e SET note=format('Khởi tạo phiếu bảo trì thiết bị %s', to_char(g.n,'FM00'))
FROM generate_series(1,10) g(n) WHERE e.id = md5('seed45:work-event:' || g.n)::uuid;
UPDATE financial_ledger_entry e SET
    event_key=format('PAYMENT_CAPTURE:20260822:%s', to_char(g.n,'FM00')),
    source='PAYMENT_SERVICE',
    description=format('Ghi nhận thanh toán booking %s', to_char(g.n,'FM00'))
FROM generate_series(1,10) g(n) WHERE e.id = md5('seed45:ledger-entry:' || g.n)::uuid;
UPDATE financial_ledger_line l SET account_code='PAYMENT_CLEARING:MOCK'
WHERE l.id IN (SELECT md5('seed45:ledger-line:debit:' || n)::uuid FROM generate_series(1,10) g(n));
UPDATE customer_support_case_event e SET message=CASE ((g.n - 1) % 5) + 1
    WHEN 1 THEN format('Đã tạo yêu cầu hỗ trợ %s.', to_char(g.n,'FM00'))
    WHEN 2 THEN 'CineBooking đã tiếp nhận và đang xử lý yêu cầu.'
    WHEN 3 THEN 'CineBooking đang chờ khách hàng bổ sung thông tin.'
    WHEN 4 THEN 'Yêu cầu hỗ trợ đã được giải quyết.'
    ELSE 'Yêu cầu hỗ trợ đã được đóng.'
END
FROM generate_series(1,10) g(n) WHERE e.id = md5('seed45:support-event:' || g.n)::uuid;
SET LOCAL session_replication_role = origin;

-- Fail if seeded reference rows still contain broken UTF-8, placeholder labels, or unconfigured gateway names.
DO $$
DECLARE bad_count bigint; placeholder_count bigint; gateway_count bigint; demo_movie_count bigint; upcoming_shift_count bigint;
BEGIN
    SELECT COUNT(*) INTO bad_count FROM (
        SELECT full_name AS v FROM app_user WHERE id IN (SELECT md5('seed45:user:' || n)::uuid FROM generate_series(1,10) g(n))
        UNION ALL SELECT address FROM cinema WHERE id IN (SELECT md5('seed45:cinema:' || n)::uuid FROM generate_series(1,10) g(n))
        UNION ALL SELECT name FROM auditorium WHERE id IN (SELECT md5('seed45:auditorium:' || n)::uuid FROM generate_series(1,10) g(n))
        UNION ALL SELECT job_title FROM staff_profile WHERE user_id IN (SELECT md5('seed45:user:' || n)::uuid FROM generate_series(1,10) g(n))
        UNION ALL SELECT note FROM staff_shift WHERE id IN (SELECT md5('seed45:shift:' || n)::uuid FROM generate_series(1,10) g(n))
        UNION ALL SELECT note FROM staff_shift WHERE id IN (SELECT md5('seed46:planned-shift:' || n)::uuid FROM generate_series(1,10) g(n))
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
        UNION ALL SELECT label FROM trusted_device WHERE id IN (SELECT md5('seed46:trusted-device:' || n)::uuid FROM generate_series(1,10) g(n))
        UNION ALL SELECT title FROM security_alert WHERE id IN (SELECT md5('seed46:security-alert:' || n)::uuid FROM generate_series(1,10) g(n))
        UNION ALL SELECT details FROM security_alert WHERE id IN (SELECT md5('seed46:security-alert:' || n)::uuid FROM generate_series(1,10) g(n))
    ) text_values WHERE v LIKE '%?%';

    IF bad_count <> 0 THEN
        RAISE EXCEPTION 'UTF-8 refresh failed: % human-readable values still contain ?', bad_count;
    END IF;

    SELECT COUNT(*) INTO placeholder_count FROM (
        SELECT email AS v FROM app_user WHERE id IN (SELECT md5('seed45:user:' || n)::uuid FROM generate_series(1,10) g(n))
        UNION ALL SELECT full_name FROM app_user WHERE id IN (SELECT md5('seed45:user:' || n)::uuid FROM generate_series(1,10) g(n))
        UNION ALL SELECT name FROM cinema WHERE id IN (SELECT md5('seed45:cinema:' || n)::uuid FROM generate_series(1,10) g(n))
        UNION ALL SELECT name FROM auditorium WHERE id IN (SELECT md5('seed45:auditorium:' || n)::uuid FROM generate_series(1,10) g(n))
        UNION ALL SELECT employee_code FROM staff_profile WHERE user_id IN (SELECT md5('seed45:user:' || n)::uuid FROM generate_series(1,10) g(n))
        UNION ALL SELECT name FROM concession_product WHERE id IN (SELECT md5('seed45:product:' || n)::uuid FROM generate_series(1,10) g(n))
        UNION ALL SELECT name FROM voucher WHERE id IN (SELECT md5('seed45:voucher:' || n)::uuid FROM generate_series(1,10) g(n))
        UNION ALL SELECT title FROM staff_incident WHERE id IN (SELECT md5('seed45:incident:' || n)::uuid FROM generate_series(1,10) g(n))
        UNION ALL SELECT name FROM cinema_equipment_asset WHERE id IN (SELECT md5('seed45:asset:' || n)::uuid FROM generate_series(1,10) g(n))
        UNION ALL SELECT title FROM maintenance_work_order WHERE id IN (SELECT md5('seed45:work-order:' || n)::uuid FROM generate_series(1,10) g(n))
        UNION ALL SELECT subject FROM customer_support_case WHERE id IN (SELECT md5('seed45:support-case:' || n)::uuid FROM generate_series(1,10) g(n))
        UNION ALL SELECT label FROM trusted_device WHERE id IN (SELECT md5('seed46:trusted-device:' || n)::uuid FROM generate_series(1,10) g(n))
        UNION ALL SELECT title FROM security_alert WHERE id IN (SELECT md5('seed46:security-alert:' || n)::uuid FROM generate_series(1,10) g(n))
    ) values_to_check
    WHERE lower(v) LIKE '%demo%' OR lower(v) LIKE '%mẫu%';
    IF placeholder_count <> 0 THEN
        RAISE EXCEPTION 'Reference-data refresh failed: % placeholder values containing demo/mẫu remain', placeholder_count;
    END IF;

    SELECT COUNT(*) INTO gateway_count
    FROM payment p
    WHERE p.id IN (SELECT md5('seed45:payment:' || n)::uuid FROM generate_series(1,10) g(n))
      AND p.provider IN ('VNPAY','VNPAY_QR','MOMO','MOMO_QR');
    gateway_count := gateway_count + (
        SELECT COUNT(*) FROM payment_webhook_event e
        WHERE e.id IN (SELECT md5('seed45:webhook:' || n)::uuid FROM generate_series(1,10) g(n))
          AND e.provider IN ('VNPAY','VNPAY_QR','MOMO','MOMO_QR')
    );
    IF gateway_count <> 0 THEN
        RAISE EXCEPTION 'Reference-data refresh failed: % seeded VNPAY/MOMO rows remain', gateway_count;
    END IF;

    SELECT COUNT(*) INTO demo_movie_count
    FROM movie
    WHERE id IN (SELECT md5('seed45:movie:' || n)::uuid FROM generate_series(1,10) g(n))
       OR title LIKE 'Phim Demo %';
    IF demo_movie_count <> 0 THEN
        RAISE EXCEPTION 'Movie cleanup failed: % synthetic placeholder movies remain', demo_movie_count;
    END IF;

    SELECT COUNT(*) INTO upcoming_shift_count
    FROM staff_shift s
    WHERE s.id IN (SELECT md5('seed46:planned-shift:' || n)::uuid FROM generate_series(1,10) g(n))
      AND s.shift_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 14
      AND s.status = 'SCHEDULED';
    IF upcoming_shift_count <> 10 THEN
        RAISE EXCEPTION 'Reference schedule refresh failed: expected 10 upcoming shifts in the default admin window, found %', upcoming_shift_count;
    END IF;
END $$;

COMMIT;

-- Quick verification of all 49 tables shown in pgAdmin V46.
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
        'staff_shift','staff_shift_handover','ticket_checkin_log','trusted_device','security_alert','user_notification','voucher',
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
