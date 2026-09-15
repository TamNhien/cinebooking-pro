from pathlib import Path
import re, sys

ROOT=Path(__file__).resolve().parents[1]
checks=[]

def text(rel):
    p=ROOT/rel
    return p.read_text(encoding='utf-8') if p.exists() else ''

def ok(cond,label):
    cond=bool(cond); checks.append(cond); print(f"[ {'OK' if cond else 'FAIL'} ] {label}")

seat_page=text('frontend/app/admin/seat-operations/page.tsx')
seat_spec=text('frontend/e2e/booking-consistency-seat-locking-v66.spec.ts')
crm_page=text('frontend/app/admin/crm-automation/page.tsx')
crm_spec=text('frontend/e2e/crm-automation-5-v77.spec.ts')
runtime_guard=text('frontend/e2e/runtime-guards.ts')

ok('withTransientSeatOperationsReadRetry' in seat_page and 'Date.now()+12_000' in seat_page,
   'V66 Admin Seat Operations retries authoritative reads inside a bounded 12-second window')
ok('status===0||status===408||status===425||status===429||status>=500' in seat_page,
   'V66 read retry is limited to transient network/HTTP failures')
ok('data-seat-summary-ready={summary?"true":"false"}' in seat_page and 'data-summary-ready={summary?"true":"false"}' in seat_page,
   'V66 exposes authoritative summary readiness independently of placeholder presentation')
ok('data-active-holds=' in seat_page and 'data-conflicts-24h=' in seat_page,
   'V66 summary exposes machine-readable operational counts after payload convergence')
ok('loginExistingAdmin(adminPage)' in seat_spec and 'ensureSurface(adminPage,"seat-operations-v66","/admin/seat-operations")' in seat_spec,
   'V66 E2E reuses existing Admin and gates the real Admin surface')
ok('data-seat-summary-ready","true"' in seat_spec and 'data-summary-ready","true"' in seat_spec,
   'V66 E2E waits for authoritative summary readiness instead of rejecting a transient em-dash placeholder')

ok('withTransientCrmReadRetry' in crm_page and 'Date.now()+12_000' in crm_page,
   'V77 CRM retries authoritative Admin summary reads inside a bounded 12-second window')
ok('status===0||status===408||status===425||status===429||status>=500' in crm_page,
   'V77 CRM read retry is limited to transient network/HTTP failures')
ok('data-crm-ready={summary?"true":"false"}' in crm_page,
   'V77 CRM exposes authoritative summary readiness')
for attr in ['data-policy-real-operational','data-policy-promotion-opt-out','data-policy-frequency-cap','data-policy-cooldown','data-policy-blast-radius','data-policy-correlation-only']:
    ok(attr in crm_page,f'V77 CRM exposes machine evidence contract {attr}')
ok('loginExistingAdmin(page)' in crm_spec and 'ensureSurface(page,"crm-automation-v77","/admin/crm-automation")' in crm_spec and 'data-crm-ready","true"' in crm_spec,
   'V77 CRM E2E reuses existing Admin and waits for authoritative payload readiness')
ok(all(attr in crm_spec for attr in ['data-policy-real-operational','data-policy-promotion-opt-out','data-policy-frequency-cap','data-policy-cooldown','data-policy-blast-radius','data-policy-correlation-only']),
   'V77 CRM E2E verifies evidence policy through localization-independent machine contracts')
legacy=['admin-v29@cine.local','V29SmokeOnly-ChangeMe','admin@cine.local','Admin@123']
ok(all(x not in seat_spec+crm_spec for x in legacy) and 'Existing root .env admin credentials are required' in runtime_guard,
   'Touched release-gate E2E uses only the existing root .env Admin credentials')
ok('method:"POST"' in seat_spec and 'method:"DELETE"' in seat_spec and 'Business writes are never retried here.' in runtime_guard,
   'V66 hold/release business writes remain single-shot while only reads/navigation recover')
ok('crm-preview-v77' in crm_spec and 'crm-execute-v77' not in crm_spec,
   'V77 focused regression remains non-mutating and exercises Preview only')

migrations=list((ROOT/'backend/src/main/resources/db/migration').glob('V*.sql'))
latest=max(int(re.match(r'V(\d+)',x.name).group(1)) for x in migrations if re.match(r'V(\d+)',x.name))
ok(latest==72 and not list((ROOT/'backend/src/main/resources/db/migration').glob('V77*.sql')),
   'V77.0.38 remains no-schema on Flyway V72')
release=text('scripts/release.ps1'); ci=text('.github/workflows/ci.yml'); diag=text('tools/diagnose-v77.ps1'); make=text('Makefile'); readme=text('README.md')
name='verify_v77_0_38_release_gate_readiness_recovery.py'
ok(name in release and name in ci and name in diag,
   'Release/CI/diagnostics run the V77.0.38 verifier')
ok('verify-v77-0-38' in make and 'release-v77-0-38' in make,
   'Makefile exposes V77.0.38 verify/release targets')
ok('46 passed' in readme and '44 passed' in readme and '2 failed' in readme and 'V77.0.38' in readme and 'data-seat-summary-ready' in readme and 'data-crm-ready' in readme,
   'README records the V77.0.37 direct-pass/release-rerun baseline and V77.0.38 recovery scope')
ok(any(x in readme for x in ['Current release:** V77.0.38','Current release:** V77.0.39','Current release:** V77.0.40','Current release:** V77.0.41','Current release:** V77.0.42','Current release:** V77.0.43','Current release:** V77.0.44','Current release:** V77.0.45','Current release:** V77.0.46','Current release:** V77.0.47','Current release:** V77.0.48','Current release:** V77.0.49','Current release:** V77.0.50','Current release:** V77.0.52','Current release:** V77.0.53']) and any(x in readme for x in ['`v77.0.38`','`v77.0.39`','`v77.0.40`','`v77.0.41`','`v77.0.42`','`v77.0.43`','`v77.0.44`','`v77.0.45`','`v77.0.46`','`v77.0.47`','`v77.0.48`','`v77.0.49`','`v77.0.50`','`v77.0.52`','`v77.0.53`']),
   'README retains V77.0.38 history with a V77.0.38-or-newer stable target')
root_markdown=[p.name for p in ROOT.glob('*.md')]
ok(root_markdown==['README.md'],
   'Source keeps the consolidated single root Markdown history document')

passed=sum(checks)
print(f"\nV77.0.38 release-gate readiness recovery verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed==len(checks) else 1)
