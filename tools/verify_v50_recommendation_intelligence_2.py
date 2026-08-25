from pathlib import Path
import re
ROOT=Path(__file__).resolve().parents[1]
checks=[]
def text(rel):
    p=ROOT/rel
    return p.read_text(encoding='utf-8') if p.exists() else ''
def check(name,cond):
    ok=bool(cond); checks.append((name,ok)); print(f"[ {'OK' if ok else 'FAIL'} ] {name}")

migration=text('backend/src/main/resources/db/migration/V50__recommendation_intelligence_2.sql')
entity=text('backend/src/main/java/com/cinebooking/domain/RecommendationFeedback.java')
repo=text('backend/src/main/java/com/cinebooking/recommendation/RecommendationFeedbackRepository.java')
service=text('backend/src/main/java/com/cinebooking/recommendation/RecommendationService.java')
controller=text('backend/src/main/java/com/cinebooking/recommendation/RecommendationController.java')
dtos=text('backend/src/main/java/com/cinebooking/recommendation/RecommendationDtos.java')
security=text('backend/src/main/java/com/cinebooking/config/SecurityConfig.java')
ui=text('frontend/app/for-you/page.tsx')
home=text('frontend/app/page.tsx')
header=text('frontend/components/Header.tsx')
types=text('frontend/lib/types.ts')
e2e=text('frontend/e2e/recommendation-intelligence-v50.spec.ts')
seed=text('tools/seed-demo-54-tables-10-rows.sql')
seed_verify=text('tools/verify_seed_demo_54.py')
integration=text('backend/src/test/java/com/cinebooking/integration/CineBookingIntegrationIT.java')
ci=text('.github/workflows/ci.yml'); rc=text('.github/workflows/release-candidate.yml'); release=text('.github/workflows/release.yml')
make=text('Makefile'); diagnose=text('tools/diagnose-v50.ps1'); readme=text('README.md')

