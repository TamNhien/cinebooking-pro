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

migration=text('backend/src/main/resources/db/migration/V72__software_supply_chain_integrity.sql')
dtos=text('backend/src/main/java/com/cinebooking/supplychain/SupplyChainDtos.java')
service=text('backend/src/main/java/com/cinebooking/supplychain/SupplyChainService.java')
controller=text('backend/src/main/java/com/cinebooking/supplychain/AdminSupplyChainController.java')
stepup=text('backend/src/main/java/com/cinebooking/identity/StepUpAuthorizationFilter.java')
stepup_service=text('backend/src/main/java/com/cinebooking/identity/StepUpAuthenticationService.java')
app=text('backend/src/main/resources/application.yml')
compose=text('docker-compose.yml')
env=text('.env.example')
admin=text('frontend/app/admin/page.tsx')
header=text('frontend/components/Header.tsx')
ui=text('frontend/app/admin/supply-chain/page.tsx')
types=text('frontend/lib/types.ts')
e2e=text('frontend/e2e/software-supply-chain-v72.spec.ts')
playwright=text('frontend/playwright.config.ts')
ci=text('.github/workflows/ci.yml')
make=text('Makefile')
release=text('scripts/release.ps1')
diag=text('tools/diagnose-v72.ps1')
readme=text('README.md')
itest=text('backend/src/test/java/com/cinebooking/integration/CineBookingIntegrationIT.java')
seed=text('tools/seed-demo-57-tables-10-rows.sql')
inventory_tool=text('tools/generate_supply_chain_inventory_v72.py')
eslint_config=text('frontend/eslint.config.mjs')
frontend_package=text('frontend/package.json')
operations_control=text('frontend/app/admin/operations-control/page.tsx')
offline_tickets=text('frontend/app/offline-tickets/page.tsx')
staff_operations=text('frontend/app/staff/operations/page.tsx')
v71=text('tools/verify_v71_secrets_key_governance_5.py')
v70=text('tools/verify_v70_data_governance_privacy_5.py')
v69=text('tools/verify_v69_backup_disaster_recovery_5.py')
v68=text('tools/verify_v68_security_identity_5.py')

for rel,label in [
 ('backend/src/main/resources/db/migration/V72__software_supply_chain_integrity.sql','V72 migration exists'),
 ('backend/src/main/java/com/cinebooking/supplychain/SupplyChainDtos.java','V72 DTOs exist'),
 ('backend/src/main/java/com/cinebooking/supplychain/SupplyChainService.java','V72 service exists'),
 ('backend/src/main/java/com/cinebooking/supplychain/AdminSupplyChainController.java','V72 admin controller exists'),
 ('frontend/app/admin/supply-chain/page.tsx','V72 Admin UI exists'),
 ('frontend/e2e/software-supply-chain-v72.spec.ts','V72 browser E2E exists'),
 ('tools/diagnose-v72.ps1','V72 diagnose exists'),
 ('tools/generate_supply_chain_inventory_v72.py','V72 dependency inventory tool exists')]: check(label,exists(rel))

check('V72 strategy version explicit','V72-SUPPLY-CHAIN-INTEGRITY-5' in service and 'V72-SUPPLY-CHAIN-INTEGRITY-5' in ui and 'V72-SUPPLY-CHAIN-INTEGRITY-5' in readme)

# V72 lint-clean follow-up: zero-warning policy and stale generated-file hygiene.
check('Frontend lint enforces zero warnings','eslint . --max-warnings=0' in frontend_package)
check('Hard-navigation compatibility policy is explicit','@next/next/no-location-assign-relative-destination' in eslint_config and '"off"' in eslint_config)
check('Stale Header.js duplicate is absent',not exists('frontend/components/Header.js'))
check('Stale exhaustive-deps line suppressions removed','eslint-disable-next-line react-hooks/exhaustive-deps' not in operations_control and 'eslint-disable-next-line react-hooks/exhaustive-deps' not in offline_tickets)
check('Staff operations documents bounded websocket dependencies','react-hooks/exhaustive-deps' in staff_operations.splitlines()[0] and 'cinemaId' in staff_operations.splitlines()[0])
check('Operations control realtime effect depends on full me snapshot','},[me]);' in operations_control)
check('Operations control polling effect depends on full data snapshot','},[autoRefresh,data]);' in operations_control)

