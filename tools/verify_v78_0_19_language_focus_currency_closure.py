from pathlib import Path
import re, subprocess, sys

ROOT=Path(__file__).resolve().parents[1]
checks=[]

def text(rel):
    p=ROOT/rel
    return p.read_text(encoding='utf-8') if p.exists() else ''

def ok(cond,label):
    cond=bool(cond); checks.append(cond); print(f"[ {'OK' if cond else 'FAIL'} ] {label}")

css=text('frontend/app/globals.css')
api=text('frontend/lib/api.ts')
movies=text('frontend/app/movies/page.tsx')
movie_card=text('frontend/components/MovieCard.tsx')
movie_detail=text('frontend/app/movies/[id]/page.tsx')
movie_presentation=text('frontend/lib/movie-presentation.ts')
security=text('frontend/app/security/page.tsx')
system_presentation=text('frontend/lib/system-presentation.ts')
input_modality=text('frontend/components/InputModalityManager.tsx')
layout=text('frontend/app/layout.tsx')
command=text('frontend/app/admin/command-center/page.tsx')
catalog=text('frontend/lib/presentation-ui-translations-v78-0-13.ts')
e2e=text('frontend/e2e/v78-language-accessibility-pwa.spec.ts')
sw=text('frontend/public/sw.js')
v78page=text('frontend/app/admin/ux-accessibility-pwa/page.tsx')
readme=text('README.md'); release=text('scripts/release.ps1'); ci=text('.github/workflows/ci.yml'); diag=text('tools/diagnose-v78.ps1'); make=text('Makefile')

ok('.input:focus-visible {' in css and '.input:focus {' not in css and 'data-input-modality="pointer"' in css and 'InputModalityManager' in input_modality and '<InputModalityManager />' in layout,
   'Pointer focus is explicitly suppressed by input modality while keyboard focus-visible remains explicit')
ok(':where(a,button,input,select,textarea,[tabindex]):focus-visible' in css,
   'Global keyboard focus-visible accessibility indicator remains enabled')

ok('`${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(v)} ₫`' in api,
   'Shared VND formatter keeps the currency unit after the numeric value in VI and EN')
direct=[]
for root in ['frontend/app','frontend/components','frontend/lib']:
    for p in (ROOT/root).rglob('*.ts*'):
        if p.as_posix().endswith('/lib/api.ts'): continue
        source=p.read_text(encoding='utf-8')
        if re.search(r'Intl\.NumberFormat\([^\n]*\{[^\n]*style\s*:\s*["\']currency["\'][^\n]*currency\s*:\s*["\']VND["\']',source):
            direct.append(str(p.relative_to(ROOT)).replace('\\','/'))
ok(not direct, f'All UI VND formatters use the shared suffix contract (direct={len(direct)})')

ok('"Doanh thu": "Revenue"' in catalog,
   'Standalone Doanh thu presentation literal is owned by the EN catalog')
ok(all(x in movie_presentation for x in ['"Bí ẩn": "Mystery"','"Khoa học viễn tưởng": "Science fiction"','"Tiếng Việt": "Vietnamese"']),
   'Controlled movie genre/language reference vocabulary has deterministic EN labels')
ok('movieGenreLabel(x,uiLanguage)' in movies and 'movieLanguageLabel(x,uiLanguage)' in movies and 'value={x}' in movies,
   'Movie filters localize visible labels while preserving raw filter/API values')
ok('movieGenreLabel(movie.genre,language)' in movie_card and 'data-testid="movie-card-title-v7808" data-i18n-skip="true"' in movie_card and 'movie-card-genre-v7808" data-i18n-skip' not in movie_card,
   'Movie cards localize controlled genres but preserve movie titles as business data')
ok('movieGenreLabel(movie.genre,language)' in movie_detail and 'movieLanguageLabel(movie.language,language)' in movie_detail,
   'Movie detail localizes controlled genre and language metadata')

ok('securityAlertPresentation(a.title,a.details||"",language)' in security and '{copy.title}' in security and '{copy.details}' in security,
   'Security page localizes CineBooking-owned alert title/details semantically')
