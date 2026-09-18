from pathlib import Path
import re, subprocess, sys

ROOT = Path(__file__).resolve().parents[1]
checks=[]

def text(rel):
    p=ROOT/rel
    return p.read_text(encoding='utf-8') if p.exists() else ''

def ok(cond,label):
    cond=bool(cond); checks.append(cond); print(f"[ {'OK' if cond else 'FAIL'} ] {label}")

helper=text('frontend/lib/transient-read.ts')
obs=text('frontend/app/admin/observability/page.tsx')
obs_e2e=text('frontend/e2e/observability-reliability-v65.spec.ts')
command=text('frontend/app/admin/command-center/page.tsx')
command_e2e=text('frontend/e2e/operations-command-center-v53.spec.ts')
ops=text('frontend/app/admin/operations-control/page.tsx')
ops_e2e=text('frontend/e2e/operations-control-center-v58.spec.ts')
sw=text('frontend/public/sw.js')
v78page=text('frontend/app/admin/ux-accessibility-pwa/page.tsx')
release=text('scripts/release.ps1'); ci=text('.github/workflows/ci.yml'); diag=text('tools/diagnose-v78.ps1'); make=text('Makefile'); readme=text('README.md')

ok('deadlineMs=options.deadlineMs??12_000' in helper and 'attemptTimeoutMs=options.attemptTimeoutMs??3_500' in helper,
   'Generic transient-read defaults remain bounded at the historical 12s / 3.5s contract')
ok('SUSTAINED_OPERATIONAL_READ_OPTIONS' in helper and 'deadlineMs: 24_000' in helper and 'attemptTimeoutMs: 8_000' in helper,
   'Heavy read-only operational aggregates have an explicit bounded 24s / 8s profile')
ok('status===401' not in helper and 'status===403' not in helper,
   'Authentication and authorization failures remain non-retryable')

ok('SUSTAINED_OPERATIONAL_READ_OPTIONS' in obs and '/admin/observability/summary",{signal}' in obs,
   'Observability V65 opts into sustained bounded summary reads')
ok('loadInFlight=useRef(false)' in obs and 'if(loadInFlight.current)return' in obs and 'load(true)' in obs,
   'Observability V65 suppresses overlapping 10-second refresh reads instead of retry amplification')
ok('data-runtime-state={summary?"READY":msg?"ERROR":"LOADING"}' in obs,
   'Observability V65 exposes authoritative runtime readiness')
ok('toHaveAttribute("data-runtime-state","READY",{timeout:45_000})' in obs_e2e and 'toContainText("Availability")' in obs_e2e and 'toContainText("API P95 latency")' in obs_e2e,
   'V65 E2E waits for real readiness while preserving SLO payload assertions')

ok('SUSTAINED_OPERATIONAL_READ_OPTIONS' in command and '/admin/command-center/summary${qs}`,{signal}' in command,
   'Command Center V53 gives its real aggregate summary the sustained bounded read profile')
ok('data-runtime-state={data?"READY":message?"ERROR":"LOADING"}' in command,
   'Command Center V53 exposes authoritative runtime readiness')
ok('toHaveAttribute("data-runtime-state","READY",{timeout:45_000})' in command_e2e and 'command-center-summary-v53' in command_e2e and 'command-center-attention-v53' in command_e2e,
   'V53 E2E waits for real readiness without removing summary/attention requirements')

ok('SUSTAINED_OPERATIONAL_READ_OPTIONS' in ops and '/admin/operations-control/snapshot${qs}`,{signal}' in ops,
   'Operations Control V58/V59 gives its real aggregate snapshot the sustained bounded read profile')
ok('snapshotInFlight=useRef(false)' in ops and 'if(quiet&&snapshotInFlight.current)return' in ops,
   'Operations Control suppresses overlapping quiet WebSocket/poll snapshot reads')
ok('data-runtime-state={data?"READY":message?"ERROR":"LOADING"}' in ops,
   'Operations Control exposes authoritative runtime readiness')
