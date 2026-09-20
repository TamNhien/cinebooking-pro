from pathlib import Path
import re, subprocess, sys

ROOT = Path(__file__).resolve().parents[1]
checks=[]

def text(rel):
    p=ROOT/rel
    return p.read_text(encoding='utf-8') if p.exists() else ''

def ok(cond,label):
    cond=bool(cond); checks.append(cond); print(f"[ {'OK' if cond else 'FAIL'} ] {label}")

bookings=text('frontend/app/admin/bookings/page.tsx')
intel=text('frontend/app/admin/booking-seat-intelligence/page.tsx')
v78e2e=text('frontend/e2e/v78-language-accessibility-pwa.spec.ts')
sw=text('frontend/public/sw.js')
v78page=text('frontend/app/admin/ux-accessibility-pwa/page.tsx')
release=text('scripts/release.ps1'); ci=text('.github/workflows/ci.yml'); diag=text('tools/diagnose-v78.ps1'); make=text('Makefile'); readme=text('README.md')

ok('data-testid="admin-bookings-cinema-option-v7817" data-i18n-skip="true">{x}</option>' in bookings,
   'Admin Bookings cinema filter options use an exact source-owned business-data boundary')
ok('<select className="input" value={cinema}' in bookings and '<select className="input" value={cinema} data-i18n-skip="true"' not in bookings,
   'Admin Bookings cinema selector itself is not globally exempted')
ok('<option>TẤT CẢ</option>' in bookings,
   'Admin Bookings presentation-owned ALL option remains inside language ownership')
ok('data-testid="admin-booking-modal-movie-title-v7817" data-i18n-skip="true"' in bookings and '{selected.movieTitle}</h2>' in bookings,
   'Admin Booking detail movie-title heading is explicitly source-owned')
ok('data-testid="booking-seat-intelligence-movie-title-v7817" data-i18n-skip="true"' in intel and '{s.movieTitle}</h3>' in intel,
   'V57 responsive movie-title heading is explicitly source-owned')
ok('if (route === "/admin/bookings")' in v78e2e and 'getByTestId("admin-bookings-cinema-option-v7817")' in v78e2e,
   'Focused V78 journey explicitly proves the populated Admin Booking cinema boundary')
ok('if (route === "/admin/booking-seat-intelligence")' in v78e2e and 'getByTestId("booking-seat-intelligence-movie-title-v7817")' in v78e2e,
   'Focused V78 journey explicitly proves the V57 responsive movie-title boundary')
ok('Vietnamese presentation copy leaked on' in v78e2e and "clone.querySelectorAll('[data-i18n-skip=\"true\"]')" in v78e2e,
   'Fail-closed Vietnamese presentation scan remains intact')
ok('"/admin/bookings"' in v78e2e and '"/admin/booking-seat-intelligence"' in v78e2e,
   'V78 browser sweep still covers both hardened Admin routes')

stale_sw=[]
for p in (ROOT/'tools').glob('verify_*.py'):
    if p.name == 'verify_v78_0_17_admin_booking_cinema_business_data_boundary.py':
        continue
    body=p.read_text(encoding='utf-8')
    if 'v78-0-17' in body and ('VERSION' in body or 'sw' in body.lower()) and 'v78-0-18' not in body:
        stale_sw.append(p.name)
ok(not stale_sw, f'Historical Service Worker verifiers are forward-compatible with V78.0.17 (stale={len(stale_sw)})')

stale_readme=[]
for p in (ROOT/'tools').glob('verify_v78*.py'):
    if p.name == 'verify_v78_0_17_admin_booking_cinema_business_data_boundary.py':
        continue
    body=p.read_text(encoding='utf-8')
    if 'Current release:** V78.0.17' in body and 'Current release:** V78.0.18' not in body:
        stale_readme.append(p.name)
ok(not stale_readme, f'Historical V78 current-release guards accept V78.0.17 (stale={len(stale_readme)})')

ok(any(x in sw for x in ['const VERSION = "v78-0-17";','const VERSION = "v78-0-18";','const VERSION = "v78-0-19";','const VERSION = "v78-0-20";']), 'Service Worker generation is V78.0.17 or forward-compatible V78.0.18')
ok(any(x in v78page for x in ['>V78.0.17</span>','>V78.0.18</span>','>V78.0.19</span>','>V78.0.20</span>']), 'Visible V78 Admin surface reports V78.0.17 or forward-compatible V78.0.18')

migrations=list((ROOT/'backend/src/main/resources/db/migration').glob('V*.sql'))
latest=max(int(re.match(r'V(\d+)',p.name).group(1)) for p in migrations if re.match(r'V(\d+)',p.name))
ok(latest==72 and not list((ROOT/'backend/src/main/resources/db/migration').glob('V78*.sql')),
   'V78.0.17 remains no-schema on Flyway V72')
name='verify_v78_0_17_admin_booking_cinema_business_data_boundary.py'
ok(name in release and name in ci and name in diag,
   'Release, CI and V78 diagnostics execute the V78.0.17 verifier')
ok('verify-v78-0-17' in make and 'release-v78-0-17' in make,
   'Makefile exposes V78.0.17 verify/release lifecycle')
ok(any(x in readme for x in ['Current release:** V78.0.17','Current release:** V78.0.18','Current release:** V78.0.19','Current release:** V78.0.20']) and '`v78.0.17`' in readme and 'Admin Booking Cinema Business-Data Boundary' in readme,
   'README records the V78.0.17 Admin Booking cinema business-data boundary release')
ok([p.name for p in ROOT.glob('*.md')]==['README.md'], 'Source keeps one consolidated root README.md')

prev=subprocess.run([sys.executable,'-X','utf8',str(ROOT/'tools/verify_v78_0_16_pricing_rule_business_data_boundary.py')],cwd=ROOT,text=True,encoding='utf-8',errors='replace',capture_output=True)
ok(prev.returncode==0 and '18/18 checks passed' in prev.stdout,
   'V78.0.16 Pricing rule business-data boundary remains green under V78.0.17 metadata')
base=subprocess.run([sys.executable,'-X','utf8',str(ROOT/'tools/verify_v78_ux_accessibility_pwa_5.py')],cwd=ROOT,text=True,encoding='utf-8',errors='replace',capture_output=True)
ok(base.returncode==0 and '27/27 checks passed' in base.stdout,
   'Base V78 UX/Accessibility/PWA verifier remains green')

passed=sum(checks)
print(f"\nV78.0.17 Admin Booking cinema business-data boundary verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed==len(checks) else 1)
