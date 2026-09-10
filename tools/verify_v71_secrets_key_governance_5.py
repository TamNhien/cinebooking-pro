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

migration=text('backend/src/main/resources/db/migration/V71__secrets_key_governance.sql')
dtos=text('backend/src/main/java/com/cinebooking/keygovernance/KeyGovernanceDtos.java')
service=text('backend/src/main/java/com/cinebooking/keygovernance/KeyGovernanceService.java')
controller=text('backend/src/main/java/com/cinebooking/keygovernance/AdminKeyGovernanceController.java')
stepup=text('backend/src/main/java/com/cinebooking/identity/StepUpAuthorizationFilter.java')
stepup_service=text('backend/src/main/java/com/cinebooking/identity/StepUpAuthenticationService.java')
app=text('backend/src/main/resources/application.yml')
compose=text('docker-compose.yml')
env=text('.env.example')
admin=text('frontend/app/admin/page.tsx')
header=text('frontend/components/Header.tsx')
ui=text('frontend/app/admin/key-governance/page.tsx')
types=text('frontend/lib/types.ts')
e2e=text('frontend/e2e/secrets-key-governance-v71.spec.ts')
playwright=text('frontend/playwright.config.ts')
ci=text('.github/workflows/ci.yml')
make=text('Makefile')
release=text('scripts/release.ps1')
diag=text('tools/diagnose-v71.ps1')
readme=text('README.md')
itest=text('backend/src/test/java/com/cinebooking/integration/CineBookingIntegrationIT.java')
seed=text('tools/seed-demo-57-tables-10-rows.sql')
v70verify=text('tools/verify_v70_data_governance_privacy_5.py')
v69verify=text('tools/verify_v69_backup_disaster_recovery_5.py')
v68verify=text('tools/verify_v68_security_identity_5.py')

for rel,label in [
 ('backend/src/main/resources/db/migration/V71__secrets_key_governance.sql','V71 migration exists'),
 ('backend/src/main/java/com/cinebooking/keygovernance/KeyGovernanceDtos.java','V71 DTOs exist'),
 ('backend/src/main/java/com/cinebooking/keygovernance/KeyGovernanceService.java','V71 service exists'),
 ('backend/src/main/java/com/cinebooking/keygovernance/AdminKeyGovernanceController.java','V71 admin controller exists'),
 ('frontend/app/admin/key-governance/page.tsx','V71 Admin UI exists'),
 ('frontend/e2e/secrets-key-governance-v71.spec.ts','V71 browser E2E exists'),
 ('tools/diagnose-v71.ps1','V71 diagnose exists')]: check(label,exists(rel))

check('V71 strategy version explicit','V71-SECRETS-KEY-GOVERNANCE-5' in service and 'V71-SECRETS-KEY-GOVERNANCE-5' in ui and 'V71-SECRETS-KEY-GOVERNANCE-5' in readme)

# Migration
check('migration creates secret_rotation_policy','CREATE TABLE secret_rotation_policy' in migration)
check('migration creates secret_rotation_event','CREATE TABLE secret_rotation_event' in migration)
for col in ['policy_key VARCHAR(80)','secret_name VARCHAR(80)','secret_class VARCHAR(40)','owner_team VARCHAR(80)','rotation_days INTEGER','enabled BOOLEAN','auto_rotation_enabled BOOLEAN','required_when VARCHAR(200)','note VARCHAR(500)']:
    check('rotation policy has '+col.split()[0],col in migration)
check('rotation days bounded','rotation_days BETWEEN 1 AND 3650' in migration)
check('secret classes constrained',"secret_class IN ('AUTH','MAIL','PAYMENT','PUSH','INFRA')" in migration)
for col in ['event_key VARCHAR(80)','policy_id UUID','event_type VARCHAR(20)','actor_user_id UUID','provider_ref VARCHAR(160)','key_fingerprint VARCHAR(128)','note VARCHAR(1000)','occurred_at TIMESTAMPTZ','recorded_at TIMESTAMPTZ']:
    check('rotation event has '+col.split()[0],col in migration)
check('rotation event types constrained',"event_type IN ('ROTATED','VERIFIED','REVOKED','INCIDENT')" in migration)
check('fingerprint length constrained','BETWEEN 8 AND 128' in migration)
check('event policy FK restricts delete','REFERENCES secret_rotation_policy(id) ON DELETE RESTRICT' in migration)
check('event actor FK restricts delete','REFERENCES app_user(id) ON DELETE RESTRICT' in migration)
for idx in ['idx_secret_policy_enabled','idx_secret_policy_owner','idx_secret_event_policy_occurred','idx_secret_event_type_occurred','idx_secret_event_recorded']:
    check('V71 index '+idx,idx in migration)
