from pathlib import Path
import re, sys

ROOT = Path(__file__).resolve().parents[1]
checks=[]

def text(rel):
    p=ROOT/rel
    return p.read_text(encoding='utf-8') if p.exists() else ''

def ok(cond,label):
    cond=bool(cond); checks.append(cond); print(f"[ {'OK' if cond else 'FAIL'} ] {label}")

crm_spec=text('frontend/e2e/crm-automation-5-v77.spec.ts')
lang_switcher=text('frontend/components/LanguageSwitcher.tsx')
bridge=text('frontend/components/LegacyUiLocalizationBridge.tsx')
layout=text('frontend/app/layout.tsx')
catalog=text('frontend/lib/interactive-ui-translations.ts')
header=text('frontend/components/Header.tsx')
lang_spec=text('frontend/e2e/realtime-operations-v59-language.spec.ts')
sw=text('frontend/public/sw.js')

ok('type Page' not in crm_spec and re.search(r'import\s*\{\s*expect\s*,\s*test\s*\}\s*from\s*"@playwright/test"', crm_spec),
   'CRM V77 E2E removes the unused Page type instead of suppressing zero-warning lint')
ok('eslint-disable' not in crm_spec,
   'CRM V77 E2E does not silence the unused-import warning')

ok('data-testid="language-switch-vi"' in lang_switcher and 'data-testid="language-switch-en"' in lang_switcher,
   'VN/EN switcher exposes stable copy-independent controls')
ok('Bộ chọn ngôn ngữ' in lang_switcher and 'Language selector' in lang_switcher and 'Ngôn ngữ' in lang_switcher,
   'Language switcher accessibility copy is language-owned')
ok('data-i18n-skip="true"' in lang_switcher,
   'Language switcher protects its language names from legacy bridge mutation')

ok('LegacyUiLocalizationBridge' in layout and '<LegacyUiLocalizationBridge />' in layout,
   'Root layout mounts the legacy UI localization bridge inside LanguageProvider')
ok('MutationObserver' in bridge and 'characterData: true' in bridge and 'childList: true' in bridge,
   'Legacy localization reacts to late-rendered UI instead of translating only first paint')
ok('"aria-label", "title", "placeholder", "alt"' in bridge,
   'Legacy localization covers accessibility and field attributes')
ok("[data-i18n-skip='true']" in bridge,
   'Legacy localization has an explicit source-owned opt-out boundary')
ok('Machine values, backend payloads, movie titles, user data, and identifiers are never translated here.' in catalog,
   'Catalog explicitly excludes machine/business data translation')

catalog_entries=len(re.findall(r'^\s*".*":\s*".*",\s*$',catalog,re.M))
ok(catalog_entries >= 1400,
   f'Full-source audited VI/EN UI catalog is broad (found {catalog_entries} entries)')
for marker,label in [
    ('"Tạo tài khoản": "Create account"','Login/register actions are bilingual'),
    ('"Quản lý mã ưu đãi": "Voucher management"','Admin voucher heading is bilingual'),
    ('"📋 Mã đặt vé": "📋 Booking code"','Ticket booking-code button is bilingual'),
    ('"Kiểm tra & xác nhận soát vé": "Validate & confirm check-in"','Staff check-in action is bilingual'),
    ('"Thanh toán vận hành & đối soát": "Payment operations & reconciliation"','Admin Payments heading is bilingual'),
    ('"Kịch bản vòng đời & an toàn liên hệ": "Lifecycle scenarios & contact safety"','CRM heading is bilingual'),
    ('"Trung tâm hỗ trợ khách hàng": "Customer support center"','Customer support heading is bilingual'),
    ('"Quản lý tài khoản nhân viên": "Staff account management"','Staff management heading is bilingual'),
]: ok(marker in catalog,label)

ok('const {language}=useLanguage()' in header and 'const t=(vi:string,enText:string)=>en?enText:vi' in header,
   'Header navigation owns the global language state')
required_header=[
  't("Bảng điều khiển","Dashboard")',
  't("Thanh toán vận hành V60","Payment operations V60")',
  't("Bảo mật & định danh V68","Security & identity V68")',
  't("Phân tích dữ liệu & BI V75","Analytics & BI V75")',
  't("Tự động hóa CRM V77","CRM automation V77")',
  't("Nhật ký kiểm toán","Audit log")',
]
ok(all(x in header for x in required_header),
   'Desktop/drawer Admin navigation no longer keeps major VI-only entries in EN mode')

for rel, markers, label in [
 ('frontend/components/PwaManager.tsx',['usePresentationLanguage','Install','Cài'], 'PWA manager owns bilingual interactive copy'),
 ('frontend/components/MovieCard.tsx',['usePresentationLanguage','Buy tickets','Mua vé'], 'Movie cards own bilingual actions'),
 ('frontend/components/PasswordInput.tsx',['usePresentationLanguage','Show password','Hiện mật khẩu'], 'Password visibility control is bilingual'),
 ('frontend/components/PasswordStrength.tsx',['usePresentationLanguage','Password strength','Độ mạnh mật khẩu'], 'Password-strength feedback is bilingual'),
 ('frontend/components/StarRating.tsx',['usePresentationLanguage','out of 5 stars','trên 5 sao'], 'Star-rating accessibility copy is bilingual'),
]:
    src=text(rel); ok(all(x in src for x in markers), label)

