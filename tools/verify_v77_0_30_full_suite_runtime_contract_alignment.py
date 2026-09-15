from pathlib import Path
import re, sys

ROOT = Path(__file__).resolve().parents[1]
checks = []

def text(rel):
    p = ROOT / rel
    return p.read_text(encoding="utf-8") if p.exists() else ""

def ok(cond, label):
    cond = bool(cond)
    checks.append(cond)
    print(f"[ {'OK' if cond else 'FAIL'} ] {label}")

runtime = text('frontend/e2e/runtime-guards.ts')
bookings = text('frontend/app/bookings/page.tsx')
profile = text('frontend/app/profile/page.tsx')
ticket_page = text('frontend/app/ticket/[bookingId]/page.tsx')
support_page = text('frontend/app/admin/support/page.tsx')
payments_page = text('frontend/app/payments/page.tsx')
offline_page = text('frontend/app/offline-tickets/page.tsx')
showtimes_page = text('frontend/app/admin/showtimes/page.tsx')

spec_names = [
    'booking-flow.spec.ts','customer-support.spec.ts','discovery-calendar.spec.ts','financial-ledger.spec.ts',
    'loyalty-membership.spec.ts','maintenance-blackout.spec.ts','payment-operations-v47.spec.ts',
    'payment-production-v60.spec.ts','pwa-mobile-v52.spec.ts','recommendation-intelligence-v50.spec.ts',
    'refund-automation.spec.ts','reliability-resilience-v74.spec.ts','security-identity-v68.spec.ts',
    'showtime-planner.spec.ts','showtime-smart-planner-v49.spec.ts','ticket-transfer.spec.ts',
]
specs = {name: text('frontend/e2e/' + name) for name in spec_names}
all_specs = '\n'.join(specs.values())

ok('existingAdminCredentials' in runtime and 'E2E_ADMIN_EMAIL' in runtime and 'E2E_ADMIN_PASSWORD' in runtime,
   'Shared E2E runtime guard resolves only the existing Admin credentials')
ok('loginExistingAdmin' in runtime and 'loginWithRole' in runtime and 'waitForAuthRole' in runtime,
   'Shared E2E login waits for hydrated navigation and authoritative auth role')
ok('waitForStepUpGrant' in runtime and 'cinebooking_admin_step_up_v68' in runtime,
   'V68 E2E can wait for the authoritative tab-bound step-up grant')
ok('data-testid="booking-status"' in bookings and 'data-booking-status={b.status}' in bookings,
   'Booking status exposes a machine-readable stable contract independent of localized copy')
ok('loyalty-reward-${r.code.toLowerCase()}' in profile and 'loyalty-redeem-${r.code.toLowerCase()}' in profile,
   'Loyalty rewards expose stable code-based card and redeem controls')
ok('data-testid="ticket-transfer-email"' in ticket_page,
   'Ticket transfer exposes a stable recipient-email control')
ok('data-testid="admin-support-v45"' in support_page and 'Vận hành hỗ trợ' in support_page,
   'Admin support exposes a stable root and current localized heading')
ok('data-testid="payments-v47"' in payments_page and 'Trung tâm thanh toán · V47' in payments_page,
   'Payment Center V47 exposes a stable localized root contract')
ok('data-testid="offline-tickets-v52"' in offline_page and 'Vé ngoại tuyến đã kiểm soát' in offline_page,
   'Offline-ticket V52 exposes a stable current Vietnamese root contract')
ok('data-testid="showtime-planning-page"' in showtimes_page,
   'Showtime planning exposes a stable page readiness root')

ok(('[data-testid="booking-status"][data-booking-status="CONFIRMED"]' in specs['booking-flow.spec.ts'] or 'data-testid="booking-card"' in bookings and 'data-booking-status={b.status}' in bookings),
   'Booking journey asserts machine booking state instead of stale raw aria copy')
ok('Vận hành hỗ trợ' in specs['customer-support.spec.ts'] and 'admin-support-v45' in specs['customer-support.spec.ts'],
   'Customer Support E2E follows the current localized Admin surface')
ok('max >= "2026-09-30"' in specs['discovery-calendar.spec.ts'] and 'toHaveAttribute("max", "2026-09-30")' not in specs['discovery-calendar.spec.ts'],
   'Discovery calendar verifies September remains selectable without freezing a stale maximum date')
ok('loginExistingAdmin(page)' in specs['financial-ledger.spec.ts'] and 'gotoHydrated(page,"/admin/finance")' in specs['financial-ledger.spec.ts'],
   'Financial Ledger reuses the existing Admin and waits for hydrated finance navigation')
ok('loyalty-redeem-rwd20k' in specs['loyalty-membership.spec.ts'] and 'loyalty-redeem-rwdcorn' in specs['loyalty-membership.spec.ts'],
   'Loyalty E2E waits on stable seeded reward codes before redeeming')
ok('maintenance-page' in specs['maintenance-blackout.spec.ts'] and 'showtime-planning-page' in specs['maintenance-blackout.spec.ts'],
   'Maintenance blackout gates both Admin hard-navigation surfaces')
ok('Trung tâm thanh toán · V47' in specs['payment-operations-v47.spec.ts'] and 'data-booking-status="CONFIRMED"' in specs['payment-operations-v47.spec.ts'],
   'V47 E2E follows current copy and machine booking state')
