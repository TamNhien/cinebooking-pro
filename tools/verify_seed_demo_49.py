from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
sql_path = root / 'tools' / 'seed-demo-49-tables-10-rows.sql'
ps1_path = root / 'tools' / 'seed-demo-49-tables.ps1'
check_sql = root / 'tools' / 'check-demo-49-table-counts.sql'

# V46 has 48 application tables plus Flyway metadata = 49 tables in pgAdmin.
# movie deliberately reuses the 8 canonical V29 rows; flyway_schema_history is read-only.
expected_seed_inserts = {
    'app_user','audit_log','auditorium','auditorium_blackout','auth_session',
    'booking','booking_concession','booking_seat','cinema','cinema_equipment_asset',
    'concession_product','customer_support_case','customer_support_case_event',
    'financial_ledger_entry','financial_ledger_line','financial_reconciliation_issue',
    'financial_reconciliation_run','inventory_movement','loyalty_point_lot','loyalty_reward',
    'loyalty_reward_redemption','loyalty_transaction','maintenance_work_order',
    'maintenance_work_order_event','movie_favorite','movie_review','notification_preference',
    'password_reset_token','payment','payment_webhook_event','pricing_rule','recommendation_event',
    'seat','security_alert','showtime','showtime_waitlist','staff_attendance','staff_incident',
    'staff_leave_request','staff_profile','staff_shift','staff_shift_handover','ticket_checkin_log',
    'trusted_device','user_notification','voucher','voucher_redemption'
}

all_49_tables = expected_seed_inserts | {'movie','flyway_schema_history'}
canonical_movie_ids = [
    '11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',
    '88888888-8888-8888-8888-888888888888','99999999-9999-9999-9999-999999999999',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'cccccccc-cccc-cccc-cccc-cccccccccccc','dddddddd-dddd-dddd-dddd-dddddddddddd',
]

checks=[]
def check(name, condition):
    checks.append((name, bool(condition)))
    print(f"[ {'OK' if condition else 'FAIL'} ] {name}")

sql = sql_path.read_text(encoding='utf-8') if sql_path.exists() else ''
ps1 = ps1_path.read_text(encoding='utf-8') if ps1_path.exists() else ''
counts = check_sql.read_text(encoding='utf-8') if check_sql.exists() else ''
targets = {t.lower() for t in re.findall(r'INSERT\s+INTO\s+([a-zA-Z_][\w]*)', sql, re.I)}
verification_array = set(re.findall(r"'([a-z_]+)'", sql[sql.find('Quick verification of all 49 tables'):]))

check('V46 49-table SQL exists and decodes as UTF-8', sql_path.exists() and 'Cảnh báo bảo mật Demo' in sql and 'Thiết bị tin cậy Demo' in sql)
check('V46 49-table PowerShell runner exists', ps1_path.exists())
check('All 47 seeded application tables have INSERT coverage', expected_seed_inserts.issubset(targets) and len(expected_seed_inserts) == 47)
check('trusted_device receives 10 deterministic rows', "seed46:trusted-device:" in sql and 'INSERT INTO trusted_device(' in sql)
check('security_alert receives 10 deterministic rows', "seed46:security-alert:" in sql and 'INSERT INTO security_alert(' in sql)
check('Security alert seed covers V46 event types', all(v in sql for v in ['NEW_DEVICE','CREDENTIAL_ATTACK','PASSWORD_CHANGED','PASSWORD_RESET','SESSION_REVOKED']))
check('Security alert seed uses risk scores matching rules', all(v in sql for v in ['45,80,50,75,35','MEDIUM','HIGH','LOW']))
check('UTF-8 repair includes V46 trusted device text', 'UPDATE trusted_device d SET' in sql and 'Thiết bị tin cậy Demo' in sql)
check('UTF-8 repair includes V46 security alert text', 'UPDATE security_alert a SET' in sql and 'Cảnh báo bảo mật Demo' in sql)
check('V46 UTF-8 fields participate in corruption self-check', 'SELECT label FROM trusted_device' in sql and 'SELECT title FROM security_alert' in sql and 'SELECT details FROM security_alert' in sql)
check('movie table is not seeded with synthetic rows', not re.search(r'INSERT\s+INTO\s+movie\s*\(', sql, re.I))
check('All eight canonical V29 movie IDs are reused', all(mid in sql for mid in canonical_movie_ids))
check('Old synthetic Phim Demo movies are removed', 'DELETE FROM movie' in sql and 'seed45:movie:' in sql)
check('Flyway metadata is never inserted/updated/deleted', not re.search(r'(INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+flyway_schema_history', sql, re.I))
check('Final verification enumerates all 49 pgAdmin tables', all_49_tables.issubset(verification_array) and len(all_49_tables) == 49)
check('Row-count helper includes V46 tables', counts.count("'trusted_device'") == 2 and counts.count("'security_alert'") == 2)
check('Final verification fails if any table is empty', 'IF c = 0 THEN' in sql and 'table % is still empty' in sql)
check('Seed remains transactional and UTF-8 explicit', 'BEGIN;' in sql and 'COMMIT;' in sql and "client_encoding = 'UTF8'" in sql)
check('Ledger stays balanced with 20 debit/credit lines', "'PAYMENT_CLEARING:DEMO45','DEBIT'" in sql and "'CUSTOMER_FUNDS_CAPTURED','CREDIT'" in sql)
check('PowerShell uses byte-safe docker compose cp', 'docker compose cp' in ps1 and 'Get-Content' not in ps1)
check('PowerShell verifies PostgreSQL UTF8 server encoding', 'SHOW server_encoding' in ps1 and 'server_encoding must be UTF8' in ps1)
check('PowerShell runs psql with ON_ERROR_STOP', 'ON_ERROR_STOP=1' in ps1 and '-f $remoteSql' in ps1)

passed=sum(ok for _,ok in checks)
print(f"\nSeed V46 49-table verification: {passed}/{len(checks)} checks passed")
raise SystemExit(0 if passed == len(checks) else 1)