# Migration
check('migration creates software_artifact_evidence','CREATE TABLE software_artifact_evidence' in migration)
check('migration creates software_supply_chain_scan','CREATE TABLE software_supply_chain_scan' in migration)
for col in ['artifact_key VARCHAR(100)','artifact_type VARCHAR(40)','version_label VARCHAR(80)','sha256 VARCHAR(64)','source_commit VARCHAR(64)','build_ref VARCHAR(160)','sbom_ref VARCHAR(200)','actor_user_id UUID','artifact_created_at TIMESTAMPTZ','recorded_at TIMESTAMPTZ']:
    check('artifact evidence has '+col.split()[0],col in migration)
check('artifact types constrained',"artifact_type IN ('BACKEND_JAR','FRONTEND_BUNDLE','CONTAINER_IMAGE','DEPENDENCY_INVENTORY')" in migration)
check('artifact SHA-256 constrained',"sha256 ~ '^[a-f0-9]{64}$'" in migration)
check('artifact actor delete restricted','REFERENCES app_user(id) ON DELETE RESTRICT' in migration)
for col in ['scan_key VARCHAR(100)','artifact_id UUID','scanner VARCHAR(80)','scanner_version VARCHAR(80)','report_fingerprint VARCHAR(128)','critical_count INTEGER','high_count INTEGER','medium_count INTEGER','low_count INTEGER','decision VARCHAR(16)','scanned_at TIMESTAMPTZ','recorded_at TIMESTAMPTZ']:
    check('scan evidence has '+col.split()[0],col in migration)
check('scan artifact FK restricts delete','REFERENCES software_artifact_evidence(id) ON DELETE RESTRICT' in migration)
check('scan severity counts nonnegative','critical_count >= 0 AND high_count >= 0 AND medium_count >= 0 AND low_count >= 0' in migration)
check('scan decision constrained',"decision IN ('PASS','WARN','FAIL')" in migration)
check('report fingerprint length constrained','BETWEEN 8 AND 128' in migration)
for idx in ['idx_software_artifact_recorded','idx_software_artifact_type_created','idx_software_artifact_version','idx_supply_chain_scan_artifact_scanned','idx_supply_chain_scan_decision_scanned','idx_supply_chain_scan_recorded']:
    check('V72 index '+idx,idx in migration)
check('V72 append-only function exists','v72_supply_chain_evidence_immutable' in migration)
check('artifact append-only trigger exists','trg_v72_software_artifact_immutable' in migration)
check('scan append-only trigger exists','trg_v72_supply_chain_scan_immutable' in migration)
check('artifact trigger blocks update delete','BEFORE UPDATE OR DELETE ON software_artifact_evidence' in migration)
check('scan trigger blocks update delete','BEFORE UPDATE OR DELETE ON software_supply_chain_scan' in migration)
check('migration seeds no artifact evidence','INSERT INTO software_artifact_evidence' not in migration)
check('migration seeds no scan evidence','INSERT INTO software_supply_chain_scan' not in migration)
check('migration stores no credential values','JWT_SECRET=' not in migration and 'MAIL_PASSWORD=' not in migration and 'MOMO_SECRET_KEY=' not in migration)

# Backend
check('V72 service Spring Service','@Service' in service)
check('V72 service uses JdbcTemplate','JdbcTemplate' in service)
check('V72 service uses AuditService','AuditService' in service)
check('artifact allowlist explicit','ARTIFACT_TYPES=List.of("BACKEND_JAR","FRONTEND_BUNDLE","CONTAINER_IMAGE","DEPENDENCY_INVENTORY")' in service)
check('evidence max age default 168','app.supply-chain.evidence-max-age-hours:168' in service)
check('evidence max age bounded','Math.max(1,Math.min(24*90,evidenceMaxAgeHours))' in service)
check('critical threshold default zero','app.supply-chain.max-critical:0' in service)
check('high threshold default zero','app.supply-chain.max-high:0' in service)
check('release enforcement default false','app.supply-chain.release-gate-enforcement-enabled:false' in service)
check('summary advisory-only default','!releaseGateEnforcementEnabled' in service and 'advisoryOnly' in dtos)
check('summary counts artifacts','select count(*) from software_artifact_evidence' in service)
check('summary counts scans','select count(*) from software_supply_chain_scan' in service)
check('summary counts failed scans',"decision='FAIL'" in service)
check('summary counts warning scans',"decision='WARN'" in service)
check('summary computes evidence freshness','Instant.now().minusSeconds(evidenceMaxAgeHours*3600L)' in service)
check('summary supports NO_EVIDENCE','posture="NO_EVIDENCE"' in service)
check('summary supports ACTION_REQUIRED','posture="ACTION_REQUIRED"' in service)
check('summary supports REVIEW','posture="REVIEW"' in service)
check('summary supports READY','posture="READY"' in service)
for policy in ['DIGESTS_ONLY','NO_ARTIFACT_BINARY_IN_DATABASE','NO_SCANNER_REPORT_BODY_IN_DATABASE','APPEND_ONLY_EVIDENCE']:
    check('summary evidence policy '+policy,policy in service)
