from pathlib import Path
import re, sys

ROOT = Path(__file__).resolve().parents[1]
checks=[]

def text(rel):
    p=ROOT/rel
    return p.read_text(encoding='utf-8') if p.exists() else ''

def ok(cond,label):
    cond=bool(cond); checks.append(cond); print(f"[ {'OK' if cond else 'FAIL'} ] {label}")

movies=text('frontend/app/movies/page.tsx')
lang_spec=text('frontend/e2e/realtime-operations-v59-language.spec.ts')
playwright=text('frontend/playwright.config.ts')
sw=text('frontend/public/sw.js')
readme=text('README.md')
release=text('scripts/release.ps1')
ci=text('.github/workflows/ci.yml')
diag=text('tools/diagnose-v77.ps1')
make=text('Makefile')

ok('usePresentationLanguage' in movies and ('const {t}=usePresentationLanguage();' in movies or 'const {t,language:uiLanguage}=usePresentationLanguage();' in movies),
   'Movies surface owns presentation copy through the live language state')
for testid,vi,en in [
    ('movies-search-label','Tìm phim','Search movies'),
    ('movies-genre-label','Thể loại','Genre'),
    ('movies-language-label','Ngôn ngữ','Language'),
    ('movies-rating-label','Phân loại','Rating'),
]:
    ok(f'data-testid="{testid}"' in movies and f't("{vi}","{en}")' in movies,
       f'Movies {testid} switches VI/EN directly')

ok('placeholder={t("Tên phim, mô tả, thể loại...","Movie title, description, genre...")}' in movies,
   'Movie search placeholder switches with the same presentation state')
ok(all(x in movies for x in [
    't("Đang chiếu","Now showing")',
    't("Sắp chiếu","Coming soon")',
    't("Tất cả","All")',
    't("Sắp xếp","Sort")',
    't("Đặt lại","Reset")',
]), 'Movie tabs, sort and reset controls are presentation-owned')
ok(all(x in movies for x in [
    't("Tất cả thể loại","All genres")',
    't("Tất cả ngôn ngữ","All languages")',
    't("Tất cả phân loại","All ratings")',
]), 'Movie default select options switch VI/EN')
ok((movies.count('data-i18n-skip="true"') >= 3 or ('movieGenreLabel(x,uiLanguage)' in movies and 'movieLanguageLabel(x,uiLanguage)' in movies and 'data-i18n-skip="true">{x}</option>' in movies)) and 'genres.map' in movies and 'languages.map' in movies and 'ratings.map' in movies,
   'Dynamic movie metadata remains explicitly owned: controlled genre/language labels may localize while raw values/rating stay protected')
ok('t("Khám phá phim","Explore movies")' in movies and 't("Không tìm thấy phim phù hợp. Hãy thử bỏ bớt bộ lọc.","No matching movies found. Try clearing some filters.")' in movies,
   'Movie heading and empty state also follow VI/EN instead of mixed copy')

ok(all(testid in lang_spec for testid in ['movies-search-label','movies-genre-label','movies-language-label','movies-rating-label']),
   'Cross-surface E2E explicitly asserts all four movie filter labels in English')
ok(all(en in lang_spec for en in ['Search movies','Genre','Language','Rating']),
   'Movie EN assertions verify the exact repaired presentation copy')
ok('assertNoVietnameseInteractiveCopy' in lang_spec and 'route === "/movies"' in lang_spec,
   'Generic Vietnamese leak audit still runs after explicit /movies assertions')
ok('data-i18n-skip="true"' in movies and 'clone.querySelectorAll(\'[data-i18n-skip="true"]\')' in lang_spec,
   'E2E continues to remove source-owned business data before presentation-copy audit')

ok('process.env.E2E_ADMIN_EMAIL || process.env.ADMIN_EMAIL || localEnv.ADMIN_EMAIL' in playwright and
   'process.env.E2E_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || localEnv.ADMIN_PASSWORD' in playwright,
   'Playwright resolves Admin credentials from root .env ADMIN_EMAIL/ADMIN_PASSWORD')
legacy=['admin-v29@cine.local','V29SmokeOnly-ChangeMe','Admin@123']
ok(all(x not in lang_spec for x in legacy),
   'Touched language E2E contains no legacy hard-coded Admin account')

