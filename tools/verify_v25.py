from pathlib import Path
root=Path(__file__).resolve().parents[1]
checks={
    'migration': ('backend/src/main/resources/db/migration/V25__recommendation_engine.sql', 'CREATE TABLE recommendation_event'),
    'movie genre column': ('backend/src/main/resources/db/migration/V25__recommendation_engine.sql', 'ADD COLUMN genre'),
    'movie metadata entity': ('backend/src/main/java/com/cinebooking/domain/Movie.java', 'private String genre'),
    'recommendation service': ('backend/src/main/java/com/cinebooking/recommendation/RecommendationService.java', 'V25-CONTENT-HYBRID-1'),
    'personalized signals': ('backend/src/main/java/com/cinebooking/recommendation/RecommendationService.java', 'movie_favorite'),
    'booking signals': ('backend/src/main/java/com/cinebooking/recommendation/RecommendationService.java', "b.status='CONFIRMED'"),
    'click signals': ('backend/src/main/java/com/cinebooking/recommendation/RecommendationService.java', 'recommendation_event'),
    'similar endpoint': ('backend/src/main/java/com/cinebooking/recommendation/RecommendationController.java', '/similar/{movieId}'),
    'public recommendation GET': ('backend/src/main/java/com/cinebooking/config/SecurityConfig.java', '"/api/recommendations/**"'),
    'admin genre editor': ('frontend/app/admin/page.tsx', 'Thể loại, phân cách bằng dấu phẩy'),
    'home personalized UI': ('frontend/app/page.tsx', 'HOME_PERSONALIZED'),
    'home trending UI': ('frontend/app/page.tsx', 'HOME_TRENDING'),
    'similar movie UI': ('frontend/app/movies/[id]/page.tsx', 'MOVIE_SIMILAR'),
    'click tracking UI': ('frontend/components/MovieCard.tsx', '/recommendations/events'),
    'diagnostic': ('tools/diagnose-v25.ps1', 'V25 Recommendation Engine diagnostics'),
    'smoke test': ('tools/test-v25.ps1', 'ALL V25 RECOMMENDATION ENGINE SMOKE TESTS PASSED'),
}
failed=[]
for name,(rel,needle) in checks.items():
    p=root/rel
    ok=p.exists() and needle in p.read_text(encoding='utf-8')
    print(('PASS' if ok else 'FAIL')+': '+name)
    if not ok: failed.append(name)
print(f"\n{len(checks)-len(failed)}/{len(checks)} checks passed")
raise SystemExit(1 if failed else 0)