check('artifact list bounded 1-100','Math.max(1,Math.min(100,requestedLimit))' in service)
check('artifact record validates type','normalizeArtifactType(body.artifactType())' in service)
check('artifact record validates SHA-256','sha.matches("[a-f0-9]{64}")' in service)
check('artifact source commit allowlist','[A-Fa-f0-9]{7,64}' in service)
check('artifact fields bounded','bounded(body.buildRef(),160' in service and 'bounded(body.sbomRef(),200' in service and 'bounded(body.note(),1000' in service)
check('artifact future timestamp rejected','rejectFuture(created,"artifactCreatedAt")' in service)
check('artifact key generated server side','ART-' in service and 'UUID.randomUUID()' in service)
check('artifact insert stores metadata only','insert into software_artifact_evidence' in service.lower())
check('artifact evidence audited','SUPPLY_CHAIN_ARTIFACT_RECORDED' in service)
check('scan requires artifact id','body.artifactId()==null' in service)
check('scan scanner required','required(body.scanner(),80' in service)
check('scan report fingerprint required','required(body.reportFingerprint(),128' in service)
check('scan fingerprint character allowlist','[A-Za-z0-9:._-]{8,128}' in service)
check('scan severity counts validated','validateCount(body.criticalCount()' in service and 'validateCount(body.highCount()' in service)
check('scan verifies artifact exists','select id from software_artifact_evidence where id=?' in service)
check('scan decision computed server side','body.criticalCount()>maxCritical||body.highCount()>maxHigh?"FAIL":body.mediumCount()>0?"WARN":"PASS"' in service)
check('scan future timestamp rejected','rejectFuture(scanned,"scannedAt")' in service)
check('scan key generated server side','SCAN-' in service)
check('scan evidence audited','SUPPLY_CHAIN_SCAN_RECORDED' in service)
check('DTO excludes artifact binary','byte[]' not in dtos and 'artifactBinary' not in dtos)
check('DTO excludes scanner report body','reportBody' not in dtos and 'scannerReport' not in dtos)
check('DTO exposes digest only','String sha256' in dtos)
check('DTO exposes severity counters','int criticalCount' in dtos and 'int highCount' in dtos and 'int mediumCount' in dtos and 'int lowCount' in dtos)
check('JDBC timestamps convert safely','Timestamp' in service and 'toInstant()' in service)

# API + step-up
check('V72 admin API namespace','@RequestMapping("/api/admin/supply-chain")' in controller)
check('V72 GET summary','@GetMapping("/summary")' in controller)
check('V72 GET artifacts','@GetMapping("/artifacts")' in controller)
check('V72 GET scans','@GetMapping("/scans")' in controller)
check('V72 POST artifact','@PostMapping("/artifacts")' in controller)
check('V72 POST scan','@PostMapping("/scans")' in controller)
check('V72 writes capture Admin','Authentication auth' in controller and 'auth.getName()' in controller)
check('V72 writes capture proxied IP','X-Forwarded-For' in controller)
check('Step-up protects V72 mutations','/api/admin/supply-chain' in stepup)
check('Protected action groups raised to twelve','PROTECTED_ACTION_GROUPS=12' in stepup_service)
check('V68 step-up strategy unchanged','V68-SECURITY-IDENTITY-5' in stepup_service)

# Config
for token in ['SUPPLY_CHAIN_EVIDENCE_MAX_AGE_HOURS:168','SUPPLY_CHAIN_MAX_CRITICAL:0','SUPPLY_CHAIN_MAX_HIGH:0','SUPPLY_CHAIN_RELEASE_GATE_ENFORCEMENT_ENABLED:false']:
    check('application wires '+token.split(':')[0],token in app)
for token in ['SUPPLY_CHAIN_EVIDENCE_MAX_AGE_HOURS: ${SUPPLY_CHAIN_EVIDENCE_MAX_AGE_HOURS:-168}','SUPPLY_CHAIN_MAX_CRITICAL: ${SUPPLY_CHAIN_MAX_CRITICAL:-0}','SUPPLY_CHAIN_MAX_HIGH: ${SUPPLY_CHAIN_MAX_HIGH:-0}','SUPPLY_CHAIN_RELEASE_GATE_ENFORCEMENT_ENABLED: ${SUPPLY_CHAIN_RELEASE_GATE_ENFORCEMENT_ENABLED:-false}']:
    check('compose wires '+token.split(':')[0],token in compose)
