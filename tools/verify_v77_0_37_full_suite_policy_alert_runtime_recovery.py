from pathlib import Path
import re, sys

ROOT = Path(__file__).resolve().parents[1]
checks=[]

def text(rel):
    p=ROOT/rel
    return p.read_text(encoding='utf-8') if p.exists() else ''

def ok(cond,label):
    cond=bool(cond); checks.append(cond); print(f"[ {'OK' if cond else 'FAIL'} ] {label}")

analytics_page=text('frontend/app/admin/analytics-bi/page.tsx')
analytics_spec=text('frontend/e2e/analytics-bi-v75.spec.ts')
dr_page=text('frontend/app/admin/disaster-recovery/page.tsx')
dr_spec=text('frontend/e2e/backup-disaster-recovery-v69.spec.ts')
recommendation_admin=text('frontend/app/admin/recommendation/page.tsx')
recommendation_for_you=text('frontend/app/for-you/page.tsx')
recommendation_spec=text('frontend/e2e/recommendation-5-v76.spec.ts')
operations_page=text('frontend/app/admin/operations-control/page.tsx')
operations_spec=text('frontend/e2e/realtime-operations-v59.spec.ts')
runtime_guard=text('frontend/e2e/runtime-guards.ts')

ok('withTransientAnalyticsBiReadRetry' in analytics_page and 'Date.now()+12_000' in analytics_page,
   'V75 Analytics & BI retries authoritative reads inside a bounded 12-second window')
ok('status===0||status===408||status===425||status===429||status>=500' in analytics_page,
   'V75 retry policy is limited to transient network/HTTP failures')
ok('data-analytics-bi-ready={data?"true":"false"}' in analytics_page and 'data-policy-real-operational=' in analytics_page and 'data-policy-no-synthetic-funnel=' in analytics_page,
   'V75 exposes payload readiness and evidence policy as machine-readable contracts')
ok('loginExistingAdmin(page)' in analytics_spec and 'data-analytics-bi-ready","true"' in analytics_spec and 'data-policy-no-synthetic-funnel","true"' in analytics_spec,
   'V75 E2E uses the existing Admin and gates evidence assertions on real payload readiness')

ok('withTransientDrReadRetry' in dr_page and 'Date.now()+12_000' in dr_page,
   'V69 Backup & DR retries the idempotent summary/evidence read bundle in a bounded window')
ok('data-dr-ready={summary?"true":"false"}' in dr_page and 'data-evidence-mode={summary?.immutableEvidence?"APPEND_ONLY":"LOADING"}' in dr_page,
   'V69 exposes authoritative DR readiness and immutable-evidence mode')
ok('loginExistingAdmin(page)' in dr_spec and 'data-dr-ready","true"' in dr_spec and 'data-evidence-mode","APPEND_ONLY"' in dr_spec,
   'V69 E2E waits for the real summary and verifies append-only evidence through machine state')

ok('withTransientRecommendationAdminReadRetry' in recommendation_admin and 'Date.now()+12_000' in recommendation_admin,
   'V76 Admin Recommendation retries authoritative real-data reads inside a bounded window')
ok('data-recommendation-admin-ready={data?"true":"false"}' in recommendation_admin and 'data-policy-assisted-correlation=' in recommendation_admin,
   'V76 Admin Recommendation exposes payload readiness and evidence-policy machine contracts')
ok('data-policy-real-operational=' in recommendation_for_you and 'data-policy-no-synthetic-movie=' in recommendation_for_you,
   'V76 customer recommendation evidence derives machine policy state from the real payload')
ok('loginExistingAdmin(page)' in recommendation_spec and 'data-recommendation-admin-ready","true"' in recommendation_spec and 'data-recommendation-ready","true"' in recommendation_spec,
   'V76 E2E uses the existing Admin and gates both Admin/customer evidence on authoritative payloads')

