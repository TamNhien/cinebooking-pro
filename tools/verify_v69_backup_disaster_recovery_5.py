from pathlib import Path
import sys

ROOT=Path(__file__).resolve().parents[1]
checks=[]

def text(rel):
    p=ROOT/rel
    return p.read_text(encoding='utf-8') if p.exists() else ''
def exists(rel): return (ROOT/rel).exists()
def check(name,cond):
    ok=bool(cond); checks.append((name,ok)); print(f"[ {'OK' if ok else 'FAIL'} ] {name}")

migration=text('backend/src/main/resources/db/migration/V69__backup_disaster_recovery_evidence.sql')
dtos=text('backend/src/main/java/com/cinebooking/dr/DisasterRecoveryDtos.java')
service=text('backend/src/main/java/com/cinebooking/dr/DisasterRecoveryService.java')
controller=text('backend/src/main/java/com/cinebooking/dr/AdminDisasterRecoveryController.java')
stepup=text('backend/src/main/java/com/cinebooking/identity/StepUpAuthorizationFilter.java')
stepup_service=text('backend/src/main/java/com/cinebooking/identity/StepUpAuthenticationService.java')
app=text('backend/src/main/resources/application.yml')
compose=text('docker-compose.yml')
env=text('.env.example')
common=text('tools/dr-common-v69.ps1')
backup=text('tools/backup-dr-v69.ps1')
verify_backup=text('tools/verify-dr-backup-v69.ps1')
drill=text('tools/dr-restore-drill-v69.ps1')
diag=text('tools/diagnose-v69.ps1')
admin=text('frontend/app/admin/page.tsx')
header=text('frontend/components/Header.tsx')
ui=text('frontend/app/admin/disaster-recovery/page.tsx')
types=text('frontend/lib/types.ts')
e2e=text('frontend/e2e/backup-disaster-recovery-v69.spec.ts')
playwright=text('frontend/playwright.config.ts')
ci=text('.github/workflows/ci.yml')
make=text('Makefile')
release=text('scripts/release.ps1')
readme=text('README.md')
itest=text('backend/src/test/java/com/cinebooking/integration/CineBookingIntegrationIT.java')
seed=text('tools/seed-demo-57-tables-10-rows.sql')
v68verify=text('tools/verify_v68_security_identity_5.py')
v67verify=text('tools/verify_v67_payment_resilience_reconciliation.py')
v66verify=text('tools/verify_v66_booking_consistency_seat_locking.py')

for rel,label in [
 ('backend/src/main/resources/db/migration/V69__backup_disaster_recovery_evidence.sql','V69 migration exists'),
 ('backend/src/main/java/com/cinebooking/dr/DisasterRecoveryDtos.java','V69 DTOs exist'),
 ('backend/src/main/java/com/cinebooking/dr/DisasterRecoveryService.java','V69 service exists'),
 ('backend/src/main/java/com/cinebooking/dr/AdminDisasterRecoveryController.java','V69 admin controller exists'),
 ('tools/dr-common-v69.ps1','V69 DR common tool exists'),
 ('tools/backup-dr-v69.ps1','V69 backup tool exists'),
 ('tools/verify-dr-backup-v69.ps1','V69 backup verifier tool exists'),
 ('tools/dr-restore-drill-v69.ps1','V69 restore drill exists'),
 ('frontend/app/admin/disaster-recovery/page.tsx','V69 Admin UI exists'),
 ('frontend/e2e/backup-disaster-recovery-v69.spec.ts','V69 browser E2E exists'),
 ('tools/diagnose-v69.ps1','V69 diagnose exists')]: check(label,exists(rel))

check('V69 strategy version explicit','V69-BACKUP-DR-5' in service and 'V69-BACKUP-DR-5' in migration and 'V69-BACKUP-DR-5' in ui and 'V69-BACKUP-DR-5' in readme)

# Migration / evidence model
check('migration creates dr_backup_record','CREATE TABLE dr_backup_record' in migration)
check('migration creates dr_restore_drill','CREATE TABLE dr_restore_drill' in migration)
for col in ['backup_key VARCHAR(160)','storage_name VARCHAR(255)','checksum_sha256 CHAR(64)','size_bytes BIGINT','latest_flyway_version INTEGER','public_table_count INTEGER','source_commit VARCHAR(64)','created_at TIMESTAMPTZ','verified_at TIMESTAMPTZ','retention_until TIMESTAMPTZ','manifest_json JSONB']:
    check('backup evidence has '+col.split()[0],col in migration)
