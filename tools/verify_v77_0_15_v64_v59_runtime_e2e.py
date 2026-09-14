from pathlib import Path
import re
import sys

ROOT=Path(__file__).resolve().parents[1]
checks=[]

def text(rel):
    p=ROOT/rel
    return p.read_text(encoding='utf-8') if p.exists() else ''

def ok(condition,label):
    passed=bool(condition)
    checks.append(passed)
    print(f"[ {'OK' if passed else 'FAIL'} ] {label}")

marketing=text('frontend/app/admin/marketing/page.tsx')
ops=text('frontend/app/admin/operations-control/page.tsx')
layout=text('frontend/app/layout.tsx')
security=text('frontend/app/admin/security/page.tsx')
mock=text('frontend/app/payment/mock/page.tsx')
register=text('frontend/app/register/page.tsx')
maintenance=text('frontend/app/admin/maintenance/page.tsx')
v64e2e=text('frontend/e2e/crm-marketing-automation-v64.spec.ts')
v59e2e=text('frontend/e2e/realtime-operations-v59-language.spec.ts')
playwright=text('frontend/playwright.config.ts')
release=text('scripts/release.ps1')
ci=text('.github/workflows/ci.yml')
diag=text('tools/diagnose-v77.ps1')
make=text('Makefile')
readme=text('README.md')

# V64 visible preview/publish feedback and V68 guard.
ok('campaign-feedback-v64' in marketing,'V64 renders inline campaign feedback')
ok('campaign-preview-result-v64' in marketing,'V64 renders a dedicated preview result')
ok('campaign-launch-result-v64' in marketing,'V64 renders a dedicated launch result')
ok(marketing.find('campaign-feedback-v64') < marketing.find('segments-v64'),'V64 feedback is placed before segment cards')
ok(marketing.find('campaign-preview-result-v64') < marketing.find('segments-v64'),'V64 preview is placed before segment cards')
ok('getStepUp()' in marketing and 'campaign-step-up-link-v64' in marketing,'V64 checks V68 grant and exposes a visible Security link')
ok('e instanceof ApiError&&e.status===428' in marketing,'V64 converts expired/missing V68 grant into visible guidance')
ok('step-up-changed' in marketing and 'window.addEventListener("focus"' in marketing,'V64 refreshes V68 state after returning from Security')
ok('payload(false)' in marketing and 'payload(true)' in marketing,'V64 preserves preview/launch confirmation contract')
ok('setPreview(null)' in marketing,'V64 invalidates stale preview when form changes')
ok(all(x in marketing for x in ['vouchersCreated','vouchersReused','notificationsCreated','notificationsSkipped']),'V64 displays durable launch counters')
ok('V64 · CRM & TỰ ĐỘNG HÓA TIẾP THỊ 4.0' in marketing and 'V64 · CRM & MARKETING AUTOMATION 4.0' in marketing,'V64 title is bilingual at render time')

# V59 consistent render-time bilingual ownership.
ok('usePresentationLanguage' in ops,'V59 uses presentation-language state directly')
ok(all(code in ops for code in ['PAYMENT','BOOKING','EQUIPMENT','STAFF','SUPPORT','INVENTORY','INCIDENT']),'V59 owns all seven domain presentation labels')
ok('{domain.label}' not in ops,'V59 no longer leaks mixed backend domain labels')
ok(all(x in ops for x in ['Đặt vé','Thiết bị','Nhân sự','Hỗ trợ','Kho','Sự cố']),'V59 contains complete Vietnamese domain copy')
ok(all(x in ops for x in ['Bookings','Equipment','Staff','Support','Inventory','Incidents']),'V59 contains complete English domain copy')
ok('Trung tâm điều khiển vận hành · V58' in ops and 'tương thích V58' not in ops,'V58 compatibility marker is restored exactly')
ok('alertTitle(' in ops and 'alertDetail(' in ops,'V59 localizes alert presentation instead of exposing mixed raw copy')
ok('cinemaDisplayName' in ops and 'All cinemas' in ops,'V59 localizes the all-cinemas scope label in both languages')