for policy in ['JWT_SIGNING_SECRET','SMTP_APP_PASSWORD','VNPAY_HASH_SECRET','MOMO_SECRET_KEY','WEB_PUSH_VAPID_PRIVATE_KEY']:
    check('operational key policy '+policy,policy in migration)
check('seeded policies disable auto rotation','auto_rotation_enabled' in migration and migration.count(',false,')>=5)
check('migration seeds no rotation events','INSERT INTO secret_rotation_event' not in migration)
check('migration stores no JWT secret values','change-this' not in migration and 'Admin@123' not in migration)
check('migration stores no payment secret values','VNPAY_HASH_SECRET=' not in migration and 'MOMO_SECRET_KEY=' not in migration)
check('append-only trigger function exists','v71_secret_rotation_event_immutable' in migration)
check('append-only trigger exists','trg_v71_secret_rotation_event_immutable' in migration)
check('append-only trigger blocks update delete','BEFORE UPDATE OR DELETE ON secret_rotation_event' in migration)

# Backend / DTO
check('V71 service Spring Service','@Service' in service)
check('V71 service uses JdbcTemplate','JdbcTemplate' in service)
check('V71 service uses AuditService','AuditService' in service)
check('V71 service uses Environment only for presence','Environment environment' in service and 'environment.getProperty(property)' in service)
check('V71 event allowlist','EVENT_TYPES=List.of("ROTATED","VERIFIED","REVOKED","INCIDENT")' in service)
for k,p in [('JWT_SIGNING_SECRET','app.jwt.secret'),('SMTP_APP_PASSWORD','spring.mail.password'),('VNPAY_HASH_SECRET','app.payment.vnpay.hash-secret'),('MOMO_SECRET_KEY','app.payment.momo.secret-key'),('WEB_PUSH_VAPID_PRIVATE_KEY','app.pwa.web-push.vapid-private-key')]:
    check('secret property mapping '+k,k in service and p in service)
check('warning days default 14','app.key-governance.warning-days:14' in service)
check('warning days bounded 1-90','Math.max(1,Math.min(90,warningDays))' in service)
check('auto rotation runtime default false','app.key-governance.auto-rotation-execution-enabled:false' in service)
check('summary exposes dry-run only','!effectiveAutoRotation' in service and 'dryRunOnly' in dtos)
check('summary hard-gates auto rotation','autoRotationExecutionEnabled&&rows.stream().anyMatch' in service and 'x.autoRotationEnabled()' in service)
check('summary counts enabled policies','filter(SecretRotationPolicy::enabled)' in service)
check('summary counts configured secrets','x.enabled()&&x.configured()' in service)
check('summary counts no evidence','"NO_EVIDENCE".equals' in service)
check('summary counts due soon','"DUE_SOON".equals' in service)
check('summary counts overdue','"OVERDUE".equals' in service)
check('summary action required on overdue','overdue>0?"ACTION_REQUIRED"' in service)
check('summary review on due/no evidence','dueSoon>0||noEvidence>0?"REVIEW"' in service)
for policy in ['NO_SECRET_VALUES_IN_DATABASE','FINGERPRINTS_ONLY','APPEND_ONLY_ROTATION_EVIDENCE']:
    check('summary storage policy '+policy,policy in service)
check('policies derive latest rotated event',"event_type='ROTATED'" in service and 'max(e.occurred_at)' in service)
check('rotation status supports DISABLED','status="DISABLED"' in service)
check('rotation status supports NO_EVIDENCE','status="NO_EVIDENCE"' in service)
check('rotation status supports OVERDUE','status="OVERDUE"' in service)
check('rotation status supports DUE_SOON','status="DUE_SOON"' in service)
check('rotation status supports HEALTHY','status="HEALTHY"' in service)
check('event list bounded 1-100','Math.max(1,Math.min(100,requestedLimit))' in service)
check('record validates policy key','normalizePolicyKey(body.policyKey())' in service)
check('record validates event type','normalizeEventType(body.eventType())' in service)
check('record bounds provider ref','bounded(body.providerRef(),160' in service)
check('record bounds fingerprint','bounded(body.keyFingerprint(),128' in service)
check('record bounds note','bounded(body.note(),1000' in service)
check('fingerprint character allowlist','[A-Za-z0-9:._-]{8,128}' in service)
check('rotated verified require fingerprint','ROTATED/VERIFIED cần keyFingerprint' in service)
check('record requires enabled policy','where policy_key=? and enabled=true' in service)
check('record captures authenticated actor','findByEmailIgnoreCase(actorEmail)' in service)
check('record rejects future event','occurred.isAfter(Instant.now().plusSeconds(300))' in service)
check('event key generated server side','KEYEV-' in service and 'UUID.randomUUID()' in service)
check('record inserts evidence only','insert into secret_rotation_event' in service.lower())
check('record is audited','SECRET_ROTATION_EVIDENCE_RECORDED' in service)
check('configured returns boolean only','private boolean configured' in service)
check('configured never returns property value','return value!=null&&!value.isBlank()' in service)
check('DTO has no secret value field','secretValue' not in dtos and 'rawSecret' not in dtos and 'password' not in dtos.lower())
check('DTO exposes configured boolean','boolean configured' in dtos)
check('DTO exposes fingerprint evidence','String keyFingerprint' in dtos)
check('JDBC timestamps convert safely','Timestamp' in service and 'toInstant()' in service)