for col in ['drill_key VARCHAR(160)','backup_id UUID','status VARCHAR(16)','started_at TIMESTAMPTZ','completed_at TIMESTAMPTZ','restore_duration_seconds NUMERIC(12,3)','rpo_seconds BIGINT','restored_flyway_version INTEGER','restored_public_table_count INTEGER','checksum_verified BOOLEAN','critical_catalog_verified BOOLEAN','evidence_json JSONB']:
    check('drill evidence has '+col.split()[0],col in migration)
check('backup checksum constrained to lowercase SHA-256',"checksum_sha256 ~ '^[0-9a-f]{64}$'" in migration)
check('backup size must be positive','size_bytes > 0' in migration)
check('backup verified time follows created time','verified_at >= created_at' in migration)
check('drill status constrained to SUCCESS FAILED',"status IN ('SUCCESS','FAILED')" in migration)
check('successful drill requires checksum evidence','checksum_verified = true' in migration)
check('successful drill requires critical catalog','critical_catalog_verified = true' in migration)
check('drill backup FK restricts delete','REFERENCES dr_backup_record(id) ON DELETE RESTRICT' in migration)
for idx in ['idx_dr_backup_verified','idx_dr_backup_created','idx_dr_backup_retention','idx_dr_backup_checksum','idx_dr_drill_completed','idx_dr_drill_status_completed','idx_dr_drill_backup']:
    check('V69 index '+idx,idx in migration)
check('V69 append-only mutation blocker exists','v69_block_dr_evidence_mutation' in migration)
check('backup evidence immutable trigger exists','trg_v69_dr_backup_immutable' in migration)
check('drill evidence immutable trigger exists','trg_v69_dr_drill_immutable' in migration)
check('V69 migration has no synthetic INSERT','INSERT INTO' not in migration.upper())

# Backend service
check('V69 service is Spring Service','@Service' in service)
check('V69 service uses JdbcTemplate','JdbcTemplate' in service)
check('V69 summary exposes READY DEGRADED NO_DATA','"READY"' in service and '"DEGRADED"' in service and '"NO_DATA"' in service)
check('RPO target config default 60','app.disaster-recovery.rpo-target-minutes:60' in service)
check('RTO target config default 15','app.disaster-recovery.rto-target-minutes:15' in service)
check('backup retention config default 30','app.disaster-recovery.backup-retention-days:30' in service)
check('drill freshness config default 168','app.disaster-recovery.drill-max-age-hours:168' in service)
check('RPO target bounded','bound(rpoTargetMinutes,5,10080)' in service)
check('RTO target bounded','bound(rtoTargetMinutes,1,1440)' in service)
check('backup retention bounded','bound(backupRetentionDays,1,3650)' in service)
check('drill age bounded','bound(drillMaxAgeHours,1,8760)' in service)
check('summary counts verified backups','select count(*) from dr_backup_record' in service)
check('summary counts successful drills',"status='SUCCESS'" in service)
check('backup freshness compares age to RPO','backupAge<=rpoTargetMinutes' in service)
check('drill freshness compares age window','drillAge<=drillMaxAgeHours' in service)
check('RTO compares restore duration','restoreDurationSeconds()!=null' in service and 'rtoTargetMinutes*60.0' in service)
check('critical catalog includes booking','"booking"' in service)
check('critical catalog includes payment','"payment"' in service)
check('critical catalog includes seat_hold','"seat_hold"' in service)
check('critical catalog includes admin_step_up_grant','"admin_step_up_grant"' in service)
check('critical catalog includes DR tables','"dr_backup_record"' in service and '"dr_restore_drill"' in service)
check('backend DTO does not expose manifest JSON','manifestJson' not in dtos and 'evidenceJson' not in dtos)
check('backend DTO does not expose credential fields','password' not in dtos.lower() and 'secret' not in dtos.lower())
check('backup API list bounded 1-100','Math.max(1,Math.min(100,requestedLimit))' in service)
check('service converts JDBC timestamps safely','Timestamp' in service and 'toInstant()' in service)