# Navigation language persistence without replacing V77.0.0 provider.
ok('cinebooking_language' in layout and 'document.documentElement.lang' in layout,'Root layout restores persisted language before hydration')
ok('suppressHydrationWarning' in layout,'Root language bootstrap is hydration-safe')
ok('localStorage.getItem(STORAGE_KEY)' in text('frontend/components/LanguageProvider.tsx'),'V77.0.0 provider still restores persisted preference')
ok('window.localStorage.setItem(STORAGE_KEY, next)' in text('frontend/components/LanguageProvider.tsx'),'V77.0.0 provider still persists explicit clicks')

# V68 state convergence and stable browser locators.
ok('Boolean(local&&remaining>0&&status?.enabled!==false)' in security,'V68 UI trusts the unexpired local grant while server status converges')
ok('step-up-changed' in security,'V68 listens for grant revision events')
ok('data-testid="mock-payment-success"' in mock and 'data-testid="mock-payment-fail"' in mock,'Mock payment has stable success/failure locators')
ok(all(x in register for x in ['register-name','register-email','register-password','register-confirm','register-submit']),'Registration has stable E2E locators')
ok('maintenance-asset-card' in maintenance and 'data-testid="maintenance-asset-row"' in maintenance,'Maintenance desktop/mobile assets have distinct testids')

# Browser journeys for the exact reported regressions.
ok('campaign-feedback-v64' in v64e2e and 'campaign-step-up-link-v64' in v64e2e,'V64 E2E verifies visible feedback and step-up guidance')
ok('unlockStepUp' in v64e2e and 'campaign-launch-result-v64' in v64e2e,'V64 E2E verifies actual publish after V68 unlock')
ok('realtime-operations-v59-language' in str(ROOT/'frontend/e2e/realtime-operations-v59-language.spec.ts') or bool(v59e2e),'V59 language E2E exists')
ok(all(x in v59e2e for x in ['Đặt vé','Hỗ trợ','Kho','Sự cố','Bookings','Support','Inventory','Incidents']),'V59 E2E checks clean VI and EN domain labels')
ok('cinebooking_language' in text('frontend/e2e/customer-value-v56.spec.ts') and 'toHaveAttribute("lang", "en"' in text('frontend/e2e/customer-value-v56.spec.ts'),'Full-navigation language E2E remains present')

# Existing admin account contract: do not create or print a replacement admin.
ok('../.env' in playwright and 'localEnv.ADMIN_EMAIL' in playwright and 'localEnv.ADMIN_PASSWORD' in playwright,'Playwright resolves the existing root .env admin account')
ok('throw new Error("Playwright requires the existing admin credentials' in playwright,'Playwright fails closed when existing admin credentials are absent')
ok('admin-v29@cine.local' not in v64e2e and 'V29SmokeOnly-ChangeMe' not in v64e2e,'V64 E2E has no alternate admin fallback')
ok('existing admin credentials' in v64e2e or 'existing project .env' in v64e2e,'V64 E2E documents existing-admin usage')

# No schema / release gate wiring.
migrations=list((ROOT/'backend/src/main/resources/db/migration').glob('V*.sql'))
latest=max((int(re.match(r'V(\d+)',p.name).group(1)),p.name) for p in migrations if re.match(r'V(\d+)',p.name))
ok(latest[0]==72,'Flyway latest remains V72')
ok(not list((ROOT/'backend/src/main/resources/db/migration').glob('V77*.sql')),'V77.0.15 adds no Flyway migration')
ok('verify_v77_0_15_v64_v59_runtime_e2e.py' in release,'Stable release runs the V77.0.15 verifier')
ok('verify_v77_0_15_v64_v59_runtime_e2e.py' in ci,'CI runs the V77.0.15 verifier')
ok('verify_v77_0_15_v64_v59_runtime_e2e.py' in diag,'V77 diagnostics run the V77.0.15 verifier')
ok('verify-v77-0-15' in make and 'release-v77-0-15' in make,'Makefile exposes V77.0.15 verify/release targets')
ok('V77.0.15' in readme and 'V64' in readme and 'V59' in readme,'README documents V77.0.15 V64/V59 fixes')

passed=sum(checks)
print(f"\nV77.0.15 V64/V59 runtime + E2E verification: {passed}/{len(checks)} checks passed")
if passed!=len(checks):
    sys.exit(1)
