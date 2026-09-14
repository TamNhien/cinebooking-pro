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
release=text('scripts/release.ps1')
ci=text('.github/workflows/ci.yml')
diag=text('tools/diagnose-v77.ps1')
make=text('Makefile')
readme=text('README.md')

ok(provider.startswith('"use client";'), 'LanguageProvider starts directly with the client directive after removing the unused ESLint suppression')
ok('react-hooks/set-state-in-effect' not in provider, 'LanguageProvider no longer carries the unused react-hooks/set-state-in-effect disable directive')
ok(not re.search(r'eslint-disable(?:-next-line|-line)?\s+react-hooks/set-state-in-effect', provider), 'LanguageProvider does not suppress react-hooks/set-state-in-effect to hide this warning')
ok('useState<Language>("vi")' in provider and (('setLanguageState(restored)' in provider) or ('setLanguageState(current =>' in provider and 'commitLanguage(browserLanguageSnapshot())' in provider)), 'V77.0.24 single React-owned language state and browser reconciliation remain intact')
ok('requestAnimationFrame(reconcileFromBrowser)' in provider and 'cancelAnimationFrame(postHydrationFrame)' in provider, 'V77.0.24 bounded post-paint reconciliation guard remains intact')
ok('window.localStorage.setItem(STORAGE_KEY, next)' in provider and 'setLanguageState(next)' in provider, 'Explicit VN/EN clicks still update React state and persistence together')
ok('useSyncExternalStore' not in helper and 'const { language, setLanguage } = useLanguage();' in helper, 'Presentation helper remains a consumer and does not recreate a language store')
ok('verify_v77_0_24_hydration_bundle_v64_startup_reliability.py' in release, 'V77.0.24 runtime verifier remains in the release matrix')

migrations=list((ROOT/'backend/src/main/resources/db/migration').glob('V*.sql'))
latest=max(int(re.match(r'V(\d+)',x.name).group(1)) for x in migrations if re.match(r'V(\d+)',x.name))
ok(latest==72 and not list((ROOT/'backend/src/main/resources/db/migration').glob('V77*.sql')), 'V77.0.25 remains no-schema on Flyway V72')

name='verify_v77_0_25_zero_warning_language_provider_cleanup.py'
ok(name in release and name in ci and name in diag, 'Release/CI/diagnostics run the V77.0.25 verifier')
ok('verify-v77-0-25' in make and 'release-v77-0-25' in make, 'Makefile exposes V77.0.25 verify/release targets')
ok('V77.0.25' in readme and 'Unused eslint-disable directive' in readme, 'README documents the exact V77.0.25 zero-warning cleanup')

passed=sum(checks)
print(f"\nV77.0.25 zero-warning LanguageProvider cleanup verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed==len(checks) else 1)
