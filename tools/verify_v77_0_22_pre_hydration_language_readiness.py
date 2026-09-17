from pathlib import Path
import re, sys

ROOT=Path(__file__).resolve().parents[1]
checks=[]

def text(rel):
    p=ROOT/rel
    return p.read_text(encoding='utf-8') if p.exists() else ''

def ok(cond,label):
    cond=bool(cond); checks.append(cond); print(f"[ {'OK' if cond else 'FAIL'} ] {label}")

layout=text('frontend/app/layout.tsx')
provider=text('frontend/components/LanguageProvider.tsx')
lang_e2e=text('frontend/e2e/customer-value-v56.spec.ts')
v64e2e=text('frontend/e2e/crm-marketing-automation-v64.spec.ts')
sw=text('frontend/public/sw.js')
release=text('scripts/release.ps1')
ci=text('.github/workflows/ci.yml')
diag=text('tools/diagnose-v77.ps1')
make=text('Makefile')
readme=text('README.md')

ok('data-cinebooking-language-ready="vi"' in layout, 'Root HTML exposes a deterministic server-side VI readiness marker')
ok('var r=(v==="vi"||v==="en")?v:"vi"' in layout, 'Pre-hydration bootstrap normalizes the persisted language')
ok('document.documentElement.lang=r' in layout and 'document.documentElement.dataset.cinebookingLanguageReady=r' in layout, 'Pre-hydration bootstrap sets lang and readiness from the same snapshot')
ok(('if (language !== browserLanguage) return;' in provider) or ('setLanguageState(restored)' in provider) or ('commitLanguage(browserLanguageSnapshot())' in provider), 'Provider reconciles the stale server snapshot before presenting browser language')
ok(('document.documentElement.dataset.cinebookingLanguageReady = language' in provider) or ('document.documentElement.dataset.cinebookingLanguageReady = restored' in provider and 'setLanguageState(restored)' in provider) or ('document.documentElement.dataset.cinebookingLanguageReady = next' in provider and 'setLanguageState(current =>' in provider), 'Provider reconciles readiness to the React-committed language')
ok(('useSyncExternalStore<Language>' in provider) or ('useState<Language>("vi")' in provider), 'Narrow language contract remains intact')

ok('data-cinebooking-language-ready' not in lang_e2e, 'Browser gate no longer depends on the internal readiness attribute')
ok('maintenance-register-equipment-title' in lang_e2e and 'Register equipment' in lang_e2e, 'Browser gate waits for visible Maintenance English copy')
ok('Preview schedule' in lang_e2e, 'Browser gate continues through a second visible English surface')
ok('cinebooking_language' in lang_e2e and 'toHaveAttribute("lang", "en"' in lang_e2e, 'Browser gate still verifies persisted EN and document lang')
ok('campaign-preview-v64' in v64e2e and 'toBeEnabled' in v64e2e, 'V64 real-overview readiness gate remains present')

m_sw=re.search(r'const VERSION = "v77-0-(\d+)"', sw)
v78_sw = any(x in sw for x in ['const VERSION = "v78-0-0";','const VERSION = "v78-0-1";','const VERSION = "v78-0-2";','const VERSION = "v78-0-3";','const VERSION = "v78-0-4";','const VERSION = "v78-0-5";','const VERSION = "v78-0-6";','const VERSION = "v78-0-7";','const VERSION = "v78-0-8";','const VERSION = "v78-0-9";','const VERSION = "v78-0-10";','const VERSION = "v78-0-11";','const VERSION = "v78-0-12";','const VERSION = "v78-0-13";','const VERSION = "v78-0-14";','const VERSION = "v78-0-15";','const VERSION = "v78-0-16";','const VERSION = "v78-0-17";','const VERSION = "v78-0-18";'])
ok((bool(m_sw) and int(m_sw.group(1)) >= 22) or v78_sw, 'Service Worker cache generation is V77.0.22 or newer')
ok('if (url.pathname.startsWith("/api/")) return;' in sw, 'API responses remain excluded from Service Worker caching')

migrations=list((ROOT/'backend/src/main/resources/db/migration').glob('V*.sql'))
latest=max(int(re.match(r'V(\d+)',x.name).group(1)) for x in migrations if re.match(r'V(\d+)',x.name))
ok(latest==72 and not list((ROOT/'backend/src/main/resources/db/migration').glob('V77*.sql')), 'V77.0.22 remains no-schema on Flyway V72')

verifier='verify_v77_0_22_pre_hydration_language_readiness.py'
ok(verifier in release and verifier in ci and verifier in diag, 'Release/CI/diagnostics run the V77.0.22 verifier')
ok('verify-v77-0-22' in make and 'release-v77-0-22' in make, 'Makefile exposes V77.0.22 verify/release targets')
ok('V77.0.22' in readme and '1 failed / 2 passed' in readme and 'Register equipment' in readme, 'README documents the exact remaining targeted regression')

passed=sum(checks)
print(f"\nV77.0.22 pre-hydration language readiness verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed==len(checks) else 1)
