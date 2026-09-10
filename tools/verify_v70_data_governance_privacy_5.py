from pathlib import Path
import re
import sys

ROOT=Path(__file__).resolve().parents[1]
checks=[]

def text(rel):
    p=ROOT/rel
    return p.read_text(encoding='utf-8') if p.exists() else ''
def exists(rel): return (ROOT/rel).exists()
def check(name,cond):
    ok=bool(cond); checks.append((name,ok)); print(f"[ {'OK' if ok else 'FAIL'} ] {name}")

migration=text('backend/src/main/resources/db/migration/V70__data_governance_privacy.sql')
dtos=text('backend/src/main/java/com/cinebooking/privacy/PrivacyGovernanceDtos.java')
service=text('backend/src/main/java/com/cinebooking/privacy/PrivacyGovernanceService.java')
controller=text('backend/src/main/java/com/cinebooking/privacy/AdminPrivacyGovernanceController.java')
stepup=text('backend/src/main/java/com/cinebooking/identity/StepUpAuthorizationFilter.java')
stepup_service=text('backend/src/main/java/com/cinebooking/identity/StepUpAuthenticationService.java')
app=text('backend/src/main/resources/application.yml')
compose=text('docker-compose.yml')
env=text('.env.example')
admin=text('frontend/app/admin/page.tsx')
header=text('frontend/components/Header.tsx')
ui=text('frontend/app/admin/privacy-governance/page.tsx')
types=text('frontend/lib/types.ts')
e2e=text('frontend/e2e/data-governance-privacy-v70.spec.ts')
playwright=text('frontend/playwright.config.ts')
ci=text('.github/workflows/ci.yml')
make=text('Makefile')
release=text('scripts/release.ps1')
diag=text('tools/diagnose-v70.ps1')
readme=text('README.md')
itest=text('backend/src/test/java/com/cinebooking/integration/CineBookingIntegrationIT.java')
seed=text('tools/seed-demo-57-tables-10-rows.sql')
v69verify=text('tools/verify_v69_backup_disaster_recovery_5.py')
v68verify=text('tools/verify_v68_security_identity_5.py')

for rel,label in [
 ('backend/src/main/resources/db/migration/V70__data_governance_privacy.sql','V70 migration exists'),
 ('backend/src/main/java/com/cinebooking/privacy/PrivacyGovernanceDtos.java','V70 DTOs exist'),
 ('backend/src/main/java/com/cinebooking/privacy/PrivacyGovernanceService.java','V70 service exists'),
 ('backend/src/main/java/com/cinebooking/privacy/AdminPrivacyGovernanceController.java','V70 admin controller exists'),
 ('frontend/app/admin/privacy-governance/page.tsx','V70 Admin UI exists'),
 ('frontend/e2e/data-governance-privacy-v70.spec.ts','V70 browser E2E exists'),
 ('tools/diagnose-v70.ps1','V70 diagnose exists')]: check(label,exists(rel))

check('V70 strategy version explicit','V70-DATA-GOVERNANCE-PRIVACY-5' in service and 'V70-DATA-GOVERNANCE-PRIVACY-5' in ui and 'V70-DATA-GOVERNANCE-PRIVACY-5' in readme)

# Migration / governance model
check('migration creates data_retention_policy','CREATE TABLE data_retention_policy' in migration)
check('migration creates privacy_request','CREATE TABLE privacy_request' in migration)
for col in ['policy_key VARCHAR(80)','data_class VARCHAR(40)','table_name VARCHAR(80)','retention_days INTEGER','retention_action VARCHAR(20)','enabled BOOLEAN','destructive_execution_enabled BOOLEAN','note VARCHAR(500)']:
    check('retention policy has '+col.split()[0],col in migration)
check('retention days bounded','retention_days BETWEEN 1 AND 3650' in migration)
check('retention action constrained',"retention_action IN ('REVIEW','ANONYMIZE','DELETE')" in migration)
check('destructive execution rows constrained false','destructive_execution_enabled = false' in migration)
for policy in ['AUTH_SESSION','PASSWORD_RESET','USER_NOTIFICATION','SECURITY_ALERT','AUDIT_LOG']:
    check('operational policy '+policy,policy in migration)
check('migration labels policy defaults non-legal','not legal/compliance claims' in migration)
for col in ['request_key VARCHAR(80)','subject_user_id UUID','request_type VARCHAR(20)','status VARCHAR(20)','requested_by UUID','reviewed_by UUID','reason VARCHAR(500)','review_note VARCHAR(1000)','due_at TIMESTAMPTZ','reviewed_at TIMESTAMPTZ','completed_at TIMESTAMPTZ']:
    check('privacy request has '+col.split()[0],col in migration)
