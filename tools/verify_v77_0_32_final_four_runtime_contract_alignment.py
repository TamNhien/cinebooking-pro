from pathlib import Path
import re, sys

ROOT = Path(__file__).resolve().parents[1]
checks=[]

def text(rel):
    p=ROOT/rel
    return p.read_text(encoding="utf-8") if p.exists() else ""

def ok(cond,label):
    cond=bool(cond); checks.append(cond); print(f"[ {'OK' if cond else 'FAIL'} ] {label}")

payments=text('frontend/app/payments/page.tsx')
movie_detail=text('frontend/app/movies/[id]/page.tsx')
finance=text('frontend/app/admin/finance/page.tsx')
booking=text('frontend/e2e/booking-flow.spec.ts')
discovery=text('frontend/e2e/discovery-calendar.spec.ts')
financial=text('frontend/e2e/financial-ledger.spec.ts')
p47=text('frontend/e2e/payment-operations-v47.spec.ts')

ok('data-testid="payment-timeline-toggle"' in payments and 'data-payment-id={p.paymentId}' in payments,
   'Payment history exposes a stable copy-independent timeline toggle per payment')
ok('data-testid="payment-timeline-event"' in payments and 'data-event-type={e.eventType}' in payments and 'data-to-status={e.toStatus||""}' in payments,
   'Payment timeline exposes machine event identity instead of localized enum copy')
ok('getByTestId("payment-timeline-toggle")' in booking and 'data-event-type="PAYMENT_SUCCEEDED"' in booking and 'name: "Xem timeline"' not in booking,
   'Booking journey opens its own payment timeline through stable machine contracts')
ok(p47.count('getByTestId("payment-timeline-toggle")') >= 2 and 'data-event-type="PAYMENT_CANCELLED"' in p47 and 'data-event-type="PAYMENT_RETRY_CREATED"' in p47 and 'data-event-type="PAYMENT_SUCCEEDED"' in p47,
   'V47 fail/cancel/retry/success timeline assertions are localization-independent')
ok((('const m=await api<Movie>(`/movies/${id}`);' in movie_detail) or ('const m=await loadCoreMovie();' in movie_detail)) and movie_detail.index('setMovie(m)') < movie_detail.index('Promise.allSettled'),
   'Movie detail commits the authoritative core movie payload before auxiliary requests')
ok('Promise.allSettled' in movie_detail and 'showtimesResult.status==="fulfilled"' in movie_detail and 'reviewsResult.status==="fulfilled"' in movie_detail and 'similarResult.status==="fulfilled"' in movie_detail,
   'Movie detail isolates showtime/review/recommendation auxiliary endpoint failures')
ok('movie-detail-v31' in discovery and 'data-movie-title' in discovery,
   'Discovery still waits for the real movie-detail payload before September calendar assertions')
ok('data-run-status={data.latestRun?.status||"NOT_RUN"}' in finance,
   'Finance reconciliation exposes a machine-readable authoritative run status')
ok('toHaveAttribute("data-run-status","CLEAN"' in financial and 'toHaveText("CLEAN"' not in financial,
   'Finance E2E asserts CLEAN through machine status while allowing localized copy')
ok('name: "Xem timeline"' not in p47 and 'getByText("PAYMENT_CANCELLED"' not in p47 and 'getByText("PAYMENT_SUCCEEDED"' not in p47,
   'Remaining V47 stale timeline copy assertions are absent')

legacy=['admin-v29@cine.local','V29SmokeOnly-ChangeMe','admin@cine.local','Admin@123']
touched='\n'.join([booking,discovery,financial,p47])
ok(all(x not in touched for x in legacy),
   'Touched V77.0.32 E2E specs continue to reuse only the existing Admin account')

migrations=list((ROOT/'backend/src/main/resources/db/migration').glob('V*.sql'))
latest=max(int(re.match(r'V(\d+)',x.name).group(1)) for x in migrations if re.match(r'V(\d+)',x.name))
ok(latest==72 and not list((ROOT/'backend/src/main/resources/db/migration').glob('V77*.sql')),
   'V77.0.32 remains no-schema on Flyway V72')

release=text('scripts/release.ps1'); ci=text('.github/workflows/ci.yml'); diag=text('tools/diagnose-v77.ps1'); make=text('Makefile'); readme=text('README.md')
name='verify_v77_0_32_final_four_runtime_contract_alignment.py'
ok(name in release and name in ci and name in diag,
   'Release/CI/diagnostics run the V77.0.32 verifier')
ok('verify-v77-0-32' in make and 'release-v77-0-32' in make,
   'Makefile exposes V77.0.32 verify/release targets')
ok('7 passed' in readme and '4 failed' in readme and 'V77.0.32' in readme,
   'README records the exact V77.0.31 focused regression baseline and V77.0.32 fixes')
ok(any(x in readme for x in ['Current release:** V77.0.32','Current release:** V77.0.33','Current release:** V77.0.34','Current release:** V77.0.35','Current release:** V77.0.36','Current release:** V77.0.37','Current release:** V77.0.38','Current release:** V77.0.39','Current release:** V77.0.40','Current release:** V77.0.41','Current release:** V77.0.42','Current release:** V77.0.43','Current release:** V77.0.44','Current release:** V77.0.45','Current release:** V77.0.46','Current release:** V77.0.47','Current release:** V77.0.48','Current release:** V77.0.49','Current release:** V77.0.50','Current release:** V77.0.52']) and any(x in readme for x in ['`v77.0.32`','`v77.0.33`','`v77.0.34`','`v77.0.35`','`v77.0.36`','`v77.0.37`','`v77.0.38`','`v77.0.39`','`v77.0.40`','`v77.0.41`','`v77.0.42`','`v77.0.43`','`v77.0.44`','`v77.0.45`','`v77.0.46`','`v77.0.47`','`v77.0.48`','`v77.0.49`','`v77.0.50`','`v77.0.52`']),
   'README retains V77.0.32 history with a V77.0.32-or-newer stable target')

passed=sum(checks)
print(f"\nV77.0.32 final-four runtime contract alignment verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed==len(checks) else 1)