# API / step-up
check('V71 admin API namespace','@RequestMapping("/api/admin/key-governance")' in controller)
check('V71 GET summary','@GetMapping("/summary")' in controller)
check('V71 GET policies','@GetMapping("/policies")' in controller)
check('V71 GET events','@GetMapping("/events")' in controller)
check('V71 POST event','@PostMapping("/events")' in controller)
check('V71 write captures Admin','Authentication auth' in controller and 'auth.getName()' in controller)
check('V71 write captures proxied IP','X-Forwarded-For' in controller)
check('Step-up protects V71 mutations','/api/admin/key-governance' in stepup)
check('Protected action groups raised to eleven or later',any(x in stepup_service for x in ['PROTECTED_ACTION_GROUPS=11','PROTECTED_ACTION_GROUPS=12']))
check('V68 step-up strategy unchanged','V68-SECURITY-IDENTITY-5' in stepup_service)

# Config
check('application wires warning days','KEY_GOVERNANCE_WARNING_DAYS:14' in app)
check('application wires auto rotation off','KEY_GOVERNANCE_AUTO_ROTATION_EXECUTION_ENABLED:false' in app)
check('compose wires warning days','KEY_GOVERNANCE_WARNING_DAYS: ${KEY_GOVERNANCE_WARNING_DAYS:-14}' in compose)
check('compose wires auto rotation off','KEY_GOVERNANCE_AUTO_ROTATION_EXECUTION_ENABLED: ${KEY_GOVERNANCE_AUTO_ROTATION_EXECUTION_ENABLED:-false}' in compose)
check('env documents warning days','KEY_GOVERNANCE_WARNING_DAYS=14' in env)
check('env documents auto rotation off','KEY_GOVERNANCE_AUTO_ROTATION_EXECUTION_ENABLED=false' in env)
check('env warns governance stores fingerprints only','never stores secret values' in env)

# Frontend
for typ in ['SecretRotationPolicyV71','SecretRotationEventV71','KeyGovernanceSummaryV71']:
    check('frontend type '+typ,typ in types)
check('Admin Dashboard V71 tile','admin-key-governance-v71' in admin and 'Key Governance V71' in admin)
labels=['Command Center V53','Performance V54','Retention V55','Customer Value V56','Realtime Operations V59','Payment Production V60','Fraud & Risk V61','Dynamic Pricing V62','Recommendation V63','CRM & Marketing V64','Observability V65','Seat Operations V66','Payment Resilience V67','Security & Identity V68','Backup & DR V69','Privacy Governance V70','Key Governance V71']
check('Admin Dashboard versioned tiles ascend through V71',all(admin.index(a)<admin.index(b) for a,b in zip(labels,labels[1:])))
check('Header links V71 page','/admin/key-governance' in header and 'Key Governance V71' in header)
check('V71 UI root test id','key-governance-v71' in ui)
check('V71 UI summary test id','key-governance-summary-v71' in ui)
check('V71 UI policy panel','key-governance-policies-v71' in ui)
check('V71 UI evidence form','key-governance-evidence-form-v71' in ui)
check('V71 UI storage policy panel','key-governance-policy-v71' in ui)
check('V71 UI evidence table','key-governance-events-v71' in ui)
check('V71 UI requires ADMIN','me.role!=="ADMIN"' in ui)
check('V71 UI says no secret values','không lưu secret value' in ui or 'NO_SECRET_VALUES_IN_DATABASE' in ui)
check('V71 UI says auto rotation off','Auto-rotation execution mặc định OFF' in ui)
check('V71 UI links Step-up V68','/admin/security' in ui and 'Step-up V68' in ui)
check('V71 UI loads summary policies events','/admin/key-governance/summary' in ui and '/admin/key-governance/policies' in ui and '/admin/key-governance/events?limit=50' in ui)
check('V71 UI writes evidence endpoint','/admin/key-governance/events' in ui and 'method:"POST"' in ui)
check('V71 UI never asks for secret value','secretValue' not in ui and 'Nhập secret' not in ui)

