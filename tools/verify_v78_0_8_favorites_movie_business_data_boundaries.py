from pathlib import Path
import re, subprocess, sys

ROOT = Path(__file__).resolve().parents[1]
checks = []

def text(rel):
    p = ROOT / rel
    return p.read_text(encoding="utf-8") if p.exists() else ""

def ok(cond, label):
    cond = bool(cond)
    checks.append(cond)
    print(f"[ {'OK' if cond else 'FAIL'} ] {label}")

card = text("frontend/components/MovieCard.tsx")
favorites = text("frontend/app/favorites/page.tsx")
e2e = text("frontend/e2e/v78-language-accessibility-pwa.spec.ts")
sw = text("frontend/public/sw.js")
readme = text("README.md")
release = text("scripts/release.ps1")
ci = text(".github/workflows/ci.yml")
make = text("Makefile")
diag = text("tools/diagnose-v78.ps1")
v78page = text("frontend/app/admin/ux-accessibility-pwa/page.tsx")

ok('data-testid="movie-card-title-v7808" data-i18n-skip="true">{movie.title}</Link>' in card,
   "MovieCard title uses an exact business-data boundary")
ok('data-testid="movie-card-genre-v7808" data-i18n-skip="true">{movie.genre}</span>' in card,
   "MovieCard genre uses an exact business-data boundary")
ok('aria-label={`${t("Xem chi tiết","View details")} ${movie.title}`}' in card and 'movie-poster-wrap" data-i18n-skip="true"' in card,
   "Poster accessibility label keeps its existing exact movie-title boundary")
ok(not re.search(r'<article[^>]*className="movie-card[^>]*data-i18n-skip="true"', card),
   "Whole MovieCard remains inside the fail-closed presentation sweep")
ok('MovieCard' in favorites and 'movie={m}' in favorites,
   "Favorites continues to render the shared MovieCard instead of a bypass copy")
ok('"/favorites"' in e2e,
   "V78 browser sweep still covers Favorites")
ok('route === "/favorites"' in e2e and 'movie-card-title-v7808' in e2e and 'movie-card-genre-v7808' in e2e,
   "Focused V78 journey proves Favorites movie metadata boundaries")
ok('clone.querySelectorAll(\'[data-i18n-skip="true"]\')' in e2e and 'closest(\'[data-i18n-skip="true"]\')' in e2e,
   "Browser leak scan still removes only explicit narrow business-data boundaries")
ok(any(x in sw for x in ['const VERSION = "v78-0-8";','const VERSION = "v78-0-9";','const VERSION = "v78-0-10";','const VERSION = "v78-0-11";','const VERSION = "v78-0-12";','const VERSION = "v78-0-13";','const VERSION = "v78-0-14";','const VERSION = "v78-0-15";','const VERSION = "v78-0-16";','const VERSION = "v78-0-17";','const VERSION = "v78-0-18";']),
   "Service Worker generation is V78.0.8 or forward-compatible V78.0.9")
ok(any(x in v78page for x in ['>V78.0.8</span>','>V78.0.9</span>','>V78.0.10</span>','>V78.0.11</span>','>V78.0.12</span>','>V78.0.13</span>','>V78.0.14</span>','>V78.0.15</span>','>V78.0.16</span>','>V78.0.17</span>','>V78.0.18</span>']),
   "Visible V78 Admin surface reports V78.0.8 or a forward patch generation")

migrations=list((ROOT/'backend/src/main/resources/db/migration').glob('V*.sql'))
latest=max(int(re.match(r'V(\d+)',x.name).group(1)) for x in migrations if re.match(r'V(\d+)',x.name))
ok(latest==72 and not list((ROOT/'backend/src/main/resources/db/migration').glob('V78*.sql')),
   "V78.0.8 remains no-schema on Flyway V72")
name='verify_v78_0_8_favorites_movie_business_data_boundaries.py'
ok(name in release and name in ci and name in diag,
   "Release, CI and V78 diagnostics execute V78.0.8 verifier")
ok('verify-v78-0-8' in make and 'release-v78-0-8' in make,
   "Makefile exposes V78.0.8 verify/release lifecycle")
ok(any(x in readme for x in ['Current release:** V78.0.8','Current release:** V78.0.9','Current release:** V78.0.10','Current release:** V78.0.11','Current release:** V78.0.12','Current release:** V78.0.13','Current release:** V78.0.14','Current release:** V78.0.15','Current release:** V78.0.16','Current release:** V78.0.17','Current release:** V78.0.18']) and any(x in readme for x in ['`v78.0.8`','`v78.0.9`','`v78.0.10`','`v78.0.11`','`v78.0.12`','`v78.0.13`','`v78.0.14`','`v78.0.15`']) and 'Favorites Movie Business-Data Boundaries' in readme,
   "README records V78.0.8 Favorites movie business-data boundary fix")
ok([p.name for p in ROOT.glob('*.md')]==['README.md'],
   "Source keeps one consolidated root README.md")

prev=subprocess.run([sys.executable,'-X','utf8',str(ROOT/'tools/verify_v78_0_7_admin_v78_entry_inventory_product_boundaries.py')],cwd=ROOT,text=True,encoding='utf-8',errors='replace',capture_output=True)
ok(prev.returncode==0 and '19/19 checks passed' in prev.stdout,
   "V78.0.7 and earlier V78 lineage remain forward-compatible with V78.0.8")
base=subprocess.run([sys.executable,'-X','utf8',str(ROOT/'tools/verify_v78_ux_accessibility_pwa_5.py')],cwd=ROOT,text=True,encoding='utf-8',errors='replace',capture_output=True)
ok(base.returncode==0 and '27/27 checks passed' in base.stdout,
   "Base V78 UX/Accessibility/PWA verifier remains green")

passed=sum(checks)
print(f"\nV78.0.8 Favorites movie business-data boundary verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed==len(checks) else 1)
