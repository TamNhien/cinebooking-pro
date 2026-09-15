from pathlib import Path
import re, sys

ROOT = Path(__file__).resolve().parents[1]
checks=[]

def text(rel):
    p=ROOT/rel
    return p.read_text(encoding='utf-8') if p.exists() else ''

def ok(cond,label):
    cond=bool(cond); checks.append(cond); print(f"[ {'OK' if cond else 'FAIL'} ] {label}")

ops=text('frontend/app/admin/operations-control/page.tsx')
lang_spec=text('frontend/e2e/realtime-operations-v59-language.spec.ts')
bridge=text('frontend/components/LegacyUiLocalizationBridge.tsx')
catalog=text('frontend/lib/interactive-ui-translations.ts')
crm_spec=text('frontend/e2e/crm-automation-5-v77.spec.ts')
sw=text('frontend/public/sw.js')
cinemas_page=text('frontend/app/cinemas/page.tsx')
movies_page=text('frontend/app/movies/page.tsx')
support_page=text('frontend/app/support/page.tsx')
staff_page=text('frontend/app/admin/staff/page.tsx')
admin_support_page=text('frontend/app/admin/support/page.tsx')

ok('data-testid="operations-control-center-v58"' in ops and 'Operations Control Center' in ops and 't(' in ops,
   'V58 compatibility marker follows the live VI/EN language instead of leaking fixed Vietnamese copy')
ok('data-i18n-skip="true"' in ops and 'cinemas.map' in ops,
   'Dynamic cinema option names are explicitly treated as business data, not UI copy')
ok('vietnameseUi.test' not in lang_spec,
   'Language regression no longer rejects legitimate Vietnamese business data by scanning the whole page text')
ok('operations-control-center-v58' in lang_spec and 'Operations Control Center' in lang_spec,
   'Language regression directly proves the historical V58 compatibility marker switches to English')
ok('Realtime Operations Center' in lang_spec and 'Operational pulse' in lang_spec and 'Centralized realtime alerts' in lang_spec,
   'Language regression proves V59 presentation headings switch to English')
ok('Control details' in lang_spec and 'Alert action history' in lang_spec,
   'Language regression covers lower V59 presentation sections in English')
ok('cloneNode(true)' in lang_spec and 'querySelectorAll(\'[data-i18n-skip="true"]\')' in lang_spec,
   'Interactive leak audit removes source-owned business-data descendants before checking UI copy')
ok('assertNoVietnameseInteractiveCopy' in lang_spec and '/admin/vouchers' in lang_spec and '/admin/analytics-bi' in lang_spec and '/admin/actions-runtime' in lang_spec,
   'Cross-surface interactive UI leak audit remains active beyond V59')
ok(all(route in lang_spec for route in ['/','/movies','/cinemas','/payments','/support']),
   'Browser language sweep covers public and customer surfaces requested by the V77.0.40+ gate')
ok(all(route in lang_spec for route in ['/admin','/admin/payments','/admin/staff','/admin/support','/admin/crm-automation']),
   'Browser language sweep covers the requested administration surfaces')
ok('for (const route of languageSweepRoutes)' in lang_spec and 'toHaveAttribute("lang", "en")' in lang_spec,
   'Every swept route re-proves the persisted EN language state before checking interactive copy')
ok('data-i18n-skip="true"' in cinemas_page and 'cinema-option' in cinemas_page and 'data-i18n-skip="true"' in support_page,
   'Cinema/support controls expose explicit source-owned business-data boundaries')
ok('data-i18n-skip="true"' in movies_page and 'data-i18n-skip="true"' in staff_page and 'data-i18n-skip="true"' in admin_support_page,
   'Movie metadata and staff/cinema selector data are excluded from presentation-copy translation')
ok('getByTestId("language-switch-en")' in lang_spec and 'getByTestId("language-switch-vi")' in lang_spec,
   'Browser regression still proves both EN and VN switching directions')
ok('"[aria-label],[title],[placeholder],[alt]"' in bridge,
   'Legacy bridge initial walk now includes alt-only elements')
ok('attributeFilter: [...ATTRS]' in bridge and 'MutationObserver' in bridge,
   'Late-rendered accessibility attributes remain localized after the initial walk')
ok("[data-i18n-skip='true']" in bridge,
   'Legacy bridge preserves the explicit business-data opt-out boundary')

catalog_entries=len(re.findall(r'^\s*".*":\s*".*",\s*$',catalog,re.M))
ok(catalog_entries >= 1400,
   f'Full-source audited VI/EN catalog remains broad (found {catalog_entries} entries)')

# Static full-source UI audit: interactive/heading Vietnamese literals must either
# be presentation-owned (t/language), catalog-backed, or explicitly business data.
vi_re=re.compile(r'[\u0103\u00e2\u0111\u00ea\u00f4\u01a1\u01b0\u00e1\u00e0\u1ea3\u00e3\u1ea1\u1ea5\u1ea7\u1ea9\u1eab\u1ead\u1eaf\u1eb1\u1eb3\u1eb5\u1eb7\u00e9\u00e8\u1ebb\u1ebd\u1eb9\u1ebf\u1ec1\u1ec3\u1ec5\u1ec7\u00ed\u00ec\u1ec9\u0129\u1ecb\u00f3\u00f2\u1ecf\u00f5\u1ecd\u1ed1\u1ed3\u1ed5\u1ed7\u1ed9\u1edb\u1edd\u1edf\u1ee1\u1ee3\u00fa\u00f9\u1ee7\u0169\u1ee5\u1ee9\u1eeb\u1eed\u1eef\u1ef1\u00fd\u1ef3\u1ef7\u1ef9\u1ef5]', re.I)
interactive_tokens=('<button','<label','<option','placeholder=','aria-label=','title=','<a ','<h1','<h2','<h3','<h4','<h5','<h6')
key_re=re.compile(r'^\s*"((?:\\.|[^"\\])*)"\s*:', re.M)
catalog_keys=set(key_re.findall(catalog))
quoted=re.compile(r'(["\'])(.*?)(?<!\\)\1')
audited=[]; uncovered=[]
for base in (ROOT/'frontend/app', ROOT/'frontend/components'):
    for source in base.rglob('*.tsx'):
        for line_no,line in enumerate(source.read_text(encoding='utf-8').splitlines(),1):
            if not any(token in line for token in interactive_tokens):
                continue
            for match in quoted.finditer(line):
                value=match.group(2)
                if not vi_re.search(value):
                    continue
                audited.append((source,line_no,value))
                covered=('t(' in line or 'language===' in line or 'language ===' in line or value in catalog_keys or 'data-i18n-skip' in line)
                if not covered:
                    uncovered.append((source,line_no,value))
