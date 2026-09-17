from pathlib import Path
import re, subprocess, sys

ROOT = Path(__file__).resolve().parents[1]
checks=[]

def text(rel):
    p=ROOT/rel
    return p.read_text(encoding='utf-8') if p.exists() else ''

def ok(cond,label):
    cond=bool(cond); checks.append(cond); print(f"[ {'OK' if cond else 'FAIL'} ] {label}")

v77e2e=text('frontend/e2e/crm-automation-5-v77.spec.ts')
v77verify=text('tools/verify_v77_crm_automation_5.py')
v7805verify=text('tools/verify_v78_0_5_admin_audit_presentation_language_ownership.py')
v7806verify=text('tools/verify_v78_0_6_inventory_presentation_language_business_boundaries.py')
v7812verify=text('tools/verify_v78_0_12_maintenance_asset_business_data_boundaries.py')
inv_e2e=text('frontend/e2e/inventory-operations-v48.spec.ts')
v78e2e=text('frontend/e2e/v78-language-accessibility-pwa.spec.ts')
shifts=text('frontend/app/admin/shifts/page.tsx')
staff_ops=text('frontend/app/staff/operations/page.tsx')
maintenance=text('frontend/app/admin/maintenance/page.tsx')
pricing=text('frontend/app/admin/pricing/page.tsx')
quick=text('frontend/components/QuickBooking.tsx')
showtimes=text('frontend/app/admin/showtimes/page.tsx')
checkin=text('frontend/app/staff/check-in/page.tsx')
movie_detail=text('frontend/app/movies/[id]/page.tsx')
seat_layout=text('frontend/app/admin/seat-layout/[auditoriumId]/page.tsx')
pwa=text('frontend/components/PwaManager.tsx')
sw=text('frontend/public/sw.js')
v78page=text('frontend/app/admin/ux-accessibility-pwa/page.tsx')
release=text('scripts/release.ps1'); ci=text('.github/workflows/ci.yml'); diag=text('tools/diagnose-v78.ps1'); make=text('Makefile'); readme=text('README.md')

ok('expect(versions.at(-1)).toBeGreaterThanOrEqual(77);' in v77e2e and 'expect(versions).toContain(76);' in v77e2e,
   'Historical V77 browser contract remains valid when forward V78 tiles are present')
ok('expect(versions.at(-1)).toBe(77);' not in v77e2e,
   'V77 E2E no longer hard-codes V77 as the forever-last Admin version')
ok("toBeGreaterThanOrEqual(77)" in v77verify and "V77 E2E verifies version order through 77 or later" in v77verify,
   'Historical V77 source verifier accepts forward Admin versions during stable release preflight')
ok('Current release:** V78.0.15' in v7805verify,
   'Historical V78.0.5 verifier accepts the current V78.0.15 release metadata')
ok('Current release:** V78.0.15' in v7806verify,
   'Historical V78.0.6 verifier accepts the current V78.0.15 release metadata')
ok("any(x in readme for x in ['Current release:** V78.0.12'" in v7812verify and "'Current release:** V78.0.15'" in v7812verify,
   'V78.0.12 README forward-compatibility guard uses explicit boolean membership instead of tuple truthiness')
ok(inv_e2e.count('page.locator(\'[role="status"].card\')') >= 5,
   'V48 inventory feedback assertions are scoped away from the global PWA status live region')
ok('page.getByRole("status")' not in inv_e2e,
   'V48 inventory E2E has no ambiguous global status-role locator')
ok('data-testid="pwa-live-region-v7814"' in pwa and 'role="status"' in pwa,
   'Persistent PWA live-region accessibility contract remains intact')

ok('data-testid="admin-shift-staff-option-v7815" data-i18n-skip="true"' in shifts,
   'Admin Shift staff options use an exact staff/cinema business-data boundary')
ok('getByTestId("admin-shift-staff-option-v7815")' in v78e2e,
   'Focused V78 journey explicitly proves the populated Admin Shift staff-option boundary')
ok('data-testid="staff-operations-handover-recipient-v7815" data-i18n-skip="true"' in staff_ops,
   'Staff Operations handover recipient options preserve employee names as source-owned data')
ok('data-testid="staff-operations-live-cinema-v7815" data-i18n-skip="true"' in staff_ops,
   'Staff Operations live cinema heading isolates only the business-data fragment')
ok('data-testid="maintenance-assignee-option-v7815" data-i18n-skip="true"' in maintenance,
   'Maintenance assignee options preserve employee names as source-owned data')
ok('data-testid="pricing-showtime-option-v7815" data-i18n-skip="true"' in pricing,
   'Pricing preview showtime options preserve movie/cinema/auditorium business data')
