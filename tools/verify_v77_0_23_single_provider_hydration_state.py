from pathlib import Path
import re, sys

ROOT=Path(__file__).resolve().parents[1]
checks=[]

def text(rel):
    p=ROOT/rel
    return p.read_text(encoding='utf-8') if p.exists() else ''

def ok(cond,label):
    cond=bool(cond); checks.append(cond); print(f"[ {'OK' if cond else 'FAIL'} ] {label}")

provider=text('frontend/components/LanguageProvider.tsx')
helper=text('frontend/lib/usePresentationLanguage.ts')
lang_e2e=text('frontend/e2e/customer-value-v56.spec.ts')
sw=text('frontend/public/sw.js')
release=text('scripts/release.ps1')
ci=text('.github/workflows/ci.yml')
diag=text('tools/diagnose-v77.ps1')
make=text('Makefile')
readme=text('README.md')

ok('useState<Language>("vi")' in provider, 'LanguageProvider uses one narrow React-owned VI/EN state')
ok('useSyncExternalStore' not in provider, 'Hydration no longer depends on an external-store server snapshot converging after hard navigation')
ok('browserLanguageSnapshot()' in provider and (('setLanguageState(restored)' in provider) or ('commitLanguage(browserLanguageSnapshot())' in provider)), 'Post-hydration reconciliation restores the persisted browser preference into React state')
ok(('queueMicrotask(reconcileFromBrowser)' in provider) or ('reconcileFromBrowser();' in provider and 'requestAnimationFrame(reconcileFromBrowser)' in provider), 'Initial restore commits after hydration with a bounded reconciliation pass')
ok((('document.documentElement.lang = restored' in provider and 'cinebookingLanguageReady = restored' in provider) or ('document.documentElement.lang = next' in provider and 'cinebookingLanguageReady = next' in provider)), 'Restored React language keeps document lang/readiness synchronized')
ok('setLanguageState(next)' in provider and 'window.localStorage.setItem(STORAGE_KEY, next)' in provider, 'Explicit VN/EN clicks update React state immediately and persist the same value')
ok('window.addEventListener(CHANGE_EVENT' in provider, 'Same-tab compatibility language events remain synchronized')
ok('window.addEventListener("storage"' in provider, 'Cross-tab persisted-language changes remain synchronized')
ok('window.addEventListener("pageshow"' in provider, 'bfcache/full-navigation pageshow reconciliation remains synchronized')
ok('useSyncExternalStore' not in helper and 'const { language, setLanguage } = useLanguage();' in helper, 'Presentation helper consumes the provider without creating a second language store')
ok('language === "en" ? en : vi' in helper and 'language === "en" ? "en-US" : "vi-VN"' in helper, 'Presentation copy and locale follow the provider state')
ok('button[title="English"]' in lang_e2e and 'aria-pressed' in lang_e2e and '"true"' in lang_e2e, 'Full-navigation E2E proves the provider itself converges to EN')
ok('maintenance-register-equipment-title' in lang_e2e and 'Register equipment' in lang_e2e, 'Full-navigation E2E still guards visible Maintenance English copy')
ok('Preview schedule' in lang_e2e, 'Full-navigation E2E continues through a second English surface')
ok('data-cinebooking-language-ready' not in lang_e2e, 'Browser gate remains independent of diagnostic readiness attributes')

m_sw=re.search(r'const VERSION = "v77-0-(\d+)"', sw)
v78_sw = any(x in sw for x in ['const VERSION = "v78-0-0";','const VERSION = "v78-0-1";','const VERSION = "v78-0-2";','const VERSION = "v78-0-3";','const VERSION = "v78-0-4";','const VERSION = "v78-0-5";','const VERSION = "v78-0-6";','const VERSION = "v78-0-7";','const VERSION = "v78-0-8";','const VERSION = "v78-0-9";','const VERSION = "v78-0-10";','const VERSION = "v78-0-11";','const VERSION = "v78-0-12";','const VERSION = "v78-0-13";','const VERSION = "v78-0-14";','const VERSION = "v78-0-15";','const VERSION = "v78-0-16";','const VERSION = "v78-0-17";','const VERSION = "v78-0-18";','const VERSION = "v78-0-19";'])
ok((bool(m_sw) and int(m_sw.group(1)) >= 23) or v78_sw, 'Service Worker cache generation is V77.0.23 or newer')
ok('if (url.pathname.startsWith("/api/")) return;' in sw, 'API responses remain excluded from Service Worker caching')

migrations=list((ROOT/'backend/src/main/resources/db/migration').glob('V*.sql'))
latest=max(int(re.match(r'V(\d+)',x.name).group(1)) for x in migrations if re.match(r'V(\d+)',x.name))
ok(latest==72 and not list((ROOT/'backend/src/main/resources/db/migration').glob('V77*.sql')), 'V77.0.23 remains no-schema on Flyway V72')

verifier='verify_v77_0_23_single_provider_hydration_state.py'
ok(verifier in release and verifier in ci and verifier in diag, 'Release/CI/diagnostics run the V77.0.23 verifier')
ok('verify-v77-0-23' in make and 'release-v77-0-23' in make, 'Makefile exposes V77.0.23 verify/release targets')
ok('V77.0.23' in readme and 'single React-owned language state' in readme and '1 failed / 2 passed' in readme, 'README documents the exact V77.0.23 runtime regression and fix')

passed=sum(checks)
print(f"\nV77.0.23 single-provider hydration-state verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed==len(checks) else 1)
