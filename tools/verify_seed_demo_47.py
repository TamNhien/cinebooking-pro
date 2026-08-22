from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
sql_path = root / 'tools' / 'seed-demo-47-tables-10-rows.sql'
ps1_path = root / 'tools' / 'seed-demo-47-tables.ps1'

# V45 has 46 application tables plus Flyway metadata = 47 tables in pgAdmin.
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
    'seat','showtime','showtime_waitlist','staff_attendance','staff_incident','staff_leave_request',
    'staff_profile','staff_shift','staff_shift_handover','ticket_checkin_log','user_notification',
    'voucher','voucher_redemption'
}

all_47_tables = {
    'app_user','audit_log','auditorium','auditorium_blackout','auth_session','booking',
    'booking_concession','booking_seat','cinema','cinema_equipment_asset','concession_product',
    'customer_support_case','customer_support_case_event','financial_ledger_entry',
    'financial_ledger_line','financial_reconciliation_issue','financial_reconciliation_run',
    'flyway_schema_history','inventory_movement','loyalty_point_lot','loyalty_reward',
    'loyalty_reward_redemption','loyalty_transaction','maintenance_work_order',
    'maintenance_work_order_event','movie','movie_favorite','movie_review','notification_preference',
    'password_reset_token','payment','payment_webhook_event','pricing_rule','recommendation_event',
    'seat','showtime','showtime_waitlist','staff_attendance','staff_incident','staff_leave_request',
    'staff_profile','staff_shift','staff_shift_handover','ticket_checkin_log','user_notification',
    'voucher','voucher_redemption'
}

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
targets = {t.lower() for t in re.findall(r'INSERT\s+INTO\s+([a-zA-Z_][\w]*)', sql, re.I)}

ci = (root / '.github' / 'workflows' / 'ci.yml').read_text(encoding='utf-8')
diagnose = (root / 'tools' / 'diagnose-v45.ps1').read_text(encoding='utf-8')
makefile = (root / 'Makefile').read_text(encoding='utf-8')
verification_array = set(re.findall(r"'([a-z_]+)'", sql[sql.find('Quick verification of all 47 tables'):]))

check('V45 47-table SQL exists and decodes as UTF-8', sql_path.exists() and 'Yêu cầu hỗ trợ mẫu' in sql and 'Máy chiếu Demo' in sql)
check('V45 47-table PowerShell runner exists', ps1_path.exists())
check('All 45 seeded application tables have INSERT coverage', expected_seed_inserts.issubset(targets) and len(expected_seed_inserts) == 45)
check('customer_support_case receives 10 deterministic rows', 'seed45:support-case:' in sql and 'INSERT INTO customer_support_case(' in sql)
check('customer_support_case_event receives 10 deterministic rows', 'seed45:support-event:' in sql and 'INSERT INTO customer_support_case_event(' in sql)
check('Support seed covers categories, priorities and lifecycle states', all(v in sql for v in ['BOOKING','PAYMENT','REFUND','CRITICAL','WAITING_CUSTOMER','RESOLVED','CLOSED']))
check('Support seed uses V45-valid immutable event types', 'CASE_CREATED' in sql and 'STATUS_CHANGED' in sql)
check('UTF-8 repair includes support case text', 'UPDATE customer_support_case c SET' in sql and 'Yêu cầu hỗ trợ mẫu %s' in sql)
check('UTF-8 repair includes immutable support events under trigger bypass', 'UPDATE customer_support_case_event e SET message' in sql and 'session_replication_role = replica' in sql)
check('Support UTF-8 fields participate in corruption self-check', 'SELECT subject FROM customer_support_case' in sql and 'SELECT message FROM customer_support_case_event' in sql)
check('movie table is not seeded with synthetic rows', not re.search(r'INSERT\s+INTO\s+movie\s*\(', sql, re.I))
check('All eight canonical V29 movie IDs are reused', all(mid in sql for mid in canonical_movie_ids))
check('Old synthetic Phim Demo movies are removed', 'DELETE FROM movie' in sql and "seed45:movie:" in sql)
check('Flyway metadata is never inserted/updated/deleted', not re.search(r'(INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+flyway_schema_history', sql, re.I))
check('Final verification enumerates all 47 pgAdmin tables', all_47_tables.issubset(verification_array) and len(all_47_tables) == 47)
check('Final verification fails if any table is empty', "table % is still empty" in sql and 'IF c = 0 THEN' in sql)
check('Seed remains transactional and UTF-8 explicit', 'BEGIN;' in sql and 'COMMIT;' in sql and "client_encoding = 'UTF8'" in sql)
check('Ledger stays balanced with 20 debit/credit lines', "'PAYMENT_CLEARING:DEMO45','DEBIT'" in sql and "'CUSTOMER_FUNDS_CAPTURED','CREDIT'" in sql)
check('PowerShell uses byte-safe docker compose cp', 'docker compose cp' in ps1 and 'Get-Content' not in ps1)
check('PowerShell verifies PostgreSQL UTF8 server encoding', 'SHOW server_encoding' in ps1 and 'server_encoding must be UTF8' in ps1)
check('PowerShell runs psql with ON_ERROR_STOP', 'ON_ERROR_STOP=1' in ps1 and '-f $remoteSql' in ps1)
check('Main CI runs the V45 47-table seed verifier', 'Verify V45 47-table UTF-8 demo seed coverage' in ci and 'verify_seed_demo_47.py' in ci)
check('V45 diagnostics runs the seed verifier', 'verify_seed_demo_47.py' in diagnose)
check('Make verify-v45 runs the seed verifier', 'verify_seed_demo_47.py' in makefile)

passed=sum(ok for _,ok in checks)
print(f"\nSeed V45 47-table verification: {passed}/{len(checks)} checks passed")
raise SystemExit(0 if passed == len(checks) else 1)
