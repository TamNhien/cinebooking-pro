from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]
checks=[]

def text(rel):
    p=ROOT/rel
    return p.read_text(encoding='utf-8') if p.exists() else ''

def check(name, cond):
    ok=bool(cond); checks.append((name,ok)); print(f"[ {'OK' if ok else 'FAIL'} ] {name}")

service=text('backend/src/main/java/com/cinebooking/recommendation/RecommendationService.java')
controller=text('backend/src/main/java/com/cinebooking/recommendation/RecommendationController.java')
dtos=text('backend/src/main/java/com/cinebooking/recommendation/RecommendationDtos.java')
ui=text('frontend/app/for-you/page.tsx')
types=text('frontend/lib/types.ts')
home=text('frontend/app/page.tsx')
header=text('frontend/components/Header.tsx')
e2e=text('frontend/e2e/recommendation-4-v63.spec.ts')
ci=text('.github/workflows/ci.yml')
rc=text('.github/workflows/release-candidate.yml')
release=text('.github/workflows/release.yml')
make=text('Makefile')
diagnose=text('tools/diagnose-v63.ps1')
readme=text('README.md')
v50verify=text('tools/verify_v50_recommendation_intelligence_2.py')
v62verify=text('tools/verify_v62_dynamic_pricing_4.py')
seed57=text('tools/seed-demo-57-tables-10-rows.sql')

# Algorithm / API contract
check('V63 algorithm version is explicit', 'V63-DEEP-CONTEXT-4' in service)
check('V63 exposes exactly three recommendation modes', 'Set.of("FAMILIAR", "BALANCED", "DISCOVERY")' in service)
check('Home API accepts optional mode with BALANCED default', '@RequestParam(defaultValue = "BALANCED") String mode' in controller)
check('Home response exposes selected mode', 'String mode' in dtos and 'new RecommendationHomeResponse(VERSION, mode' in service)
check('Invalid mode returns BAD_REQUEST', 'HttpStatus.BAD_REQUEST' in service and 'mode phải là FAMILIAR, BALANCED hoặc DISCOVERY' in service)
check('Legacy public recommendation routes remain present', all(x in controller for x in ['@GetMapping("/home")','@GetMapping("/trending")','@GetMapping("/similar/{movieId}")']))
check('Legacy protected taste routes remain present', all(x in controller for x in ['@GetMapping("/profile")','@PutMapping("/feedback")','@DeleteMapping("/feedback/{movieId}")']))

# Deep profile facets from real existing data
check('V63 retains V50 favorites signal', 'movie_favorite' in service and 'favoriteMovies' in service)
check('V63 retains positive and negative review learning', 'movie_review' in service and 'rating <= 2' in service and '-5.0' in service and '-3.5' in service)
check('V63 retains confirmed booking learning', "b.status='CONFIRMED'" in service and 'bookedMovies' in service)
check('V63 retains 120-day event recency decay', "recommendation_event" in service and "interval '120 days'" in service and 'ChronoUnit.DAYS' in service and 'decay' in service)
check('V63 retains explicit MORE LESS HIDE feedback', all(x in service for x in ['MORE_LIKE_THIS','LESS_LIKE_THIS','HIDE','moreLikeMovies','lessLikeMovies','hiddenMovies']))
check('V63 learns language facet from movie metadata', 'languageWeights' in service and 'movie.getLanguage()' in service and 'languageLabels' in service)
check('V63 learns content-rating facet from movie metadata', 'ratingWeights' in service and 'movie.getRating()' in service)
check('V63 learns duration facet from movie metadata', 'durationWeights' in service and 'durationBand(movie.getDurationMinutes())' in service)
check('V63 duration bands are deterministic', all(x in service for x in ['minutes <= 100','minutes <= 130','"SHORT"','"STANDARD"','"LONG"']))
check('V63 derives weekday from confirmed showtime history', 'extract(isodow from st.start_time)::int as weekday_value' in service and 'weekdayWeights.merge' in service)
check('V63 still derives cinema and daypart from booking history', 'cinemaWeights.merge' in service and 'daypartWeights.merge' in service)
check('V63 profile exposes languages weekday duration and strength', all(x in dtos for x in ['List<TasteFacet> topLanguages','Integer preferredWeekday','String preferredDurationBand','int profileStrength']))
check('Profile strength is bounded 0 to 100', 'Math.max(0, Math.min(100, raw))' in service)
check('Profile summary can explain language duration and weekday', all(x in service for x in ['hay xem','hợp thời lượng','thường đi']))

