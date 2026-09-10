from pathlib import Path
import re
import sys

ROOT=Path(__file__).resolve().parents[1]
checks=[]

def text(rel):
    p=ROOT/rel
    return p.read_text(encoding='utf-8') if p.exists() else ''

def check(name,ok):
    ok=bool(ok);checks.append((name,ok));print(('[ OK ]' if ok else '[ FAIL ]')+' '+name)

service=text('backend/src/main/java/com/cinebooking/reliability/ReliabilityService.java')
dtos=text('backend/src/main/java/com/cinebooking/reliability/ReliabilityDtos.java')
controller=text('backend/src/main/java/com/cinebooking/reliability/AdminReliabilityController.java')
requests=text('backend/src/main/java/com/cinebooking/observability/RequestObservabilityService.java')
inc_repo=text('backend/src/main/java/com/cinebooking/staffops/StaffIncidentRepository.java')
app=text('backend/src/main/resources/application.yml')
compose=text('docker-compose.yml')
env=text('.env.example')
ui=text('frontend/app/admin/reliability/page.tsx')
types=text('frontend/lib/types.ts')
admin=text('frontend/app/admin/page.tsx')
header=text('frontend/components/Header.tsx')
e2e=text('frontend/e2e/reliability-resilience-v74.spec.ts')
failover=text('tools/failover-drill-v74.ps1')
diag=text('tools/diagnose-v74.ps1')
ci=text('.github/workflows/ci.yml')
release=text('scripts/release.ps1')
make=text('Makefile')
readme=text('README.md')
v73=text('tools/verify_v73_github_actions_node24.py')
itest=text('backend/src/test/java/com/cinebooking/integration/CineBookingIntegrationIT.java')
seed=text('tools/seed-demo-57-tables.ps1')+text('tools/seed-demo-57-tables.sql')

# Files / no-schema contract
for rel in [
    'backend/src/main/java/com/cinebooking/reliability/ReliabilityDtos.java',
    'backend/src/main/java/com/cinebooking/reliability/ReliabilityService.java',
    'backend/src/main/java/com/cinebooking/reliability/AdminReliabilityController.java',
    'frontend/app/admin/reliability/page.tsx',
    'frontend/e2e/reliability-resilience-v74.spec.ts',
    'tools/failover-drill-v74.ps1','tools/diagnose-v74.ps1']:
    check(f'V74 file exists: {rel}',(ROOT/rel).exists())
check('V74 strategy version explicit','V74-RELIABILITY-RESILIENCE-5' in service and 'V74-RELIABILITY-RESILIENCE-5' in readme)
check('V74 adds no Flyway migration',not any((ROOT/'backend/src/main/resources/db/migration').glob('V74__*.sql')))
check('Integration remains Flyway >=72','isGreaterThanOrEqualTo(72)' in itest)
check('Integration remains at least 67 public tables','publicTables).isGreaterThanOrEqualTo(67)' in itest)

# Request telemetry extension
check('V65 sample cap preserved','MAX_SAMPLES = 2_000' in requests)
check('Reliability telemetry max window is 120 minutes','MAX_RELIABILITY_WINDOW_MINUTES = 120' in requests)
check('Existing snapshot delegates to configured window','return snapshot(windowMinutes);' in requests)
check('Custom reliability window snapshot exists','snapshot(int requestedMinutes)' in requests)
check('Custom snapshot bounds window','Math.min(requestedMinutes, MAX_RELIABILITY_WINDOW_MINUTES)' in requests)
check('Custom snapshot filters by cutoff','.filter(s -> !s.at().isBefore(cutoff))' in requests)
check('Custom snapshot counts 5xx','s.status() >= 500' in requests)
check('Custom snapshot computes availability','availability' in requests and 'total - serverErrors' in requests)
check('Custom snapshot computes error rate','errorRate' in requests and 'serverErrors * 100.0 / total' in requests)
check('Custom snapshot exposes buffer truncation','sampleBufferTruncated' in requests and 'samples.size() >= MAX_SAMPLES' in requests)
check('Retention covers reliability max window','Math.max(MAX_RELIABILITY_WINDOW_MINUTES' in requests)
check('Historical V65 prune remains','pruneOld()' in requests)