check('V50 migration creates explicit recommendation feedback table', 'CREATE TABLE recommendation_feedback' in migration and 'uq_recommendation_feedback_user_movie' in migration)
check('V50 feedback type is constrained to MORE LESS HIDE', all(x in migration for x in ['MORE_LIKE_THIS','LESS_LIKE_THIS','HIDE','ck_recommendation_feedback_type']))
check('V50 feedback indexes user recency and movie type', all(x in migration for x in ['idx_recommendation_feedback_user_updated','idx_recommendation_feedback_movie_type']))
check('RecommendationFeedback entity maps durable taste controls', '@Table(name = "recommendation_feedback"' in entity and all(x in entity for x in ['feedbackType','source','createdAt','updatedAt']))
check('Recommendation feedback repository supports upsert lookup and counts', all(x in repo for x in ['findByUserIdOrderByUpdatedAtDesc','findByUserIdAndMovieId','countByUserId','deleteByUserIdAndMovieId']))
check('V50 algorithm version is explicit', 'V50-HYBRID-TASTE-2' in service)
check('V50 profile learns from favorites reviews bookings and recency events', all(x in service for x in ['movie_favorite','movie_review','b.status=\'CONFIRMED\'','recommendation_event','ChronoUnit.DAYS']))
check('V50 JdbcTemplate popularity query avoids ambiguous expression lambda overload', 'rs -> {\n                    result.put(rs.getObject(\"id\", UUID.class), mapPopularity(rs));\n                }' in service and 'rs -> result.put(rs.getObject(\"id\", UUID.class), mapPopularity(rs))' not in service)
check('V50 profile learns negative ratings instead of treating only positives', 'rating <= 2' in service and '-5.0' in service and '-3.5' in service)
check('V50 explicit more-like feedback boosts genre affinity', 'case "MORE_LIKE_THIS"' in service and '8.0' in service and 'moreLikeMovies' in service)
check('V50 explicit less-like feedback reduces genre affinity', 'case "LESS_LIKE_THIS"' in service and '-7.0' in service and 'lessLikeMovies' in service)
check('V50 hidden feedback removes movies from personalized candidates', 'hiddenMovies' in service and '.filter(m -> !profile.hiddenMovies.contains(m.getId()))' in service)
check('V50 derives preferred cinema from confirmed booking history', 'cinemaWeights' in service and 'preferredCinemaId' in service and 'join auditorium a' in service)
check('V50 derives preferred daypart from booking hour', 'daypartWeights' in service and 'preferredDaypart' in service and 'extract(hour from st.start_time)' in service)
check('V50 availability boosts preferred cinema and daypart showtimes', 'a.preferredCinema' in service and 'a.preferredDaypart' in service and 'score += 4.5' in service and 'score += 3.5' in service)
check('V50 explainability uses more-like anchor title', 'Vì bạn muốn xem thêm phim giống' in service and 'bestAnchor' in service)
check('V50 recommendation item exposes confidence signals and feedback state', all(x in dtos for x in ['int confidence','List<String> signals','String feedback']))
check('V50 taste profile exposes top genres cinema daypart and signal counts', all(x in dtos for x in ['RecommendationTasteProfile','topGenres','preferredCinemaName','preferredDaypartLabel','signalCount','feedbackCount','hiddenCount']))
check('V50 API exposes protected profile feedback save and clear', all(x in controller for x in ['@GetMapping("/profile")','@PutMapping("/feedback")','@DeleteMapping("/feedback/{movieId}")']))
check('Security protects recommendation profile while keeping public discovery GETs', '.requestMatchers(HttpMethod.GET, "/api/recommendations/profile").authenticated()' in security and '"/api/recommendations/**"' in security)
check('V50 For You UI identifies Recommendation Intelligence 2.0', 'V50 · RECOMMENDATION INTELLIGENCE 2.0' in ui and 'Gu phim của bạn' in ui)
check('V50 For You UI renders explainable confidence and signal chips', 'item.confidence' in ui and 'item.signals.map' in ui and 'GỢI Ý CÓ GIẢI THÍCH' in ui)
check('V50 For You UI supports more less hide and clear feedback', all(x in ui for x in ['MORE_LIKE_THIS','LESS_LIKE_THIS','HIDE','clear-recommendation-feedback']))
check('Header links authenticated users to For You taste center', 'href="/for-you"' in header and 'Gu phim' in header)
check('Home personalized section links to taste tuning', 'Tinh chỉnh gu phim' in home and 'item.confidence' in home)
check('Frontend types include V50 taste profile confidence signals and feedback', all(x in types for x in ['RecommendationTasteProfile','confidence:number','signals:string[]','RecommendationFeedbackResponse']))
check('Dedicated V50 Playwright covers explicit taste feedback and hide', all(x in e2e for x in ['V50 user tunes explainable recommendations with explicit taste feedback','more-like-this','hide-recommendation','taste-profile']))
check('V50 seed covers recommendation_feedback with honest explicit controls', 'INSERT INTO recommendation_feedback(' in seed and 'REFERENCE_TASTE_CENTER' in seed and 'seed50:recommendation-feedback:' in seed)
check('V50 54-table realistic-data verifier exists', 'recommendation_feedback' in seed_verify and '54 pgAdmin tables' in seed_verify)
check('Integration test keeps V50 schema coverage on V50-or-newer Flyway catalog', 'recommendation_feedback' in integration and (('flywayMigratesRealPostgresToV50RecommendationIntelligenceSchemaAndCatalog' in integration and 'assertThat(latest).isEqualTo("50")' in integration) or ('flywayMigratesRealPostgresToV51AnalyticsForecastingSchemaAndCatalog' in integration and 'assertThat(latest).isEqualTo("51")' in integration) or ('flywayMigratesRealPostgresToV52PwaMobileExperienceSchemaAndCatalog' in integration and 'assertThat(latest).isEqualTo("52")' in integration)))
ci_versions=[int(v) for v in re.findall(r'V26-V(\d+) source regression',ci)]
rc_versions=[int(v) for v in re.findall(r'default: "v(\d+)\.0\.0-rc\.1"',rc)]
release_versions=[int(v) for v in re.findall(r'default: "(\d+)\.0\.0"',release)]
check('Main CI retains V50 source and 54-table compatibility gates', bool(ci_versions) and max(ci_versions)>=50 and 'verify_v50_recommendation_intelligence_2.py' in ci and 'verify_seed_demo_54.py' in ci)
check('Standalone RC keeps V50 gate in V50-or-newer candidate', bool(rc_versions) and max(rc_versions)>=50 and 'verify_v50_recommendation_intelligence_2.py' in rc)
check('Stable release keeps V50 gate in V50-or-newer release', bool(release_versions) and max(release_versions)>=50 and 'verify_v50_recommendation_intelligence_2.py' in release)
check('Makefile exposes V50 verify diagnose seed and reference targets', all(x in make for x in ['verify-v50:','diagnose-v50:','seed-demo-v50:','verify-reference-v50:','seed-reference-v50:']))
check('V50 diagnostics chains V46 through V50 and 54-table seed', all(x in diagnose for x in ['verify_v46_security_account_protection.py','verify_v47_payment_gateway_operations.py','verify_v48_concession_inventory_2.py','verify_v49_smart_showtime_planning_2.py','verify_v50_recommendation_intelligence_2.py','verify_seed_demo_54.py']))
check('README identifies V50 Recommendation Intelligence 2.0', 'V50 - Recommendation Intelligence 2.0' in readme and 'V50__recommendation_intelligence_2.sql' in readme)

passed=sum(ok for _,ok in checks)
print(f"\nV50 verification: {passed}/{len(checks)} checks passed")
raise SystemExit(0 if passed==len(checks) else 1)