# API / auth boundary
check('V69 admin API namespace','@RequestMapping("/api/admin/disaster-recovery")' in controller)
check('V69 summary GET endpoint','@GetMapping("/summary")' in controller)
check('V69 backups GET endpoint','@GetMapping("/backups")' in controller)
check('V69 drills GET endpoint','@GetMapping("/drills")' in controller)
check('V69 API remains read-only','@PostMapping' not in controller and '@PutMapping' not in controller and '@DeleteMapping' not in controller)
check('step-up future-protects disaster recovery writes','/api/admin/disaster-recovery' in stepup)
check('step-up protected group count raised to nine or later',any(x in stepup_service for x in ['PROTECTED_ACTION_GROUPS=9','PROTECTED_ACTION_GROUPS=10']))
check('V68 step-up mechanism remains strategy V68','V68-SECURITY-IDENTITY-5' in stepup_service)

# Config
check('application wires DR_RPO_TARGET_MINUTES','DR_RPO_TARGET_MINUTES:60' in app)
check('application wires DR_RTO_TARGET_MINUTES','DR_RTO_TARGET_MINUTES:15' in app)
check('application wires DR_BACKUP_RETENTION_DAYS','DR_BACKUP_RETENTION_DAYS:30' in app)
check('application wires DR_DRILL_MAX_AGE_HOURS','DR_DRILL_MAX_AGE_HOURS:168' in app)
for marker in ['DR_RPO_TARGET_MINUTES: ${DR_RPO_TARGET_MINUTES:-60}','DR_RTO_TARGET_MINUTES: ${DR_RTO_TARGET_MINUTES:-15}','DR_BACKUP_RETENTION_DAYS: ${DR_BACKUP_RETENTION_DAYS:-30}','DR_DRILL_MAX_AGE_HOURS: ${DR_DRILL_MAX_AGE_HOURS:-168}']:
    check('compose wires '+marker.split(':')[0],marker in compose)
for marker in ['DR_RPO_TARGET_MINUTES=60','DR_RTO_TARGET_MINUTES=15','DR_BACKUP_RETENTION_DAYS=30','DR_DRILL_MAX_AGE_HOURS=168']:
    check('env example documents '+marker.split('=')[0],marker in env)

# Host backup tooling
check('DR tools reuse V27 safe backup path','Get-SafeBackupInfo' in backup and 'Get-SafeBackupInfo' in verify_backup and 'Get-SafeBackupInfo' in drill)
check('backup tool requires live V69 schema','Assert-DrV69LiveSchema' in backup)
check('backup tool delegates pg_dump to hardened V27 script','backup-db.ps1' in backup)
check('backup tool creates metadata manifest','manifestVersion = 1' in backup and 'manifest.json' in common)
check('backup manifest writes UTF-8 without BOM','UTF8Encoding($false)' in backup)
check('backup tool records SHA-256','Get-FileHash' in backup and 'Algorithm SHA256' in backup)
check('backup tool records source commit','Get-DrGitCommit' in backup)
check('backup tool records Flyway version','latestFlywayVersion' in backup)
check('backup tool records public table count','publicTableCount' in backup)
check('backup tool records retention timestamp','retentionUntilUtc' in backup)
check('backup tool runs V69 verification before evidence insert','verify-dr-backup-v69.ps1' in backup and backup.index('verify-dr-backup-v69.ps1') < backup.index('insert into dr_backup_record'))
check('backup evidence insert is append-only insert','insert into dr_backup_record' in backup.lower() and 'update dr_backup_record' not in backup.lower())
check('retention only targets V69 dump filename pattern','cinebooking-v69-*.dump' in backup)
check('retention removes dump sidecars together','.sha256' in backup and '.manifest.json' in backup)
check('base backup verifier still checks pg_restore listing','verify-db-backup.ps1' in verify_backup)
check('V69 verifier compares manifest checksum','Manifest SHA-256 does not match archive' in verify_backup)
check('V69 verifier compares manifest file size','Manifest sizeBytes does not match archive' in verify_backup)
check('V69 verifier requires Flyway >=69','latestFlywayVersion -lt 69' in verify_backup)
check('V69 verifier requires at least 61 tables','publicTableCount -lt 61' in verify_backup)
check('V69 manifest whitelist prevents credential fields','$allowed' in verify_backup and 'unexpected fields' in verify_backup.lower())