ok('assertNoVietnameseInteractiveCopy' in lang_spec and 'Vietnamese interactive copy leaked in EN mode' in lang_spec,
   'Browser language regression actively rejects Vietnamese interactive leakage in EN mode')
ok('getByTestId("language-switch-en")' in lang_spec and 'getByTestId("language-switch-vi")' in lang_spec,
   'Browser regression switches both directions through stable machine controls')
ok('/admin/vouchers' in lang_spec and '/admin/analytics-bi' in lang_spec and '/admin/actions-runtime' in lang_spec,
   'Browser regression samples customer/admin legacy surfaces beyond V59')
ok('↻ Refresh' in lang_spec and '↻ Làm mới' in lang_spec,
   'Browser regression proves English then restored Vietnamese presentation')

ok(any(x in sw for x in ['const VERSION = "v77-0-39";','const VERSION = "v77-0-40";','const VERSION = "v77-0-41";','const VERSION = "v77-0-42";','const VERSION = "v77-0-43";','const VERSION = "v77-0-44";','const VERSION = "v77-0-45";','const VERSION = "v77-0-46";','const VERSION = "v77-0-47";','const VERSION = "v77-0-48";','const VERSION = "v77-0-49";','const VERSION = "v77-0-50";','const VERSION = "v77-0-52";','const VERSION = "v77-0-53";','const VERSION = "v77-0-54";','const VERSION = "v77-0-55";','const VERSION = "v77-0-56";','const VERSION = "v77-0-57";','const VERSION = "v77-0-59";','const VERSION = "v77-0-60";','const VERSION = "v77-0-61";']),
   'Service Worker cache generation remains V77.0.39-or-newer so stale pre-language-fix shell is evicted')

migrations=list((ROOT/'backend/src/main/resources/db/migration').glob('V*.sql'))
latest=max(int(re.match(r'V(\d+)',x.name).group(1)) for x in migrations if re.match(r'V(\d+)',x.name))
ok(latest==72 and not list((ROOT/'backend/src/main/resources/db/migration').glob('V77*.sql')),
   'V77.0.39 remains no-schema on Flyway V72')
legacy=['admin-v29@cine.local','V29SmokeOnly-ChangeMe','Admin@123']
ok(all(x not in crm_spec+lang_spec for x in legacy),
   'Touched V77.0.39 E2E contains no fallback Admin credential')

release=text('scripts/release.ps1'); ci=text('.github/workflows/ci.yml'); diag=text('tools/diagnose-v77.ps1'); make=text('Makefile'); readme=text('README.md')
name='verify_v77_0_39_zero_warning_full_ui_language_contract.py'
ok(name in release and name in ci and name in diag,
   'Release/CI/diagnostics run the V77.0.39 verifier')
ok('verify-v77-0-39' in make and 'release-v77-0-39' in make,
   'Makefile exposes V77.0.39 verify/release targets')
ok(any(x in readme for x in ['Current release:** V77.0.39','Current release:** V77.0.40','Current release:** V77.0.41','Current release:** V77.0.42','Current release:** V77.0.43','Current release:** V77.0.44','Current release:** V77.0.45','Current release:** V77.0.46','Current release:** V77.0.47','Current release:** V77.0.48','Current release:** V77.0.49','Current release:** V77.0.50','Current release:** V77.0.52','Current release:** V77.0.53','Current release:** V77.0.54','Current release:** V77.0.55','Current release:** V77.0.56','Current release:** V77.0.57','Current release:** V77.0.59','Current release:** V77.0.60','Current release:** V77.0.61']) and any(x in readme for x in ['`v77.0.39`','`v77.0.40`','`v77.0.41`','`v77.0.42`','`v77.0.43`','`v77.0.44`','`v77.0.45`','`v77.0.46`','`v77.0.47`','`v77.0.48`','`v77.0.49`','`v77.0.50`','`v77.0.52`','`v77.0.53`','`v77.0.54`','`v77.0.55`','`v77.0.56`','`v77.0.57`','`v77.0.59`','`v77.0.60`','`v77.0.61`']) and 'Zero-Warning Full-UI Language Contract' in readme,
   'README retains V77.0.39 history under the V77.0.45-or-newer stable target')
ok('Page` không sử dụng' in readme and 'LegacyUiLocalizationBridge' in readme and 'language-switch-en' in readme,
   'README records the lint root cause and full-UI language recovery scope')
root_markdown=[p.name for p in ROOT.glob('*.md')]
ok(root_markdown==['README.md'],
   'Source keeps one consolidated root Markdown history document')

passed=sum(checks)
print(f"\nV77.0.39 zero-warning full-UI language contract verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed==len(checks) else 1)