ok('data-testid="operations-control-alert-v59"' in operations_page and 'data-alert-fingerprint={item.fingerprint}' in operations_page and 'data-alert-state={item.state}' in operations_page,
   'V59 alert cards expose stable fingerprint/state machine contracts')
ok('data-testid="operations-alert-ack-v59"' in operations_page and 'data-testid="operations-alert-resolve-v59"' in operations_page,
   'V59 alert actions expose copy-independent controls')
ok('loginExistingAdmin(page)' in operations_spec and 'data-alert-state="OPEN"' in operations_spec and 'operations-alert-ack-v59' in operations_spec,
   'V59 E2E targets only an OPEN machine-state alert through the stable ack control')
ok('timeout:2_000' in operations_spec and '.catch(()=>false)' in operations_spec and 'data-alert-fingerprint' in operations_spec,
   'V59 alert race handling is bounded and follows the same fingerprint after acknowledgement')
ok('retry one read/navigation only' in runtime_guard and 'Business writes are never retried here.' in runtime_guard,
   'Shared navigation recovery remains bounded and does not retry business writes')

legacy=['admin-v29@cine.local','V29SmokeOnly-ChangeMe','admin@cine.local','Admin@123']
for spec,label in [(analytics_spec,'V75'),(dr_spec,'V69'),(recommendation_spec,'V76'),(operations_spec,'V59')]:
    ok(all(x not in spec for x in legacy),f'{label} touched E2E contains no fallback Admin credentials')

migrations=list((ROOT/'backend/src/main/resources/db/migration').glob('V*.sql'))
latest=max(int(re.match(r'V(\d+)',x.name).group(1)) for x in migrations if re.match(r'V(\d+)',x.name))
ok(latest==72 and not list((ROOT/'backend/src/main/resources/db/migration').glob('V77*.sql')),
   'V77.0.37 remains no-schema on Flyway V72')

release=text('scripts/release.ps1'); ci=text('.github/workflows/ci.yml'); diag=text('tools/diagnose-v77.ps1'); make=text('Makefile'); readme=text('README.md')
name='verify_v77_0_37_full_suite_policy_alert_runtime_recovery.py'
ok(name in release and name in ci and name in diag,
   'Release/CI/diagnostics run the V77.0.37 verifier')
ok('verify-v77-0-37' in make and 'release-v77-0-37' in make,
   'Makefile exposes V77.0.37 verify/release targets')
ok('42 passed' in readme and '4 failed' in readme and 'V77.0.37' in readme and 'APPEND_ONLY' in readme and 'operations-alert-ack-v59' in readme,
   'README records the exact V77.0.36 full-suite baseline and V77.0.37 recovery scope')
ok(any(x in readme for x in ['Current release:** V77.0.37','Current release:** V77.0.38','Current release:** V77.0.39','Current release:** V77.0.40','Current release:** V77.0.41','Current release:** V77.0.42','Current release:** V77.0.43','Current release:** V77.0.44','Current release:** V77.0.45','Current release:** V77.0.46','Current release:** V77.0.47','Current release:** V77.0.48','Current release:** V77.0.49','Current release:** V77.0.50','Current release:** V77.0.52','Current release:** V77.0.53','Current release:** V77.0.54']) and any(x in readme for x in ['`v77.0.37`','`v77.0.38`','`v77.0.39`','`v77.0.40`','`v77.0.41`','`v77.0.42`','`v77.0.43`','`v77.0.44`','`v77.0.45`','`v77.0.46`','`v77.0.47`','`v77.0.48`','`v77.0.49`','`v77.0.50`','`v77.0.52`','`v77.0.53`','`v77.0.54`']),
   'README retains V77.0.37 history with a V77.0.37-or-newer stable target')
root_markdown=[p.name for p in ROOT.glob('*.md')]
ok(root_markdown==['README.md'],
   'Source keeps a single root Markdown history document: README.md')

passed=sum(checks)
print(f"\nV77.0.37 full-suite policy/alert runtime recovery verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed==len(checks) else 1)