# Context-aware ranking
check('V63 keeps V50 genre affinity lineage', 'affinity * 2.4 + popularityScore(movie, p) * 0.25' in service)
check('V63 keeps preferred cinema V50 contribution', 'if (a.preferredCinema) score += 4.5' in service)
check('V63 keeps preferred daypart V50 contribution', 'if (a.preferredDaypart) score += 3.5' in service)
check('V63 adds bounded language contribution', 'languageContribution' in service and 'Math.max(-8.0, Math.min(10.0' in service)
check('V63 adds bounded content-rating contribution', 'ratingContribution' in service and 'Math.max(-5.0, Math.min(6.0' in service)
check('V63 adds bounded duration contribution', 'durationContribution' in service and 'Math.max(-6.0, Math.min(8.0' in service)
check('V63 adds weekday schedule contribution', 'weekdayContribution = a.preferredWeekday ? 3.0 * facetMultiplier' in service)
check('FAMILIAR mode uses strongest learned-facet multiplier', 'case "FAMILIAR" -> 1.00' in service)
check('DISCOVERY mode reduces facet multiplier to widen exploration', 'case "DISCOVERY" -> 0.45' in service)
check('BALANCED mode is middle facet multiplier', 'default -> 0.75' in service)
check('DISCOVERY has largest novelty bonus', 'case "DISCOVERY" -> 5.0' in service and 'case "FAMILIAR" -> 0.5' in service)
check('New-to-you excludes all durable user signals', all(x in service for x in ['!favoriteMovies.contains(movieId)','!bookedMovies.contains(movieId)','!reviewedMovies.contains(movieId)','!interactedMovies.contains(movieId)','!feedbackByMovie.containsKey(movieId)']))
check('Future OPEN showtimes drive context fit', "st.status='OPEN' and st.start_time>now()" in service)
check('Future schedule fit covers cinema daypart weekday', all(x in service for x in ['a.preferredCinema = true','a.preferredDaypart = true','a.preferredWeekday = true']))

# Diversity reranker / explainability
check('V63 uses deterministic diversity reranker', 'diversityRerank(pool, limit, mode)' in service and 'genreOverlap' in service)
check('DISCOVERY diversity penalty is strongest', 'case "DISCOVERY" -> 6.0' in service)
check('FAMILIAR diversity penalty is weakest', 'case "FAMILIAR" -> 1.5' in service)
check('Genre overlap is Jaccard-style intersection over union', 'intersection.retainAll(right)' in service and 'union.addAll(right)' in service and '(double)intersection.size() / union.size()' in service)
check('Diversity reranker has deterministic title tie-break', 'movie().title().compareTo(best.item().movie().title())' in service)
check('Recommendation item exposes newToYou and scoreBreakdown', 'boolean newToYou' in dtos and 'List<RecommendationScoreComponent> scoreBreakdown' in dtos)
check('Score component exposes key label contribution evidence', all(x in dtos for x in ['String key','String label','double contribution','String evidence']))
check('Score breakdown includes deep taste and schedule signals', all(x in service for x in ['GENRE_TASTE','LANGUAGE_FIT','RATING_FIT','DURATION_FIT','SCHEDULE_FIT']))
check('Score breakdown includes popularity and novelty', 'POPULARITY' in service and 'NOVELTY' in service)
check('Score breakdown is capped to six components', '.limit(6).toList()' in service)
check('V63 confidence incorporates profile strength', 'profile.profileStrength() / 15' in service)
check('V63 signals include language duration weekday novelty', all(x in service for x in ['Ngôn ngữ hợp gu','Thời lượng hợp gu','Ngày xem thường chọn','Phim mới với bạn']))

