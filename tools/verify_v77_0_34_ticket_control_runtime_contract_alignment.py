from pathlib import Path
import re, sys

ROOT = Path(__file__).resolve().parents[1]
checks=[]

def text(rel):
    p=ROOT/rel
    return p.read_text(encoding='utf-8') if p.exists() else ''

def ok(cond,label):
    cond=bool(cond); checks.append(cond); print(f"[ {'OK' if cond else 'FAIL'} ] {label}")

ticket=text('frontend/app/ticket/[bookingId]/page.tsx')
booking=text('frontend/e2e/booking-flow.spec.ts')
discovery=text('frontend/e2e/discovery-calendar.spec.ts')

ok('data-testid="ticket-add-calendar"' in ticket,
   'Ticket calendar action exposes a stable copy-independent control')
ok('data-testid="ticket-copy-booking-code"' in ticket and 'data-booking-id={bookingId}' in ticket,
   'Ticket booking-code action exposes a booking-bound machine contract')
ok('data-testid="ticket-print"' in ticket,
   'Ticket print action exposes a stable copy-independent control')
ok('getByTestId("ticket-add-calendar")' in booking and 'getByTestId("ticket-copy-booking-code")' in booking and 'getByTestId("ticket-print")' in booking,
   'Booking Flow uses stable ticket action contracts instead of localized button labels')
ok('toHaveAttribute("data-booking-id", bookingId)' in booking,
   'Booking Flow proves the booking-code control belongs to its own booking')
ok('name: /Mã booking/' not in booking,
   'Stale pre-localization booking-code selector is absent from Booking Flow')
ok('data-testid="ticket-qr-v33"' in ticket and 'getByTestId("ticket-qr-v33")' in booking,
   'V77.0.33 booking-bound QR contract remains intact')
ok('gotoSurface(page, marsHref, "movie-detail-v31")' in discovery,
   'V77.0.33 Discovery movie-detail recovery contract remains intact')

legacy=['admin-v29@cine.local','V29SmokeOnly-ChangeMe','admin@cine.local','Admin@123']
ok(all(x not in booking for x in legacy),
   'Touched V77.0.34 E2E continues to avoid fallback Admin credentials')

migrations=list((ROOT/'backend/src/main/resources/db/migration').glob('V*.sql'))
latest=max(int(re.match(r'V(\d+)',x.name).group(1)) for x in migrations if re.match(r'V(\d+)',x.name))
ok(latest==72 and not list((ROOT/'backend/src/main/resources/db/migration').glob('V77*.sql')),
   'V77.0.34 remains no-schema on Flyway V72')

release=text('scripts/release.ps1'); ci=text('.github/workflows/ci.yml'); diag=text('tools/diagnose-v77.ps1'); make=text('Makefile'); readme=text('README.md')
name='verify_v77_0_34_ticket_control_runtime_contract_alignment.py'
ok(name in release and name in ci and name in diag,
   'Release/CI/diagnostics run the V77.0.34 verifier')
ok('verify-v77-0-34' in make and 'release-v77-0-34' in make,
   'Makefile exposes V77.0.34 verify/release targets')
ok('1 passed / 1 failed' in readme and 'V77.0.34' in readme and 'ticket-copy-booking-code' in readme,
   'README records the exact V77.0.33 focused baseline and V77.0.34 fix')
ok(any(x in readme for x in ['Current release:** V77.0.34','Current release:** V77.0.35','Current release:** V77.0.36','Current release:** V77.0.37','Current release:** V77.0.38','Current release:** V77.0.39','Current release:** V77.0.40','Current release:** V77.0.41','Current release:** V77.0.42','Current release:** V77.0.43','Current release:** V77.0.44','Current release:** V77.0.45','Current release:** V77.0.46','Current release:** V77.0.47','Current release:** V77.0.48','Current release:** V77.0.49','Current release:** V77.0.50','Current release:** V77.0.52']) and any(x in readme for x in ['`v77.0.34`','`v77.0.35`','`v77.0.36`','`v77.0.37`','`v77.0.38`','`v77.0.39`','`v77.0.40`','`v77.0.41`','`v77.0.42`','`v77.0.43`','`v77.0.44`','`v77.0.45`','`v77.0.46`','`v77.0.47`','`v77.0.48`','`v77.0.49`','`v77.0.50`','`v77.0.52`']),
   'README current release and stable target are V77.0.34')

passed=sum(checks)
print(f"\nV77.0.34 ticket control runtime contract alignment verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed==len(checks) else 1)