for token in ['SUPPLY_CHAIN_EVIDENCE_MAX_AGE_HOURS=168','SUPPLY_CHAIN_MAX_CRITICAL=0','SUPPLY_CHAIN_MAX_HIGH=0','SUPPLY_CHAIN_RELEASE_GATE_ENFORCEMENT_ENABLED=false']:
    check('env documents '+token.split('=')[0],token in env)

# Frontend
for typ in ['SoftwareArtifactEvidenceV72','SoftwareSupplyChainScanV72','SupplyChainSummaryV72']:
    check('frontend type '+typ,typ in types)
check('Admin Dashboard V72 tile','admin-supply-chain-v72' in admin and 'Supply Chain V72' in admin)
labels=['Command Center V53','Performance V54','Retention V55','Customer Value V56','Realtime Operations V59','Payment Production V60','Fraud & Risk V61','Dynamic Pricing V62','Recommendation V63','CRM & Marketing V64','Observability V65','Seat Operations V66','Payment Resilience V67','Security & Identity V68','Backup & DR V69','Privacy Governance V70','Key Governance V71','Supply Chain V72']
check('Admin Dashboard versioned tiles ascend through V72',all(admin.index(a)<admin.index(b) for a,b in zip(labels,labels[1:])))
check('Header links V72 page','/admin/supply-chain' in header and 'Supply Chain V72' in header)
check('V72 UI root test id','supply-chain-v72' in ui)
check('V72 UI summary test id','supply-chain-summary-v72' in ui)
check('V72 UI policy panel','supply-chain-policy-v72' in ui)
check('V72 UI artifact form','supply-chain-artifact-form-v72' in ui)
check('V72 UI scan form','supply-chain-scan-form-v72' in ui)
check('V72 UI artifact table','supply-chain-artifacts-v72' in ui)
check('V72 UI scan table','supply-chain-scans-v72' in ui)
check('V72 UI requires ADMIN','me.role!=="ADMIN"' in ui)
check('V72 UI says digest only','DIGESTS_ONLY' in ui)
check('V72 UI says no automatic release block','V72 mặc định không tự chặn release' in ui)
check('V72 UI links Step-up V68','/admin/security' in ui and 'Step-up V68' in ui)
check('V72 UI links Key Governance V71','/admin/key-governance' in ui and 'Key Governance V71' in ui)
check('V72 UI loads three read endpoints','/admin/supply-chain/summary' in ui and '/admin/supply-chain/artifacts?limit=50' in ui and '/admin/supply-chain/scans?limit=50' in ui)
check('V72 UI writes both evidence endpoints','/admin/supply-chain/artifacts' in ui and '/admin/supply-chain/scans' in ui and ui.count('method:"POST"')>=2)
check('V72 UI does not accept scan decision','decision:' not in ui.split('JSON.stringify({artifactId',1)[-1].split('})',1)[0])

# Offline dependency inventory
check('inventory tool uses stdlib only','urllib' not in inventory_tool and 'requests' not in inventory_tool)
check('inventory reads Maven pom','backend/pom.xml' in inventory_tool)
check('inventory reads npm manifest or lockfile','frontend/package.json' in inventory_tool and 'frontend/package-lock.json' in inventory_tool)
check('inventory emits V72 strategy','V72-SUPPLY-CHAIN-INTEGRITY-5' in inventory_tool)
check('inventory emits SHA-256 sidecar','hashlib.sha256' in inventory_tool and '.json.sha256' in inventory_tool)
check('inventory captures Git source commit','git' in inventory_tool and 'rev-parse' in inventory_tool)
check('inventory labels Maven coverage as direct','direct dependencies declared in backend/pom.xml' in inventory_tool)
check('inventory labels npm coverage honestly','resolved packages from frontend/package-lock.json' in inventory_tool and 'package-lock.json not shipped' in inventory_tool)
check('CI generates V72 dependency inventory','generate_supply_chain_inventory_v72.py --output-dir build/supply-chain-v72' in ci)
check('CI uploads V72 dependency inventory','cinebooking-v72-dependency-inventory' in ci and 'actions/upload-artifact@v4' in ci)
check('Makefile inventory-v72 target','inventory-v72:' in make and 'generate_supply_chain_inventory_v72.py' in make)

