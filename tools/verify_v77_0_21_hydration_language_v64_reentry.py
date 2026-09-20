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
marketing=text('frontend/app/admin/marketing/page.tsx')
v64e2e=text('frontend/e2e/crm-marketing-automation-v64.spec.ts')
lang_e2e=text('frontend/e2e/customer-value-v56.spec.ts')
sw=text('frontend/public/sw.js')
release=text('scripts/release.ps1')
ci=text('.github/workflows/ci.yml')
diag=text('tools/diagnose-v77.ps1')
make=text('Makefile')
readme=text('README.md')

ok((('useEffect' in provider) or ('useLayoutEffect' in provider)) and 'browserLanguageSnapshot()' in provider and (('setLanguageState(restored)' in provider) or ('commitLanguage(browserLanguageSnapshot())' in provider)), 'LanguageProvider explicitly reconciles the persisted browser language after hydration')
ok(('document.documentElement.dataset.cinebookingLanguageReady = restored' in provider) or ('document.documentElement.dataset.cinebookingLanguageReady = next' in provider), 'Hydration exposes a deterministic language-ready marker')
ok(('window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: restored }))' in provider) or ('setLanguageState(restored)' in provider) or ('commitLanguage(browserLanguageSnapshot())' in provider), 'Hydration explicitly commits the restored language after mount')
ok('document.documentElement.dataset.cinebookingLanguageReady = next' in provider, 'Explicit VN/EN clicks keep the readiness marker synchronized')
ok(('useSyncExternalStore<Language>' in provider) or ('useState<Language>("vi")' in provider), 'Narrow Language contract remains intact')

ok('const auth=getAuth();' in marketing and 'auth.role!=="ADMIN"' in marketing, 'V64 re-entry uses the persisted Admin session without a redundant /me round-trip')
ok(('for(let attempt=0;attempt<3;attempt+=1)' in marketing) or ('const deadline=Date.now()+12_000' in marketing and 'while(Date.now()<deadline)' in marketing), 'V64 overview load tolerates a bounded transient runtime convergence window')
ok('error.status===401||error.status===403' in marketing, 'V64 overview retry fails closed for authorization failures')
ok('segments-loading-v64' in marketing, 'V64 shows an explicit real-segment loading state instead of an empty surface')
ok('disabled={busy||!overview}' in marketing, 'V64 Preview remains gated on real overview readiness')

ok(('toBeEnabled({timeout:15000})' in v64e2e or 'toBeEnabled({timeout:30000})' in v64e2e) and 'campaign-preview-v64' in v64e2e, 'V64 E2E waits on real overview readiness after V68 re-entry')
ok('segments-loading-v64' in v64e2e and 'locator("button").count()' not in v64e2e, 'V64 E2E no longer infers readiness from incidental segment-card button count')
ok('E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD must come from the existing project .env' in lang_e2e, 'Language E2E reuses the existing Admin account and fails closed')
ok(('data-cinebooking-language-ready' in lang_e2e) or ('maintenance-register-equipment-title' in lang_e2e and 'Register equipment' in lang_e2e and 'Preview schedule' in lang_e2e), 'Full-navigation language E2E waits for post-hydration language reconciliation')
ok('admin-v29@cine.local' not in lang_e2e and 'V29SmokeOnly-ChangeMe' not in lang_e2e, 'Language E2E has no legacy alternate Admin fallback')

m_sw=re.search(r'const VERSION = "v77-0-(\d+)"', sw)
v78_sw = any(x in sw for x in ['const VERSION = "v78-0-0";','const VERSION = "v78-0-1";','const VERSION = "v78-0-2";','const VERSION = "v78-0-3";','const VERSION = "v78-0-4";','const VERSION = "v78-0-5";','const VERSION = "v78-0-6";','const VERSION = "v78-0-7";','const VERSION = "v78-0-8";','const VERSION = "v78-0-9";','const VERSION = "v78-0-10";','const VERSION = "v78-0-11";','const VERSION = "v78-0-12";','const VERSION = "v78-0-13";','const VERSION = "v78-0-14";','const VERSION = "v78-0-15";','const VERSION = "v78-0-16";','const VERSION = "v78-0-17";','const VERSION = "v78-0-18";','const VERSION = "v78-0-19";','const VERSION = "v78-0-20";'])
ok((bool(m_sw) and int(m_sw.group(1)) >= 21) or v78_sw, 'Service Worker cache generation is V77.0.21 or newer')
ok('if (url.pathname.startsWith("/api/")) return;' in sw, 'API responses remain excluded from Service Worker caching')

migrations=list((ROOT/'backend/src/main/resources/db/migration').glob('V*.sql'))
latest=max(int(re.match(r'V(\d+)',x.name).group(1)) for x in migrations if re.match(r'V(\d+)',x.name))
ok(latest==72 and not list((ROOT/'backend/src/main/resources/db/migration').glob('V77*.sql')), 'V77.0.21 remains no-schema on Flyway V72')

verifier='verify_v77_0_21_hydration_language_v64_reentry.py'
ok(verifier in release and verifier in ci and verifier in diag, 'Release/CI/diagnostics run the V77.0.21 verifier')
ok('verify-v77-0-21' in make and 'release-v77-0-21' in make, 'Makefile exposes V77.0.21 verify/release targets')
ok('V77.0.21' in readme and '2 failed / 1 passed' in readme and 'data-cinebooking-language-ready' in readme, 'README documents the exact V77.0.21 targeted-runtime regressions')

passed=sum(checks)
print(f"\nV77.0.21 hydration language + V64 re-entry verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed==len(checks) else 1)
