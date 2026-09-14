from pathlib import Path
import re, sys

ROOT = Path(__file__).resolve().parents[1]
checks = []

def text(rel):
    p = ROOT / rel
    return p.read_text(encoding="utf-8") if p.exists() else ""

def ok(condition, label):
    condition = bool(condition)
    checks.append(condition)
    print(f"[ {'OK' if condition else 'FAIL'} ] {label}")

helper = text('frontend/lib/usePresentationLanguage.ts')
provider = text('frontend/components/LanguageProvider.tsx')
release = text('scripts/release.ps1')
ci = text('.github/workflows/ci.yml')
diag = text('tools/diagnose-v77.ps1')
make = text('Makefile')
readme = text('README.md')
store = provider + '\n' + helper
centralized = 'useSyncExternalStore<Language>' in provider and 'browserLanguageSnapshot' in provider
single_state = 'useState<Language>("vi")' in provider and 'browserLanguageSnapshot' in provider

ok(('export type Language = "vi" | "en";' in helper) or ('export type { Language }' in helper and 'export type Language = "vi" | "en";' in provider), 'Presentation helper exports the narrow Language union')
ok(('useSyncExternalStore<Language>(' in store) or single_state, 'Language source remains explicitly narrowed to Language instead of widening to string')
ok(('(): Language => "vi"' in store) or single_state, 'Initial hydration snapshot is explicitly typed as Language')
ok('const getSnapshot = useCallback((): Language =>' in helper or 'function browserLanguageSnapshot(): Language' in provider, 'Browser snapshot remains explicitly typed as Language')
ok('return { language: resolvedLanguage, locale, setLanguage, t };' in helper or 'return { language: language as Language, locale, setLanguage, t };' in helper, 'Hook returns the narrowed resolved language')
ok('useState' not in helper, 'V77.0.17 race-prone shadow state remains removed')
ok('window.localStorage.getItem(STORAGE_KEY)' in store, 'Persisted language remains first browser authority')
ok('document.documentElement.lang' in store, 'Document language remains the browser fallback')
ok('return domLanguage ?? language' in helper or 'return normalizeLanguage(document.documentElement.lang) ?? "vi"' in provider, 'Language store keeps a deterministic final fallback')
ok(single_state or centralized, 'LanguageProvider VI/EN contract remains intact')

# Guard the exact regression: without the generic, TS infers string and dozens of pages reject it.
ok('useSyncExternalStore(subscribe, getSnapshot, () => "vi")' not in helper, 'Untyped useSyncExternalStore call that widened Language to string is absent')
ok((('useSyncExternalStore<Language>' in store) or single_state) and (('resolvedLanguage' in helper) or ('language as Language' in helper)), 'Resolved language has a reusable narrow type for all consuming pages')

migrations = list((ROOT / 'backend/src/main/resources/db/migration').glob('V*.sql'))
latest = max(int(re.match(r'V(\d+)', x.name).group(1)) for x in migrations if re.match(r'V(\d+)', x.name))
ok(latest == 72 and not list((ROOT / 'backend/src/main/resources/db/migration').glob('V77*.sql')), 'V77.0.18 remains no-schema on Flyway V72')

verifier = 'verify_v77_0_18_presentation_language_type_contract_fix.py'
ok(verifier in release and verifier in ci and verifier in diag, 'Release/CI/diagnostics run V77.0.18 verifier')
ok('verify-v77-0-18' in make and 'release-v77-0-18' in make, 'Makefile exposes V77.0.18 verify/release targets')
ok('V77.0.18' in readme and 'TypeScript' in readme and 'Language' in readme, 'README documents the V77.0.18 TypeScript type-contract fix')

passed = sum(checks)
print(f"\nV77.0.18 presentation-language type-contract verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed == len(checks) else 1)