# Frontend contract/UI
check('Frontend types expose RecommendationMode', 'export type RecommendationMode = "FAMILIAR"|"BALANCED"|"DISCOVERY"' in types)
check('Frontend item type exposes V63 explainability fields', 'newToYou:boolean' in types and 'scoreBreakdown:RecommendationScoreComponent[]' in types)
check('Frontend profile type exposes V63 deep facets', all(x in types for x in ['topLanguages:RecommendationTasteFacet[]','preferredWeekday?:number','preferredDurationBand?:string','profileStrength:number']))
check('For You page is branded V63 Recommendation 4.0', 'V63 · RECOMMENDATION 4.0' in ui and 'Gợi ý phim cá nhân hóa sâu' in ui)
check('For You page has V63 root test id', 'data-testid="for-you-v63"' in ui)
check('V50 root compatibility test id is retained', 'data-testid="for-you-v50"' in ui)
check('UI requests selected mode from API', '/recommendations/home?limit=12&mode=${nextMode}' in ui)
check('UI offers all three mode controls', 'const modes:RecommendationMode[]=["FAMILIAR","BALANCED","DISCOVERY"]' in ui and 'recommendation-mode-${value.toLowerCase()}' in ui)
check('UI explains no fabricated history for mode switch', 'không sửa hay tạo giả lịch sử' in ui)
check('UI renders profile strength', 'profile.profileStrength' in ui and 'Độ mạnh hồ sơ' in ui)
check('UI renders top languages and duration', 'profile.topLanguages' in ui and 'profile.preferredDurationLabel' in ui)
check('UI renders weekday/daypart/cinema schedule profile', all(x in ui for x in ['profile.preferredWeekdayLabel','profile.preferredDaypartLabel','profile.preferredCinemaName']))
check('UI renders V63 new-to-you badge', 'data-testid="new-to-you-v63"' in ui and 'MỚI VỚI BẠN' in ui)
check('UI renders score breakdown chips', 'data-testid="score-breakdown-v63"' in ui and 'item.scoreBreakdown.slice(0,4)' in ui)
check('UI preserves MORE LESS HIDE controls', all(x in ui for x in ['more-like-this','less-like-this','hide-recommendation','clear-recommendation-feedback']))
check('V63 feedback source is explicit', 'source:"FOR_YOU_V63"' in ui)
check('Movie click tracking carries V63 mode', 'FOR_YOU_V63_${mode}' in ui)
check('Home still renders personalized recommendations', 'recommendations?.personalizedMovies.length' in home and 'Tinh chỉnh gu phim' in home)
check('Header still links authenticated users to For You', 'href="/for-you"' in header and 'Gu phim' in header)

# Browser journey
check('V63 Playwright journey exists', bool(e2e))
check('V63 E2E registers a real user flow', 'page.goto("/register")' in e2e and 'Nguyễn Minh Khôi' in e2e)
check('V63 E2E verifies V63 branding and mode surface', 'for-you-v63' in e2e and 'recommendation-mode-v63' in e2e)
check('V63 E2E creates durable MORE_LIKE_THIS signal', 'more-like-this' in e2e and 'Đã ưu tiên thêm phim' in e2e)
check('V63 E2E verifies score breakdown', 'score-breakdown-v63' in e2e)
check('V63 E2E switches to discovery mode', 'recommendation-mode-discovery' in e2e)
check('V63 E2E verifies novelty badge', 'new-to-you-v63' in e2e)
check('Playwright suite now has at least 31 journeys', sum(1 for _ in (ROOT/'frontend/e2e').glob('*.spec.ts')) >= 31)

