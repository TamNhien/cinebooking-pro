-- V29.3 demo catalog: keep exactly eight active "now showing" movies for the
-- home-page 4-column desktop grid (two complete rows), and provide deterministic
-- demo showtimes through 2026-09-30.
--
-- This is a new Flyway migration. Do not rewrite V1-V25 on an existing database.

INSERT INTO movie(
    id, title, description, duration_minutes, poster_url, rating,
    genre, movie_language, trailer_url, release_date, active
)
VALUES
(
    '11111111-1111-1111-1111-111111111111',
    'Hành Trình Sao Hỏa',
    'Một phi hành đoàn Việt Nam bước vào nhiệm vụ sinh tồn trên Sao Hỏa sau khi liên lạc với Trái Đất bị gián đoạn.',
    128,
    'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=800&q=80',
    'T13',
    'Khoa học viễn tưởng,Phiêu lưu',
    'Tiếng Việt',
    NULL,
    DATE '2026-08-01',
    TRUE
),
(
    '22222222-2222-2222-2222-222222222222',
    'Thành Phố Sau Cơn Mưa',
    'Hai người trẻ gặp lại nhau giữa Sài Gòn sau một cơn mưa lớn và phải lựa chọn giữa ký ức, công việc và tình yêu.',
    105,
    'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=800&q=80',
    'T16',
    'Tâm lý,Tình cảm',
    'Tiếng Việt',
    NULL,
    DATE '2026-08-03',
    TRUE
),
(
    '88888888-8888-8888-8888-888888888888',
    'Mật Mã Đại Dương',
    'Một nhóm nghiên cứu biển sâu phát hiện tín hiệu lạ dưới đáy đại dương và lần theo mật mã dẫn đến một bí mật bị chôn vùi hàng thập kỷ.',
    116,
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
    'T13',
    'Phiêu lưu,Bí ẩn',
    'Tiếng Việt',
    NULL,
    DATE '2026-08-05',
    TRUE
),
(
    '99999999-9999-9999-9999-999999999999',
    'Đêm Sài Gòn 2088',
    'Trong một Sài Gòn tương lai phủ đầy biển quảng cáo neon, một kỹ sư an ninh mạng phát hiện âm mưu có thể làm tê liệt cả thành phố.',
    122,
    'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=800&q=80',
    'T16',
    'Khoa học viễn tưởng,Hành động',
    'Tiếng Việt',
    NULL,
    DATE '2026-08-07',
    TRUE
),
(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Vệt Nắng Cuối Trời',
    'Một gia đình ba thế hệ trở về quê cũ trong mùa hè cuối cùng trước khi ngôi nhà tuổi thơ được bán, mở ra những câu chuyện chưa từng được nói.',
    98,
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80',
    'P',
    'Gia đình,Tâm lý',
    'Tiếng Việt',
    NULL,
    DATE '2026-08-09',
    TRUE
),
(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'Khu Rừng Thức Giấc',
    'Bốn người bạn lạc vào khu rừng được cho là đã biến mất khỏi bản đồ và phải giải mã những dấu hiệu kỳ lạ để tìm đường trở về.',
    110,
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=800&q=80',
    'T13',
    'Kỳ ảo,Phiêu lưu',
    'Tiếng Việt',
    NULL,
    DATE '2026-08-11',
    TRUE
),
(
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'Chuyến Tàu 0 Giờ',
    'Một chuyến tàu đêm rời ga đúng nửa đêm nhưng không xuất hiện trong bất kỳ lịch trình nào, kéo theo chuỗi biến cố khó giải thích.',
    114,
    'https://images.unsplash.com/photo-1473445361085-b9a07f55608b?auto=format&fit=crop&w=800&q=80',
    'T16',
    'Giật gân,Bí ẩn',
    'Tiếng Việt',
    NULL,
    DATE '2026-08-13',
    TRUE
),
(
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'Hồ Sơ Bóng Tối',
    'Một điều tra viên kỳ cựu nhận lại hồ sơ án tưởng như đã khép lại, rồi phát hiện các manh mối mới liên kết nhiều vụ việc trong thành phố.',
    120,
    'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=800&q=80',
    'T18',
    'Tội phạm,Trinh thám',
    'Tiếng Việt',
    NULL,
    DATE '2026-08-15',
    TRUE
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    duration_minutes = EXCLUDED.duration_minutes,
    poster_url = EXCLUDED.poster_url,
    rating = EXCLUDED.rating,
    genre = EXCLUDED.genre,
    movie_language = EXCLUDED.movie_language,
    trailer_url = EXCLUDED.trailer_url,
    release_date = EXCLUDED.release_date,
    active = EXCLUDED.active;

-- Four extra demo auditoriums allow all eight movies to receive two daily
-- showtimes without overlapping the legacy Room 01 seed showtimes.
INSERT INTO auditorium(id, cinema_id, name)
VALUES
('44444444-4444-4444-4444-444444444445', '33333333-3333-3333-3333-333333333333', 'Phòng 02'),
('44444444-4444-4444-4444-444444444446', '33333333-3333-3333-3333-333333333333', 'Phòng 03'),
('44444444-4444-4444-4444-444444444447', '33333333-3333-3333-3333-333333333333', 'Phòng 04'),
('44444444-4444-4444-4444-444444444448', '33333333-3333-3333-3333-333333333333', 'Phòng 05')
ON CONFLICT (id) DO UPDATE SET
    cinema_id = EXCLUDED.cinema_id,
    name = EXCLUDED.name;

INSERT INTO seat(id, auditorium_id, row_label, seat_number, seat_type, price_modifier)
SELECT
    gen_random_uuid(),
    rooms.auditorium_id,
    seat_rows.row_label,
    numbers.seat_number,
    CASE WHEN seat_rows.row_label IN ('C', 'D') THEN 'VIP' ELSE 'STANDARD' END,
    CASE WHEN seat_rows.row_label IN ('C', 'D') THEN 20000 ELSE 0 END
FROM (
    VALUES
    ('44444444-4444-4444-4444-444444444445'::uuid),
    ('44444444-4444-4444-4444-444444444446'::uuid),
    ('44444444-4444-4444-4444-444444444447'::uuid),
    ('44444444-4444-4444-4444-444444444448'::uuid)
) AS rooms(auditorium_id)
CROSS JOIN (VALUES ('A'), ('B'), ('C'), ('D'), ('E')) AS seat_rows(row_label)
CROSS JOIN generate_series(1, 8) AS numbers(seat_number)
ON CONFLICT (auditorium_id, row_label, seat_number) DO NOTHING;

-- 44 calendar days (2026-08-18 through 2026-09-30) x 16 showtimes/day
-- = 704 deterministic demo showtimes. Times are interpreted in Vietnam time.
WITH daily_slots(movie_id, auditorium_id, local_time, base_price) AS (
    VALUES
    ('11111111-1111-1111-1111-111111111111'::uuid, '44444444-4444-4444-4444-444444444445'::uuid, TIME '10:00',  90000::numeric),
    ('22222222-2222-2222-2222-222222222222'::uuid, '44444444-4444-4444-4444-444444444445'::uuid, TIME '13:00',  85000::numeric),
    ('11111111-1111-1111-1111-111111111111'::uuid, '44444444-4444-4444-4444-444444444445'::uuid, TIME '16:00', 100000::numeric),
    ('22222222-2222-2222-2222-222222222222'::uuid, '44444444-4444-4444-4444-444444444445'::uuid, TIME '19:30',  95000::numeric),

    ('88888888-8888-8888-8888-888888888888'::uuid, '44444444-4444-4444-4444-444444444446'::uuid, TIME '10:00',  90000::numeric),
    ('99999999-9999-9999-9999-999999999999'::uuid, '44444444-4444-4444-4444-444444444446'::uuid, TIME '13:00', 105000::numeric),
    ('88888888-8888-8888-8888-888888888888'::uuid, '44444444-4444-4444-4444-444444444446'::uuid, TIME '16:00', 100000::numeric),
    ('99999999-9999-9999-9999-999999999999'::uuid, '44444444-4444-4444-4444-444444444446'::uuid, TIME '19:30', 115000::numeric),

    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, '44444444-4444-4444-4444-444444444447'::uuid, TIME '10:00',  80000::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, '44444444-4444-4444-4444-444444444447'::uuid, TIME '13:00',  90000::numeric),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, '44444444-4444-4444-4444-444444444447'::uuid, TIME '16:00',  90000::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, '44444444-4444-4444-4444-444444444447'::uuid, TIME '19:30', 100000::numeric),

    ('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, '44444444-4444-4444-4444-444444444448'::uuid, TIME '10:00',  90000::numeric),
    ('dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid, '44444444-4444-4444-4444-444444444448'::uuid, TIME '13:00', 100000::numeric),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, '44444444-4444-4444-4444-444444444448'::uuid, TIME '16:00', 100000::numeric),
    ('dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid, '44444444-4444-4444-4444-444444444448'::uuid, TIME '19:30', 110000::numeric)
),
demo_days(day) AS (
    SELECT generate_series(DATE '2026-08-18', DATE '2026-09-30', INTERVAL '1 day')
),
expanded AS (
    SELECT
        slots.movie_id,
        slots.auditorium_id,
        ((days.day::date + slots.local_time) AT TIME ZONE 'Asia/Ho_Chi_Minh') AS start_time,
        slots.base_price
    FROM demo_days days
    CROSS JOIN daily_slots slots
)
INSERT INTO showtime(id, movie_id, auditorium_id, start_time, base_price, status)
SELECT
    gen_random_uuid(),
    expanded.movie_id,
    expanded.auditorium_id,
    expanded.start_time,
    expanded.base_price,
    'OPEN'
FROM expanded
WHERE NOT EXISTS (
    SELECT 1
    FROM showtime existing
    WHERE existing.movie_id = expanded.movie_id
      AND existing.auditorium_id = expanded.auditorium_id
      AND existing.start_time = expanded.start_time
);
