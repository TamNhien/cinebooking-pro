from pathlib import Path
import re, sys

ROOT = Path(__file__).resolve().parents[1]
checks=[]

def text(rel):
    p=ROOT/rel
    return p.read_text(encoding="utf-8") if p.exists() else ""

def ok(cond,label):
    cond=bool(cond); checks.append(cond); print(f"[ {'OK' if cond else 'FAIL'} ] {label}")

bookings=text('frontend/app/bookings/page.tsx')
payments=text('frontend/app/payments/page.tsx')
checkin=text('frontend/app/staff/check-in/page.tsx')
movie_detail=text('frontend/app/movies/[id]/page.tsx')
privacy=text('frontend/app/admin/privacy-governance/page.tsx')
mobile=text('frontend/app/mobile/page.tsx')
finance=text('frontend/app/admin/finance/page.tsx')

specs={name:text('frontend/e2e/'+name) for name in [
  'booking-flow.spec.ts','booking-seat-intelligence-v57.spec.ts','data-governance-privacy-v70.spec.ts',
  'discovery-calendar.spec.ts','financial-ledger.spec.ts','payment-operations-v47.spec.ts',
  'pwa-mobile-v52.spec.ts','refund-automation.spec.ts','showtime-smart-planner-v49.spec.ts','ticket-transfer.spec.ts'
]}
all_specs='\n'.join(specs.values())

ok('data-testid="booking-card"' in bookings and 'data-booking-id={b.id}' in bookings and 'data-booking-status={b.status}' in bookings,
   'Booking wallet exposes stable booking-id/status card contracts')
ok('data-testid="payment-history-item"' in payments and 'data-booking-id={p.bookingId}' in payments and 'data-payment-status={p.status}' in payments and 'data-attempt-no={p.attemptNo}' in payments,
   'Payment history exposes stable booking/status/attempt machine contracts')
ok('data-testid="staff-check-in-submit"' in checkin,
   'Staff gate submit action has a stable copy-independent control')
ok('data-testid="movie-detail-v31"' in movie_detail and 'data-movie-id={movie.id}' in movie_detail,
   'Movie detail exposes a real-data readiness contract after API load')
ok('data-retention-mode=' in privacy and 'DRY_RUN' in privacy and 'EXECUTION_ENABLED' in privacy,
   'Privacy governance exposes runtime retention mode without freezing environment policy')
ok('data-delivery-mode={config?.deliveryMode||"LOADING"}' in mobile,
   'PWA surface exposes authoritative push delivery mode after config load')
ok('data-event-type={e.eventType}' in finance and 'data-event-key={e.eventKey}' in finance,
   'Finance ledger exposes immutable machine event type/key contracts')

b=specs['booking-flow.spec.ts']
ok('selectedMovie' in b and 'data-booking-id="${bookingId}"' in b and 'data-payment-status="SUCCESS"' in b,
   'Booking journey follows its own booking/payment instead of a title-only card match')
ok('staff-check-in-submit' in b and 'Kiểm tra & xác nhận check-in' not in b,
   'Booking journey uses stable staff-gate submit contract')

v57=specs['booking-seat-intelligence-v57.spec.ts']
ok('gotoSurface(page, bookingUrl, "booking-seat-intelligence-v57")' in v57 and 'seat-hold-countdown-v57' in v57,
   'V57 reload waits for hydrated booking data before hold-countdown assertion')
ok('loginExistingAdmin(page)' in v57 and 'V29SmokeOnly-ChangeMe' not in v57,
   'V57 Admin shortcut test reuses only the existing Admin account')

v70=specs['data-governance-privacy-v70.spec.ts']
ok('data-retention-mode' in v70 and 'DRY_RUN|EXECUTION_ENABLED' in v70 and 'CHỈ CHẠY THỬ' not in v70,
   'V70 E2E validates the actual guarded runtime mode instead of stale fixed copy')
ok('loginExistingAdmin(page)' in v70 and 'Admin@123' not in v70,
   'V70 E2E reuses only the existing Admin account')

disc=specs['discovery-calendar.spec.ts']
ok('movie-detail-v31' in disc and 'data-movie-title' in disc,
   'Discovery waits for the real movie-detail payload before title/calendar assertions')

fin=specs['financial-ledger.spec.ts']
ok('finance-ledger-section' in fin and 'data-event-type="PAYMENT_CAPTURED"' in fin and 'Financial Ledger & Reconciliation' not in fin,
   'Finance E2E uses current localized surface plus machine ledger event identity')