# Restore drill safety
check('restore drill verifies backup first','verify-dr-backup-v69.ps1' in drill)
check('restore drill requires registered backup evidence','dr_backup_record' in drill and 'Backup evidence is not registered' in drill)
check('restore drill creates temporary database','createdb -T template0' in drill and 'cinebooking_drill_' in drill)
check('restore drill uses pg_restore exit-on-error','pg_restore' in drill and '--exit-on-error' in drill)
check('restore drill never calls live Invoke-DbRecreate','Invoke-DbRecreate' not in drill)
check('restore drill checks Flyway >=69','Restored Flyway version is below V69' in drill)
check('restore drill checks at least 61 tables','Restored public table count is below 61' in drill)
check('restore drill checks six critical tables',"critical -ne '6'" in drill)
check('restore drill measures duration','Stopwatch' in drill and 'Elapsed.TotalSeconds' in drill)
check('restore drill measures backup age RPO','rpoSeconds' in drill and 'backupCreated' in drill)
check('successful drill evidence is inserted','insert into dr_restore_drill' in drill.lower() and "'SUCCESS'" in drill)
check('failed drill evidence can be inserted',"'FAILED'" in drill and 'failed-drill evidence' in drill)
check('temporary drill database always cleanup in finally','finally' in drill and 'dropdb --force' in drill)
check('restore drill does not stop backend writers','docker compose stop' not in drill.lower() and 'backend-1' not in drill)

# Frontend / dashboard
check('frontend V69 backup type exists','DrBackupEvidenceV69' in types)
check('frontend V69 drill type exists','DrRestoreDrillEvidenceV69' in types)
check('frontend V69 summary type exists','DisasterRecoverySummaryV69' in types)
check('Admin Dashboard V69 tile exists','admin-disaster-recovery-v69' in admin and 'Backup & DR V69' in admin)
labels=['Command Center V53','Performance V54','Retention V55','Customer Value V56','Realtime Operations V59','Payment Production V60','Fraud & Risk V61','Dynamic Pricing V62','Recommendation V63','CRM & Marketing V64','Observability V65','Seat Operations V66','Payment Resilience V67','Security & Identity V68','Backup & DR V69']
check('Admin Dashboard versioned tiles ascend through V69',all(admin.index(a)<admin.index(b) for a,b in zip(labels,labels[1:])))
check('Header links V69 DR page','/admin/disaster-recovery' in header and 'Backup & DR V69' in header)
check('V69 UI root test id','disaster-recovery-v69' in ui)
check('V69 UI summary test id','disaster-recovery-summary-v69' in ui)
check('V69 UI backup health panel','dr-backup-health-v69' in ui)
check('V69 UI drill health panel','dr-drill-health-v69' in ui)
check('V69 UI evidence policy panel','dr-evidence-policy-v69' in ui)
check('V69 UI runbook panel','dr-runbook-v69' in ui)
check('V69 UI backup evidence table','dr-backups-v69' in ui)
check('V69 UI drill evidence table','dr-drills-v69' in ui)
check('V69 UI requires ADMIN role','me.role!=="ADMIN"' in ui)
check('V69 UI loads all three read endpoints','/admin/disaster-recovery/summary' in ui and '/admin/disaster-recovery/backups?limit=20' in ui and '/admin/disaster-recovery/drills?limit=20' in ui)
check('V69 UI does not expose host absolute backup path','FullPath' not in ui and 'D:\\' not in ui)

# E2E / Playwright
check('V69 E2E logs in as real admin','E2E_ADMIN_EMAIL' in e2e and 'E2E_ADMIN_PASSWORD' in e2e)
check('V69 E2E verifies tile','admin-disaster-recovery-v69' in e2e)
check('V69 E2E verifies version order forward-compatible','sort((a,b)=>a-b)' in e2e and ('toBeGreaterThanOrEqual(69)' in e2e or 'toBe(69)' in e2e))
check('V69 E2E verifies strategy','V69-BACKUP-DR-5' in e2e)
check('V69 E2E verifies append-only policy','APPEND-ONLY' in e2e)
check('V69 E2E rejects UI error banner','disaster-recovery-error-v69' in e2e and 'toHaveCount(0)' in e2e)
check('Playwright still supports loopback HTTPS mkcert','ignoreHTTPSErrors: ignoreLoopbackHttpsErrors' in playwright)