# E2E
check('V71 E2E real admin env','E2E_ADMIN_EMAIL' in e2e and 'E2E_ADMIN_PASSWORD' in e2e)
check('V71 E2E verifies tile','admin-key-governance-v71' in e2e)
check('V71 E2E verifies ascending versions','sort((a,b)=>a-b)' in e2e and 'toBeGreaterThanOrEqual(71)' in e2e)
check('V71 E2E verifies strategy','V71-SECRETS-KEY-GOVERNANCE-5' in e2e)
check('V71 E2E verifies no secret storage policy','NO_SECRET_VALUES_IN_DATABASE' in e2e)
check('V71 E2E verifies auto rotation off','Auto-rotation execution mặc định OFF' in e2e)
check('V71 E2E rejects UI error banner','key-governance-error-v71' in e2e and 'toHaveCount(0)' in e2e)
check('Playwright loopback HTTPS remains','ignoreHTTPSErrors: ignoreLoopbackHttpsErrors' in playwright)

# Integration / compatibility
check('Integration expects Flyway >=71',any(x in itest for x in ['isGreaterThanOrEqualTo(71)','isGreaterThanOrEqualTo(72)']))
check('Integration expects at least 65 public tables',any(x in itest for x in ['publicTables).isGreaterThanOrEqualTo(65)','publicTables).isGreaterThanOrEqualTo(67)']))
check('Integration verifies two V71 tables','keyGovernanceV71Tables' in itest and 'isEqualTo(2)' in itest)
check('Integration verifies five V71 indexes','keyGovernanceV71Indexes' in itest and 'isEqualTo(5)' in itest)
check('Integration verifies five manual policies','keyGovernanceV71Policies' in itest and 'isGreaterThanOrEqualTo(5)' in itest)
check('Integration verifies immutable evidence trigger','keyGovernanceV71Triggers' in itest and 'isEqualTo(1)' in itest)
check('V70 verifier forward-compatible with V71+','72' in v70verify and '67' in v70verify)
check('V69 verifier forward-compatible with V71+','72' in v69verify and '67' in v69verify)
check('V68 verifier forward-compatible with V71+','72' in v68verify and '67' in v68verify)
check('V71 adds no synthetic seeded business rows','V71' not in seed)

# CI/tooling/docs/release
check('CI source regression names V71 or later',(m:=re.search(r'V26-V(\d+) source regression',ci)) is not None and int(m.group(1))>=71)
check('CI runs V71 verifier','verify_v71_secrets_key_governance_5.py' in ci)
check('Makefile verify-v71','verify-v71:' in make and 'verify_v71_secrets_key_governance_5.py' in make)
check('Makefile diagnose-v71','diagnose-v71:' in make and 'diagnose-v71.ps1' in make)
check('Makefile release-v71','release-v71:' in make and 'v71.0.0' in make)
check('Diagnose V71 chains V68-V71',all(x in diag for x in ['verify_v68_security_identity_5.py','verify_v69_backup_disaster_recovery_5.py','verify_v70_data_governance_privacy_5.py','verify_v71_secrets_key_governance_5.py']))
check('Diagnose states Flyway V71','Flyway V71' in diag)
check('Diagnose states 65 public tables','65 public tables' in diag)
check('Release preflight runs V71 verifier','verify_v71_secrets_key_governance_5.py' in release)
check('Release example is V71 or later stable',(m:=re.search(r'such as v(\d+)\.0\.0',release)) is not None and int(m.group(1))>=71)
check('Release remains stable-only','Pre-release tags are disabled' in release and '-rc.' not in release)
check('README current release V71 or later',(m:=re.search(r'Current release:\*\* V(\d+)|Current release: \*\*V(\d+)\*\*',readme)) is not None and int(next(g for g in m.groups() if g))>=71)
check('README title V71 or later',(m:=re.search(r'^# CineBooking Pro V(\d+)$',readme,re.M)) is not None and int(m.group(1))>=71)
check('README history includes V71','| **V71** |' in readme)
check('README V71 section','## V71 - Secrets & Key Governance 5.0' in readme)
check('README strategy','V71-SECRETS-KEY-GOVERNANCE-5' in readme)
check('README Flyway V71','Flyway latest: V71' in readme)
check('README 65 tables','Public tables: 65' in readme or '65 public tables' in readme)
check('README stable-only v71','Stable only: v71.0.0' in readme)
check('README has no concrete V71 RC tag','v71.0.0-rc.1' not in readme and 'v71.0.0-rc.2' not in readme)
check('README documents auto rotation off','KEY_GOVERNANCE_AUTO_ROTATION_EXECUTION_ENABLED=false' in readme)
check('README documents no secret values','không lưu hoặc trả secret value' in readme)
check('README preserves real-data policy','V52/V65/V66/V67/V68/V69/V70/V71' in readme and '**không tạo phim/khách/booking/payment giả**' in readme)

passed=sum(ok for _,ok in checks)
print(f"\nV71 verification: {passed}/{len(checks)} checks passed")
if passed!=len(checks):
    print('\nFailed checks:')
    for name,ok in checks:
        if not ok: print(' - '+name)
    sys.exit(1)
