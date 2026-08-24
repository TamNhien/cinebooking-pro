\pset pager off
SET client_encoding = 'UTF8';
SET TIME ZONE 'Asia/Ho_Chi_Minh';

DO $$
DECLARE
    server_enc text;
    client_enc text;
    table_count integer;
    latest_version text;
    movie_count integer;
    snapshot_count bigint;
    bad_text_count bigint;
BEGIN
    SELECT current_setting('server_encoding') INTO server_enc;
    SELECT current_setting('client_encoding') INTO client_enc;
    IF upper(server_enc) <> 'UTF8' OR upper(client_enc) <> 'UTF8' THEN
        RAISE EXCEPTION 'UTF-8 check failed: server=%, client=%', server_enc, client_enc;
    END IF;

    SELECT count(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    IF table_count < 56 THEN
        RAISE EXCEPTION 'V51 expects at least 56 public tables, found %', table_count;
    END IF;

    SELECT version INTO latest_version
    FROM flyway_schema_history
    WHERE success = true AND version IS NOT NULL
    ORDER BY installed_rank DESC
    LIMIT 1;
    IF latest_version <> '51' THEN
        RAISE EXCEPTION 'Flyway latest version must be 51, found %', latest_version;
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
        RAISE EXCEPTION 'Expected the 8 existing V29 movies, found %', movie_count;
    END IF;

    SELECT count(*) INTO snapshot_count FROM analytics_snapshot;
    IF snapshot_count = 0 THEN
        RAISE EXCEPTION 'analytics_snapshot is empty. Run tools/seed-v51-real-data.ps1 or wait for the V51 scheduler.';
    END IF;

    SELECT count(*) INTO bad_text_count
    FROM (
        SELECT title AS value FROM movie
        UNION ALL SELECT name FROM cinema
        UNION ALL SELECT address FROM cinema
        UNION ALL SELECT name FROM concession_product
        UNION ALL SELECT description FROM concession_product
        UNION ALL SELECT full_name FROM app_user
    ) s
    WHERE value IS NOT NULL
      AND value ~ '(Ã.|Ä.|Æ.|áº|á»|ï¿½|�)';
    IF bad_text_count > 0 THEN
        RAISE EXCEPTION 'Possible mojibake/encoding corruption detected in % text rows', bad_text_count;
    END IF;
END $$;

SELECT current_setting('server_encoding') AS server_encoding,
       current_setting('client_encoding') AS client_encoding,
       current_setting('TimeZone') AS timezone;

SELECT count(*) AS public_tables
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

SELECT installed_rank, version, description, success
FROM flyway_schema_history
ORDER BY installed_rank DESC
LIMIT 5;

SELECT id, title, movie_language
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
)
ORDER BY release_date, id;

SELECT 'cinema_concession_cost_basis' AS table_name, count(*) AS row_count FROM cinema_concession_cost_basis
UNION ALL
SELECT 'analytics_snapshot', count(*) FROM analytics_snapshot;

SELECT c.name AS cinema_name,
       s.period_kind,
       s.period_start,
       s.revenue,
       s.concession_cost,
       s.gross_margin,
       s.cost_coverage_rate,
       s.forecast_next_7d,
       s.forecast_algorithm
FROM analytics_snapshot s
JOIN cinema c ON c.id = s.cinema_id
ORDER BY s.generated_at DESC, c.name, s.period_kind
LIMIT 20;
