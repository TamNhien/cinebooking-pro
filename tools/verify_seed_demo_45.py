from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
sql_path = root / 'tools' / 'seed-demo-45-tables-10-rows.sql'
ps1_path = root / 'tools' / 'seed-demo-45-tables.ps1'

# movie is deliberately NOT seeded anymore; the eight canonical V29 movies are reused.
expected_seed_inserts = {
    'app_user','audit_log','auditorium','auditorium_blackout','auth_session',
    'booking','booking_concession','booking_seat','cinema','cinema_equipment_asset',
    'concession_product','financial_ledger_entry','financial_ledger_line',
    'financial_reconciliation_issue','financial_reconciliation_run','inventory_movement',
    'loyalty_point_lot','loyalty_reward','loyalty_reward_redemption','loyalty_transaction',
    'maintenance_work_order','maintenance_work_order_event','movie_favorite','movie_review',
    'notification_preference','password_reset_token','payment','payment_webhook_event','pricing_rule',
    'recommendation_event','seat','showtime','showtime_waitlist','staff_attendance','staff_incident',
    'staff_leave_request','staff_profile','staff_shift','staff_shift_handover','ticket_checkin_log',
    'user_notification','voucher','voucher_redemption'
}

canonical_movie_ids = [
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '88888888-8888-8888-8888-888888888888',
    '99999999-9999-9999-9999-999999999999',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
]

checks = []
def check(name, condition):
    checks.append((name, bool(condition)))
    print(f"[ {'OK' if condition else 'FAIL'} ] {name}")

sql = sql_path.read_text(encoding='utf-8') if sql_path.exists() else ''
ps1 = ps1_path.read_text(encoding='utf-8') if ps1_path.exists() else ''
targets = [t.lower() for t in re.findall(r'INSERT\s+INTO\s+([a-zA-Z_][\w]*)', sql, re.I)]

check('Seed SQL exists and decodes as UTF-8', sql_path.exists() and 'Máy chiếu Demo' in sql and 'Phòng Demo' in sql)
check('PowerShell runner exists', ps1_path.exists())
check('All non-movie application seed tables are covered', expected_seed_inserts.issubset(set(targets)))
check('movie table is not seeded with synthetic rows', not re.search(r'INSERT\s+INTO\s+movie\s*\(', sql, re.I))
check('All eight canonical V29 movie IDs are mapped', all(mid in sql for mid in canonical_movie_ids))
check('Ten relation slots reuse the eight canonical movies', 'CREATE TEMP TABLE seed45_movie_map' in sql and '(10,' in sql)
check('Old synthetic seed45 movies are explicitly removed', "DELETE FROM movie" in sql and "seed45:movie:" in sql)
check('No literal Phim Demo insert remains', not re.search(r"format\('Phim Demo", sql))
check('Showtime uses canonical movie map', 'SELECT movie_id FROM seed45_movie_map' in sql)
check('Favorite/review/recommendation/pricing relations are remapped', sql.count('FROM seed45_movie_map mapped') >= 5)
check('Flyway metadata is never inserted into', not re.search(r'INSERT\s+INTO\s+flyway_schema_history', sql, re.I))
check('Seed uses transaction and explicit UTF8 client encoding', 'BEGIN;' in sql and 'COMMIT;' in sql and "client_encoding = 'UTF8'" in sql)
check('UTF-8 repair refreshes equipment and auditorium names', "Máy chiếu Demo %s" in sql and "Phòng Demo %s" in sql)
check('UTF-8 repair covers human-readable fields broadly', sql.count('UPDATE ') >= 25)
check('Seed self-check rejects remaining question-mark corruption', "UTF-8 repair failed" in sql and "LIKE '%?%'" in sql)
check('Seed self-check rejects remaining synthetic movies', 'movie cleanup failed' in sql)
check('Immutable repair temporarily bypasses user triggers', 'session_replication_role = replica' in sql and 'session_replication_role = origin' in sql)
check('Ledger still has balanced debit and credit lines', "'PAYMENT_CLEARING:DEMO45','DEBIT'" in sql and "'CUSTOMER_FUNDS_CAPTURED','CREDIT'" in sql)
check('PowerShell avoids native text piping by using docker compose cp', 'docker compose cp' in ps1 and 'Get-Content' not in ps1)
check('PowerShell verifies PostgreSQL UTF8 server encoding', 'SHOW server_encoding' in ps1 and "server_encoding must be UTF8" in ps1)
check('PowerShell executes copied SQL with ON_ERROR_STOP', 'ON_ERROR_STOP=1' in ps1 and '-f $remoteSql' in ps1)
check('PowerShell removes temporary SQL from container', 'rm -f $remoteSql' in ps1)

passed = sum(ok for _, ok in checks)
print(f"\nSeed UTF-8/movie reuse verification: {passed}/{len(checks)} checks passed")
raise SystemExit(0 if passed == len(checks) else 1)
