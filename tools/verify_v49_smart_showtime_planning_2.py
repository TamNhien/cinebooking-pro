from pathlib import Path
import re
import sys
ROOT=Path(__file__).resolve().parents[1]
checks=[]
def text(rel):
    p=ROOT/rel
    return p.read_text(encoding='utf-8') if p.exists() else ''
def check(name,cond):
    ok=bool(cond);checks.append((name,ok));print(f"[ {'OK' if ok else 'FAIL'} ] {name}")

migration=text('backend/src/main/resources/db/migration/V49__smart_showtime_planning_2.sql')
run_entity=text('backend/src/main/java/com/cinebooking/domain/ShowtimePlanningRun.java')
showtime_entity=text('backend/src/main/java/com/cinebooking/domain/Showtime.java')
run_repo=text('backend/src/main/java/com/cinebooking/movie/ShowtimePlanningRunRepository.java')
smart=text('backend/src/main/java/com/cinebooking/movie/SmartShowtimePlanningService.java')
manual=text('backend/src/main/java/com/cinebooking/movie/ShowtimePlanningService.java')
controller=text('backend/src/main/java/com/cinebooking/movie/ShowtimePlanningController.java')
dtos=text('backend/src/main/java/com/cinebooking/movie/AdminCatalogDtos.java')
movie_dtos=text('backend/src/main/java/com/cinebooking/movie/MovieDtos.java')
movie_service=text('backend/src/main/java/com/cinebooking/movie/MovieService.java')
ui=text('frontend/app/admin/showtimes/page.tsx')
types=text('frontend/lib/types.ts')
e2e=text('frontend/e2e/showtime-smart-planner-v49.spec.ts')
seed=text('tools/seed-demo-53-tables-10-rows.sql')
seed_verify=text('tools/verify_seed_demo_53.py')
integration=text('backend/src/test/java/com/cinebooking/integration/CineBookingIntegrationIT.java')
ci=text('.github/workflows/ci.yml'); rc=text('.github/workflows/release-candidate.yml'); release=text('.github/workflows/release.yml')
make=text('Makefile'); diagnose=text('tools/diagnose-v49.ps1'); readme=text('README.md')

