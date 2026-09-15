#!/usr/bin/env python3
from __future__ import annotations
import re, sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
checks=[]
def text(rel:str)->str:
    p=ROOT/rel
    return p.read_text(encoding='utf-8') if p.exists() else ''
def ok(cond:bool,label:str)->None:
    cond=bool(cond); checks.append(cond); print(f"[ {'OK' if cond else 'FAIL'} ] {label}")

booking=text('frontend/app/booking/[showtimeId]/page.tsx')
v66=text('frontend/e2e/booking-consistency-seat-locking-v66.spec.ts')
ci=text('.github/workflows/ci.yml')
release=text('scripts/release.ps1')
diag=text('tools/diagnose-v77.ps1')
make=text('Makefile')
readme=text('README.md')
sw=text('frontend/public/sw.js')
prev=text('tools/verify_v77_0_50_v26_ci_service_worker_version_parser.py')
v29=text('tools/verify_v77_0_29_frontend_healthcheck_contract.py')

ok('const seatHoldAuthority=map?.holdAuthority||"POSTGRESQL_WITH_REDIS_MIRROR";' in booking,
   'Booking page owns an explicit V66 authority value before early-return rendering')
ok('const seatHoldAuthorityMarker=<div data-testid="seat-hold-authority-v66"' in booking,
   'Booking page defines one reusable V66 authority marker surface')
ok('if(loading)return' in booking and '{seatHoldAuthorityMarker}</div>;' in booking,
   'Loading surface renders the V66 authority marker instead of hiding it')
ok('if(fatalError||!showtime||!map)return' in booking and booking.count('{seatHoldAuthorityMarker}')>=3,
   'Unavailable/error and normal booking surfaces both retain the authority marker')
ok(booking.count('data-testid="seat-hold-authority-v66"')==1,
   'V66 marker test id has one source definition to prevent divergent copies')
ok('map?.holdAuthority||"POSTGRESQL_WITH_REDIS_MIRROR"' in booking,
   'Loaded seat-map authority overrides the boot-safe architectural default')

ok('expect([a.status,b.status].sort((x,y)=>x-y)).toEqual([200,409])' in v66,
   'V66 browser journey still requires exactly one winner and one conflict')
ok('expect(winner.body!.authority).toBe("POSTGRESQL_WITH_REDIS_MIRROR")' in v66,
   'V66 browser journey still proves authority from the winning API response')
ok('expect(winner.body!.holdToken).toMatch(/^[0-9a-f-]{36}$/i)' in v66,
   'V66 browser journey still proves a durable UUID hold token')
ok('winnerPage.getByTestId("seat-hold-authority-v66")' in v66,
   'V66 browser journey still verifies the booking authority marker')
ok('adminPage.getByTestId("seat-hold-authority-v66")' in v66 and 'active-seat-holds-v66' in v66,
   'V66 browser journey still proves Admin authority and active-hold visibility')
ok('method:"DELETE",body:{seatIds:pair.seatIds}' in v66,
   'V66 browser journey still releases the winning hold after verification')

ok(any(x in sw for x in ['const VERSION = "v77-0-51";','const VERSION = "v77-0-52";','const VERSION = "v77-0-53";','const VERSION = "v77-0-54";']),
   'Service Worker release metadata is V77.0.51 or forward-compatible V77.0.52')
migrations=list((ROOT/'backend/src/main/resources/db/migration').glob('V*.sql'))
latest=max(int(re.match(r'V(\d+)',p.name).group(1)) for p in migrations if re.match(r'V(\d+)',p.name))
ok(latest==72 and not list((ROOT/'backend/src/main/resources/db/migration').glob('V73*.sql')),
   'V77.0.51 remains no-schema on Flyway V72')

name='verify_v77_0_51_v66_booking_authority_boot_surface.py'
ok(name in release, 'Stable release preflight runs the V77.0.51 verifier')
ok(name in ci, 'Main CI runs the V77.0.51 verifier')
ok(name in diag, 'V77 diagnostics chain the V77.0.51 verifier')
ok('verify-v77-0-51' in make and 'release-v77-0-51' in make,
   'Makefile exposes V77.0.51 verify/release lifecycle')
ok(any(x in readme for x in ['Current release:** V77.0.51','Current release:** V77.0.52','Current release:** V77.0.53','Current release:** V77.0.54']) and any(x in readme for x in ['`v77.0.51`','`v77.0.52`','`v77.0.53`','`v77.0.54`']),
   'README retains V77.0.51 history under the V77.0.52-or-newer stable target')
ok('45/46' in readme and 'seat-hold-authority-v66' in readme and 'boot-safe render invariant' in readme,
   'README records the exact V77.0.50 release blocker and boot-surface fix')
ok([p.name for p in ROOT.glob('*.md')]==['README.md'],
   'Source keeps one consolidated root Markdown history document')
ok(any(x in prev for x in ['v77-0-51','v77-0-52','v77-0-53','v77-0-54']) and 'V77.0.50' in prev,
   'V77.0.50 verifier remains forward-compatible through V77.0.52')
ok(any(x in v29 for x in ['Current release:** V77.0.52','Current release:** V77.0.53','Current release:** V77.0.54']) and any(x in v29 for x in ['`v77.0.52`','`v77.0.53`','`v77.0.54`']),
   'V77.0.29 forward-compatibility chain accepts the V77.0.52 stable target')

passed=sum(checks)
print(f"\nV77.0.51 V66 booking authority boot-surface verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed==len(checks) else 1)