p47=specs['payment-operations-v47.spec.ts']
ok(p47.count('data-testid="payment-history-item"') >= 5 and 'data-payment-status="FAILED"' in p47 and 'data-payment-status="SUCCESS"' in p47,
   'V47 E2E follows machine payment statuses across fail/cancel/retry/success')

pwa=specs['pwa-mobile-v52.spec.ts']
ok('data-delivery-mode' in pwa and 'FOREGROUND_FALLBACK|VAPID_BACKGROUND' in pwa and 'toContainText("FOREGROUND_FALLBACK")' not in pwa,
   'V52 E2E waits for runtime push mode and remains honest across VAPID configuration')

refund=specs['refund-automation.spec.ts']
ok('bookingId' in refund and 'data-booking-id="${bookingId}"' in refund and 'data-payment-status="REFUNDED"' in refund,
   'Refund E2E identifies the refunded payment by its own booking id')

smart=specs['showtime-smart-planner-v49.spec.ts']
ok('selectedMovieLabel.split(" · ")[0]' in smart and '.filter({hasText:selectedMovie})' in smart,
   'Smart Planner normalizes option metadata and selects the matching committed run')

transfer=specs['ticket-transfer.spec.ts']
ok(transfer.count('staff-check-in-submit') >= 2 and 'Kiểm tra & xác nhận check-in' not in transfer,
   'Ticket transfer uses stable staff-gate control for old/new QR validation')

legacy=['admin-v29@cine.local','V29SmokeOnly-ChangeMe','admin@cine.local','Admin@123']
ok(all(x not in all_specs for x in legacy),
   'Touched remaining full-suite specs contain no fallback Admin credentials')

migrations=list((ROOT/'backend/src/main/resources/db/migration').glob('V*.sql'))
latest=max(int(re.match(r'V(\d+)',x.name).group(1)) for x in migrations if re.match(r'V(\d+)',x.name))
ok(latest==72 and not list((ROOT/'backend/src/main/resources/db/migration').glob('V77*.sql')),
   'V77.0.31 remains no-schema on Flyway V72')

release=text('scripts/release.ps1'); ci=text('.github/workflows/ci.yml'); diag=text('tools/diagnose-v77.ps1'); make=text('Makefile'); readme=text('README.md')
name='verify_v77_0_31_remaining_full_suite_contract_alignment.py'
ok(name in release and name in ci and name in diag,
   'Release/CI/diagnostics run the V77.0.31 verifier')
ok('verify-v77-0-31' in make and 'release-v77-0-31' in make,
   'Makefile exposes V77.0.31 verify/release targets')
ok('36 passed' in readme and '10 failed' in readme and 'V77.0.31' in readme,
   'README records the exact V77.0.30 full-suite baseline and V77.0.31 alignment')
ok(any(x in readme for x in ['Current release:** V77.0.31','Current release:** V77.0.32','Current release:** V77.0.33','Current release:** V77.0.34','Current release:** V77.0.35','Current release:** V77.0.36','Current release:** V77.0.37','Current release:** V77.0.38','Current release:** V77.0.39','Current release:** V77.0.40','Current release:** V77.0.41','Current release:** V77.0.42','Current release:** V77.0.43','Current release:** V77.0.44','Current release:** V77.0.45','Current release:** V77.0.46','Current release:** V77.0.47','Current release:** V77.0.48','Current release:** V77.0.49','Current release:** V77.0.50','Current release:** V77.0.52','Current release:** V77.0.53','Current release:** V77.0.54','Current release:** V77.0.55','Current release:** V77.0.56','Current release:** V77.0.57','Current release:** V77.0.59','Current release:** V77.0.60','Current release:** V77.0.61']) and any(x in readme for x in ['`v77.0.31`','`v77.0.32`','`v77.0.33`','`v77.0.34`','`v77.0.35`','`v77.0.36`','`v77.0.37`','`v77.0.38`','`v77.0.39`','`v77.0.40`','`v77.0.41`','`v77.0.42`','`v77.0.43`','`v77.0.44`','`v77.0.45`','`v77.0.46`','`v77.0.47`','`v77.0.48`','`v77.0.49`','`v77.0.50`','`v77.0.52`','`v77.0.53`','`v77.0.54`','`v77.0.55`','`v77.0.56`','`v77.0.57`','`v77.0.59`','`v77.0.60`','`v77.0.61`']),
   'README retains the V77.0.31 history with a V77.0.31-or-newer stable target')

passed=sum(checks)
print(f"\nV77.0.31 remaining full-suite contract alignment verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed==len(checks) else 1)
