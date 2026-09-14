from pathlib import Path
import re, sys

ROOT = Path(__file__).resolve().parents[1]
checks=[]

def text(rel):
    p=ROOT/rel
    return p.read_text(encoding='utf-8') if p.exists() else ''

def ok(cond,label):
    cond=bool(cond); checks.append(cond); print(f"[ {'OK' if cond else 'FAIL'} ] {label}")

booking=text('frontend/e2e/booking-flow.spec.ts')
payment_spec=text('frontend/e2e/payment-production-v60.spec.ts')
payments_page=text('frontend/app/admin/payments/page.tsx')
v60_verifier=text('tools/verify_v60_payment_production_4.py')
v29_verifier=text('tools/verify_v77_0_29_frontend_healthcheck_contract.py')
recent_verifiers='\n'.join(text(x) for x in [
    'tools/verify_v77_0_30_full_suite_runtime_contract_alignment.py',
    'tools/verify_v77_0_31_remaining_full_suite_contract_alignment.py',
    'tools/verify_v77_0_32_final_four_runtime_contract_alignment.py',
    'tools/verify_v77_0_33_final_two_runtime_contract_alignment.py',
    'tools/verify_v77_0_34_ticket_control_runtime_contract_alignment.py',
])

ok('gotoSurface(page, "/admin/payments", "payment-production-readiness-v60")' in booking,
   'Booking Flow gates Admin Payments on the existing V60 readiness surface')
ok('getByTestId("payment-production-readiness-v60")' in booking,
   'Booking Flow uses the copy-independent V60 readiness contract')
ok('getByTestId("payment-readiness-mock-v60")' in booking,
   'Booking Flow proves the MOCK provider through its stable machine selector')
ok('Thanh toán production & đối soát' not in booking,
   'Stale pre-localization Admin Payments heading is absent from Booking Flow')
ok('Payment Production · V60' not in booking,
   'Historical compatibility marker is no longer treated as rendered UI by Booking Flow')
ok('payment-production-readiness-v60' in payments_page and 'payment-readiness-${g.provider.toLowerCase()}-v60' in payments_page,
   'Admin Payments keeps the V60 readiness and provider machine contracts')
ok('gotoSurface(page, "/admin/payments", "payment-production-readiness-v60")' in payment_spec,
   'Canonical V60 E2E and Booking Flow now share the same Admin Payments readiness contract')
ok('stable_booking_payment_contract' in v60_verifier and 'payment-production-readiness-v60' in v60_verifier,
   'Historical V60 verifier accepts the stable Admin Payments machine contract')
ok(any(x in v29_verifier for x in ['Current release:** V77.0.35','Current release:** V77.0.36','Current release:** V77.0.37','Current release:** V77.0.38','Current release:** V77.0.39','Current release:** V77.0.40','Current release:** V77.0.41','Current release:** V77.0.42','Current release:** V77.0.43','Current release:** V77.0.44','Current release:** V77.0.45','Current release:** V77.0.46','Current release:** V77.0.47','Current release:** V77.0.48','Current release:** V77.0.49']) and any(x in v29_verifier for x in ['`v77.0.35`','`v77.0.36`','`v77.0.37`','`v77.0.38`','`v77.0.39`','`v77.0.40`','`v77.0.41`','`v77.0.42`','`v77.0.43`','`v77.0.44`','`v77.0.45`','`v77.0.46`','`v77.0.47`','`v77.0.48`','`v77.0.49`']),
   'Historical V77.0.29 verifier accepts the current forward stable target')
ok(sum(recent_verifiers.count(x) for x in ['Current release:** V77.0.35','Current release:** V77.0.36','Current release:** V77.0.37','Current release:** V77.0.38','Current release:** V77.0.39','Current release:** V77.0.40','Current release:** V77.0.41','Current release:** V77.0.42','Current release:** V77.0.43','Current release:** V77.0.44','Current release:** V77.0.45','Current release:** V77.0.46','Current release:** V77.0.47','Current release:** V77.0.48','Current release:** V77.0.49']) >= 5 and sum(recent_verifiers.count(x) for x in ['`v77.0.35`','`v77.0.36`','`v77.0.37`','`v77.0.38`','`v77.0.39`','`v77.0.40`','`v77.0.41`','`v77.0.42`','`v77.0.43`','`v77.0.44`','`v77.0.45`','`v77.0.46`','`v77.0.47`','`v77.0.48`','`v77.0.49`']) >= 5,
   'Historical V77.0.30-V77.0.34 verifiers accept the current forward stable target')

legacy=['admin-v29@cine.local','V29SmokeOnly-ChangeMe','admin@cine.local','Admin@123']
ok(all(x not in booking for x in legacy),
   'Touched V77.0.35 E2E continues to avoid fallback Admin credentials')

migrations=list((ROOT/'backend/src/main/resources/db/migration').glob('V*.sql'))
latest=max(int(re.match(r'V(\d+)',x.name).group(1)) for x in migrations if re.match(r'V(\d+)',x.name))
ok(latest==72 and not list((ROOT/'backend/src/main/resources/db/migration').glob('V77*.sql')),
   'V77.0.35 remains no-schema on Flyway V72')

release=text('scripts/release.ps1'); ci=text('.github/workflows/ci.yml'); diag=text('tools/diagnose-v77.ps1'); make=text('Makefile'); readme=text('README.md')
name='verify_v77_0_35_admin_payments_runtime_contract_alignment.py'
ok(name in release and name in ci and name in diag,
   'Release/CI/diagnostics run the V77.0.35 verifier')
ok('verify-v77-0-35' in make and 'release-v77-0-35' in make,
   'Makefile exposes V77.0.35 verify/release targets')
ok('1 passed / 1 failed' in readme and 'V77.0.35' in readme and 'payment-production-readiness-v60' in readme,
   'README records the exact V77.0.34 focused baseline and V77.0.35 fix')
ok(any(x in readme for x in ['Current release:** V77.0.35','Current release:** V77.0.36','Current release:** V77.0.37','Current release:** V77.0.38','Current release:** V77.0.39','Current release:** V77.0.40','Current release:** V77.0.41','Current release:** V77.0.42','Current release:** V77.0.43','Current release:** V77.0.44','Current release:** V77.0.45','Current release:** V77.0.46','Current release:** V77.0.47','Current release:** V77.0.48','Current release:** V77.0.49']) and any(x in readme for x in ['`v77.0.35`','`v77.0.36`','`v77.0.37`','`v77.0.38`','`v77.0.39`','`v77.0.40`','`v77.0.41`','`v77.0.42`','`v77.0.43`','`v77.0.44`','`v77.0.45`','`v77.0.46`','`v77.0.47`','`v77.0.48`','`v77.0.49`']),
   'README current release and stable target are forward-compatible with V77.0.35+')

passed=sum(checks)
print(f"\nV77.0.35 Admin Payments runtime contract alignment verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed==len(checks) else 1)