# DTOs / service
for token in ['BurnRateWindow','ReliabilityIncident','RunbookStep','ReliabilitySummary']:
    check('V74 DTO '+token,('record '+token) in dtos)
for token in ['availabilityTargetPercent','errorBudgetPercent','fastWindow','slowWindow','multiWindowBurnAlert','burnAlertSeverity','openIncidents','criticalOpenIncidents','dependencyStatus','disasterRecoveryReadiness','evidencePolicy']:
    check('Summary field '+token,token in dtos)
check('Burn window exposes truncation','sampleBufferTruncated' in dtos)
check('Incident exposes provenance','source' in dtos and 'evidenceRef' in dtos)
check('Runbook exposes safety','safety' in dtos)
check('Reliability service is Spring service','@Service' in service)
check('Reliability reuses V65 observability','RequestObservabilityService' in service and 'ObservabilityService' in service)
check('Reliability reuses V69 DR','DisasterRecoveryService' in service)
check('Reliability reads durable staff incidents','StaffIncidentRepository' in service)
check('Reliability reads durable audit','AuditLogRepository' in service)
check('No synthetic incident policy explicit','NO_SYNTHETIC_INCIDENTS' in service)
check('Runtime 5xx labeled ephemeral','RUNTIME_5XX_IS_EPHEMERAL' in service and '"EPHEMERAL"' in service)
check('Durable evidence policy explicit','STAFF_INCIDENTS_AND_AUDIT_ARE_DURABLE' in service)
check('Failover exercise opt-in policy explicit','FAILOVER_EXERCISE_IS_OPT_IN' in service)
check('No volume deletion policy explicit','NO_DATABASE_VOLUME_DELETION' in service)
check('Availability target bounded','clamp(availabilityTargetPercent, 90.0, 99.999)' in service)
check('Fast window bounded','bound(fastWindowMinutes, 1, 30)' in service)
check('Slow window bounded','bound(slowWindowMinutes, 5, 120)' in service)
check('Slow window cannot be shorter than fast','Math.max(this.fastWindowMinutes' in service)
check('Fast burn threshold bounded','clamp(fastBurnThreshold, 1.0, 1000.0)' in service)
check('Slow burn threshold bounded','clamp(slowBurnThreshold, 1.0, 1000.0)' in service)
check('Incident lookback bounded','bound(incidentLookbackHours, 1, 168)' in service)
check('Error budget derived from availability target','100.0 - availabilityTargetPercent' in service)
check('Burn rate divides observed error by budget','snapshot.errorRatePercent() / errorBudgetPercent' in service)
check('Fast default threshold 14.4','fast-burn-threshold:14.4' in service)
check('Slow default threshold 6.0','slow-burn-threshold:6.0' in service)
check('Fast default window 5','fast-window-minutes:5' in service)
check('Slow default window 60','slow-window-minutes:60' in service)
check('Buffer truncation becomes PARTIAL','sampleBufferTruncated() ? "PARTIAL"' in service)
check('Zero traffic becomes NO_DATA','snapshot.total() == 0 ? "NO_DATA"' in service)
check('Burn threshold becomes ALERT','burnRate >= threshold ? "ALERT"' in service)
check('Half threshold becomes WATCH','burnRate >= threshold / 2.0 ? "WATCH"' in service)
check('Multi-window alert requires both windows','boolean multiWindow = exceeds(fast) && exceeds(slow)' in service)
check('Critical burn severity requires multi-window','multiWindow ? "CRITICAL"' in service)
check('Dependency failure escalates posture','dependencyFailure || criticalOpen > 0 || (exceeds(fast) && exceeds(slow))' in service)
check('Critical open incidents escalate posture','criticalOpen > 0' in service)
check('DR degraded contributes WATCH','"DEGRADED".equals(drReadiness)' in service)
check('No request traffic avoids healthy claim','fast.requests() == 0 && slow.requests() == 0' in service)
check('DR no-data avoids healthy claim','"NO_DATA".equals(drReadiness)' in service)
check('Global open incident count','countByStatus("OPEN")' in service)
check('Global critical incident count','countByStatusAndSeverity("OPEN", "CRITICAL")' in service)
check('Global incident repository query exists','findTop100ByOrderByCreatedAtDesc()' in inc_repo)
check('Global status counters exist','countByStatus(String status)' in inc_repo and 'countByStatusAndSeverity' in inc_repo)
check('Staff incident evidence links operations','"/staff/operations"' in service)
check('Audit incident source exists','"AUDIT_LOG"' in service)
check('Runtime 5xx incident source exists','"RUNTIME_5XX"' in service)
check('Runtime incident retains trace reference','"trace:" + sample.traceId()' in service)
check('Incident timeline sorted newest first','Comparator.comparing(ReliabilityIncident::occurredAt).reversed()' in service)
check('Incident timeline limit bounded','bound(requestedLimit, 1, 100)' in service)
check('Incident details sanitized','replaceAll("[\\\\r\\\\n\\\\t]+", " ")' in service)
check('Incident details length bounded','clean.substring(0, max - 1)' in service)