check('privacy request type constrained',"request_type IN ('EXPORT','ERASURE','RECTIFICATION')" in migration)
check('privacy request status constrained',"status IN ('OPEN','APPROVED','REJECTED','COMPLETED','CANCELLED')" in migration)
check('privacy request reason minimum','char_length(trim(reason)) >= 8' in migration)
check('privacy subject delete restricted','REFERENCES app_user(id) ON DELETE RESTRICT' in migration)
check('active duplicate request partial unique index','uq_privacy_request_active_subject_type' in migration and "status IN ('OPEN','APPROVED')" in migration)
for idx in ['idx_retention_policy_enabled','idx_retention_policy_action','idx_privacy_request_status_due','idx_privacy_request_subject_created','idx_privacy_request_requested_by']:
    check('V70 index '+idx,idx in migration)
check('V70 migration seeds no privacy requests','INSERT INTO privacy_request' not in migration)
check('V70 migration seeds no customer movie booking payment data',all(x not in migration for x in ['INSERT INTO app_user','INSERT INTO movie','INSERT INTO booking','INSERT INTO payment']))

# Backend service / DTO
check('V70 service Spring Service','@Service' in service)
check('V70 service uses JdbcTemplate','JdbcTemplate' in service)
check('V70 service uses AuditService','AuditService' in service)
check('V70 request type allowlist','REQUEST_TYPES=List.of("EXPORT","ERASURE","RECTIFICATION")' in service)
check('request SLA default 72','app.privacy.request-sla-hours:72' in service)
check('request SLA bounded 1-720','Math.max(1,Math.min(720,requestSlaHours))' in service)
check('retention execution config default false','app.privacy.retention-execution-enabled:false' in service)
check('summary exposes dry-run mode','effectiveRetentionExecution' in service and '!effectiveRetentionExecution' in service and 'dryRunOnly' in dtos)
check('summary counts policies','select count(*) from data_retention_policy' in service)
check('summary hard-gates destructive execution','destructive_execution_enabled=true' in service and 'retentionExecutionEnabled&&destructivePolicyCount>0' in service)
check('summary counts open requests',"status='OPEN'" in service)
check('summary counts approved requests',"status='APPROVED'" in service)
check('summary counts overdue requests','due_at < now()' in service)
check('privacy request list bounded 1-100','Math.max(1,Math.min(100,requestedLimit))' in service)
check('subject inventory normalizes email','normalizeEmail(rawEmail)' in service)
for table in ['app_user','booking','payment','auth_session','trusted_device','security_alert','user_notification','movie_favorite','movie_review','pwa_device']:
    check('subject inventory covers '+table,table in service)
check('subject inventory returns no destructive action','destructiveActionPerformed' in dtos and 'items,false' in service)
check('subject inventory counts payment through booking ownership','join booking b on b.id=p.booking_id where b.user_id=?' in service)
check('create validates reason bounds','reason.length()<8||reason.length()>500' in service)
check('create prevents duplicate active request',"status in ('OPEN','APPROVED')" in service)
check('request key generated server side','PRIV-' in service and 'UUID.randomUUID()' in service)
check('request due time uses SLA','requestSlaHours*3600L' in service)
check('create only inserts OPEN request',"'OPEN'" in service and 'insert into privacy_request' in service.lower())
check('create is audited','PRIVACY_REQUEST_CREATED' in service)
check('review allowlist','APPROVED","REJECTED","CANCELLED' in service)
check('review locks request row','for update' in service.lower())
check('review only allows OPEN','Only privacy request OPEN' in service or 'Chỉ privacy request OPEN' in service)
check('review is audited','PRIVACY_REQUEST_REVIEWED' in service)
check('DTO does not expose password hash','passwordHash' not in dtos and 'password_hash' not in dtos)
check('DTO does not expose refresh/push secrets','refreshToken' not in dtos and 'authSecret' not in dtos and 'p256dh' not in dtos)
check('JDBC timestamps convert safely','Timestamp' in service and 'toInstant()' in service)

# API / step-up
check('V70 admin API namespace','@RequestMapping("/api/admin/privacy-governance")' in controller)
for endpoint in ['/summary','/policies','/requests','/subject-inventory']:
    check('V70 GET endpoint '+endpoint,('@GetMapping("'+endpoint+'")' in controller) or (endpoint=='/requests' and '@GetMapping("/requests")' in controller))