ok('toHaveAttribute("data-runtime-state","READY",{timeout:45_000})' in ops_e2e and all(x in ops_e2e for x in ['operations-control-summary-v58','operations-control-domains-v58','operations-control-alerts-v58','operations-control-detail-v58']),
   'V58 E2E waits for real readiness while preserving all operational-surface assertions')

ok('withTransientReadRetry' in obs and 'withTransientReadRetry' in command and 'withTransientReadRetry' in ops,
   'Historical fail-closed transient-read helper remains the actual retry mechanism')
ok('setSummary(' in obs and 'setData(' in command and 'setData(' in ops and 'fake' not in (obs+command+ops).lower(),
   'No synthetic summary/snapshot fallback was introduced')

stale_sw=[]
for p in (ROOT/'tools').glob('verify_*.py'):
    if p.name == 'verify_v78_0_18_full_suite_operational_read_stability.py':
        continue
    body=p.read_text(encoding='utf-8')
    if 'v78-0-17' in body and ('VERSION' in body or 'sw' in body.lower()) and 'v78-0-18' not in body:
        stale_sw.append(p.name)
ok(not stale_sw, f'Historical Service Worker verifiers are forward-compatible with V78.0.18 (stale={len(stale_sw)})')

stale_readme=[]
for p in (ROOT/'tools').glob('verify_v78*.py'):
    if p.name == 'verify_v78_0_18_full_suite_operational_read_stability.py':
        continue
    body=p.read_text(encoding='utf-8')
    if 'Current release:** V78.0.17' in body and 'Current release:** V78.0.18' not in body:
        stale_readme.append(p.name)
ok(not stale_readme, f'Historical V78 current-release guards accept V78.0.18 (stale={len(stale_readme)})')

ok(any(x in sw for x in ['const VERSION = "v78-0-18";','const VERSION = "v78-0-19";']), 'Service Worker generation is V78.0.18 or forward-compatible V78.0.19')
ok(any(x in v78page for x in ['>V78.0.18</span>','>V78.0.19</span>']), 'Visible V78 Admin surface reports V78.0.18 or forward-compatible V78.0.19')

migrations=list((ROOT/'backend/src/main/resources/db/migration').glob('V*.sql'))
latest=max(int(re.match(r'V(\d+)',p.name).group(1)) for p in migrations if re.match(r'V(\d+)',p.name))
ok(latest==72 and not list((ROOT/'backend/src/main/resources/db/migration').glob('V78*.sql')),
   'V78.0.18 remains no-schema on Flyway V72')
name='verify_v78_0_18_full_suite_operational_read_stability.py'
ok(name in release and name in ci and name in diag,
   'Release, CI and V78 diagnostics execute the V78.0.18 verifier')
ok('verify-v78-0-18' in make and 'release-v78-0-18' in make,
   'Makefile exposes V78.0.18 verify/release lifecycle')
ok(any(x in readme for x in ['Current release:** V78.0.18','Current release:** V78.0.19']) and '`v78.0.18`' in readme and 'Full-Suite Operational Read Stability' in readme,
   'README records the V78.0.18 full-suite operational read stability release')
ok([p.name for p in ROOT.glob('*.md')]==['README.md'], 'Source keeps one consolidated root README.md')

prev=subprocess.run([sys.executable,'-X','utf8',str(ROOT/'tools/verify_v78_0_17_admin_booking_cinema_business_data_boundary.py')],cwd=ROOT,text=True,encoding='utf-8',errors='replace',capture_output=True)
ok(prev.returncode==0 and '20/20 checks passed' in prev.stdout,
   'V78.0.17 Admin Booking business-data boundary remains green under V78.0.18 metadata')
base=subprocess.run([sys.executable,'-X','utf8',str(ROOT/'tools/verify_v78_ux_accessibility_pwa_5.py')],cwd=ROOT,text=True,encoding='utf-8',errors='replace',capture_output=True)
ok(base.returncode==0 and '27/27 checks passed' in base.stdout,
   'Base V78 UX/Accessibility/PWA verifier remains green')

passed=sum(checks)
print(f"\nV78.0.18 full-suite operational read stability verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed==len(checks) else 1)