# Runbook
for code in ['DETECT','TRIAGE','STABILIZE','FAILOVER','RECOVER','VERIFY','CLOSE']:
    check('Runbook step '+code,f'"{code}"' in service)
check('Runbook points to observability','/admin/observability' in service)
check('Runbook points to V74 failover drill','failover-drill-v74.ps1 -Execute' in service)
check('Runbook reuses V69 restore drill','dr-restore-drill-v69.ps1' in service)
check('Runbook verifies V74','verify_v74_reliability_resilience_5.py' in service)
check('Runbook says no volume deletion','Không xóa volume' in service)
check('Runbook says no live DB overwrite','Không restore đè live DB' in service)

# Controller / RBAC namespace
check('V74 controller is REST','@RestController' in controller)
check('V74 admin namespace','@RequestMapping("/api/admin/reliability")' in controller)
check('V74 GET summary','@GetMapping("/summary")' in controller)
check('V74 GET incidents','@GetMapping("/incidents")' in controller)
check('V74 GET runbook','@GetMapping("/runbook")' in controller)
check('V74 controller exposes no mutation endpoint','@PostMapping' not in controller and '@PutMapping' not in controller and '@DeleteMapping' not in controller and '@PatchMapping' not in controller)

# Config
for key in ['RELIABILITY_AVAILABILITY_TARGET_PERCENT','RELIABILITY_FAST_WINDOW_MINUTES','RELIABILITY_SLOW_WINDOW_MINUTES','RELIABILITY_FAST_BURN_THRESHOLD','RELIABILITY_SLOW_BURN_THRESHOLD','RELIABILITY_INCIDENT_LOOKBACK_HOURS']:
    check('Application wires '+key,key in app)
    check('Compose wires '+key,key in compose)
    check('Env example documents '+key,key in env)

# Failover script safety
check('Failover targets only backend replicas',"ValidateSet('backend-1','backend-2')" in failover)
check('Failover defaults backend-1',"$Target = 'backend-1'" in failover)
check('Failover is opt-in with Execute switch','[switch]$Execute' in failover)
check('Failover default is PLAN ONLY','PLAN ONLY - no container will be stopped.' in failover)
check('Failover loopback-only guard',"loopback BaseUrl" in failover and 'localhost|127\\.0\\.0\\.1' in failover)
check('Failover probes public movies path',"'/api/movies'" in failover)
check('Failover requires baseline probe','Baseline probe failed before failover' in failover)
check('Failover stops only selected target',"Invoke-Compose @('stop',$Target)" in failover)
check('Failover probes surviving replica','surviving replica served probe' in failover)
check('Failover has success threshold','0.8' in failover and 'successful probes' in failover)
check('Failover restart is in finally','finally {' in failover and "Invoke-Compose @('start',$Target)" in failover)
check('Failover never runs down -v','down -v' not in failover.lower())
check('Failover never invokes db recreate','Invoke-DbRecreate' not in failover)
check('Failover does not stop postgres','stop postgres' not in failover.lower())
check('Failover does not stop redis','stop redis' not in failover.lower())