# E2E
check('V72 E2E real admin env','E2E_ADMIN_EMAIL' in e2e and 'E2E_ADMIN_PASSWORD' in e2e)
check('V72 E2E verifies tile','admin-supply-chain-v72' in e2e)
check('V72 E2E verifies ascending versions','sort((a,b)=>a-b)' in e2e and 'toBe(72)' in e2e)
check('V72 E2E verifies strategy','V72-SUPPLY-CHAIN-INTEGRITY-5' in e2e)
check('V72 E2E verifies digest policy','DIGESTS_ONLY' in e2e)
check('V72 E2E verifies advisory release gate','V72 mặc định không tự chặn release' in e2e)
check('V72 E2E rejects UI error banner','supply-chain-error-v72' in e2e and 'toHaveCount(0)' in e2e)
check('Playwright loopback HTTPS remains','ignoreHTTPSErrors: ignoreLoopbackHttpsErrors' in playwright)

# Integration + compatibility
check('Integration expects Flyway >=72','isGreaterThanOrEqualTo(72)' in itest)
check('Integration expects at least 67 public tables','publicTables).isGreaterThanOrEqualTo(67)' in itest)
check('Integration verifies two V72 tables','supplyChainV72Tables' in itest and 'isEqualTo(2)' in itest)
check('Integration verifies six V72 indexes','supplyChainV72Indexes' in itest and 'isEqualTo(6)' in itest)
check('Integration verifies two V72 triggers','supplyChainV72Triggers' in itest and 'isEqualTo(2)' in itest)
check('V71 verifier forward-compatible with V72','72' in v71 and '67' in v71)
check('V70 verifier forward-compatible with V72','72' in v70 and '67' in v70)
check('V69 verifier forward-compatible with V72','72' in v69 and '67' in v69)
check('V68 verifier forward-compatible with V72','72' in v68 and '67' in v68)
check('V72 adds no synthetic seeded business rows','V72' not in seed)

# CI/tooling/docs/release
check('CI source regression names V72','V26-V72 source regression' in ci)
check('CI runs V72 verifier','verify_v72_software_supply_chain_5.py' in ci)
check('Makefile verify-v72','verify-v72:' in make and 'verify_v72_software_supply_chain_5.py' in make)
check('Makefile diagnose-v72','diagnose-v72:' in make and 'diagnose-v72.ps1' in make)
check('Makefile release-v72','release-v72:' in make and 'v72.0.0' in make)
check('Diagnose V72 chains V68-V72',all(x in diag for x in ['verify_v68_security_identity_5.py','verify_v69_backup_disaster_recovery_5.py','verify_v70_data_governance_privacy_5.py','verify_v71_secrets_key_governance_5.py','verify_v72_software_supply_chain_5.py']))
check('Diagnose states Flyway V72','Flyway V72' in diag)
check('Diagnose states 67 public tables','67 public tables' in diag)
check('Release preflight runs V72 verifier','verify_v72_software_supply_chain_5.py' in release)
check('Release example is V72 stable','such as v72.0.0' in release)
check('Release remains stable-only','Pre-release tags are disabled' in release and '-rc.' not in release)
check('README current release V72','Current release:** V72' in readme or 'Current release: **V72**' in readme)
check('README title V72','# CineBooking Pro V72' in readme)
check('README history includes V72','| **V72** |' in readme)
check('README V72 section','## V72 - Software Supply Chain Integrity 5.0' in readme)
check('README strategy','V72-SUPPLY-CHAIN-INTEGRITY-5' in readme)
check('README Flyway V72','Flyway latest: V72' in readme)
check('README 67 tables','Public tables: 67' in readme or '67 public tables' in readme)
check('README stable-only v72','Stable only: v72.0.0' in readme)
check('README has no concrete V72 RC tag','v72.0.0-rc.1' not in readme and 'v72.0.0-rc.2' not in readme)
check('README documents advisory release gate','SUPPLY_CHAIN_RELEASE_GATE_ENFORCEMENT_ENABLED=false' in readme)
check('README documents no artifact binary','không lưu artifact binary' in readme)
check('README documents offline dependency inventory','generate_supply_chain_inventory_v72.py' in readme and 'frontend/package.json' in readme)
check('README preserves real-data policy','V52/V65/V66/V67/V68/V69/V70/V71/V72 **không tạo phim/khách/booking/payment giả**' in readme)

passed=sum(ok for _,ok in checks)
print(f"\nV72 verification: {passed}/{len(checks)} checks passed")
if passed!=len(checks):
    print('\nFailed checks:')
    for name,ok in checks:
        if not ok: print(' - '+name)
    sys.exit(1)