ok(len(audited) >= 900 and not uncovered,
   f'Full-source interactive/heading language audit is covered ({len(audited)} literals; uncovered={len(uncovered)})')
ok('type Page' not in crm_spec and 'eslint-disable' not in crm_spec,
   'Zero-warning CRM import fix remains intact without lint suppression')
ok(any(x in sw for x in ['const VERSION = "v77-0-40";','const VERSION = "v77-0-41";','const VERSION = "v77-0-42";','const VERSION = "v77-0-43";','const VERSION = "v77-0-44";','const VERSION = "v77-0-45";','const VERSION = "v77-0-46";','const VERSION = "v77-0-47";','const VERSION = "v77-0-48";','const VERSION = "v77-0-49";','const VERSION = "v77-0-50";','const VERSION = "v77-0-52";','const VERSION = "v77-0-53";','const VERSION = "v77-0-54";','const VERSION = "v77-0-55";','const VERSION = "v77-0-56";','const VERSION = "v77-0-57";','const VERSION = "v77-0-59";','const VERSION = "v77-0-60";','const VERSION = "v77-0-61";']),
   'Service Worker generation is V77.0.40 or the forward-compatible V77.0.41 cache generation')

legacy=['admin-v29@cine.local','V29SmokeOnly-ChangeMe','Admin@123']
ok(all(x not in lang_spec+crm_spec for x in legacy),
   'Touched language E2E continues to use only the existing root .env Admin account')

migrations=list((ROOT/'backend/src/main/resources/db/migration').glob('V*.sql'))
latest=max(int(re.match(r'V(\d+)',x.name).group(1)) for x in migrations if re.match(r'V(\d+)',x.name))
ok(latest==72 and not list((ROOT/'backend/src/main/resources/db/migration').glob('V77*.sql')),
   'V77.0.40 remains no-schema on Flyway V72')

release=text('scripts/release.ps1'); ci=text('.github/workflows/ci.yml'); diag=text('tools/diagnose-v77.ps1'); make=text('Makefile'); readme=text('README.md')
name='verify_v77_0_40_runtime_language_boundary_fix.py'
ok(name in release and name in ci and name in diag,
   'Release, CI and diagnostics run the V77.0.40 verifier')
ok('verify-v77-0-40' in make and 'release-v77-0-40' in make,
   'Makefile exposes V77.0.40 verify/release targets')
ok(any(x in readme for x in ['Current release:** V77.0.40','Current release:** V77.0.41','Current release:** V77.0.42','Current release:** V77.0.43','Current release:** V77.0.44','Current release:** V77.0.45','Current release:** V77.0.46','Current release:** V77.0.47','Current release:** V77.0.48','Current release:** V77.0.49','Current release:** V77.0.50','Current release:** V77.0.52','Current release:** V77.0.53','Current release:** V77.0.54','Current release:** V77.0.55','Current release:** V77.0.56','Current release:** V77.0.57','Current release:** V77.0.59','Current release:** V77.0.60','Current release:** V77.0.61']) and any(x in readme for x in ['`v77.0.40`','`v77.0.41`','`v77.0.42`','`v77.0.43`','`v77.0.44`','`v77.0.45`','`v77.0.46`','`v77.0.47`','`v77.0.48`','`v77.0.49`','`v77.0.50`','`v77.0.52`','`v77.0.53`','`v77.0.54`','`v77.0.55`','`v77.0.56`','`v77.0.57`','`v77.0.59`','`v77.0.60`','`v77.0.61`']),
   'README retains V77.0.40 history under the V77.0.45-or-newer stable target')
ok('V77.0.40' in readme and 'business data' in readme.lower() and 'operations-control-center-v58' in readme,
   'README records the runtime language false-positive root cause and business-data boundary')
root_markdown=[p.name for p in ROOT.glob('*.md')]
ok(root_markdown==['README.md'],
   'Source keeps one consolidated root Markdown history document')

# Historical V77.0.39 verifier must remain forward-compatible with this patch.
v39=text('tools/verify_v77_0_39_zero_warning_full_ui_language_contract.py')
ok(any(x in v39 for x in ['V77.0.41','V77.0.42','V77.0.43','V77.0.44','V77.0.45','V77.0.46','V77.0.47']) and any(x in v39 for x in ['v77-0-41','v77-0-42','v77-0-43','v77-0-44','v77-0-45','v77-0-46','v77-0-47']),
   'V77.0.39 verifier accepts the V77.0.45-or-newer stable target and cache generation')

passed=sum(checks)
print(f"\nV77.0.40 runtime language boundary verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed==len(checks) else 1)
