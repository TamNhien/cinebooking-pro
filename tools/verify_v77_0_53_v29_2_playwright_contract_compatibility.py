#!/usr/bin/env python3
from __future__ import annotations
import re, sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
checks=[]
def text(rel:str)->str:
    p=ROOT/rel
    return p.read_text(encoding='utf-8') if p.exists() else ''
def ok(cond:bool,label:str)->None:
    cond=bool(cond); checks.append(cond); print(f"[ {'OK' if cond else 'FAIL'} ] {label}")

legacy=text('tools/verify_v29_2_playwright_e2e.py')
spec=text('frontend/e2e/booking-flow.spec.ts')
guards=text('frontend/e2e/runtime-guards.ts')
ci=text('.github/workflows/ci.yml')
release=text('scripts/release.ps1')
diag=text('tools/diagnose-v77.ps1')
make=text('Makefile')
readme=text('README.md')
sw=text('frontend/public/sw.js')
prev=text('tools/verify_v77_0_52_full_suite_transient_read_resilience.py')
v29=text('tools/verify_v77_0_29_frontend_healthcheck_contract.py')

ok('runtime_guards = text("frontend/e2e/runtime-guards.ts")' in legacy,
   'Historical V29.2 verifier reads the shared current runtime guard contract')
ok('getByTestId("register-submit")' in legacy and 'gia.huy+${stamp}@example.com' in legacy,
   'Historical V29.2 registration check accepts the current unique-customer locator contract')
ok('gotoSurface(page, "/login", "login-email")' in legacy and 'CUSTOMER_PASSWORD' in legacy,
   'Historical V29.2 login check accepts current explicit login navigation')
ok('getByTestId("mock-payment-success")' in legacy and 'data-booking-status="CONFIRMED"' in legacy,
   'Historical V29.2 payment check requires current mock success and confirmed booking evidence')
ok('getByTestId("ticket-qr-v33")' in legacy and '/api/tickets/${id}' in legacy and 'qrUrl' in legacy,
   'Historical V29.2 QR check accepts current signed ticket contract')
ok('getByTestId("staff-check-in-submit")' in legacy and 'Soát vé.*thành công' in legacy,
   'Historical V29.2 staff gate check accepts current submit and success contract')
ok('loginExistingAdmin' in legacy and 'process.env.E2E_ADMIN_EMAIL' in legacy and 'process.env.E2E_ADMIN_PASSWORD' in legacy,
   'Historical V29.2 Admin credential check follows shared environment-backed login helper')

ok('getByTestId("register-submit")' in spec and 'customerEmail = `gia.huy+${stamp}@example.com`' in spec,
   'Current booking E2E still registers a unique customer')
ok('gotoSurface(page, "/login", "login-email")' in spec and 'getByRole("button", { name: "Đăng nhập" })' in spec,
   'Current booking E2E still performs an explicit fresh customer login')
ok('getByTestId("mock-payment-success")' in spec and 'data-booking-status="CONFIRMED"' in spec,
   'Current booking E2E still completes mock payment to a confirmed booking')
ok('getByTestId("ticket-qr-v33")' in spec and '/api/tickets/${id}' in spec and 'expect(qrUrl).toContain("/staff/check-in?ticket=")' in spec,
   'Current booking E2E still proves the signed ticket QR URL')
ok('gotoHydrated(page, "/staff/check-in")' in spec and 'getByTestId("staff-check-in-submit")' in spec,
   'Current booking E2E still checks in through the staff gate UI')
ok('loginExistingAdmin(page)' in spec and 'existingAdminCredentials' in guards and 'process.env.E2E_ADMIN_EMAIL' in guards and 'process.env.E2E_ADMIN_PASSWORD' in guards,
   'Current booking E2E still uses environment-backed existing Admin credentials')

ok(legacy.count('check(')==32 and 'failed = [name for name, ok in checks if not ok]' in legacy and 'sys.exit(1)' in legacy,
   'Historical V29.2 gate remains fail-closed with its full 31-check matrix')
