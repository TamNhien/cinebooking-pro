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
maintenance = text('frontend/app/admin/maintenance/page.tsx')
e2e = text('frontend/e2e/customer-value-v56.spec.ts')
v59 = text('frontend/e2e/realtime-operations-v59-language.spec.ts')
v64 = text('frontend/e2e/crm-marketing-automation-v64.spec.ts')
release = text('scripts/release.ps1')
ci = text('.github/workflows/ci.yml')
diag = text('tools/diagnose-v77.ps1')
make = text('Makefile')
readme = text('README.md')
store = provider + '\n' + helper
centralized = 'useSyncExternalStore<Language>' in provider and 'browserLanguageSnapshot' in provider
single_state = 'useState<Language>("vi")' in provider and 'browserLanguageSnapshot' in provider

ok(('useSyncExternalStore' in store) or single_state, 'Presentation language uses one React-owned synchronized language source')
ok('useState' not in helper, 'Presentation language no longer maintains a racing shadow language state')
ok('window.localStorage.getItem(STORAGE_KEY)' in store, 'Persisted cinebooking_language remains the first browser authority')
ok('document.documentElement.lang' in store, 'Document lang remains a browser fallback')
ok('return domLanguage ?? language' in helper or 'return normalizeLanguage(document.documentElement.lang) ?? "vi"' in provider, 'Provider/store keeps a deterministic final language fallback')
ok(('window.addEventListener("language-changed"' in store) or ('CHANGE_EVENT' in provider and 'addEventListener(CHANGE_EVENT' in provider), 'Same-tab VN/EN clicks notify the presentation store')
ok('window.addEventListener("storage"' in store, 'Cross-tab language changes notify the presentation store')
ok('window.addEventListener("pageshow"' in store, 'Full-navigation/bfcache pageshow notifies the presentation store')
ok(('useSyncExternalStore<Language>(' in store and '(): Language => "vi"' in store) or single_state, 'Hydration keeps a deterministic VI React snapshot')
ok('resolvedLanguage === "en" ? en : vi' in helper or 'language === "en" ? en : vi' in helper, 'Translated copy follows the resolved external-store language')
ok('resolvedLanguage === "en" ? "en-US" : "vi-VN"' in helper or 'language === "en" ? "en-US" : "vi-VN"' in helper, 'Locale follows the resolved external-store language')
ok('const { language, setLanguage } = useLanguage();' in helper, 'Original V77.0.0 provider remains integrated')
ok(single_state or centralized, 'LanguageProvider preserves the VI/EN persistence/switch contract')
ok('maintenance-register-equipment-title' in maintenance and 't("Đăng ký thiết bị", "Register equipment")' in maintenance, 'Maintenance heading remains presentation-owned bilingual copy')
ok(('page.goto("/admin/maintenance")' in e2e or 'gotoHydrated(page, "/admin/maintenance")' in e2e) and 'toHaveText("Register equipment"' in e2e, 'Browser E2E guards the exact Maintenance EN regression')
ok(('page.goto("/admin/showtimes")' in e2e or 'gotoHydrated(page, "/admin/showtimes")' in e2e) and 'name: "Preview schedule"' in e2e, 'Browser E2E continues through a second full-navigation EN surface')
ok('toHaveCount(1)' in v59 and 'operations-history-detail-v59' in v59, 'V59 duplicate/mixed-language regression coverage remains present')
ok('toHaveCount(7)' in v64 and 'segment-select-v64' in v64, 'V64 stable segment selector regression coverage remains present')

migrations = list((ROOT / 'backend/src/main/resources/db/migration').glob('V*.sql'))
latest = max(int(re.match(r'V(\d+)', x.name).group(1)) for x in migrations if re.match(r'V(\d+)', x.name))
ok(latest == 72 and not list((ROOT / 'backend/src/main/resources/db/migration').glob('V77*.sql')), 'V77.0.17 remains no-schema on Flyway V72')

verifier = 'verify_v77_0_17_full_navigation_language_store_fix.py'
ok(verifier in release and verifier in ci and verifier in diag, 'Release/CI/diagnostics run V77.0.17 verifier')
ok('verify-v77-0-17' in make and 'release-v77-0-17' in make, 'Makefile exposes V77.0.17 targets')
ok('V77.0.17' in readme and 'useSyncExternalStore' in readme, 'README documents the V77.0.17 language-store fix')

passed = sum(checks)
print(f"\nV77.0.17 full-navigation language-store verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed == len(checks) else 1)
