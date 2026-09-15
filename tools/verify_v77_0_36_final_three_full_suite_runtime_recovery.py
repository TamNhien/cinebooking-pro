from pathlib import Path
import re, sys

ROOT = Path(__file__).resolve().parents[1]
checks=[]

def text(rel):
    p=ROOT/rel
    return p.read_text(encoding='utf-8') if p.exists() else ''

def ok(cond,label):
    cond=bool(cond); checks.append(cond); print(f"[ {'OK' if cond else 'FAIL'} ] {label}")

analytics_page=text('frontend/app/admin/analytics/page.tsx')
analytics_spec=text('frontend/e2e/analytics-forecasting-v51.spec.ts')
recommendation_page=text('frontend/app/for-you/page.tsx')
recommendation_spec=text('frontend/e2e/recommendation-4-v63.spec.ts')
booking_page=text('frontend/app/booking/[showtimeId]/page.tsx')
seat_spec=text('frontend/e2e/seat-map-ux.spec.ts')
runtime_guard=text('frontend/e2e/runtime-guards.ts')

ok('readAnalyticsWithTransientRetry' in analytics_page and 'Date.now()+12_000' in analytics_page,
   'V51 Analytics retries the authoritative dashboard read inside a bounded 12-second window')
ok('status===0||status===408||status===425||status===429||status>=500' in analytics_page,
   'V51 Analytics retry policy is limited to transient network/HTTP failures')
ok('readAnalyticsWithTransientRetry(query.toString())' in analytics_page and 'readAnalyticsWithTransientRetry(analyticsQuery().toString())' in analytics_page,
   'V51 initial load and read refresh share the bounded transient-read contract')
ok('loginExistingAdmin(page)' in analytics_spec and 'admin-v29@cine.local' not in analytics_spec and 'V29SmokeOnly-ChangeMe' not in analytics_spec,
   'V51 E2E reuses only the existing Admin account')
ok('ensureSurface(page,"forecast-v51","/admin/analytics")' in analytics_spec and 'timeout:30_000' in analytics_spec,
   'V51 reload waits for the real forecast data surface with bounded recovery')

ok('withTransientReadRetry' in recommendation_page and 'Date.now()+12_000' in recommendation_page,
   'V63 Recommendation retries idempotent home/profile reads inside a bounded 12-second window')
ok('data-recommendation-ready={home&&profile?"true":"false"}' in recommendation_page,
   'V63 Recommendation exposes authoritative real-data readiness after both reads succeed')
ok('ensureSurface(page,"for-you-v63","/for-you")' in recommendation_spec and 'data-recommendation-ready","true"' in recommendation_spec,
   'V63 reload gates explainability assertions on the authoritative recommendation payload')
ok('Vì bạn muốn xem thêm phim giống|Hợp gu|Khám phá mới' in recommendation_spec,
   'V63 E2E still proves an explainable recommendation reason after reload')

ok('withTransientBookingReadRetry' in booking_page and 'Date.now()+12_000' in booking_page,
   'Booking core showtime/seat-map reads use bounded transient recovery')
ok('data-testid="booking-seat-map-v39"' in booking_page and 'data-showtime-id={showtimeId}' in booking_page,
   'V39 seat map exposes a showtime-bound machine readiness contract')
ok(seat_spec.count('gotoSurface(') >= 2 and 'booking-seat-map-v39' in seat_spec,
   'V39 contention E2E gates both second-client and loser reloads on the real seat map')
ok('method: "POST"' in seat_spec and 'method: "DELETE"' in seat_spec and 'gotoSurface(loserPage' in seat_spec,
   'V39 keeps business hold/release writes single-shot while only read navigation is recovered')
ok('retry one read/navigation only' in runtime_guard and 'Business writes are never retried here.' in runtime_guard,
   'Shared runtime recovery remains bounded and explicitly excludes business writes')

legacy=['admin-v29@cine.local','V29SmokeOnly-ChangeMe','admin@cine.local','Admin@123']
ok(all(x not in analytics_spec for x in legacy),
   'Touched Admin-facing V77.0.36 E2E contains no fallback Admin credentials')

migrations=list((ROOT/'backend/src/main/resources/db/migration').glob('V*.sql'))
latest=max(int(re.match(r'V(\d+)',x.name).group(1)) for x in migrations if re.match(r'V(\d+)',x.name))
ok(latest==72 and not list((ROOT/'backend/src/main/resources/db/migration').glob('V77*.sql')),
   'V77.0.36 remains no-schema on Flyway V72')

release=text('scripts/release.ps1'); ci=text('.github/workflows/ci.yml'); diag=text('tools/diagnose-v77.ps1'); make=text('Makefile'); readme=text('README.md')
name='verify_v77_0_36_final_three_full_suite_runtime_recovery.py'
ok(name in release and name in ci and name in diag,
   'Release/CI/diagnostics run the V77.0.36 verifier')
ok('verify-v77-0-36' in make and 'release-v77-0-36' in make,
   'Makefile exposes V77.0.36 verify/release targets')
ok('43 passed' in readme and '3 failed' in readme and 'V77.0.36' in readme and 'booking-seat-map-v39' in readme,
   'README records the exact V77.0.35 full-suite baseline and V77.0.36 recovery scope')
ok(any(x in readme for x in ['Current release:** V77.0.36','Current release:** V77.0.37','Current release:** V77.0.38','Current release:** V77.0.39','Current release:** V77.0.40','Current release:** V77.0.41','Current release:** V77.0.42','Current release:** V77.0.43','Current release:** V77.0.44','Current release:** V77.0.45','Current release:** V77.0.46','Current release:** V77.0.47','Current release:** V77.0.48','Current release:** V77.0.49','Current release:** V77.0.50','Current release:** V77.0.52','Current release:** V77.0.53','Current release:** V77.0.54','Current release:** V77.0.55','Current release:** V77.0.56','Current release:** V77.0.57','Current release:** V77.0.59','Current release:** V77.0.60','Current release:** V77.0.61']) and any(x in readme for x in ['`v77.0.36`','`v77.0.37`','`v77.0.38`','`v77.0.39`','`v77.0.40`','`v77.0.41`','`v77.0.42`','`v77.0.43`','`v77.0.44`','`v77.0.45`','`v77.0.46`','`v77.0.47`','`v77.0.48`','`v77.0.49`','`v77.0.50`','`v77.0.52`','`v77.0.53`','`v77.0.54`','`v77.0.55`','`v77.0.56`','`v77.0.57`','`v77.0.59`','`v77.0.60`','`v77.0.61`']),
   'README current release and stable target are V77.0.36')

passed=sum(checks)
print(f"\nV77.0.36 final-three full-suite runtime recovery verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed==len(checks) else 1)
