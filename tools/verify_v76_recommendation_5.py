from pathlib import Path
import re
import sys

ROOT=Path(__file__).resolve().parents[1]
checks=[]

def text(rel):
    p=ROOT/rel
    return p.read_text(encoding='utf-8') if p.exists() else ''

def check(name,cond):
    ok=bool(cond); checks.append((name,ok)); print(f"[ {'OK' if ok else 'FAIL'} ] {name}")

service=text('backend/src/main/java/com/cinebooking/recommendation/RecommendationService.java')
dtos=text('backend/src/main/java/com/cinebooking/recommendation/RecommendationDtos.java')
admin_service=text('backend/src/main/java/com/cinebooking/recommendation/AdminRecommendationService.java')
admin_dtos=text('backend/src/main/java/com/cinebooking/recommendation/AdminRecommendationDtos.java')
admin_controller=text('backend/src/main/java/com/cinebooking/recommendation/AdminRecommendationController.java')
security=text('backend/src/main/java/com/cinebooking/config/SecurityConfig.java')
for_you=text('frontend/app/for-you/page.tsx')
admin_page=text('frontend/app/admin/recommendation/page.tsx')
admin=text('frontend/app/admin/page.tsx')
header=text('frontend/components/Header.tsx')
types=text('frontend/lib/types.ts')
e2e=text('frontend/e2e/recommendation-5-v76.spec.ts')
ci=text('.github/workflows/ci.yml')
release=text('scripts/release.ps1')
make=text('Makefile')
diag=text('tools/diagnose-v76.ps1')
readme=text('README.md')
v75verify=text('tools/verify_v75_analytics_bi_5.py')
v75e2e=text('frontend/e2e/analytics-bi-v75.spec.ts')
seed=text('tools/seed-demo-57-tables-10-rows.sql')

# Core customer recommendation lineage
check('V76 recommendation algorithm version is explicit','V76-EVIDENCE-AWARE-5' in service)
check('V63 algorithm lineage remains documented','V63-DEEP-CONTEXT-4' in service)
check('V76 home response exposes evidence policy','List<String> evidencePolicy' in dtos and 'EVIDENCE_POLICY' in service)
for token in ['REAL_OPERATIONAL_DATA_ONLY','NO_SYNTHETIC_MOVIE_DATA','EXPLAINABLE_RECOMMENDATIONS','DETERMINISTIC_DIVERSITY_RERANK','EXPLICIT_FEEDBACK_CONTROLS']:
    check('V76 customer evidence policy '+token,token in service)
check('V76 keeps three recommendation modes','Set.of("FAMILIAR", "BALANCED", "DISCOVERY")' in service)
check('V76 keeps deterministic diversity reranking','diversityRerank(pool, limit, mode)' in service and 'genreOverlap' in service)
check('V76 keeps explicit feedback controls',all(x in service for x in ['MORE_LIKE_THIS','LESS_LIKE_THIS','HIDE']))

# Admin quality/evidence service
check('V76 Admin recommendation service is Spring service','@Service' in admin_service and 'JdbcTemplate' in admin_service)
check('V76 Admin strategy explicit','V76-RECOMMENDATION-5' in admin_service)
check('V76 window bound 7..180','bound(requestedDays, 7, 180)' in admin_service)
for token in ['REAL_OPERATIONAL_DATA_ONLY','NO_SYNTHETIC_MOVIE_DATA','ASSISTED_BOOKING_IS_CORRELATION_NOT_CAUSATION','NO_RAW_PERSONAL_DATA_IN_ADMIN_RECOMMENDATION_UI']:
    check('V76 Admin policy '+token,token in admin_service)