# Frontend types/UI
for token in ['ReliabilityBurnWindowV74','ReliabilityIncidentV74','ReliabilityRunbookStepV74','ReliabilitySummaryV74']:
    check('Frontend type '+token,token in types)
check('Admin Dashboard V74 tile','admin-reliability-v74' in admin and 'Reliability V74' in admin)
labels=['Command Center V53','Performance V54','Retention V55','Customer Value V56','Realtime Operations V59','Payment Production V60','Fraud & Risk V61','Dynamic Pricing V62','Recommendation V63','CRM & Marketing V64','Observability V65','Seat Operations V66','Payment Resilience V67','Security & Identity V68','Backup & DR V69','Privacy Governance V70','Key Governance V71','Supply Chain V72','Reliability V74']
check('Admin Dashboard versioned tiles ascend through V74',all(admin.index(a)<admin.index(b) for a,b in zip(labels,labels[1:])))
check('Header links V74 reliability page','/admin/reliability' in header and 'Reliability V74' in header)
check('V74 UI root test id','reliability-v74' in ui)
check('V74 UI summary test id','reliability-summary-v74' in ui)
check('V74 UI burn-rate panel','burn-rate-v74' in ui and 'Fast burn' in ui and 'Slow burn' in ui)
check('V74 UI policy panel','reliability-policy-v74' in ui)
check('V74 UI incident timeline','incident-timeline-v74' in ui)
check('V74 UI failover panel','failover-drill-v74' in ui)
check('V74 UI runbook panel','reliability-runbook-v74' in ui)
check('V74 UI requires ADMIN','me.role!=="ADMIN"' in ui)
check('V74 UI loads all three endpoints','/admin/reliability/summary' in ui and '/admin/reliability/incidents?limit=50' in ui and '/admin/reliability/runbook' in ui)
check('V74 UI does not expose mutation request','method:"POST"' not in ui and 'method:"PUT"' not in ui and 'method:"DELETE"' not in ui and 'method:"PATCH"' not in ui)
check('V74 UI says no synthetic incidents','NO_SYNTHETIC_INCIDENTS' in ui)
check('V74 UI labels runtime 5xx ephemeral','ephemeral' in ui.lower())
check('V74 UI documents plan-only failover','PLAN ONLY' in ui and '-Execute' in ui)
check('V74 UI says no down-volume action','down -v' in ui.lower())

# E2E
check('V74 E2E logs in as real admin','E2E_ADMIN_EMAIL' in e2e and 'E2E_ADMIN_PASSWORD' in e2e)
check('V74 E2E verifies tile','admin-reliability-v74' in e2e)
check('V74 E2E verifies ascending versions','sort((a,b)=>a-b)' in e2e and 'toBe(74)' in e2e)
check('V74 E2E verifies strategy','V74-RELIABILITY-RESILIENCE-5' in e2e)
check('V74 E2E verifies fast slow burn','Fast burn' in e2e and 'Slow burn' in e2e)
check('V74 E2E verifies evidence policy','NO_SYNTHETIC_INCIDENTS' in e2e)
check('V74 E2E verifies failover opt-in','PLAN ONLY' in e2e and '-Execute' in e2e)
check('V74 E2E verifies runbook','reliability-runbook-v74' in e2e and 'FAILOVER' in e2e)
check('V74 E2E rejects UI error banner','reliability-error-v74' in e2e and 'toHaveCount(0)' in e2e)

