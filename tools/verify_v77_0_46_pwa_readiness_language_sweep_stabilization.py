from pathlib import Path
import re, sys

ROOT=Path(__file__).resolve().parents[1]
checks=[]
def text(rel):
    p=ROOT/rel
    return p.read_text(encoding="utf-8") if p.exists() else ""
def ok(cond,label):
    cond=bool(cond); checks.append(cond); print(f"[ {'OK' if cond else 'FAIL'} ] {label}")

pwa=text('frontend/lib/pwa.ts')
mobile=text('frontend/app/mobile/page.tsx')
language=text('frontend/e2e/realtime-operations-v59-language.spec.ts')
pwa_e2e=text('frontend/e2e/pwa-mobile-v52.spec.ts')
sw=text('frontend/public/sw.js')
readme=text('README.md')
release=text('scripts/release.ps1'); ci=text('.github/workflows/ci.yml'); diag=text('tools/diagnose-v77.ps1'); make=text('Makefile')

ok('resolveServiceWorkerRegistration(timeoutMs=8_000)' in pwa,
   'PWA device registration has a bounded Service Worker readiness helper')
ok('navigator.serviceWorker.getRegistration()' in pwa and 'Promise.race([' in pwa and 'setTimeout(()=>resolve(null),timeoutMs)' in pwa,
   'PWA readiness uses an existing registration first and bounds the ready wait')
ok('const registration=await navigator.serviceWorker.ready;' not in pwa,
   'PWA device operations no longer wait indefinitely on navigator.serviceWorker.ready')
ok('const registration=await resolveServiceWorkerRegistration();' in pwa and pwa.count('resolveServiceWorkerRegistration()') >= 3,
   'Register, disable and remove device paths share the bounded readiness contract')
ok('if(!registration||!pushManager)throw new Error("Service Worker chưa sẵn sàng cho Web Push.");' in pwa,
   'Explicit push subscription still requires a real ready registration')

cfg_pos=mobile.find('const cfg=await pushConfig();')
set_pos=mobile.find('setConfig(cfg);')
register_pos=mobile.find('await registerCurrentPwaDevice();')
ok(cfg_pos >= 0 and set_pos > cfg_pos and register_pos > set_pos,
   'Mobile center publishes authoritative push config before browser-device registration')
ok('data-delivery-mode={config?.deliveryMode||"LOADING"}' in mobile,
   'PWA UI keeps LOADING only as a true pre-config state instead of inventing a delivery mode')
ok('FOREGROUND_FALLBACK|VAPID_BACKGROUND' in pwa_e2e and 'not.toBe("LOADING")' in pwa_e2e,
   'Existing V52 browser regression still requires an honest non-LOADING server delivery mode')

ok('test.setTimeout(180_000);' in language,
   'Comprehensive V59 language sweep has a dedicated 180-second full-suite budget')
ok(language.count('"/admin/vouchers"') == 2 and language.count('"/admin/analytics-bi"') == 3 and language.count('"/admin/actions-runtime"') == 2,
   'Language sweep keeps one EN navigation per audited admin route plus the intentional VI analytics re-entry')
ok('if (route === "/admin/vouchers")' in language and 'name: "Create voucher"' in language,
   'Voucher exact EN assertion runs inside the existing sweep loop')
ok('if (route === "/admin/analytics-bi")' in language and 'name: "↻ Refresh"' in language,
   'Analytics exact EN assertion runs inside the existing sweep loop')
ok('if (route === "/admin/actions-runtime")' in language and 'name: /Dashboard/' in language,
   'Actions Runtime exact EN assertion runs inside the existing sweep loop')
ok('assertNoVietnameseInteractiveCopy' in language and 'expect(leaks' in language,
   'Language stabilization does not relax the Vietnamese leak assertion')

ok(any(x in sw for x in ['const VERSION = "v77-0-46";','const VERSION = "v77-0-47";','const VERSION = "v77-0-48";','const VERSION = "v77-0-49";']),
   'Service Worker cache generation is V77.0.46 or forward-compatible V77.0.47/V77.0.48')
migrations=list((ROOT/'backend/src/main/resources/db/migration').glob('V*.sql'))
latest=max(int(re.match(r'V(\d+)',x.name).group(1)) for x in migrations if re.match(r'V(\d+)',x.name))
ok(latest==72 and not list((ROOT/'backend/src/main/resources/db/migration').glob('V73*.sql')),
   'V77.0.46 remains no-schema on Flyway V72')
name='verify_v77_0_46_pwa_readiness_language_sweep_stabilization.py'
ok(name in release and name in ci and name in diag and 'verify-v77-0-46' in make and 'release-v77-0-46' in make,
   'Release, CI, diagnostics and Makefile include the V77.0.46 gate')
ok(any(x in readme for x in ['Current release:** V77.0.46','Current release:** V77.0.47','Current release:** V77.0.48','Current release:** V77.0.49']) and any(x in readme for x in ['`v77.0.46`','`v77.0.47`','`v77.0.48`','`v77.0.49`']) and 'V77.0.46 - PWA Readiness + Full-Suite Language Sweep Stabilization' in readme,
   'README retains V77.0.46 history under the V77.0.49-or-newer stable target')
ok('44/46' in readme and 'data-delivery-mode="LOADING"' in readme and '180-second timeout' in readme,
   'README records both concrete V77.0.45 full-suite failures and the stabilization strategy')
ok([p.name for p in ROOT.glob('*.md')]==['README.md'],
   'Source keeps one consolidated root Markdown history document')

passed=sum(checks)
print(f"\nV77.0.46 PWA readiness/language sweep verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed==len(checks) else 1)