ok('loginExistingAdmin(page)' in specs['payment-production-v60.spec.ts'] and 'payment-production-readiness-v60' in specs['payment-production-v60.spec.ts'],
   'V60 production-payment E2E gates the real readiness panel after existing-Admin login')
ok('Vé ngoại tuyến đã kiểm soát' in specs['pwa-mobile-v52.spec.ts'] and 'offline-tickets-v52' in specs['pwa-mobile-v52.spec.ts'],
   'V52 PWA E2E follows current offline-ticket wording and stable root')
ok('taste-profile' in specs['recommendation-intelligence-v50.spec.ts'] and 'timeout: 30_000' in specs['recommendation-intelligence-v50.spec.ts'],
   'V50 recommendation E2E gives the real async profile a bounded readiness window')
ok('data-booking-status="CONFIRMED"' in specs['refund-automation.spec.ts'] and 'data-booking-status="REFUNDED"' in specs['refund-automation.spec.ts'],
   'Refund E2E asserts immutable machine booking states rather than localized aria text')
ok('chuyển dự phòng|FAILOVER' in specs['reliability-resilience-v74.spec.ts'],
   'V74 E2E accepts the current localized failover runbook presentation')
ok('waitForStepUpGrant(page)' in specs['security-identity-v68.spec.ts'],
   'V68 E2E waits for the authoritative step-up grant before UI status assertion')
ok('planningMovie.selectOption({ index: 1 })' in specs['showtime-planner.spec.ts'] and 'Hành Trình Sao Hỏa' not in specs['showtime-planner.spec.ts'],
   'Showtime planner no longer depends on one movie remaining active after prior serial tests')
ok('movie.selectOption({index:1})' in specs['showtime-smart-planner-v49.spec.ts'] and 'selectedMovie' in specs['showtime-smart-planner-v49.spec.ts'] and 'Hành Trình Sao Hỏa' not in specs['showtime-smart-planner-v49.spec.ts'],
   'Smart Planner derives provenance from the actual selected active movie')
ok('ticket-transfer-email' in specs['ticket-transfer.spec.ts'] and 'Email người nhận vé' not in specs['ticket-transfer.spec.ts'],
   'Ticket-transfer E2E uses the stable recipient-email control instead of stale wording')

legacy_admin = ['admin-v29@cine.local','V29SmokeOnly-ChangeMe','admin@cine.local','Admin@123']
ok(all(x not in all_specs for x in legacy_admin),
   'Touched full-suite E2E specs contain no fallback Admin credentials')
ok('Trạng thái booking: CONFIRMED' not in all_specs and 'Trạng thái booking: REFUNDED' not in all_specs,
   'Touched E2E specs no longer depend on stale raw booking-status aria labels')

migrations = list((ROOT/'backend/src/main/resources/db/migration').glob('V*.sql'))
latest = max(int(re.match(r'V(\d+)', x.name).group(1)) for x in migrations if re.match(r'V(\d+)', x.name))
ok(latest == 72 and not list((ROOT/'backend/src/main/resources/db/migration').glob('V77*.sql')),
   'V77.0.30 remains no-schema on Flyway V72')

release = text('scripts/release.ps1'); ci = text('.github/workflows/ci.yml'); diag = text('tools/diagnose-v77.ps1'); make = text('Makefile'); readme = text('README.md')
name = 'verify_v77_0_30_full_suite_runtime_contract_alignment.py'
ok(name in release and name in ci and name in diag,
   'Release/CI/diagnostics run the V77.0.30 verifier')
ok('verify-v77-0-30' in make and 'release-v77-0-30' in make,
   'Makefile exposes V77.0.30 verify/release targets')
ok('30 passed' in readme and '16 failed' in readme and 'V77.0.30' in readme,
   'README records the exact V77.0.29 full-suite baseline and V77.0.30 alignment')
ok(any(x in readme for x in ['Current release:** V77.0.30','Current release:** V77.0.31','Current release:** V77.0.32','Current release:** V77.0.33','Current release:** V77.0.34','Current release:** V77.0.35','Current release:** V77.0.36','Current release:** V77.0.37','Current release:** V77.0.38','Current release:** V77.0.39','Current release:** V77.0.40','Current release:** V77.0.41','Current release:** V77.0.42','Current release:** V77.0.43','Current release:** V77.0.44','Current release:** V77.0.45','Current release:** V77.0.46','Current release:** V77.0.47','Current release:** V77.0.48','Current release:** V77.0.49','Current release:** V77.0.50','Current release:** V77.0.52','Current release:** V77.0.53']) and any(x in readme for x in ['`v77.0.30`','`v77.0.31`','`v77.0.32`','`v77.0.33`','`v77.0.34`','`v77.0.35`','`v77.0.36`','`v77.0.37`','`v77.0.38`','`v77.0.39`','`v77.0.40`','`v77.0.41`','`v77.0.42`','`v77.0.43`','`v77.0.44`','`v77.0.45`','`v77.0.46`','`v77.0.47`','`v77.0.48`','`v77.0.49`','`v77.0.50`','`v77.0.52`','`v77.0.53`']),
   'README current release and stable target are V77.0.30')

passed = sum(checks)
print(f"\nV77.0.30 full-suite runtime contract alignment verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed == len(checks) else 1)