check('V76 counts actionable movies from real future OPEN showtimes',"st.status='OPEN'" in admin_service and 'st.start_time>now()' in admin_service)
check('V76 metadata coverage requires genre language duration',all(x in admin_service for x in ['btrim(genre)','btrim(movie_language)','duration_minutes>0']))
check('V76 personalizable users use durable real signals',all(x in admin_service for x in ['movie_favorite','movie_review','booking where confirmed_at is not null','recommendation_event','recommendation_feedback']))
check('V76 measures click and view events',"event_type='CLICK'" in admin_service and "event_type='VIEW'" in admin_service)
check('V76 measures explicit MORE LESS HIDE feedback',all(x in admin_service for x in ["feedback_type='MORE_LIKE_THIS'","feedback_type='LESS_LIKE_THIS'","feedback_type='HIDE'"]))
check('V76 assisted booking requires same user and movie prior event','e.user_id=b.user_id' in admin_service and 'e.movie_id=st.movie_id' in admin_service and "interval '7 days'" in admin_service)
check('V76 assisted revenue uses realized SUCCESS payment only',"p.status='SUCCESS'" in admin_service and 'max(p.amount)' in admin_service)
check('V76 admin top movies uses only observed events feedback assists','event_metric' in admin_service and 'feedback_metric' in admin_service and 'assisted_metric' in admin_service)
check('V76 admin source metrics do not fabricate missing sources',"'UNKNOWN'" in admin_service and 'recommendation_event where created_at>=?' in admin_service)
check('V76 admin service never selects raw email','email' not in admin_service.lower())

# DTO/controller/security
for token in ['RecommendationCoverageV76','RecommendationMovieMetricV76','RecommendationSourceMetricV76','RecommendationAdminSummaryV76']:
    check('V76 Admin DTO '+token,('record '+token) in admin_dtos)
check('V76 summary exposes coverage top movies sources and policy',all(x in admin_dtos for x in ['RecommendationCoverageV76 coverage','List<RecommendationMovieMetricV76> topMovies','List<RecommendationSourceMetricV76> topSources','List<String> evidencePolicy']))
check('V76 admin controller namespace','@RequestMapping("/api/admin/recommendation")' in admin_controller)
check('V76 admin summary GET','@GetMapping("/summary")' in admin_controller and '@RequestParam(defaultValue = "30")' in admin_controller)
check('V76 admin controller is read-only',all(x not in admin_controller for x in ['@PostMapping','@PutMapping','@PatchMapping','@DeleteMapping']))
check('V76 admin API is protected by global admin rule','requestMatchers("/api/admin/**").hasRole("ADMIN")' in security)

# Frontend
check('V76 frontend home type exposes evidence policy','evidencePolicy:string[]' in types)
for token in ['RecommendationCoverageV76','RecommendationMovieMetricV76','RecommendationSourceMetricV76','RecommendationAdminSummaryV76']:
    check('V76 frontend type '+token,('type '+token) in types)
check('For You page branded V76 Recommendation 5.0','V76 · RECOMMENDATION 5.0' in for_you and 'for-you-v76' in for_you)
check('For You keeps V63 runtime compatibility surface','for-you-v63' in for_you and 'V63 · RECOMMENDATION 4.0' in for_you)
check('For You writes V76 feedback source','source:"FOR_YOU_V76"' in for_you)
check('For You click tracking writes V76 mode','FOR_YOU_V76_${mode}' in for_you)
check('For You renders V76 evidence panel','recommendation-evidence-v76' in for_you and 'NO_SYNTHETIC_MOVIE_DATA' in for_you)
check('Admin V76 page root and strategy',all(x in admin_page for x in ['recommendation-admin-v76','V76 · RECOMMENDATION 5.0','V76-RECOMMENDATION-5']))
check('Admin V76 page supports 7 30 90 180 windows','[7,30,90,180]' in admin_page)
check('Admin V76 page requires ADMIN','me.role!=="ADMIN"' in admin_page)
check('Admin V76 page reads summary endpoint','/admin/recommendation/summary?days=' in admin_page)
for token in ['recommendation-policy-v76','recommendation-coverage-v76','recommendation-feedback-v76','recommendation-assisted-v76','recommendation-top-movies-v76','recommendation-sources-v76','recommendation-admin-error-v76']:
    check('Admin V76 UI panel '+token,token in admin_page)
check('Admin V76 page explains assisted correlation not causation','correlation' in admin_page and 'không phải causal attribution' in admin_page)
check('Admin dashboard adds V76 tile after V75','admin-recommendation-v76' in admin and admin.index('admin-analytics-bi-v75')<admin.index('admin-recommendation-v76'))
labels=['Recommendation V63','CRM & Marketing V64','Observability V65','Seat Operations V66','Payment Resilience V67','Security & Identity V68','Backup & DR V69','Privacy Governance V70','Key Governance V71','Supply Chain V72','Actions Runtime V73','Reliability V74','Analytics & BI V75','Recommendation V76']
check('Admin versioned tiles ascend through V76',all(admin.index(a)<admin.index(b) for a,b in zip(labels,labels[1:])))
check('Header links Recommendation V76 admin page','/admin/recommendation' in header and 'Recommendation V76' in header)