# Lifecycle / historical compatibility
check('CI source regression names V74','V26-V74 source regression' in ci)
check('CI runs V74 verifier','verify_v74_reliability_resilience_5.py' in ci)
check('V73 verifier forward-compatible with V74','V73 or later' in v73 and 'V26-V(?:7[3-9]|[89][0-9]) source regression' in v73)
check('V73 Node24 regression remains in CI','verify_v73_github_actions_node24.py' in ci)
check('V59 clipping regression remains in CI','verify_v59_realtime_operations_4.py' in ci)
check('Makefile exposes verify-v74','verify-v74:' in make and 'verify_v74_reliability_resilience_5.py' in make)
check('Makefile exposes diagnose-v74','diagnose-v74:' in make and 'diagnose-v74.ps1' in make)
check('Makefile exposes failover plan','failover-plan-v74:' in make and 'failover-drill-v74.ps1' in make)
check('Makefile exposes stable release-v74','release-v74:' in make and 'v74.0.0' in make)
check('Diagnose V74 chains V59/V65/V69/V72/V73/V74',all(x in diag for x in ['verify_v59_realtime_operations_4.py','verify_v65_observability_reliability.py','verify_v69_backup_disaster_recovery_5.py','verify_v72_software_supply_chain_5.py','verify_v73_github_actions_node24.py','verify_v74_reliability_resilience_5.py']))
check('Diagnose states no-schema authority','Flyway V72 / 67 public tables' in diag)
check('Release preflight runs V74 verifier','verify_v74_reliability_resilience_5.py' in release)
check('Release example is V74 stable','such as v74.0.0' in release)
check('Release remains stable-only','Pre-release tags are disabled' in release and '-rc.' not in release)

# README/docs
check('README title V74',re.search(r'^# CineBooking Pro V74$',readme,re.M) is not None)
check('README current release V74','Current release:** V74 - Reliability & Resilience 5.0' in readme)
check('README history V74 after V73','| **V73** |' in readme and '| **V74** |' in readme and readme.index('| **V73** |')<readme.index('| **V74** |'))
check('README detailed V74 section','## V74 - Reliability & Resilience 5.0' in readme)
check('README strategy V74','V74-RELIABILITY-RESILIENCE-5' in readme)
check('README documents burn formula','burn rate = observed 5xx error rate / allowed error budget' in readme)
check('README documents 5m/60m windows','FAST window: 5 phút' in readme and 'SLOW window: 60 phút' in readme)
check('README documents 14.4x/6.0x thresholds','14.4x' in readme and '6.0x' in readme)
check('README documents PARTIAL truncation','sampleBufferTruncated=true' in readme and 'PARTIAL' in readme)
check('README documents incident provenance','STAFF_INCIDENT' in readme and 'AUDIT_LOG' in readme and 'RUNTIME_5XX' in readme)
check('README documents PLAN ONLY','PLAN ONLY - no container will be stopped.' in readme)
check('README documents explicit Execute','failover-drill-v74.ps1 -Execute' in readme)
check('README documents no down -v','không chứa `down -v`' in readme)
check('README documents seven-step runbook','DETECT → TRIAGE → STABILIZE → FAILOVER → RECOVER → VERIFY → CLOSE' in readme)
check('README documents no-schema V74','New V74 tables: 0' in readme and 'Flyway latest: V72' in readme and 'Public tables: 67' in readme)
check('README V74 stable only','Stable only: v74.0.0' in readme)
check('README keeps real-data policy through V74','V52/V65/V66/V67/V68/V69/V70/V71/V72/V73/V74' in readme and '**không tạo phim/khách/booking/payment giả**' in readme)
check('V74 adds no synthetic seed content','V74-RELIABILITY' not in seed and 'reliability_v74' not in seed.lower())

passed=sum(ok for _,ok in checks)
print(f'\nV74 verification: {passed}/{len(checks)} checks passed')
if passed!=len(checks):
    print('\nFailed checks:')
    for name,ok in checks:
        if not ok: print(' - '+name)
    sys.exit(1)
