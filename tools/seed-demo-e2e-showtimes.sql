-- Explicit demo-only E2E schedule refresh. NEVER run against a production database.
-- Reuses only the eight V29 demo movies, known auditoriums and the original
-- seeded daily slots. It does not create movies, cinemas, products or payments,
-- move existing showtimes, or modify customer bookings.
BEGIN;
SET LOCAL TIME ZONE 'Asia/Ho_Chi_Minh';
DO $$
DECLARE demo_movies integer; demo_slots integer;
BEGIN
  SELECT count(*) INTO demo_movies FROM movie
    WHERE active = true AND id IN (
      '11111111-1111-1111-1111-111111111111'::uuid,
      '22222222-2222-2222-2222-222222222222'::uuid,
      '88888888-8888-8888-8888-888888888888'::uuid,
      '99999999-9999-9999-9999-999999999999'::uuid,
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
      'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid,
      'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid
    );
  SELECT count(*) INTO demo_slots FROM showtime st
    WHERE (st.start_time AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = '2026-09-30'::date
      AND st.auditorium_id IN (
        '44444444-4444-4444-4444-444444444445'::uuid,
        '44444444-4444-4444-4444-444444444446'::uuid,
        '44444444-4444-4444-4444-444444444447'::uuid,
        '44444444-4444-4444-4444-444444444448'::uuid
      );
  IF demo_movies <> 8 OR demo_slots <> 16 THEN
    RAISE EXCEPTION 'Refusing: V29 demo fixture not recognized (movies %, schedule slots %).', demo_movies, demo_slots;
  END IF;
END $$;
WITH template AS (
  SELECT st.movie_id, st.auditorium_id,
         (st.start_time AT TIME ZONE 'Asia/Ho_Chi_Minh')::time AS local_time,
         st.base_price
  FROM showtime st
  WHERE (st.start_time AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = DATE '2026-09-30'
    AND st.auditorium_id IN (
      '44444444-4444-4444-4444-444444444445'::uuid,
      '44444444-4444-4444-4444-444444444446'::uuid,
      '44444444-4444-4444-4444-444444444447'::uuid,
      '44444444-4444-4444-4444-444444444448'::uuid
    )
), days AS (
  SELECT (current_date + offset_days)::date AS show_day
  FROM generate_series(2, 32) AS offset_days
), future_slots AS (
  SELECT t.movie_id,t.auditorium_id,t.base_price,
         ((d.show_day + t.local_time) AT TIME ZONE 'Asia/Ho_Chi_Minh') AS start_time
  FROM template t CROSS JOIN days d
)
INSERT INTO showtime (id,movie_id,auditorium_id,start_time,base_price,status)
SELECT gen_random_uuid(), f.movie_id,f.auditorium_id,f.start_time,f.base_price,'OPEN'
FROM future_slots f
WHERE NOT EXISTS (
  SELECT 1 FROM showtime existing
  WHERE existing.movie_id=f.movie_id
    AND existing.auditorium_id=f.auditorium_id
    AND existing.start_time=f.start_time
);
COMMIT;