# E2E/lifecycle
check('V76 E2E logs in real admin env','E2E_ADMIN_EMAIL' in e2e and 'E2E_ADMIN_PASSWORD' in e2e)
check('V76 E2E verifies dashboard tile','admin-recommendation-v76' in e2e)
check('V76 E2E is forward-compatible with later versions','sort((a,b)=>a-b)' in e2e and 'toBeGreaterThanOrEqual(76)' in e2e and 'toContain(75)' in e2e)
check('V76 E2E verifies strategy','V76-RECOMMENDATION-5' in e2e)
check('V76 E2E verifies real-data and no-synthetic policies','REAL_OPERATIONAL_DATA_ONLY' in e2e and 'NO_SYNTHETIC_MOVIE_DATA' in e2e)
check('V76 E2E verifies correlation disclaimer','ASSISTED_BOOKING_IS_CORRELATION_NOT_CAUSATION' in e2e and 'correlation' in e2e)
check('V76 E2E checks For You V76 surface','for-you-v76' in e2e and 'recommendation-evidence-v76' in e2e)
check('V75 E2E is forward-compatible with V76','toContain(75)' in v75e2e and 'toBeGreaterThanOrEqual(75)' in v75e2e)
check('V75 verifier accepts V75 or later source regression','V75 or later' in v75verify and 'V26-V(?:7[5-9]|[89][0-9]) source regression' in v75verify)
check('CI source regression names V76 or later',re.search(r'V26-V(?:7[6-9]|[89][0-9]) source regression',ci) is not None)
check('CI runs V76 verifier','verify_v76_recommendation_5.py' in ci)
check('Release preflight runs V76 verifier','verify_v76_recommendation_5.py' in release)
check('Release example is V76 or later stable',re.search(r'such as v(?:7[6-9]|[89][0-9])\.0\.0',release) is not None)
check('Makefile exposes V76 verify diagnose release',all(x in make for x in ['verify-v76:','diagnose-v76:','release-v76:','v76.0.0']))
check('Diagnose V76 chains V63 V75 patch and V76',all(x in diag for x in ['verify_v63_recommendation_4.py','verify_v75_analytics_bi_5.py','verify_v75_cost_coverage_drilldown.py','verify_v76_recommendation_5.py']))
check('Diagnose V76 keeps real-data gates','verify_realistic_data_57.py' in diag and 'verify_seed_demo_57.py' in diag)

# Schema/data/README
check('V76 is no-schema release',not any((ROOT/'backend/src/main/resources/db/migration').glob('V76__*.sql')))
check('V76 adds no synthetic seed content','V76-RECOMMENDATION' not in seed and 'FOR_YOU_V76' not in seed)
check('README title is V76 or later',re.search(r'^# CineBooking Pro V(?:7[6-9]|[89][0-9])$',readme,re.M) is not None)
check('README current release is V76 or later',re.search(r'Current release:\*\* V(?:7[6-9]|[89][0-9])',readme) is not None)
check('README history has V76 after V75.0.1','| **V75.0.1** |' in readme and '| **V76** |' in readme and readme.index('| **V75.0.1** |')<readme.index('| **V76** |'))
check('README detailed V76 section','## V76 - Recommendation 5.0' in readme)
for token in ['V76-RECOMMENDATION-5','V76-EVIDENCE-AWARE-5','ASSISTED_BOOKING_IS_CORRELATION_NOT_CAUSATION','NO_RAW_PERSONAL_DATA_IN_ADMIN_RECOMMENDATION_UI','New V76 tables: 0','Stable only: v76.0.0']:
    check('README documents '+token,token in readme)
check('README keeps Flyway V72 / 67 tables','Flyway latest: V72' in readme and 'Public tables: 67' in readme)
check('README real-data policy extends through V76','V52/V65/V66/V67/V68/V69/V70/V71/V72/V73/V74/V75/V76' in readme and '**không tạo phim/khách/booking/payment giả**' in readme)
check('README retains Windows project command root',r'D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui' in readme)

passed=sum(ok for _,ok in checks)
print(f"\nV76 verification: {passed}/{len(checks)} checks passed")
if passed!=len(checks):
    print('\nFailed checks:')
    for name,ok in checks:
        if not ok: print(' - '+name)
    sys.exit(1)