check('V49 migration creates durable smart planning run table', 'CREATE TABLE showtime_planning_run' in migration and 'plan_json TEXT' in migration)
check('V49 run table constrains dates operating window and status', all(x in migration for x in ['ck_showtime_planning_run_dates','ck_showtime_planning_run_window','ck_showtime_planning_run_status']))
check('V49 migration adds showtime planning provenance', all(x in migration for x in ['planning_source','planning_run_id','planning_score','ck_showtime_planning_source']))
check('V49 migration indexes run history and smart provenance', all(x in migration for x in ['idx_showtime_planning_run_cinema_created','idx_showtime_planning_run_movie_created','idx_showtime_planning_run_id','idx_showtime_planning_source_start']))
check('ShowtimePlanningRun entity maps audit fields', '@Table(name="showtime_planning_run")' in run_entity and all(x in run_entity for x in ['cinemaId','movieId','targetPerDay','historicalSamples','planJson','createdBy','committedAt']))
check('Showtime entity maps MANUAL BATCH SMART provenance', all(x in showtime_entity for x in ['planningSource','planningRunId','planningScore','planningSource="MANUAL"']))
check('Planning run repository exposes global and cinema history', 'findTop20ByOrderByCreatedAtDesc' in run_repo and 'findTop20ByCinemaIdOrderByCreatedAtDesc' in run_repo)
check('V49 smart request defines cinema movie date window and target', all(x in dtos for x in ['SmartShowtimePlanRequest','cinemaId','targetPerDay','operatingStart','operatingEnd','intervalMinutes']))
check('V49 smart preview exposes score occupancy reasons and daily grouping', all(x in dtos for x in ['SmartShowtimeSlot','historicalOccupancy','historicalSamples','reasons','SmartShowtimeDay','SmartShowtimePlanPreview']))
check('V49 commit response carries durable planning run id', 'SmartShowtimeCommitResponse(UUID planningRunId' in dtos)
check('Smart planner validates max date span and operating window', 'MAX_DAYS = 31' in smart and 'Giờ đóng cửa phải sau giờ mở cửa' in smart and 'Khung vận hành ngắn hơn thời lượng phim cộng thời gian dọn phòng' in smart)
check('Smart planner pessimistically locks rooms before commit', 'findByIdForUpdate' in smart and 'lockRooms' in smart and '.sorted()' in smart)
check('Smart planner respects existing showtimes and maintenance blackout', 'hardConflict' in smart and 'AuditoriumBlackout' in smart and 's.getStatus()==ShowtimeStatus.CANCELLED' in smart)
check('Smart planner includes turnaround in candidate end time', 'movieMinutes+turnaroundMinutes' in smart and 'turnaroundMinutes' in smart)
check('Smart planner enforces cinema-wide movie spacing', 'MIN_MOVIE_SPACING_MINUTES = 45' in smart and 'tooCloseExisting' in smart)
check('Smart planner derives historical occupancy from booking seats', all(x in smart for x in ['booking_seat','COUNT(DISTINCT st.id)','REFUND_REQUESTED','historicalOccupancy']))
check('Smart planner falls back from movie history to cinema history', 'movieDemand' in smart and 'cinemaDemand' in smart and 'MOVIE_HISTORY' in smart and 'CINEMA_HISTORY' in smart)
check('Smart planner scores prime time and weekend demand', 'Khung giờ cao điểm buổi tối' in smart and 'Cuối tuần' in smart and 'heuristic' in smart)
check('Smart commit recomputes plan after locks and writes SMART showtimes', 'SmartShowtimePlanPreview preview=buildPreview(plan,request)' in smart and 's.setPlanningSource("SMART")' in smart and 's.setPlanningRunId(run.getId())' in smart)
check('Smart commit persists planning score and audit JSON', 'setPlanningScore' in smart and 'writeValueAsString(preview.days())' in smart and 'runs.save(run)' in smart)
check('Manual batch planner marks created showtimes as BATCH', 's.setPlanningSource("BATCH")' in manual)
check('Showtime API DTO exposes provenance without breaking public schedule data', all(x in movie_dtos for x in ['planningSource','planningRunId','planningScore']) and 's.getPlanningSource()' in movie_service)
check('Admin planner API exposes smart preview commit and history', all(x in controller for x in ['@PostMapping("/smart/preview")','@PostMapping("/smart/commit")','@GetMapping("/smart/runs")']))
check('Smart commit records authenticated admin email', 'Authentication auth' in controller and 'auth.getName()' in controller)
check('Frontend identifies V49 Smart Showtime Planning 2.0', 'V49 · SMART SHOWTIME PLANNING 2.0' in ui and 'Smart Planner' in ui)
check('Frontend loads cinemas and durable smart planning history', '/admin/cinemas' in ui and '/admin/showtime-planner/smart/runs' in ui and 'Lịch sử Smart Planner' in ui)
check('Frontend supports smart preview and commit', '/admin/showtime-planner/smart/preview' in ui and '/admin/showtime-planner/smart/commit' in ui and 'smart-preview-button' in ui and 'smart-commit-button' in ui)
check('Frontend renders score historical occupancy and reasons', 'Score {slot.score}' in ui and 'historicalOccupancy' in ui and 'slot.reasons.join' in ui)
check('Frontend preserves V34 manual batch workflow', '/admin/showtime-planner/preview' in ui and '/admin/showtime-planner/commit' in ui and 'Phim lập lịch' in ui and 'Phòng lập lịch' in ui)
check('Frontend types include V49 smart planner and showtime provenance', all(x in types for x in ['SmartShowtimePlanPreview','ShowtimePlanningRun','planningSource','planningScore']))
check('Dedicated V49 Playwright covers preview commit and run provenance', all(x in e2e for x in ['V49 Smart Planner suggests demand-balanced conflict-free showtimes and commits provenance','smart-preview-button','smart-commit-button','smart-planning-run','SMART']))
check('V49 E2E pins migration-backed cinema and movie instead of order-sensitive first options', 'selectOption({label:"CineHub Quận 1"})' in e2e and 'selectOption({label:"Hành Trình Sao Hỏa · 128 phút"})' in e2e and 'smart-cinema-select' in e2e and 'smart-movie-select' in e2e)
check('V49 seed covers planning run and SMART provenance', 'INSERT INTO showtime_planning_run(' in seed and "planning_source='SMART'" in seed and 'seed49:planning-run:' in seed)
check('V49 53-table realistic-data verifier exists', 'showtime_planning_run' in seed_verify and '53 pgAdmin tables' in seed_verify and '36/36' not in seed_verify)
check('Integration test expects Flyway V49 and 53 public tables', (('flywayMigratesRealPostgresToV49SmartShowtimePlanningSchemaAndCatalog' in integration and 'assertThat(latest).isEqualTo("49")' in integration and 'isGreaterThanOrEqualTo(53)' in integration) or ('flywayMigratesRealPostgresToV50RecommendationIntelligenceSchemaAndCatalog' in integration and 'assertThat(latest).isEqualTo("50")' in integration and 'isGreaterThanOrEqualTo(54)' in integration) or ('flywayMigratesRealPostgresToV51AnalyticsForecastingSchemaAndCatalog' in integration and 'assertThat(latest).isEqualTo("51")' in integration and 'isGreaterThanOrEqualTo(56)' in integration) or ('flywayMigratesRealPostgresToV52PwaMobileExperienceSchemaAndCatalog' in integration and 'assertThat(latest).isEqualTo("52")' in integration and 'isGreaterThanOrEqualTo(57)' in integration)))
check('Integration test checks V49 table columns and indexes', all(x in integration for x in ['planningV49Table','planningV49ShowtimeColumns','planningV49Indexes','showtime_planning_run']))
ci_versions=[int(v) for v in re.findall(r'V26-V(\d+) source regression',ci)]
rc_versions=[int(v) for v in re.findall(r'default: "v(\d+)\.0\.0-rc\.1"',rc)]
release_versions=[int(v) for v in re.findall(r'default: "(\d+)\.0\.0"',release)]
check('Main CI includes V49 source and 53-table gates', bool(ci_versions) and max(ci_versions)>=49 and 'verify_v49_smart_showtime_planning_2.py' in ci and 'verify_seed_demo_53.py' in ci)
check('Standalone RC defaults to V49-or-newer and keeps V49 gate', bool(rc_versions) and max(rc_versions)>=49 and 'verify_v49_smart_showtime_planning_2.py' in rc)
check('Stable release defaults to V49-or-newer and keeps V49 gate', bool(release_versions) and max(release_versions)>=49 and 'verify_v49_smart_showtime_planning_2.py' in release)
check('Makefile exposes V49 verify diagnose seed and reference targets', all(x in make for x in ['verify-v49:','diagnose-v49:','seed-demo-v49:','verify-reference-v49:','seed-reference-v49:']))
check('V49 diagnostics chains V46 V47 V48 V49 and 53-table seed', all(x in diagnose for x in ['verify_v46_security_account_protection.py','verify_v47_payment_gateway_operations.py','verify_v48_concession_inventory_2.py','verify_v49_smart_showtime_planning_2.py','verify_seed_demo_53.py']))
check('README identifies V49 Smart Showtime Planning 2.0', 'V49 - Smart Showtime Planning 2.0' in readme and 'V49__smart_showtime_planning_2.sql' in readme)

passed=sum(ok for _,ok in checks)
print(f"\nV49 verification: {passed}/{len(checks)} checks passed")
raise SystemExit(0 if passed==len(checks) else 1)