ok('run: python3 tools/verify_v29_2_playwright_e2e.py' in ci,
   'Main CI still executes the historical V29.2 gate')
ok(any(x in sw for x in ['const VERSION = "v77-0-53";','const VERSION = "v77-0-54";','const VERSION = "v77-0-55";','const VERSION = "v77-0-56";','const VERSION = "v77-0-57";','const VERSION = "v77-0-59";','const VERSION = "v77-0-60";','const VERSION = "v77-0-61";','const VERSION = "v78-0-0";','const VERSION = "v78-0-1";','const VERSION = "v78-0-2";','const VERSION = "v78-0-3";','const VERSION = "v78-0-4";','const VERSION = "v78-0-5";','const VERSION = "v78-0-6";','const VERSION = "v78-0-7";','const VERSION = "v78-0-8";','const VERSION = "v78-0-9";','const VERSION = "v78-0-10";','const VERSION = "v78-0-11";','const VERSION = "v78-0-12";','const VERSION = "v78-0-13";','const VERSION = "v78-0-14";','const VERSION = "v78-0-15";','const VERSION = "v78-0-16";','const VERSION = "v78-0-17";','const VERSION = "v78-0-18";']),
   'Service Worker release metadata is V77.0.53 or forward-compatible V77.0.54')
migrations=list((ROOT/'backend/src/main/resources/db/migration').glob('V*.sql'))
latest=max(int(re.match(r'V(\d+)',p.name).group(1)) for p in migrations if re.match(r'V(\d+)',p.name))
ok(latest==72 and not list((ROOT/'backend/src/main/resources/db/migration').glob('V73*.sql')),
   'V77.0.53 remains no-schema on Flyway V72')
name='verify_v77_0_53_v29_2_playwright_contract_compatibility.py'
ok(name in release, 'Stable release preflight runs the V77.0.53 verifier')
ok(name in ci, 'Main CI runs the V77.0.53 verifier')
ok(name in diag, 'V77 diagnostics chain the V77.0.53 verifier')
ok('verify-v77-0-53' in make and 'release-v77-0-53' in make,
   'Makefile exposes V77.0.53 verify/release lifecycle')
ok(any(x in readme for x in ['Current release:** V77.0.53','Current release:** V77.0.54','Current release:** V77.0.55','Current release:** V77.0.56','Current release:** V77.0.57','Current release:** V77.0.59','Current release:** V77.0.60','Current release:** V77.0.61']) and any(x in readme for x in ['`v77.0.53`','`v77.0.54`','`v77.0.55`','`v77.0.56`','`v77.0.57`','`v77.0.59`','`v77.0.60`','`v77.0.61`']),
   'README retains V77.0.53 history under the V77.0.54-or-newer stable target')
ok('25/31' in readme and 'verify_v29_2_playwright_e2e.py' in readme and '31/31' in readme,
   'README records the exact V29.2 CI blocker and compatibility fix')
ok([p.name for p in ROOT.glob('*.md')]==['README.md'],
   'Source keeps one consolidated root Markdown history document')
ok(any(x in prev for x in ['v77-0-53','v77-0-54','V77.0.53','V77.0.54','V77.0.55','V77.0.56','V77.0.57','V77.0.59','V77.0.60','V77.0.61']),
   'V77.0.52 verifier remains forward-compatible through V77.0.54')
ok(any(x in v29 for x in ['Current release:** V77.0.53','Current release:** V77.0.54','Current release:** V77.0.55','Current release:** V77.0.56','Current release:** V77.0.57','Current release:** V77.0.59','Current release:** V77.0.60','Current release:** V77.0.61']) and any(x in v29 for x in ['`v77.0.53`','`v77.0.54`','`v77.0.55`','`v77.0.56`','`v77.0.57`','`v77.0.59`','`v77.0.60`','`v77.0.61`']),
   'V77.0.29 forward-compatibility chain accepts the V77.0.54 stable target')

passed=sum(checks)
print(f"\nV77.0.53 historical V29.2 Playwright contract compatibility verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed==len(checks) else 1)