# Data/schema policy
check('V63 adds no Flyway migration', len(list((ROOT/'backend/src/main/resources/db/migration').glob('V63__*.sql'))) == 0)
check('V63 adds no synthetic recommendation entity', not (ROOT/'backend/src/main/java/com/cinebooking/domain/RecommendationProfileV63.java').exists())
check('V63 reuses existing V25 and V50 recommendation tables', all(x in readme for x in ['recommendation_event','recommendation_feedback','movie_favorite','movie_review']))
check('V63 README explicitly forbids synthetic movie/taste history', 'không seed phim mới' in readme and 'Không tạo phim giả hay lịch sử gu giả' in ui)
check('V63 README keeps 8 real V29 movies policy', '8 phim V29' in readme)
check('V63 keeps 57 public table / Flyway V52 contract', '57 public tables' in readme and 'Flyway latest: V52' in readme)
check('V63 README explicitly keeps UTF-8 end to end', 'UTF-8 end-to-end' in readme and 'server_encoding = UTF8' in readme)
check('V63 does not add a new seed SQL', not (ROOT/'tools/seed-demo-58-tables-10-rows.sql').exists())
check('Existing 57-table seed remains available', bool(seed57))

# Release / regression wiring
ci_match=re.search(r'V26-V(\d+) source regression',ci)
check('CI source regression extends through V63', bool(ci_match) and int(ci_match.group(1))>=63)
check('CI runs V63 verifier', 'python3 tools/verify_v63_recommendation_4.py' in ci)
rc_default=re.search(r'default: "v(\d+)\.0\.0-rc\.1"',rc)
check('RC defaults to V63 or later', bool(rc_default) and int(rc_default.group(1))>=63)
check('RC compose namespace is V63 or later', bool(re.search(r'cinebooking_v(6[3-9]|[7-9][0-9])_rc_',rc)))
check('RC runs V63 source gate', 'Verify V63 source gate' in rc and 'verify_v63_recommendation_4.py' in rc)
check('RC browser label includes V63', '+ V62 + V63)' in rc)
stable_default=re.search(r'default: "(\d+)\.0\.0"',release)
check('Stable defaults to V63 or later', bool(stable_default) and int(stable_default.group(1))>=63)
check('Stable compose namespace is V63 or later', bool(re.search(r'cinebooking_v(6[3-9]|[7-9][0-9])_release_',release)))
check('Stable runs V63 source gate', 'Verify V63 source gate' in release and 'verify_v63_recommendation_4.py' in release)
check('Makefile exposes verify-v63 and diagnose-v63', all(x in make for x in ['verify-v63:','diagnose-v63:','verify_v63_recommendation_4.py','diagnose-v63.ps1']))
check('Makefile reuses 57-table data gates for V63', all(x in make for x in ['verify-seed-demo-v63:','verify-reference-v63:','verify-realistic-data-v63:']))
check('Diagnose V63 chains V50 V60 V61 V62 V63 and real-data gates', all(x in diagnose for x in ['verify_v50_recommendation_intelligence_2.py','verify_v60_payment_production_4.py','verify_v61_fraud_risk_intelligence.py','verify_v62_dynamic_pricing_4.py','verify_v63_recommendation_4.py','verify_realistic_data_57.py','verify_seed_demo_57.py']))
check('V62 verifier is forward-compatible with later releases', 'V62 or later' in v62verify and 'at least 30 journeys' in v62verify)
check('V50 regression verifier is retained', 'V50 verification:' in v50verify)

# README/version history
check('README current release is V63', '# CineBooking Pro V63' in readme and 'Current release:** V63 - Recommendation 4.0' in readme)
check('README version history contains V63 after V62', readme.find('| **V62**') < readme.find('| **V63**'))
check('README has detailed V63 section after V62 section', readme.find('## V62 - Dynamic Pricing 4.0') < readme.find('## V63 - Recommendation 4.0'))
check('README documents all three ranking modes', all(x in readme for x in ['FAMILIAR','BALANCED','DISCOVERY']))
check('README documents score breakdown and novelty', 'scoreBreakdown[]' in readme and 'newToYou' in readme)
check('README documents V63 release tags', 'v63.0.0-rc.1' in readme and 'v63.0.0' in readme)
check('README retains Windows project command root', r'D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui' in readme)

passed=sum(ok for _,ok in checks)
print(f"\nV63 verification: {passed}/{len(checks)} checks passed")
if passed!=len(checks):
    print('Failed checks:')
    for name,ok in checks:
        if not ok: print(' - '+name)
    raise SystemExit(1)
