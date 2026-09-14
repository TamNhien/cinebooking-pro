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
marketing=text('frontend/app/admin/marketing/page.tsx')
v64e2e=text('frontend/e2e/crm-marketing-automation-v64.spec.ts')
lang_e2e=text('frontend/e2e/customer-value-v56.spec.ts')
sw=text('frontend/public/sw.js')
release=text('scripts/release.ps1')
ci=text('.github/workflows/ci.yml')
diag=text('tools/diagnose-v77.ps1')
make=text('Makefile')
readme=text('README.md')

ok('useState<Language>("vi")' in provider, 'LanguageProvider keeps one narrow React-owned language state')
ok('reconcileFromBrowser();' in provider and 'queueMicrotask(reconcileFromBrowser)' not in provider, 'Initial persisted-language reconciliation commits directly in the mount effect')
ok('requestAnimationFrame(reconcileFromBrowser)' in provider and 'cancelAnimationFrame(postHydrationFrame)' in provider, 'One bounded post-paint reconciliation guard covers late hydration convergence')
ok('window.localStorage.setItem(STORAGE_KEY, next)' in provider and 'setLanguageState(next)' in provider, 'Explicit VN/EN clicks still commit React state and persistence together')
ok('window.addEventListener("storage"' in provider and 'window.addEventListener("pageshow"' in provider, 'Cross-tab and full-navigation reconciliation remain active')
ok('useSyncExternalStore' not in helper and 'const { language, setLanguage } = useLanguage();' in helper, 'Presentation helper remains a consumer instead of a second language store')
ok('button[title="English"]' in lang_e2e and 'aria-pressed' in lang_e2e and 'Register equipment' in lang_e2e, 'Language E2E still proves provider EN state and visible Maintenance copy')
ok('Preview schedule' in lang_e2e, 'Language E2E still continues through the second full-navigation English surface')

m_sw=re.search(r'const VERSION = "v77-0-(\d+)"', sw)
ok(bool(m_sw) and int(m_sw.group(1)) >= 24, 'Service Worker cache generation is V77.0.24 or newer')
ok('async function staticAssetNetworkFirst(request)' in sw, 'Service Worker defines network-first current-build static asset hydration')
ok('fetch(request, { cache: "no-cache" })' in sw, 'Next static asset path revalidates against the network while online')
ok('url.pathname.startsWith("/_next/static/")' in sw and 'staticAssetNetworkFirst(request)' in sw, 'Next static assets use the network-first hydration strategy')
ok('if (url.pathname.startsWith("/api/")) return;' in sw, 'API responses remain excluded from Service Worker caching')

ok('const deadline=Date.now()+12_000' in marketing and 'while(Date.now()<deadline)' in marketing, 'V64 overview retries transient startup failures across a bounded 12-second window')
ok('error.status===401||error.status===403' in marketing, 'V64 authorization failures still fail closed without retry')
ok('setOverviewLoading(true)' in marketing and 'setOverviewLoading(false)' in marketing, 'V64 exposes explicit overview loading lifecycle')
ok('segments-loading-v64' in marketing and 'segments-retry-v64' in marketing, 'V64 distinguishes real loading from exhausted retry state')
ok('window.addEventListener("online",retryIfNeeded)' in marketing and 'window.addEventListener("focus",retryIfNeeded)' in marketing, 'V64 retries an unresolved overview when runtime connectivity/focus returns')
ok('disabled={busy||!overview}' in marketing, 'V64 Preview remains gated on a real overview')
ok('toBeEnabled({timeout:30000})' in v64e2e, 'V64 E2E allows the bounded backend startup convergence window')
ok('segments-loading-v64' in v64e2e and 'VIP giá trị cao' in v64e2e, 'V64 E2E still requires the real loaded segment surface')
ok('E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD must come from the existing project .env' in v64e2e and 'E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD must come from the existing project .env' in lang_e2e, 'Targeted E2E continues to reuse only the existing Admin account')

migrations=list((ROOT/'backend/src/main/resources/db/migration').glob('V*.sql'))
latest=max(int(re.match(r'V(\d+)',x.name).group(1)) for x in migrations if re.match(r'V(\d+)',x.name))
ok(latest==72 and not list((ROOT/'backend/src/main/resources/db/migration').glob('V77*.sql')), 'V77.0.24 remains no-schema on Flyway V72')

name='verify_v77_0_24_hydration_bundle_v64_startup_reliability.py'
ok(name in release and name in ci and name in diag, 'Release/CI/diagnostics run the V77.0.24 verifier')
ok('verify-v77-0-24' in make and 'release-v77-0-24' in make, 'Makefile exposes V77.0.24 verify/release targets')
ok('V77.0.24' in readme and 'network-first' in readme and '12-second' in readme, 'README documents V77.0.24 hydration-bundle and V64 startup reliability fixes')

passed=sum(checks)
print(f"\nV77.0.24 hydration bundle + V64 startup reliability verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed==len(checks) else 1)
