from pathlib import Path
import re, sys

ROOT=Path(__file__).resolve().parents[1]
checks=[]
def text(rel):
    p=ROOT/rel
    return p.read_text(encoding="utf-8") if p.exists() else ""
def ok(cond,label):
    cond=bool(cond); checks.append(cond); print(f"[ {'OK' if cond else 'FAIL'} ] {label}")

movie_card=text('frontend/components/MovieCard.tsx')
discovery=text('frontend/e2e/discovery-calendar.spec.ts')
smart=text('frontend/e2e/showtime-smart-planner-v49.spec.ts')
sw=text('frontend/public/sw.js')
readme=text('README.md')
release=text('scripts/release.ps1'); ci=text('.github/workflows/ci.yml'); diag=text('tools/diagnose-v77.ps1'); make=text('Makefile')

ok('aria-label={`${t("Xem chi tiết","View details")} ${movie.title}`}' in movie_card,
   'MovieCard restores the historical accessible detail-link name without punctuation drift')
ok('aria-label={`${t("Xem chi tiết","View details")}: ${movie.title}`}' not in movie_card,
   'MovieCard no longer inserts the colon that broke the discovery-calendar role locator')
ok('getByRole("link", { name: "Xem chi tiết Hành Trình Sao Hỏa" })' in discovery,
   'Discovery E2E retains the user-facing accessible-link contract')

ok('function isolatedPlannerDate()' in smart and 'process.pid*97' in smart,
   'Smart Planner E2E derives an isolated future planning date per execution')
ok('2026-10-15' not in smart,
   'Smart Planner E2E no longer reuses the saturating fixed October 2026 date')
ok('fill(planningDate)' in smart and smart.count('fill(planningDate)') >= 2,
   'Smart Planner uses the same isolated date for both range endpoints')
ok('/api/admin/showtime-planner/smart/commit' in smart and 'commitResponsePromise' in smart,
   'Smart Planner E2E captures the authoritative commit response')
ok('const createdShowtimeIds=' in smart and 'expect(createdShowtimeIds.length).toBeGreaterThan(0)' in smart,
   'Smart Planner E2E records generated showtime IDs before cleanup')
ok('finally{' in smart and 'page.request.delete(`/api/admin/showtimes/${id}`' in smart,
   'Smart Planner E2E cleans generated showtimes even when a post-commit assertion fails')
ok('localStorage.getItem("cinebooking_auth_v3")' in smart and 'Authorization:`Bearer ${accessToken}`' in smart,
   'Smart Planner cleanup reuses the authenticated Admin session instead of hard-coded credentials')
ok('smart-suggested-metric' in smart and 'toBeGreaterThan(0)' in smart and 'smart-planning-run' in smart,
   'Smart Planner still proves non-zero suggestions and committed provenance before cleanup')

ok(any(x in sw for x in ['const VERSION = "v77-0-45";','const VERSION = "v77-0-46";','const VERSION = "v77-0-47";','const VERSION = "v77-0-48";','const VERSION = "v77-0-49";','const VERSION = "v77-0-50";','const VERSION = "v77-0-52";']),
   'Service Worker cache generation is V77.0.45 or forward-compatible V77.0.46/V77.0.47/V77.0.48')
migrations=list((ROOT/'backend/src/main/resources/db/migration').glob('V*.sql'))
latest=max(int(re.match(r'V(\d+)',x.name).group(1)) for x in migrations if re.match(r'V(\d+)',x.name))
ok(latest==72 and not list((ROOT/'backend/src/main/resources/db/migration').glob('V77*.sql')),
   'V77.0.45 remains no-schema on Flyway V72')
name='verify_v77_0_45_full_suite_repeatability_accessibility_fix.py'
ok(name in release and name in ci and name in diag and 'verify-v77-0-45' in make and 'release-v77-0-45' in make,
   'Release, CI, diagnostics and Makefile include the V77.0.45 gate')
ok(any(x in readme for x in ['Current release:** V77.0.45','Current release:** V77.0.46','Current release:** V77.0.47','Current release:** V77.0.48','Current release:** V77.0.49','Current release:** V77.0.50','Current release:** V77.0.52']) and any(x in readme for x in ['`v77.0.45`','`v77.0.46`','`v77.0.47`','`v77.0.48`','`v77.0.49`','`v77.0.50`','`v77.0.52`']) and 'V77.0.45 - Full-Suite Repeatability + Accessibility Contract Fix' in readme,
   'README retains V77.0.45 history under the V77.0.50-or-newer stable target')
ok('44/46' in readme and 'Xem chi tiết Hành Trình Sao Hỏa' in readme and 'suggested=0' in readme,
   'README records both concrete full-suite failures and their fixes')
ok([p.name for p in ROOT.glob('*.md')]==['README.md'],
   'Source keeps one consolidated root Markdown history document')

v44=text('tools/verify_v77_0_44_crm_payload_v66_authority_fix.py')
ok('V77.0.45' in v44 and 'v77-0-45' in v44,
   'V77.0.44 verifier accepts the V77.0.45 stable target/cache generation')

passed=sum(checks)
print(f"\nV77.0.45 full-suite repeatability/accessibility verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed==len(checks) else 1)
