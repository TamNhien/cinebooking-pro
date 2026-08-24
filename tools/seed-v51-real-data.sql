-- CineBooking V51 real-data snapshot refresh.
-- This script NEVER creates movies, cinemas, products, bookings, payments, or fake cost basis.
-- It only derives analytics_snapshot rows from data that already exists in the database.
-- Existing cinema_concession_cost_basis rows are respected; missing cost remains unknown (NULL).

BEGIN;
SET LOCAL client_encoding = 'UTF8';
SET LOCAL TIME ZONE 'Asia/Ho_Chi_Minh';

DO $$
DECLARE
    server_enc text;
    movie_count integer;
BEGIN
    SELECT current_setting('server_encoding') INTO server_enc;
    IF upper(server_enc) <> 'UTF8' THEN
        RAISE EXCEPTION 'PostgreSQL server_encoding must be UTF8, found %', server_enc;
    END IF;

    SELECT count(*) INTO movie_count
    FROM movie
    WHERE id IN (
        '11111111-1111-1111-1111-111111111111'::uuid,
        '22222222-2222-2222-2222-222222222222'::uuid,
        '88888888-8888-8888-8888-888888888888'::uuid,
        '99999999-9999-9999-9999-999999999999'::uuid,
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
        'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid,
        'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid
    );
    IF movie_count <> 8 THEN
        RAISE EXCEPTION 'V51 real-data refresh requires the 8 existing V29 movies; found %/8', movie_count;
    END IF;
END $$;

