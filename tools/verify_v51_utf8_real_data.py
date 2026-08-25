from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
checks = []


def text(rel):
    p = ROOT / rel
    return p.read_text(encoding='utf-8') if p.exists() else ''


def check(name, cond):
    ok = bool(cond)
    checks.append((name, ok))
    print(f"[ {'OK' if ok else 'FAIL'} ] {name}")

compose = text('docker-compose.yml')
nginx = text('infra/nginx/nginx.conf')
layout = text('frontend/app/layout.tsx')
controller = text('backend/src/main/java/com/cinebooking/analytics/AdminAnalyticsController.java')
app_yml = text('backend/src/main/resources/application.yml')
editorconfig = text('.editorconfig')
real_sql = text('tools/seed-v51-real-data.sql')
real_ps1 = text('tools/seed-v51-real-data.ps1')
check_sql = text('tools/check-v51-data-utf8.sql')
readme = text('README.md')
seed_fixture = text('tools/seed-demo-56-tables-10-rows.sql')

check('PostgreSQL init explicitly requests UTF8', 'POSTGRES_INITDB_ARGS' in compose and '--encoding=UTF8' in compose)
check('Backend JVM explicitly uses UTF-8', 'JAVA_TOOL_OPTIONS' in compose and '-Dfile.encoding=UTF-8' in compose)
check('Nginx declares UTF-8 charset', 'charset utf-8;' in nginx)
check('Frontend root document remains Vietnamese', '<html lang="vi">' in layout)
check('Analytics CSV HTTP response explicitly declares UTF-8', 'text/csv;charset=UTF-8' in controller)
check('Spring servlet response encoding is forced to UTF-8', 'charset: UTF-8' in app_yml and 'force: true' in app_yml)
check('Repository editor policy pins text files to UTF-8', 'charset = utf-8' in editorconfig)
check('V51 real-data refresh checks UTF8 server encoding', "server_encoding" in real_sql and "UTF8" in real_sql)
check('V51 real-data refresh reuses exactly the 8 existing V29 movie IDs', all(x in real_sql for x in [
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '88888888-8888-8888-8888-888888888888',
    '99999999-9999-9999-9999-999999999999',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'dddddddd-dddd-dddd-dddd-dddddddddddd']))
check('V51 real-data refresh does not insert movies/cinemas/products/bookings/payments', all(x not in real_sql.lower() for x in [
    'insert into movie', 'insert into cinema(', 'insert into concession_product', 'insert into booking(', 'insert into payment(']))
check('V51 real-data refresh derives analytics_snapshot from existing transactions', 'INSERT INTO analytics_snapshot' in real_sql and 'FROM payment pay' in real_sql and 'FROM booking_concession bc' in real_sql)
check('V51 real-data refresh never fabricates concession cost basis', 'INSERT INTO cinema_concession_cost_basis' not in real_sql)
check('Unknown concession cost remains nullable in real-data refresh', 'CASE WHEN bs.concession_units = bs.costed_units THEN bs.known_cost ELSE NULL END' in real_sql)
check('Real-data PowerShell copies SQL file byte-for-byte into PostgreSQL container', 'docker compose cp' in real_ps1 and 'psql -v ON_ERROR_STOP=1' in real_ps1)
check('Runtime UTF-8 checker validates Flyway V51-or-newer and at least 56 public tables', "latest_version::integer < 51" in check_sql and 'table_count < 56' in check_sql)
check('Runtime UTF-8 checker detects common mojibake markers', 'Possible mojibake/encoding corruption' in check_sql)
check('Runtime UTF-8 checker verifies analytics_snapshot is populated', 'analytics_snapshot is empty' in check_sql)
check('README states all commands run from the requested project root', r'D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui' in readme)
check('README contains no Set-Location command', 'Set-Location' not in readme)
check('README documents real-data V51 seed', 'seed-v51-real-data.ps1' in readme and 'check-v51-data-utf8.ps1' in readme)
check('Legacy deterministic 56-table fixture remains available only for CI/reference regression', bool(seed_fixture) and 'Quick verification of all 56 tables' in seed_fixture)

# Catch common source-level mojibake in key user-visible text/code files.
mojibake = ('Ã', 'Ä', 'Æ', 'áº', 'á»', 'ï¿½', '\ufffd')
key_files = [
    'README.md',
    'frontend/app/admin/analytics/page.tsx',
    'backend/src/main/resources/db/migration/V29__demo_movies_and_showtimes_september_2026.sql',
    'tools/seed-demo-56-tables-10-rows.sql',
]
bad = []
for rel in key_files:
    data = text(rel)
    if any(marker in data for marker in mojibake):
        bad.append(rel)
check('Key Vietnamese source files contain no common mojibake markers', not bad)

passed = sum(ok for _, ok in checks)
print(f"\nV51 UTF-8/real-data verification: {passed}/{len(checks)} checks passed")
if bad:
    print('Mojibake candidates: ' + ', '.join(bad))
raise SystemExit(0 if passed == len(checks) else 1)
