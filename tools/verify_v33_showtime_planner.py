from pathlib import Path
import re
import sys

ROOT=Path(__file__).resolve().parents[1]
checks=[]
def text(rel):
    p=ROOT/rel
    return p.read_text(encoding='utf-8') if p.exists() else ''
def check(name,ok):
    ok=bool(ok);checks.append((name,ok));print(('PASS' if ok else 'FAIL')+f': {name}')

service=text('backend/src/main/java/com/cinebooking/movie/ShowtimePlanningService.java')
controller=text('backend/src/main/java/com/cinebooking/movie/ShowtimePlanningController.java')
dtos=text('backend/src/main/java/com/cinebooking/movie/AdminCatalogDtos.java')
catalog=text('backend/src/main/java/com/cinebooking/movie/AdminCatalogService.java')
audrepo=text('backend/src/main/java/com/cinebooking/movie/AuditoriumRepository.java')
showrepo=text('backend/src/main/java/com/cinebooking/movie/ShowtimeRepository.java')
unit=text('backend/src/test/java/com/cinebooking/movie/ShowtimePlanningServiceTest.java')
it=text('backend/src/test/java/com/cinebooking/integration/CineBookingIntegrationIT.java')
page=text('frontend/app/admin/showtimes/page.tsx')
admin=text('frontend/app/admin/page.tsx')
types=text('frontend/lib/types.ts')
e2e=text('frontend/e2e/showtime-planner.spec.ts')
ci=text('.github/workflows/ci.yml')
rc=text('.github/workflows/release-candidate.yml')
diag=text('tools/diagnose-v33.ps1')
make=text('Makefile')
v31=text('tools/verify_v31_ticket_wallet.py')
v312=text('tools/verify_v31_2_rc_determinism.py')

check('showtime planning backend service exists',bool(service))
check('planner uses configurable 15-minute turnaround default','app.showtime.turnaround-minutes:15' in service)
check('planner uses Vietnam business timezone by default','app.showtime.zone:Asia/Ho_Chi_Minh' in service)
check('planner limits date ranges to 62 days','MAX_PLAN_DAYS = 62' in service)
check('planner limits daily start times to 12','MAX_START_TIMES = 12' in service)
check('planner caps batch size at 500 slots','MAX_PLAN_SLOTS = 500' in service)
check('planner collision rule uses half-open time windows','aStart.isBefore(bEnd) && aEnd.isAfter(bStart)' in service)
check('planner includes movie runtime plus turnaround in room occupancy','movieMinutes + turnaroundMinutes' in service)
check('cancelled existing showtimes do not occupy a room','s.getStatus() == ShowtimeStatus.CANCELLED' in service)
check('bulk plan rejects CANCELLED creation','Không tạo lịch hàng loạt ở trạng thái CANCELLED' in service)
check('preview endpoint is read-only and returns conflicts','ShowtimePlanPreview preview' in service and 'buildPreview' in service)
check('commit can reject conflicts unless skipConflicts is enabled','preview.conflicts() > 0 && !request.skipConflicts()' in service)
check('commit writes only creatable preview slots','if (slot == null || !slot.creatable()) continue' in service)
check('room writes use pessimistic auditorium lock','findByIdForUpdate' in service and 'PESSIMISTIC_WRITE' in audrepo)
check('showtime repository can load a room timeline','findByAuditoriumIdOrderByStartTimeAsc' in showrepo)
check('planner DTOs expose request preview slot and commit response',all(x in dtos for x in ['ShowtimePlanRequest','ShowtimePlanSlot','ShowtimePlanPreview','ShowtimePlanCommitResponse']))
check('planner controller exposes preview and commit endpoints','/api/admin/showtime-planner' in controller and '@PostMapping("/preview")' in controller and '@PostMapping("/commit")' in controller)
check('single showtime create uses conflict guard','planning.requireNoConflict(null' in catalog)
check('single showtime update uses conflict guard','planning.requireNoConflict(id' in catalog)
check('booked showtimes cannot move movie room or start time','bookings.existsByShowtimeId(id)' in catalog and 'chỉ được đổi giá hoặc trạng thái' in catalog)
check('planner overlap unit tests cover touching and intersecting windows','touchingWindowsDoNotOverlap' in unit and 'intersectingWindowsOverlap' in unit)
check('Testcontainers integration preview detects seeded V33 collision','showtimePlannerDetectsSeededRoomCollisionWithoutWriting' in it and 'preview.conflicts()).isEqualTo(1)' in it)
check('frontend planner response types exist','ShowtimePlanPreview' in types and 'ShowtimePlanCommit' in types)
check('dedicated admin showtime planner page exists','Lập lịch chiếu & chống trùng phòng' in page)
check('planner UI supports movie room date range and daily times',all(x in page for x in ['Phim lập lịch','Phòng lập lịch','Từ ngày lập lịch','Đến ngày lập lịch','Khung giờ mỗi ngày']))
check('planner UI performs dry-run preview','/admin/showtime-planner/preview' in page and 'Preview lịch' in page)
check('planner UI can commit valid slots','/admin/showtime-planner/commit' in page and 'Tạo ${preview.creatable} suất hợp lệ' in page)
check('admin dashboard links to planner','href="/admin/showtimes"' in admin and 'Lập lịch chiếu' in admin)
check('Playwright V33 planner journey exists','admin previews showtime conflicts before scheduling' in e2e)
check('Playwright V33 test is deterministic preview-only','2026-09-30' in e2e and '10:00, 22:30' in e2e and 'Yêu cầu: 2' in e2e and 'Có thể tạo: 1' in e2e and '/commit' not in e2e)
check('main CI runs V33 verifier','python3 tools/verify_v33_showtime_planner.py' in ci)
check('RC defaults to V33 and identifies V33 browser coverage','default: "v33-rc1"' in rc and 'V29.2 + V30 + V31.2 + V33' in rc)
check('legacy V31 RC verifier accepts newer release candidates','V31-compatible or newer' in v31 and 'v(?:31|3[2-9]|[4-9][0-9])' in v31)
check('legacy V31.2 verifier accepts RC versions newer than 31.2','rc_tuple >= (31, 2)' in v312)
check('V33 diagnostics Makefile and reset safety are wired','diagnose-v32.ps1' in diag and 'verify_v33_showtime_planner.py' in diag and 'verify-v33:' in make and 'diagnose-v33:' in make and 'destructive volume reset is disabled' in make and '@exit 1' in make)

failed=[n for n,o in checks if not o]
print(f'\n{len(checks)-len(failed)}/{len(checks)} checks passed')
if failed:
    print('Failed checks:')
    for n in failed: print(' -',n)
    sys.exit(1)