ok(any(x in sw for x in ['const VERSION = "v77-0-41";','const VERSION = "v77-0-42";','const VERSION = "v77-0-43";','const VERSION = "v77-0-44";','const VERSION = "v77-0-45";','const VERSION = "v77-0-46";','const VERSION = "v77-0-47";','const VERSION = "v77-0-48";','const VERSION = "v77-0-49";','const VERSION = "v77-0-50";','const VERSION = "v77-0-52";','const VERSION = "v77-0-53";','const VERSION = "v77-0-54";','const VERSION = "v77-0-55";','const VERSION = "v77-0-56";','const VERSION = "v77-0-57";','const VERSION = "v77-0-59";','const VERSION = "v77-0-60";','const VERSION = "v77-0-61";','const VERSION = "v78-0-0";','const VERSION = "v78-0-1";','const VERSION = "v78-0-2";','const VERSION = "v78-0-3";','const VERSION = "v78-0-4";','const VERSION = "v78-0-5";','const VERSION = "v78-0-6";','const VERSION = "v78-0-7";','const VERSION = "v78-0-8";','const VERSION = "v78-0-9";','const VERSION = "v78-0-10";','const VERSION = "v78-0-11";','const VERSION = "v78-0-12";','const VERSION = "v78-0-13";','const VERSION = "v78-0-14";','const VERSION = "v78-0-15";','const VERSION = "v78-0-16";','const VERSION = "v78-0-17";','const VERSION = "v78-0-18";','const VERSION = "v78-0-19";','const VERSION = "v78-0-20";']),
   'Service Worker generation is V77.0.41 or a forward-compatible V77.0.42/V77.0.43/V77.0.44 cache generation')

migrations=list((ROOT/'backend/src/main/resources/db/migration').glob('V*.sql'))
latest=max(int(re.match(r'V(\d+)',x.name).group(1)) for x in migrations if re.match(r'V(\d+)',x.name))
ok(latest==72 and not list((ROOT/'backend/src/main/resources/db/migration').glob('V77*.sql')),
   'V77.0.41 remains no-schema on Flyway V72')

name='verify_v77_0_41_movies_language_surface_fix.py'
ok(name in release and name in ci and name in diag,
   'Release, CI and diagnostics run the V77.0.41 verifier')
ok('verify-v77-0-41' in make and 'release-v77-0-41' in make,
   'Makefile exposes V77.0.41 verify/release targets')
ok(any(x in readme for x in ['Current release:** V77.0.41','Current release:** V77.0.42','Current release:** V77.0.43','Current release:** V77.0.44','Current release:** V77.0.45','Current release:** V77.0.46','Current release:** V77.0.47','Current release:** V77.0.48','Current release:** V77.0.49','Current release:** V77.0.50','Current release:** V77.0.52','Current release:** V77.0.53','Current release:** V77.0.54','Current release:** V77.0.55','Current release:** V77.0.56','Current release:** V77.0.57','Current release:** V77.0.59','Current release:** V77.0.60','Current release:** V77.0.61']) and any(x in readme for x in ['`v77.0.41`','`v77.0.42`','`v77.0.43`','`v77.0.44`','`v77.0.45`','`v77.0.46`','`v77.0.47`','`v77.0.48`','`v77.0.49`','`v77.0.50`','`v77.0.52`','`v77.0.53`','`v77.0.54`','`v77.0.55`','`v77.0.56`','`v77.0.57`','`v77.0.59`','`v77.0.60`','`v77.0.61`']),
   'README retains V77.0.41 history under the V77.0.45-or-newer stable target')
ok('V77.0.41 - Movies Presentation-Language Runtime Fix' in readme and '/movies' in readme and 'root `.env`' in readme,
   'README records the runtime root cause, fix scope and existing Admin credential policy')
root_markdown=[p.name for p in ROOT.glob('*.md')]
ok(root_markdown==['README.md'],
   'Source keeps one consolidated root Markdown history document')

# Historical V77.0.40 verifier remains chained and forward-compatible.
v40=text('tools/verify_v77_0_40_runtime_language_boundary_fix.py')
ok(any(x in v40 for x in ['V77.0.41','V77.0.42','V77.0.43','V77.0.44','V77.0.45','V77.0.46','V77.0.47']) and any(x in v40 for x in ['v77-0-41','v77-0-42','v77-0-43','v77-0-44','v77-0-45','v77-0-46','v77-0-47']),
   'V77.0.40 verifier accepts the V77.0.45-or-newer stable target and Service Worker generation')

passed=sum(checks)
print(f"\nV77.0.41 movies presentation-language runtime verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed==len(checks) else 1)
