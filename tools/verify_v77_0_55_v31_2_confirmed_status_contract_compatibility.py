#!/usr/bin/env python3
from __future__ import annotations
import re, subprocess, sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
checks=[]
def text(rel:str)->str:
    p=ROOT/rel
    return p.read_text(encoding='utf-8') if p.exists() else ''
def ok(cond:bool,label:str)->None:
    cond=bool(cond); checks.append(cond); print(f"[ {'OK' if cond else 'FAIL'} ] {label}")

legacy=text('tools/verify_v31_2_rc_determinism.py')
spec=text('frontend/e2e/booking-flow.spec.ts')
bookings=text('frontend/app/bookings/page.tsx')
ci=text('.github/workflows/ci.yml')
release=text('scripts/release.ps1')
diag=text('tools/diagnose-v77.ps1')
make=text('Makefile')
readme=text('README.md')
sw=text('frontend/public/sw.js')
prev=text('tools/verify_v77_0_54_v31_ticket_wallet_contract_compatibility.py')
v29=text('tools/verify_v77_0_29_frontend_healthcheck_contract.py')

ok('legacy_confirmed_label' in legacy and 'current_confirmed_status' in legacy,
   'Historical V31.2 verifier accepts legacy or current confirmed-status contracts')
ok('confirmedCard.getByTestId("booking-status")' in legacy,
   'Historical V31.2 current path requires the dedicated booking-status node')
ok('toHaveAttribute("data-booking-status", "CONFIRMED")' in legacy,
   'Historical V31.2 current path requires raw CONFIRMED machine status')
ok('toHaveAccessibleName(/Trạng thái đặt vé:/)' in legacy,
   'Historical V31.2 current path requires an accessible booking-status name')
ok('getByText("CONFIRMED")' in legacy and 'not in spec' in legacy,
   'Historical V31.2 still forbids ambiguous CONFIRMED text locators')

ok('const confirmedCard = page.locator(\'[data-testid="booking-card"][data-booking-status="CONFIRMED"]\').first();' in spec,
   'Current booking E2E still identifies the confirmed booking card deterministically')
ok('const confirmedStatus = confirmedCard.getByTestId("booking-status");' in spec,
   'Current booking E2E asserts the dedicated booking-status node')
ok('toHaveAttribute("data-booking-status", "CONFIRMED")' in spec,
   'Current booking E2E asserts raw CONFIRMED status')
ok('toHaveAccessibleName(/Trạng thái đặt vé:/)' in spec,
   'Current booking E2E asserts booking-status accessibility')
ok('getByText("CONFIRMED")' not in spec,
   'Current booking E2E does not regress to ambiguous text matching')
ok('data-testid="booking-status"' in bookings and 'data-booking-status={b.status}' in bookings,
   'Bookings UI keeps a dedicated machine-readable status surface')
ok('aria-label={`Trạng thái đặt vé: ${viLabel(b.status)}`}' in bookings or ('aria-label={t(`Trạng thái đặt vé: ${localizedLabel(b.status,"vi")}`' in bookings and 'Booking status: ${localizedLabel(b.status,"en")}' in bookings),
   'Bookings UI keeps the accessible localized status label')

ok(legacy.count('check(')==19 and 'sys.exit(1)' in legacy,
   'Historical V31.2 gate remains fail-closed with its full 18-check matrix')
v312_run=subprocess.run([sys.executable, str(ROOT/'tools/verify_v31_2_rc_determinism.py')], cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
ok(v312_run.returncode==0 and '18/18 checks passed' in v312_run.stdout,
   'Historical V31.2 verifier exits zero on current source with all 18 checks')
ok('python3 tools/verify_v31_2_rc_determinism.py' in ci,
   'Main CI still executes the historical V31.2 gate')

ok(any(x in sw for x in ['const VERSION = "v77-0-55";','const VERSION = "v77-0-56";','const VERSION = "v77-0-57";','const VERSION = "v77-0-59";','const VERSION = "v77-0-60";','const VERSION = "v77-0-61";','const VERSION = "v78-0-0";','const VERSION = "v78-0-1";','const VERSION = "v78-0-2";','const VERSION = "v78-0-3";','const VERSION = "v78-0-4";','const VERSION = "v78-0-5";','const VERSION = "v78-0-6";','const VERSION = "v78-0-7";','const VERSION = "v78-0-8";','const VERSION = "v78-0-9";','const VERSION = "v78-0-10";','const VERSION = "v78-0-11";','const VERSION = "v78-0-12";','const VERSION = "v78-0-13";','const VERSION = "v78-0-14";','const VERSION = "v78-0-15";','const VERSION = "v78-0-16";','const VERSION = "v78-0-17";','const VERSION = "v78-0-18";','const VERSION = "v78-0-19";']),
   'Service Worker release metadata is V77.0.55 or forward-compatible V77.0.56')
migrations=list((ROOT/'backend/src/main/resources/db/migration').glob('V*.sql'))
latest=max(int(re.match(r'V(\d+)',p.name).group(1)) for p in migrations if re.match(r'V(\d+)',p.name))
ok(latest==72 and not list((ROOT/'backend/src/main/resources/db/migration').glob('V73*.sql')),
   'V77.0.55 remains no-schema on Flyway V72')
name='verify_v77_0_55_v31_2_confirmed_status_contract_compatibility.py'
ok(name in release, 'Stable release preflight runs the V77.0.55 verifier')
ok(name in ci, 'Main CI runs the V77.0.55 verifier')
ok(name in diag, 'V77 diagnostics chain the V77.0.55 verifier')
ok('verify-v77-0-55' in make and 'release-v77-0-55' in make,
   'Makefile exposes V77.0.55 verify/release lifecycle')
ok(any(x in readme for x in ['Current release:** V77.0.55','Current release:** V77.0.56','Current release:** V77.0.57','Current release:** V77.0.59','Current release:** V77.0.60','Current release:** V77.0.61']) and any(x in readme for x in ['`v77.0.55`','`v77.0.56`','`v77.0.57`','`v77.0.59`','`v77.0.60`','`v77.0.61`']),
   'README retains V77.0.55 history under the V77.0.56-or-newer stable target')
ok('17/18' in readme and 'verify_v31_2_rc_determinism.py' in readme and '18/18' in readme,
   'README records the exact V31.2 CI blocker and restored 18/18 contract')
ok([p.name for p in ROOT.glob('*.md')]==['README.md'],
   'Source keeps one consolidated root Markdown history document')
ok(any(x in prev for x in ['v77-0-55','V77.0.55','V77.0.56','V77.0.57','V77.0.59','V77.0.60','V77.0.61']),
   'V77.0.54 verifier is forward-compatible with V77.0.55 release metadata')
ok(any(x in v29 for x in ['Current release:** V77.0.55','Current release:** V77.0.56','Current release:** V77.0.57','Current release:** V77.0.59','Current release:** V77.0.60','Current release:** V77.0.61']) and any(x in v29 for x in ['`v77.0.55`','`v77.0.56`','`v77.0.57`','`v77.0.59`','`v77.0.60`','`v77.0.61`']),
   'V77.0.29 forward-compatibility chain accepts the V77.0.56 stable target')

passed=sum(checks)
print(f"\nV77.0.55 historical V31.2 confirmed-status contract compatibility verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed==len(checks) else 1)