ok('data-testid="quick-booking-movie-option-v7815" data-i18n-skip="true"' in quick,
   'Quick Booking movie options preserve source movie titles')
ok('data-testid="quick-booking-cinema-option-v7815" data-i18n-skip="true"' in quick,
   'Quick Booking cinema options preserve source cinema names')
ok(showtimes.count('data-testid="showtime-movie-option-v7815" data-i18n-skip="true"') >= 2,
   'Admin Showtime movie selectors consistently preserve source movie titles')
ok('data-testid="staff-checkin-movie-title-v7815" data-i18n-skip="true"' in checkin,
   'Staff check-in result movie title is explicitly source-owned')
ok('data-testid="movie-detail-title-v7815" data-i18n-skip="true"' in movie_detail and 'data-testid="movie-detail-cinema-v7815" data-i18n-skip="true"' in movie_detail,
   'Movie detail title and cinema heading use narrow business-data boundaries')
ok('data-testid="seat-layout-auditorium-name-v7815" data-i18n-skip="true"' in seat_layout,
   'Seat-layout auditorium name is isolated from presentation copy')

# Guard against broad exemptions on affected control containers.
ok('<select className="input" value={form.staffUserId}' in shifts and '<select className="input" value={form.staffUserId}' not in shifts.split('data-i18n-skip="true"')[0][-120:],
   'Admin Shift selector itself is not globally exempted')
ok('Vietnamese presentation copy leaked on' in v78e2e and "clone.querySelectorAll('[data-i18n-skip=\"true\"]')" in v78e2e,
   'Fail-closed browser language scan still removes only explicit narrow boundaries')
routes_block=re.search(r'const routes\s*=\s*\[(.*?)\];',v78e2e,re.S)
route_count=len(re.findall(r'"(/[^"\n]*)"',routes_block.group(1))) if routes_block else 0
ok(route_count==67, f'Focused V78 browser sweep still covers every static page route ({route_count}/67)')
ok(all(x in v78e2e for x in ['Command center V53','CRM automation V77','UX & PWA V78']),
   'Admin version-title EN assertions remain intact through V78')

ok(any(x in sw for x in ['const VERSION = "v78-0-15";','const VERSION = "v78-0-16";','const VERSION = "v78-0-17";','const VERSION = "v78-0-18";']), 'Service Worker generation is V78.0.15 or forward-compatible V78.0.16')
ok(any(x in v78page for x in ['>V78.0.15</span>','>V78.0.16</span>','>V78.0.17</span>','>V78.0.18</span>']), 'Visible V78 Admin surface reports V78.0.15 or forward-compatible V78.0.16')
migrations=list((ROOT/'backend/src/main/resources/db/migration').glob('V*.sql'))
latest=max(int(re.match(r'V(\d+)',p.name).group(1)) for p in migrations if re.match(r'V(\d+)',p.name))
ok(latest==72 and not list((ROOT/'backend/src/main/resources/db/migration').glob('V78*.sql')),
   'V78.0.15 remains no-schema on Flyway V72')
name='verify_v78_0_15_full_suite_runtime_business_data_hardening.py'
ok(name in release and name in ci and name in diag,
   'Release, CI and V78 diagnostics execute the V78.0.15 verifier')
ok('verify-v78-0-15' in make and 'release-v78-0-15' in make,
   'Makefile exposes V78.0.15 verify/release lifecycle')
ok(any(x in readme for x in ['Current release:** V78.0.15','Current release:** V78.0.16','Current release:** V78.0.17','Current release:** V78.0.18']) and '`v78.0.15`' in readme and 'Full-Suite Runtime Business-Data Hardening' in readme,
   'README preserves the V78.0.15 full-suite/runtime-data hardening release under forward metadata')
ok([p.name for p in ROOT.glob('*.md')]==['README.md'], 'Source keeps one consolidated root README.md')

prev=subprocess.run([sys.executable,'-X','utf8',str(ROOT/'tools/verify_v78_0_14_pwa_live_region_stability.py')],cwd=ROOT,text=True,encoding='utf-8',errors='replace',capture_output=True)
ok(prev.returncode==0 and '21/21 checks passed' in prev.stdout,
   'V78.0.14 persistent PWA live-region stability remains green')
comp=subprocess.run([sys.executable,'-X','utf8',str(ROOT/'tools/verify_v78_0_13_comprehensive_language_ownership.py')],cwd=ROOT,text=True,encoding='utf-8',errors='replace',capture_output=True)
ok(comp.returncode==0 and '26/26 checks passed' in comp.stdout,
   'V78.0.13 comprehensive language ownership remains green')

passed=sum(checks)
print(f"\nV78.0.15 full-suite/runtime business-data hardening verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed==len(checks) else 1)
