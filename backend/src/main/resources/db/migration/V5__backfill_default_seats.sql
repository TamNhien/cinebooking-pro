-- Backfill a complete seat map for auditoriums that currently have no seats.
-- This fixes showtimes created in a room before seats were configured.
-- Layout: A-D STANDARD, E-G VIP, H COUPLE; 10 seats per row.
INSERT INTO seat(id, auditorium_id, row_label, seat_number, seat_type, price_modifier)
SELECT gen_random_uuid(), a.id, r.row_label, n.seat_number,
       CASE
         WHEN r.row_label = 'H' THEN 'COUPLE'
         WHEN r.row_label IN ('E','F','G') THEN 'VIP'
         ELSE 'STANDARD'
       END,
       CASE
         WHEN r.row_label = 'H' THEN 50000
         WHEN r.row_label IN ('E','F','G') THEN 20000
         ELSE 0
       END
FROM auditorium a
CROSS JOIN (VALUES ('A'),('B'),('C'),('D'),('E'),('F'),('G'),('H')) AS r(row_label)
CROSS JOIN generate_series(1,10) AS n(seat_number)
WHERE NOT EXISTS (
  SELECT 1 FROM seat s WHERE s.auditorium_id = a.id
);
