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

page = text('frontend/app/admin/marketing/page.tsx')
release = text('scripts/release.ps1')
ci = text('.github/workflows/ci.yml')
diag = text('tools/diagnose-v77.ps1')
make = text('Makefile')
readme = text('README.md')

ok('useCallback' in page, 'V64 marketing imports React useCallback')
ok('const refreshStepUp=useCallback(' in page, 'V64 step-up refresh callback has stable identity')
ok('const load=useCallback(async()=>{' in page, 'V64 marketing loader has stable identity')
ok('},[refreshStepUp]);' in page, 'V64 marketing loader declares its refreshStepUp dependency')
ok(('},[load,refreshStepUp]);' in page) or ('},[load,reportLoadError]);' in page and '},[load,overview,refreshStepUp,reportLoadError]);' in page), 'V64 initialization effect declares all hook dependencies')
ok('load().catch(' in page, 'V64 initialization effect still loads the marketing overview')
ok('window.addEventListener("step-up-changed",onStepUp)' in page, 'V64 step-up subscription remains active')
ok(('window.addEventListener("focus",onStepUp)' in page) or ('window.addEventListener("focus",retryIfNeeded)' in page), 'V64 focus refresh remains active')
ok('await load();' in page, 'V64 launch still reloads overview after successful publish')
ok('eslint-disable react-hooks/exhaustive-deps' not in page, 'V64 does not silence exhaustive-deps instead of fixing it')

# Exact warning reported by real npm run lint must be structurally impossible now.
ok(not re.search(r'useEffect\(\(\)=>\{[\s\S]*?load\(\)[\s\S]*?\},\[\]\);', page), 'No empty-dependency effect captures the load callback')

# Keep the V77.0.18 Language type-contract fix intact.
helper = text('frontend/lib/usePresentationLanguage.ts')
provider = text('frontend/components/LanguageProvider.tsx')
ok(('useSyncExternalStore<Language>(' in (helper+provider)) or ('useState<Language>("vi")' in provider), 'V77.0.18 narrow Language contract remains intact')

migrations = list((ROOT / 'backend/src/main/resources/db/migration').glob('V*.sql'))
latest = max(int(re.match(r'V(\d+)', x.name).group(1)) for x in migrations if re.match(r'V(\d+)', x.name))
ok(latest == 72 and not list((ROOT / 'backend/src/main/resources/db/migration').glob('V77*.sql')), 'V77.0.19 remains no-schema on Flyway V72')

verifier = 'verify_v77_0_19_zero_warning_marketing_effect_dependencies.py'
ok(verifier in release and verifier in ci and verifier in diag, 'Release/CI/diagnostics run V77.0.19 verifier')
ok('verify-v77-0-19' in make and 'release-v77-0-19' in make, 'Makefile exposes V77.0.19 verify/release targets')
ok('V77.0.19' in readme and 'exhaustive-deps' in readme and 'zero-warning' in readme.lower(), 'README documents the V77.0.19 zero-warning hook fix')

passed = sum(checks)
print(f"\nV77.0.19 zero-warning marketing effect-dependency verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed == len(checks) else 1)