ok('"Đăng nhập từ thiết bị chưa tin cậy"' in system_presentation and '"Sign-in from an untrusted device"' in system_presentation,
   'Known NEW_DEVICE security template has EN presentation ownership')
ok('commandCenterAttentionTitle(item.title,language)' in command and 'localizedLabel(item.severity,language)' in command,
   'Command Center localizes source-owned attention titles and machine labels')
ok(all(x in system_presentation for x in ['Support requests past SLA','Overdue maintenance work orders','Products out of available stock','Products at low-stock threshold','Open operational incidents']),
   'All five Command Center attention templates have EN presentation copy')

# Business/user-authored values must stay untouched.
support=text('frontend/app/admin/support/page.tsx'); staff_ops=text('frontend/app/staff/operations/page.tsx'); maintenance=text('frontend/app/admin/maintenance/page.tsx')
ok('supportCasePresentation(c.subject,c.description,language)' in support and 'SUPPORT_SUBJECT_EN' in system_presentation and 'SUPPORT_DESCRIPTION_EN' in system_presentation and '?? subject' in system_presentation and '?? description' in system_presentation,
   'Known seeded support templates localize while arbitrary user-authored payloads fall through unchanged')
ok('{i.title}' in staff_ops and '{i.description}' in staff_ops,
   'Staff incident title/description remain user-authored business payloads')
ok('maintenanceAssetName(asset.name,language)' in maintenance and 'MAINTENANCE_ASSET_PREFIX_EN' in system_presentation and 'return value;' in system_presentation and 'name: asset.name' in maintenance,
   'Known maintenance asset prefixes localize while arbitrary/editable business names remain raw')

ok('route === "/admin/performance"' in e2e and 'columnheader", { name: "Revenue"' in e2e,
   'Focused browser contract asserts the Revenue header in EN')
ok('not.toHaveAttribute("data-i18n-skip", "true")' in e2e and 'movie-card-genre-v7808' in e2e,
   'Browser contract treats movie genre as localized controlled vocabulary')

ok('const VERSION = "v78-0-19";' in sw, 'Service Worker generation advances to V78.0.19')
ok('>V78.0.19</span>' in v78page, 'Visible V78 Admin surface reports V78.0.19')

migrations=list((ROOT/'backend/src/main/resources/db/migration').glob('V*.sql'))
latest=max(int(re.match(r'V(\d+)',p.name).group(1)) for p in migrations if re.match(r'V(\d+)',p.name))
ok(latest==72 and not list((ROOT/'backend/src/main/resources/db/migration').glob('V78*.sql')),
   'V78.0.19 remains no-schema on Flyway V72')

name='verify_v78_0_19_language_focus_currency_closure.py'
ok(name in release and name in ci and name in diag,
   'Release, CI and V78 diagnostics execute the V78.0.19 verifier')
ok('verify-v78-0-19' in make and 'release-v78-0-19' in make,
   'Makefile exposes V78.0.19 verify/release lifecycle')
ok('Current release:** V78.0.19' in readme and '`v78.0.19`' in readme and 'Language / Focus / Currency Closure' in readme,
   'README records the V78.0.19 release and consolidated change history')
ok([p.name for p in ROOT.glob('*.md')]==['README.md'],'Source keeps one consolidated root README.md')

base=subprocess.run([sys.executable,'-X','utf8',str(ROOT/'tools/verify_v78_ux_accessibility_pwa_5.py')],cwd=ROOT,text=True,encoding='utf-8',errors='replace',capture_output=True)
ok(base.returncode==0 and '27/27 checks passed' in base.stdout,'Base V78 UX/Accessibility/PWA verifier remains green')
prev=subprocess.run([sys.executable,'-X','utf8',str(ROOT/'tools/verify_v78_0_18_full_suite_operational_read_stability.py')],cwd=ROOT,text=True,encoding='utf-8',errors='replace',capture_output=True)
ok(prev.returncode==0 and '27/27 checks passed' in prev.stdout,'V78.0.18 lineage remains green under V78.0.19 metadata')

passed=sum(checks)
print(f"\nV78.0.19 language / focus / currency closure verification: {passed}/{len(checks)} checks passed")
if direct:
    for item in direct: print('DIRECT_VND',item)
sys.exit(0 if passed==len(checks) else 1)
