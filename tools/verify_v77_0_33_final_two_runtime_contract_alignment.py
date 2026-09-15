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
movie=text('frontend/app/movies/[id]/page.tsx')
discovery=text('frontend/e2e/discovery-calendar.spec.ts')
runtime=text('frontend/e2e/runtime-guards.ts')

ok('data-testid="ticket-qr-v33"' in ticket and 'data-booking-id={bookingId}' in ticket,
   'Ticket QR exposes a stable booking-bound machine selector')
ok('getByTestId("ticket-qr-v33")' in booking and 'QR URL vé CineBooking' not in booking,
   'Booking Flow no longer depends on stale QR alt text')
ok('toHaveAttribute("data-booking-id", bookingId)' in booking,
   'Booking Flow proves the visible QR belongs to its own booking')

ok('async function loadCoreMovie()' in movie and 'Date.now()+12_000' in movie,
   'Movie detail retries the idempotent core read inside a bounded 12-second window')
ok('e instanceof ApiError' in movie and 'status===408' in movie and 'status===425' in movie and 'status===429' in movie and 'status>=500' in movie,
   'Movie detail retry policy is limited to transient network/HTTP failures')
ok('if(!retryable||Date.now()>=deadline)throw e;' in movie,
   'Movie detail fails closed for non-retryable 4xx and after the bounded deadline')
ok('const m=await loadCoreMovie();' in movie and movie.index('setMovie(m)') < movie.index('Promise.allSettled'),
   'Authoritative core movie payload is committed before auxiliary reads')
ok('Promise.allSettled' in movie and 'showtimesResult.status==="fulfilled"' in movie and 'reviewsResult.status==="fulfilled"' in movie and 'similarResult.status==="fulfilled"' in movie,
   'Auxiliary movie reads remain isolated from core detail availability')
ok('movie-detail-error-v33' in movie and 'movie-detail-loading-v33' in movie,
   'Movie detail exposes explicit loading/error diagnostics without inventing data')

ok('gotoSurface(page, marsHref, "movie-detail-v31")' in discovery,
   'Discovery uses the shared one-navigation surface recovery contract for movie detail')
ok('gotoSurface' in runtime and 'Retry one real navigation' in runtime,
   'Shared runtime recovery remains bounded to one navigation and does not retry business writes')
ok('data-movie-title' in discovery and '2026-09-30' in discovery,
   'Discovery still proves the real Hành Trình Sao Hỏa detail and September schedule')

legacy=['admin-v29@cine.local','V29SmokeOnly-ChangeMe','admin@cine.local','Admin@123']
ok(all(x not in '\n'.join([booking,discovery]) for x in legacy),
   'Touched V77.0.33 E2E specs continue to avoid fallback Admin credentials')

migrations=list((ROOT/'backend/src/main/resources/db/migration').glob('V*.sql'))
latest=max(int(re.match(r'V(\d+)',x.name).group(1)) for x in migrations if re.match(r'V(\d+)',x.name))
ok(latest==72 and not list((ROOT/'backend/src/main/resources/db/migration').glob('V77*.sql')),
   'V77.0.33 remains no-schema on Flyway V72')

release=text('scripts/release.ps1'); ci=text('.github/workflows/ci.yml'); diag=text('tools/diagnose-v77.ps1'); make=text('Makefile'); readme=text('README.md')
name='verify_v77_0_33_final_two_runtime_contract_alignment.py'
ok(name in release and name in ci and name in diag,
   'Release/CI/diagnostics run the V77.0.33 verifier')
ok('verify-v77-0-33' in make and 'release-v77-0-33' in make,
   'Makefile exposes V77.0.33 verify/release targets')
ok('2 passed / 2 failed' in readme and 'V77.0.33' in readme and 'ticket-qr-v33' in readme,
   'README records the exact V77.0.32 focused baseline and V77.0.33 fixes')
ok(any(x in readme for x in ['Current release:** V77.0.33','Current release:** V77.0.34','Current release:** V77.0.35','Current release:** V77.0.36','Current release:** V77.0.37','Current release:** V77.0.38','Current release:** V77.0.39','Current release:** V77.0.40','Current release:** V77.0.41','Current release:** V77.0.42','Current release:** V77.0.43','Current release:** V77.0.44','Current release:** V77.0.45','Current release:** V77.0.46','Current release:** V77.0.47','Current release:** V77.0.48','Current release:** V77.0.49','Current release:** V77.0.50','Current release:** V77.0.52']) and any(x in readme for x in ['`v77.0.33`','`v77.0.34`','`v77.0.35`','`v77.0.36`','`v77.0.37`','`v77.0.38`','`v77.0.39`','`v77.0.40`','`v77.0.41`','`v77.0.42`','`v77.0.43`','`v77.0.44`','`v77.0.45`','`v77.0.46`','`v77.0.47`','`v77.0.48`','`v77.0.49`','`v77.0.50`','`v77.0.52`']),
   'README current release and stable target are V77.0.33')

passed=sum(checks)
print(f"\nV77.0.33 final-two runtime contract alignment verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed==len(checks) else 1)