# Integration / historical forward compatibility
check('Integration expects Flyway >=69',any(x in itest for x in ['isGreaterThanOrEqualTo(69)','isGreaterThanOrEqualTo(70)']))
check('Integration expects at least 61 public tables',any(x in itest for x in ['publicTables).isGreaterThanOrEqualTo(61)','publicTables).isGreaterThanOrEqualTo(63)']))
check('Integration verifies two V69 tables','disasterRecoveryV69Tables' in itest and 'isEqualTo(2)' in itest)
check('Integration verifies seven V69 indexes','disasterRecoveryV69Indexes' in itest and 'isEqualTo(7)' in itest)
check('Integration verifies two immutable triggers','disasterRecoveryV69Triggers' in itest and 'isEqualTo(2)' in itest)
check('V68 verifier forward-compatible with V69 Flyway','isGreaterThanOrEqualTo(69)' in v68verify)
check('V68 verifier forward-compatible with 61 tables','isGreaterThanOrEqualTo(61)' in v68verify)
check('V67 verifier forward-compatible with V69 Flyway','isGreaterThanOrEqualTo(69)' in v67verify)
check('V67 verifier forward-compatible with 61 tables','isGreaterThanOrEqualTo(61)' in v67verify)
check('V66 verifier forward-compatible with V69 Flyway','isGreaterThanOrEqualTo(69)' in v66verify)
check('V66 verifier forward-compatible with 61 tables','isGreaterThanOrEqualTo(61)' in v66verify)
check('V69 adds no synthetic seed rows','V69' not in seed)

# CI / release / docs
check('CI source regression names V69 or later',any(x in ci for x in ['V26-V69 source regression','V26-V70 source regression']))
check('CI runs V69 verifier','verify_v69_backup_disaster_recovery_5.py' in ci)
check('Makefile exposes verify-v69','verify-v69:' in make and 'verify_v69_backup_disaster_recovery_5.py' in make)
check('Makefile exposes diagnose-v69','diagnose-v69:' in make)
check('Makefile exposes backup-v69','backup-v69:' in make and 'backup-dr-v69.ps1' in make)
check('Makefile exposes stable release-v69','release-v69:' in make and 'v69.0.0' in make)
check('Diagnose V69 chains V68','verify_v68_security_identity_5.py' in diag)
check('Diagnose V69 runs V69 verifier','verify_v69_backup_disaster_recovery_5.py' in diag)
check('Diagnose V69 states Flyway V69','Flyway V69' in diag)
check('Diagnose V69 states 61 public tables','61 public tables' in diag)
check('Release preflight runs V69 verifier','verify_v69_backup_disaster_recovery_5.py' in release)
check('Release remains stable-only','Pre-release tags are disabled' in release and '-rc.' not in release)
check('Release example is stable-only current version',any(x in release for x in ['such as v69.0.0','such as v70.0.0']))
check('README current release is V69 or later',any(x in readme for x in ['Current release:** V69','Current release: **V69**','Current release:** V70','Current release: **V70**']))
check('README title is V69 or later',any(x in readme for x in ['# CineBooking Pro V69','# CineBooking Pro V70']))
check('README history includes V69','| **V69** |' in readme)
check('README V69 section exists','## V69 - Backup & Disaster Recovery 5.0' in readme)
check('README documents 61 public tables','Public tables: 61' in readme or '61 public tables' in readme)
check('README documents Flyway V69','Flyway latest: V69' in readme)
check('README documents stable-only v69','Stable only: v69.0.0' in readme)
check('README has no concrete V69 RC tag','v69.0.0-rc.1' not in readme and 'v69.0.0-rc.2' not in readme)
check('README documents non-destructive restore drill','không overwrite database đang chạy' in readme)
check('README documents manifest has no credentials','không chứa credential' in readme)
check('README preserves real-data policy',any(x in readme for x in ['V52/V65/V66/V67/V68/V69 **không tạo phim/khách/booking/payment giả**','V52/V65/V66/V67/V68/V69/V70 **không tạo phim/khách/booking/payment giả**']))

passed=sum(ok for _,ok in checks)
print(f"\nV69 verification: {passed}/{len(checks)} checks passed")
if passed!=len(checks):
    print('\nFailed checks:')
    for name,ok in checks:
        if not ok: print(' - '+name)
    sys.exit(1)