check('V70 create POST endpoint','@PostMapping("/requests")' in controller)
check('V70 review POST endpoint','@PostMapping("/requests/{id}/review")' in controller)
check('V70 writes capture authenticated Admin','Authentication auth' in controller and 'auth.getName()' in controller)
check('V70 writes capture proxied IP','X-Forwarded-For' in controller)
check('Step-up protects V70 mutations','/api/admin/privacy-governance' in stepup)
check('Protected action groups raised to ten or later',any(x in stepup_service for x in ['PROTECTED_ACTION_GROUPS=10','PROTECTED_ACTION_GROUPS=11','PROTECTED_ACTION_GROUPS=12']))
check('V68 step-up strategy remains unchanged','V68-SECURITY-IDENTITY-5' in stepup_service)

# Config
check('application wires privacy SLA','PRIVACY_REQUEST_SLA_HOURS:72' in app)
check('application wires retention execution off','PRIVACY_RETENTION_EXECUTION_ENABLED:false' in app)
check('compose wires privacy SLA','PRIVACY_REQUEST_SLA_HOURS: ${PRIVACY_REQUEST_SLA_HOURS:-72}' in compose)
check('compose wires retention execution off','PRIVACY_RETENTION_EXECUTION_ENABLED: ${PRIVACY_RETENTION_EXECUTION_ENABLED:-false}' in compose)
check('env documents privacy SLA','PRIVACY_REQUEST_SLA_HOURS=72' in env)
check('env documents retention execution off','PRIVACY_RETENTION_EXECUTION_ENABLED=false' in env)

# Frontend
for typ in ['RetentionPolicyV70','PrivacyRequestV70','SubjectInventoryV70','PrivacyGovernanceSummaryV70']:
    check('frontend type '+typ,typ in types)
check('Admin Dashboard V70 tile','admin-privacy-governance-v70' in admin and 'Privacy Governance V70' in admin)
labels=['Command Center V53','Performance V54','Retention V55','Customer Value V56','Realtime Operations V59','Payment Production V60','Fraud & Risk V61','Dynamic Pricing V62','Recommendation V63','CRM & Marketing V64','Observability V65','Seat Operations V66','Payment Resilience V67','Security & Identity V68','Backup & DR V69','Privacy Governance V70']
check('Admin Dashboard versioned tiles ascend through V70',all(admin.index(a)<admin.index(b) for a,b in zip(labels,labels[1:])))
check('Header links V70 page','/admin/privacy-governance' in header and 'Privacy Governance V70' in header)
check('V70 UI root test id','privacy-governance-v70' in ui)
check('V70 UI summary test id','privacy-governance-summary-v70' in ui)
check('V70 UI subject inventory panel','privacy-subject-inventory-v70' in ui)
check('V70 UI request form','privacy-request-form-v70' in ui)
check('V70 UI retention policies','privacy-retention-policies-v70' in ui)
check('V70 UI request queue','privacy-requests-v70' in ui)
check('V70 UI requires ADMIN role','me.role!=="ADMIN"' in ui)
check('V70 UI shows dry-run only','DRY-RUN ONLY' in ui)
check('V70 UI states no automatic deletion','không thực thi data deletion tự động' in ui or 'không xóa, không anonymize' in ui)
check('V70 UI links Step-up V68','/admin/security' in ui and 'Step-up V68' in ui)
check('V70 UI loads summary policies requests','/admin/privacy-governance/summary' in ui and '/admin/privacy-governance/policies' in ui and '/admin/privacy-governance/requests?limit=50' in ui)
check('V70 UI inventory endpoint','/admin/privacy-governance/subject-inventory?email=' in ui)
check('V70 UI create endpoint','/admin/privacy-governance/requests' in ui and 'method:"POST"' in ui)
check('V70 UI review endpoint','/review' in ui and 'APPROVED' in ui and 'REJECTED' in ui)

# E2E
check('V70 E2E real admin env','E2E_ADMIN_EMAIL' in e2e and 'E2E_ADMIN_PASSWORD' in e2e)
check('V70 E2E verifies tile','admin-privacy-governance-v70' in e2e)
check('V70 E2E verifies ascending versions','sort((a,b)=>a-b)' in e2e and 'toBeGreaterThanOrEqual(70)' in e2e)
check('V70 E2E verifies strategy','V70-DATA-GOVERNANCE-PRIVACY-5' in e2e)
check('V70 E2E verifies dry-run','DRY-RUN ONLY' in e2e)
check('V70 E2E verifies destructive policies OFF','privacy-retention-policies-v70' in e2e and 'OFF' in e2e)
check('V70 E2E rejects UI error banner','privacy-governance-error-v70' in e2e and 'toHaveCount(0)' in e2e)
check('Playwright loopback HTTPS support remains','ignoreHTTPSErrors: ignoreLoopbackHttpsErrors' in playwright)

