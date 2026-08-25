\pset pager off
\pset border 2
\pset null '(null)'

BEGIN;
SET LOCAL client_encoding = 'UTF8';

-- V58 data-quality audit: all 57 public tables + semantic ownership + synthetic display scan.
CREATE TEMP TABLE realistic_table_counts(table_name text PRIMARY KEY,row_count bigint NOT NULL) ON COMMIT DROP;
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'app_user','audit_log','auditorium','auditorium_blackout','auth_session','booking','booking_concession','booking_seat',
    'cinema','cinema_equipment_asset','cinema_concession_inventory','cinema_concession_price','cinema_concession_cost_basis',
    'concession_product','customer_support_case','customer_support_case_event','financial_ledger_entry','financial_ledger_line',
    'financial_reconciliation_issue','financial_reconciliation_run','flyway_schema_history','inventory_movement','loyalty_point_lot',
    'loyalty_reward','loyalty_reward_redemption','loyalty_transaction','maintenance_work_order','maintenance_work_order_event',
    'movie','movie_favorite','movie_review','notification_preference','password_reset_token','payment','payment_event',
    'payment_webhook_event','pricing_rule','pwa_device','recommendation_event','recommendation_feedback','analytics_snapshot',
    'seat','showtime','showtime_planning_run','showtime_waitlist','staff_attendance','staff_incident','staff_leave_request',
    'staff_profile','staff_shift','staff_shift_handover','ticket_checkin_log','trusted_device','security_alert','user_notification',
    'voucher','voucher_redemption'
  ] LOOP
    EXECUTE format('INSERT INTO realistic_table_counts SELECT %L,count(*) FROM public.%I',t,t);
  END LOOP;
END $$;

SELECT table_name,row_count,CASE WHEN row_count>0 THEN 'OK' ELSE 'EMPTY' END AS status
FROM realistic_table_counts ORDER BY table_name;

CREATE TEMP TABLE realistic_findings(table_name text,column_name text,row_count bigint) ON COMMIT DROP;
DO $$
DECLARE c record; n bigint; q text;
BEGIN
  FOR c IN
    SELECT table_name,column_name
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name <> 'flyway_schema_history'
      AND data_type IN ('character varying','character','text')
  LOOP
    q:=format($fmt$
      SELECT count(*) FROM public.%I
      WHERE %I IS NOT NULL AND (
        lower(%I) LIKE '%%@example.test%%' OR
        lower(%I) LIKE '%%playwright%%' OR
        lower(%I) LIKE '%%test staff%%' OR
        lower(%I) LIKE '%%test cinema%%' OR
        lower(%I) LIKE '%%local smoke test%%' OR
        lower(%I) LIKE '%%automated smoke test%%' OR
        lower(%I) LIKE '%% v43 e2e %%' OR lower(%I) LIKE 'v43 e2e %%' OR
        lower(%I) LIKE '%% v44 e2e %%' OR lower(%I) LIKE 'v44 e2e %%' OR
        lower(%I) LIKE '%% v45 e2e %%' OR lower(%I) LIKE 'v45 e2e %%' OR
        lower(%I) LIKE 'e2e-%%' OR
        lower(%I) LIKE '%%đường kiểm thử%%' OR
        lower(%I) LIKE '%%kiểm thử tự động%%' OR
        lower(%I) LIKE '%%bài test%%'
      )
    $fmt$,c.table_name,c.column_name,
      c.column_name,c.column_name,c.column_name,c.column_name,c.column_name,c.column_name,c.column_name,c.column_name,
      c.column_name,c.column_name,c.column_name,c.column_name,c.column_name,c.column_name,c.column_name,c.column_name);
    EXECUTE q INTO n;
    IF n>0 THEN INSERT INTO realistic_findings VALUES(c.table_name,c.column_name,n); END IF;
  END LOOP;
END $$;

SELECT * FROM realistic_findings ORDER BY table_name,column_name;

CREATE TEMP TABLE realistic_semantic_findings(check_name text PRIMARY KEY,row_count bigint NOT NULL) ON COMMIT DROP;
INSERT INTO realistic_semantic_findings
SELECT 'booking purchaser is not USER',count(*) FROM booking b JOIN app_user u ON u.id=b.purchaser_user_id WHERE b.purchaser_user_id IS NOT NULL AND u.role<>'USER'
UNION ALL SELECT 'booking owner is not USER',count(*) FROM booking b JOIN app_user u ON u.id=b.user_id WHERE b.user_id IS NOT NULL AND u.role<>'USER'
UNION ALL SELECT 'payment payer is not USER',count(*) FROM payment p JOIN app_user u ON u.id=p.payer_user_id WHERE p.payer_user_id IS NOT NULL AND u.role<>'USER'
UNION ALL SELECT 'staff_profile links to non-staff role',count(*) FROM staff_profile sp JOIN app_user u ON u.id=sp.user_id WHERE u.role NOT IN ('STAFF','MANAGER','ADMIN')
UNION ALL SELECT 'support customer is not USER',count(*) FROM customer_support_case c JOIN app_user u ON u.id=c.user_id WHERE u.role<>'USER'
UNION ALL SELECT 'support assignee is not staff role',count(*) FROM customer_support_case c JOIN app_user u ON u.id=c.assigned_to WHERE c.assigned_to IS NOT NULL AND u.role NOT IN ('STAFF','MANAGER','ADMIN')
UNION ALL SELECT 'version/test-style customer display name',count(*) FROM app_user WHERE role='USER' AND (full_name ~* '^V[0-9]+[[:space:]]' OR full_name ILIKE '%Playwright%' OR full_name ILIKE '%Test%')
UNION ALL SELECT 'deprecated example.test user email',count(*) FROM app_user WHERE lower(email) LIKE '%@example.test';

SELECT check_name,row_count,CASE WHEN row_count=0 THEN 'PASS' ELSE 'FAIL' END AS status
FROM realistic_semantic_findings ORDER BY check_name;

DO $$
DECLARE empty_count integer; text_count integer; semantic_count integer; table_count integer;
BEGIN
  SELECT count(*) INTO table_count FROM realistic_table_counts;
  IF table_count<>57 THEN RAISE EXCEPTION '57-table audit enumerated % tables, expected 57',table_count; END IF;
  SELECT count(*) INTO empty_count FROM realistic_table_counts WHERE row_count=0;
  IF empty_count<>0 THEN RAISE EXCEPTION 'Realistic-data audit failed: % public tables are empty',empty_count; END IF;
  SELECT coalesce(sum(row_count),0) INTO text_count FROM realistic_findings;
  IF text_count<>0 THEN RAISE EXCEPTION 'Realistic-data audit failed: % synthetic human-readable values remain',text_count; END IF;
  SELECT coalesce(sum(row_count),0) INTO semantic_count FROM realistic_semantic_findings;
  IF semantic_count<>0 THEN RAISE EXCEPTION 'Realistic-data audit failed: % semantic ownership/name/email violations remain',semantic_count; END IF;
END $$;

SELECT 'PASS: all 57 tables contain data and no known synthetic human-readable test values remain.' AS result;
COMMIT;