WITH params AS (
    SELECT (current_timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS today
), periods AS (
    SELECT c.id AS cinema_id, 'DAILY'::varchar(12) AS period_kind,
           p.today - 1 AS period_start, p.today - 1 AS period_end
    FROM cinema c CROSS JOIN params p
    UNION ALL
    SELECT c.id, 'WEEKLY'::varchar(12),
           date_trunc('week', p.today::timestamp)::date - 7,
           date_trunc('week', p.today::timestamp)::date - 1
    FROM cinema c CROSS JOIN params p
    UNION ALL
    SELECT c.id, 'MONTHLY'::varchar(12),
           (date_trunc('month', p.today::timestamp) - interval '1 month')::date,
           (date_trunc('month', p.today::timestamp) - interval '1 day')::date
    FROM cinema c CROSS JOIN params p
), period_bounds AS (
    SELECT p.*,
           (p.period_start::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh') AS start_at,
           ((p.period_end + 1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh') AS end_at
    FROM periods p
), base_stats AS (
    SELECT pb.*,
           COALESCE((
               SELECT sum(pay.amount)
               FROM payment pay
               JOIN booking b ON b.id = pay.booking_id
               JOIN showtime st ON st.id = b.showtime_id
               JOIN auditorium a ON a.id = st.auditorium_id
               WHERE a.cinema_id = pb.cinema_id
                 AND pay.status = 'SUCCESS'
                 AND pay.paid_at >= pb.start_at
                 AND pay.paid_at < pb.end_at
           ), 0)::numeric(14,2) AS revenue,
           COALESCE((
               SELECT count(*)
               FROM booking b
               JOIN showtime st ON st.id = b.showtime_id
               JOIN auditorium a ON a.id = st.auditorium_id
               WHERE a.cinema_id = pb.cinema_id
                 AND b.status = 'CONFIRMED'
                 AND b.confirmed_at >= pb.start_at
                 AND b.confirmed_at < pb.end_at
           ), 0)::bigint AS bookings,
           COALESCE((
               SELECT count(*)
               FROM booking_seat bs
               JOIN booking b ON b.id = bs.booking_id
               JOIN showtime st ON st.id = bs.showtime_id
               JOIN auditorium a ON a.id = st.auditorium_id
               WHERE a.cinema_id = pb.cinema_id
                 AND b.status = 'CONFIRMED'
                 AND bs.released_at IS NULL
                 AND b.confirmed_at >= pb.start_at
                 AND b.confirmed_at < pb.end_at
           ), 0)::bigint AS tickets,
           COALESCE((
               SELECT sum((
                   SELECT count(*)
                   FROM seat se
                   WHERE se.auditorium_id = st.auditorium_id
                     AND se.seat_type <> 'BLOCKED'
               ))
               FROM showtime st
               JOIN auditorium a ON a.id = st.auditorium_id
               WHERE a.cinema_id = pb.cinema_id
                 AND st.start_time >= pb.start_at
                 AND st.start_time < pb.end_at
                 AND coalesce(st.status, 'OPEN') <> 'CANCELLED'
           ), 0)::bigint AS capacity,
           COALESCE((
               SELECT sum(bc.subtotal)
               FROM booking_concession bc
               JOIN booking b ON b.id = bc.booking_id
               JOIN showtime st ON st.id = b.showtime_id
               JOIN auditorium a ON a.id = st.auditorium_id
               WHERE a.cinema_id = pb.cinema_id
                 AND b.status = 'CONFIRMED'
                 AND b.confirmed_at >= pb.start_at
                 AND b.confirmed_at < pb.end_at
           ), 0)::numeric(14,2) AS concession_revenue,
           COALESCE((
               SELECT sum(bc.quantity)
               FROM booking_concession bc
               JOIN booking b ON b.id = bc.booking_id
               JOIN showtime st ON st.id = b.showtime_id
               JOIN auditorium a ON a.id = st.auditorium_id
               WHERE a.cinema_id = pb.cinema_id
                 AND b.status = 'CONFIRMED'
                 AND b.confirmed_at >= pb.start_at
                 AND b.confirmed_at < pb.end_at
           ), 0)::bigint AS concession_units,
           COALESCE((
               SELECT sum(CASE WHEN cb.unit_cost IS NOT NULL THEN bc.quantity ELSE 0 END)
               FROM booking_concession bc
               JOIN booking b ON b.id = bc.booking_id
               JOIN showtime st ON st.id = b.showtime_id
               JOIN auditorium a ON a.id = st.auditorium_id
               LEFT JOIN cinema_concession_cost_basis cb
                 ON cb.cinema_id = a.cinema_id AND cb.product_id = bc.product_id
               WHERE a.cinema_id = pb.cinema_id
                 AND b.status = 'CONFIRMED'
                 AND b.confirmed_at >= pb.start_at
                 AND b.confirmed_at < pb.end_at
           ), 0)::bigint AS costed_units,
           COALESCE((
               SELECT sum(CASE WHEN cb.unit_cost IS NOT NULL THEN bc.quantity * cb.unit_cost ELSE 0 END)
               FROM booking_concession bc
               JOIN booking b ON b.id = bc.booking_id
               JOIN showtime st ON st.id = b.showtime_id
               JOIN auditorium a ON a.id = st.auditorium_id
               LEFT JOIN cinema_concession_cost_basis cb
                 ON cb.cinema_id = a.cinema_id AND cb.product_id = bc.product_id
               WHERE a.cinema_id = pb.cinema_id
                 AND b.status = 'CONFIRMED'
                 AND b.confirmed_at >= pb.start_at
                 AND b.confirmed_at < pb.end_at
           ), 0)::numeric(14,2) AS known_cost
    FROM period_bounds pb
), forecast_targets AS (
    SELECT c.id AS cinema_id,
           p.today + offs.day_offset AS target_day,
           offs.day_offset
    FROM cinema c
    CROSS JOIN params p
    CROSS JOIN generate_series(1,7) AS offs(day_offset)
), forecast_values AS (
    SELECT ft.cinema_id, ft.target_day, ft.day_offset,
           round(sum(COALESCE(day_revenue.revenue, 0) * sample.weight)::numeric / 10, 2) AS predicted
    FROM forecast_targets ft
    CROSS JOIN (VALUES (1,4),(2,3),(3,2),(4,1)) AS sample(week_no, weight)
    LEFT JOIN LATERAL (
        SELECT sum(pay.amount)::numeric AS revenue
        FROM payment pay
        JOIN booking b ON b.id = pay.booking_id
        JOIN showtime st ON st.id = b.showtime_id
        JOIN auditorium a ON a.id = st.auditorium_id
        WHERE a.cinema_id = ft.cinema_id
          AND pay.status = 'SUCCESS'
          AND date(pay.paid_at AT TIME ZONE 'Asia/Ho_Chi_Minh') = ft.target_day - (sample.week_no * 7)
    ) day_revenue ON true
    GROUP BY ft.cinema_id, ft.target_day, ft.day_offset
), forecast_total AS (
    SELECT cinema_id, round(sum(predicted), 2)::numeric(14,2) AS forecast_next_7d
    FROM forecast_values
    GROUP BY cinema_id
), final_stats AS (
    SELECT bs.*,
           greatest(bs.revenue - bs.concession_revenue, 0)::numeric(14,2) AS ticket_revenue,
           CASE WHEN bs.concession_units = bs.costed_units THEN bs.known_cost ELSE NULL END::numeric(14,2) AS concession_cost,
           CASE WHEN bs.concession_units = bs.costed_units THEN (bs.revenue - bs.known_cost) ELSE NULL END::numeric(14,2) AS gross_margin,
           CASE WHEN bs.capacity = 0 THEN 0 ELSE round(bs.tickets::numeric * 100 / bs.capacity, 3) END::numeric(7,3) AS occupancy_rate,
           CASE WHEN bs.concession_units = 0 THEN 100 ELSE round(bs.costed_units::numeric * 100 / bs.concession_units, 3) END::numeric(7,3) AS cost_coverage_rate,
           coalesce(ft.forecast_next_7d, 0)::numeric(14,2) AS forecast_next_7d
    FROM base_stats bs
    LEFT JOIN forecast_total ft ON ft.cinema_id = bs.cinema_id
)
INSERT INTO analytics_snapshot(
    id, cinema_id, period_kind, period_start, period_end,
    revenue, ticket_revenue, concession_revenue, concession_cost, gross_margin,
    bookings, tickets, capacity, occupancy_rate, cost_coverage_rate,
    forecast_next_7d, forecast_algorithm, generated_at
)
SELECT gen_random_uuid(), cinema_id, period_kind, period_start, period_end,
       revenue, ticket_revenue, concession_revenue, concession_cost, gross_margin,
       bookings, tickets, capacity, occupancy_rate, cost_coverage_rate,
       forecast_next_7d, 'V51-WEEKDAY-WEIGHTED-MA-1', current_timestamp
FROM final_stats
ON CONFLICT (cinema_id, period_kind, period_start) DO UPDATE SET
    period_end = excluded.period_end,
    revenue = excluded.revenue,
    ticket_revenue = excluded.ticket_revenue,
    concession_revenue = excluded.concession_revenue,
    concession_cost = excluded.concession_cost,
    gross_margin = excluded.gross_margin,
    bookings = excluded.bookings,
    tickets = excluded.tickets,
    capacity = excluded.capacity,
    occupancy_rate = excluded.occupancy_rate,
    cost_coverage_rate = excluded.cost_coverage_rate,
    forecast_next_7d = excluded.forecast_next_7d,
    forecast_algorithm = excluded.forecast_algorithm,
    generated_at = current_timestamp;

COMMIT;

SELECT 'analytics_snapshot' AS table_name, count(*) AS rows FROM analytics_snapshot
UNION ALL
SELECT 'cinema_concession_cost_basis', count(*) FROM cinema_concession_cost_basis;
