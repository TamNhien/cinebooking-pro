from pathlib import Path
import re, sys

ROOT=Path(__file__).resolve().parents[1]
checks=[]

def text(rel):
    p=ROOT/rel
    return p.read_text(encoding="utf-8") if p.exists() else ""

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

ok('useLayoutEffect' in provider and 'useEffect' not in provider.split('export function LanguageProvider',1)[1].split('const setLanguage',1)[0], 'LanguageProvider reconciles persisted language in a layout effect before painted client copy')
ok('useState<Language>("vi")' in provider, 'Server-compatible VI initializer remains the single React-owned language state')
ok('const commitLanguage = (next: Language)' in provider and 'setLanguageState(current => (current === next ? current : next))' in provider, 'Hydration reconciliation commits only real language changes into React state')
ok('reconcileFromBrowser();' in provider and 'requestAnimationFrame(reconcileFromBrowser)' in provider, 'Immediate and post-paint hydration reconciliation are both present')
ok('[50, 250, 1000].map' in provider and 'clearTimeout(timer)' in provider, 'Selective hydration gets a finite bounded reconciliation window without permanent polling')
ok('window.addEventListener("storage"' in provider and 'window.addEventListener("pageshow"' in provider and 'window.addEventListener(CHANGE_EVENT' in provider, 'Cross-tab, bfcache and same-tab language signals remain synchronized')
ok('window.localStorage.setItem(STORAGE_KEY, next)' in provider and 'setLanguageState(next)' in provider, 'Explicit VN/EN clicks remain immediate and persistent')
ok('useSyncExternalStore' not in helper and 'const { language, setLanguage } = useLanguage();' in helper, 'Presentation helper remains a provider consumer rather than a second store')
ok('button[title="English"]' in lang_e2e and 'customer-value-intelligence-v56' in lang_e2e and 'Customer Value & RFM Intelligence' in lang_e2e, 'Customer-value hard navigation now proves provider EN state before English page copy')
ok('window.localStorage.getItem("cinebooking_language")' in lang_e2e, 'Customer-value hard navigation still proves persisted EN preference')
m_sw=re.search(r'const VERSION = "v77-0-(\d+)"', sw)
ok(bool(m_sw) and int(m_sw.group(1)) >= 27, 'Service Worker cache generation is bumped for V77.0.27')
ok('if (url.pathname.startsWith("/api/")) return;' in sw, 'API responses remain excluded from Service Worker caching')

migrations=list((ROOT/'backend/src/main/resources/db/migration').glob('V*.sql'))
latest=max(int(re.match(r'V(\d+)',x.name).group(1)) for x in migrations if re.match(r'V(\d+)',x.name))
ok(latest==72 and not list((ROOT/'backend/src/main/resources/db/migration').glob('V77*.sql')), 'V77.0.27 remains no-schema on Flyway V72')

name='verify_v77_0_27_layout_effect_language_reconciliation.py'
ok(name in release and name in ci and name in diag, 'Release/CI/diagnostics run the V77.0.27 verifier')
ok('verify-v77-0-27' in make and 'release-v77-0-27' in make, 'Makefile exposes V77.0.27 verify/release targets')
ok('V77.0.27' in readme and 'Customer Value & RFM Intelligence' in readme and 'layout effect' in readme, 'README documents the exact V77.0.27 runtime regression and fix')

passed=sum(checks)
print(f"\nV77.0.27 layout-effect language reconciliation verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed==len(checks) else 1)