# Integration / compatibility
check('Integration expects Flyway >=70',any(x in itest for x in ['isGreaterThanOrEqualTo(70)','isGreaterThanOrEqualTo(71)','isGreaterThanOrEqualTo(72)']))
check('Integration expects at least 63 public tables',any(x in itest for x in ['publicTables).isGreaterThanOrEqualTo(63)','publicTables).isGreaterThanOrEqualTo(65)','publicTables).isGreaterThanOrEqualTo(67)']))
check('Integration verifies two V70 tables','privacyV70Tables' in itest and 'isEqualTo(2)' in itest)
check('Integration verifies six V70 indexes','privacyV70Indexes' in itest and 'isEqualTo(6)' in itest)
check('Integration verifies retention policies non-destructive','privacyV70Policies' in itest and 'destructive_execution_enabled=false' in itest)
check('V69 verifier forward-compatible with V70',any(x in v69verify for x in ['isGreaterThanOrEqualTo(70)','isGreaterThanOrEqualTo(71)','isGreaterThanOrEqualTo(72)']) and any(x in v69verify for x in ['63','65']))
check('V68 verifier forward-compatible with V70',any(x in v68verify for x in ['70','71']) and any(x in v68verify for x in ['63','65']))
check('V70 adds no synthetic seeded business rows','V70' not in seed)

# CI / tooling / release / docs
check('CI source regression names V70 or later',(m:=re.search(r'V26-V(\d+) source regression',ci)) is not None and int(m.group(1))>=70)
check('CI runs V70 verifier','verify_v70_data_governance_privacy_5.py' in ci)
check('Makefile verify-v70','verify-v70:' in make and 'verify_v70_data_governance_privacy_5.py' in make)
check('Makefile diagnose-v70','diagnose-v70:' in make and 'diagnose-v70.ps1' in make)
check('Makefile release-v70','release-v70:' in make and 'v70.0.0' in make)
check('Diagnose V70 chains V68 V69 V70','verify_v68_security_identity_5.py' in diag and 'verify_v69_backup_disaster_recovery_5.py' in diag and 'verify_v70_data_governance_privacy_5.py' in diag)
check('Diagnose states Flyway V70','Flyway V70' in diag)
check('Diagnose states 63 public tables','63 public tables' in diag)
check('Release preflight runs V70 verifier','verify_v70_data_governance_privacy_5.py' in release)
check('Release example is V70 or later stable',(m:=re.search(r'such as v(\d+)\.0\.0',release)) is not None and int(m.group(1))>=70)
check('Release remains stable-only','Pre-release tags are disabled' in release and '-rc.' not in release)
check('README current release V70 or later',(m:=re.search(r'Current release:\*\* V(\d+)|Current release: \*\*V(\d+)\*\*',readme)) is not None and int(next(g for g in m.groups() if g))>=70)
check('README title V70 or later',(m:=re.search(r'^# CineBooking Pro V(\d+)$',readme,re.M)) is not None and int(m.group(1))>=70)
check('README history includes V70','| **V70** |' in readme)
check('README V70 section','## V70 - Data Governance & Privacy 5.0' in readme)
check('README strategy','V70-DATA-GOVERNANCE-PRIVACY-5' in readme)
check('README Flyway V70','Flyway latest: V70' in readme)
check('README 63 tables','Public tables: 63' in readme or '63 public tables' in readme)
check('README stable-only v70','Stable only: v70.0.0' in readme)
check('README has no concrete V70 RC tag','v70.0.0-rc.1' not in readme and 'v70.0.0-rc.2' not in readme)
check('README documents destructive execution off','PRIVACY_RETENTION_EXECUTION_ENABLED=false' in readme)
check('README says retention defaults are not compliance claims','không phải tuyên bố đáp ứng bất kỳ luật/quy chuẩn cụ thể nào' in readme)
check('README preserves real-data policy','V52/V65/V66/V67/V68/V69/V70' in readme and '**không tạo phim/khách/booking/payment giả**' in readme)

passed=sum(ok for _,ok in checks)
print(f"\nV70 verification: {passed}/{len(checks)} checks passed")
if passed!=len(checks):
    print('\nFailed checks:')
    for name,ok in checks:
        if not ok: print(' - '+name)
    sys.exit(1)
