INSERT INTO movie(id, title, description, duration_minutes, poster_url, rating, release_date, active)
VALUES
('11111111-1111-1111-1111-111111111111', 'Hành Trình Sao Hỏa', 'Phim khoa học viễn tưởng dùng làm dữ liệu demo cho hệ thống đặt vé.', 128, 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=800&q=80', 'T13', CURRENT_DATE, TRUE),
('22222222-2222-2222-2222-222222222222', 'Thành Phố Sau Cơn Mưa', 'Phim tâm lý - tình cảm dùng làm dữ liệu demo.', 105, 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=800&q=80', 'T16', CURRENT_DATE, TRUE);

INSERT INTO cinema(id, name, address)
VALUES ('33333333-3333-3333-3333-333333333333', 'CineHub Quận 1', '1 Nguyễn Huệ, Quận 1, TP.HCM');

INSERT INTO auditorium(id, cinema_id, name)
VALUES ('44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', 'Phòng 01');

INSERT INTO seat(id, auditorium_id, row_label, seat_number, seat_type, price_modifier)
SELECT gen_random_uuid(), '44444444-4444-4444-4444-444444444444', row_label, seat_number,
       CASE WHEN row_label = 'C' THEN 'VIP' ELSE 'STANDARD' END,
       CASE WHEN row_label = 'C' THEN 20000 ELSE 0 END
FROM (VALUES ('A'), ('B'), ('C'), ('D'), ('E')) AS r(row_label)
CROSS JOIN generate_series(1, 8) AS s(seat_number);

INSERT INTO showtime(id, movie_id, auditorium_id, start_time, base_price, status)
VALUES
('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', CURRENT_TIMESTAMP + INTERVAL '1 day', 90000, 'OPEN'),
('66666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', CURRENT_TIMESTAMP + INTERVAL '2 days', 100000, 'OPEN'),
('77777777-7777-7777-7777-777777777777', '22222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444', CURRENT_TIMESTAMP + INTERVAL '1 day 4 hours', 85000, 'OPEN');
