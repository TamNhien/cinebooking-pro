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

migration=text('backend/src/main/resources/db/migration/V34__auditorium_blackout_windows.sql')
entity=text('backend/src/main/java/com/cinebooking/domain/AuditoriumBlackout.java')
repo=text('backend/src/main/java/com/cinebooking/movie/AuditoriumBlackoutRepository.java')
service=text('backend/src/main/java/com/cinebooking/movie/AuditoriumBlackoutService.java')
controller=text('backend/src/main/java/com/cinebooking/movie/AuditoriumBlackoutController.java')
planning=text('backend/src/main/java/com/cinebooking/movie/ShowtimePlanningService.java')
dtos=text('backend/src/main/java/com/cinebooking/movie/AdminCatalogDtos.java')
it=text('backend/src/test/java/com/cinebooking/integration/CineBookingIntegrationIT.java')
page=text('frontend/app/admin/maintenance/page.tsx')
planner_page=text('frontend/app/admin/showtimes/page.tsx')
admin=text('frontend/app/admin/page.tsx')
types=text('frontend/lib/types.ts')
e2e=text('frontend/e2e/maintenance-blackout.spec.ts')
playwright=text('frontend/playwright.config.ts')
ci=text('.github/workflows/ci.yml')
rc=text('.github/workflows/release-candidate.yml')
readme=text('README.md')
diag=text('tools/diagnose-v34.ps1')
make=text('Makefile')

check('V34 blackout migration exists', bool(migration))
check('blackout table references auditorium with cascade cleanup', 'CREATE TABLE auditorium_blackout' in migration and 'REFERENCES auditorium(id) ON DELETE CASCADE' in migration)
check('database enforces positive blackout windows', 'CHECK (end_time > start_time)' in migration)
check('room-time blackout index exists', 'idx_auditorium_blackout_room_time' in migration)
check('blackout entity maps operational fields', all(x in entity for x in ['@Table(name = "auditorium_blackout")','auditoriumId','startTime','endTime','reason','createdAt']))
check('blackout repository supports overlap queries', 'findByAuditoriumIdAndEndTimeAfterAndStartTimeBeforeOrderByStartTimeAsc' in repo)
check('blackout creation locks auditorium pessimistically', 'findByIdForUpdate' in service)
check('blackout duration is capped at 14 days', 'MAX_BLACKOUT = Duration.ofDays(14)' in service)
check('blackout cannot overlap another blackout', 'Khoảng bảo trì bị trùng với một khoảng khóa phòng' in service)
check('blackout cannot hide an active showtime', 'Không thể khóa phòng vì đang có suất' in service and 'ShowtimeStatus.CANCELLED' in service)
check('blackout REST API supports list create delete', '/api/admin/auditorium-blackouts' in controller and '@GetMapping' in controller and '@PostMapping' in controller and '@DeleteMapping("/{id}")' in controller)
check('blackout DTO request and response exist', 'AuditoriumBlackoutRequest' in dtos and 'AuditoriumBlackoutResponse' in dtos)
check('single showtime conflict guard blocks blackouts', 'Phòng đang bị khóa/bảo trì' in planning and 'roomBlackouts' in planning)
check('bulk planner reads blackout timeline', 'findByAuditoriumIdOrderByStartTimeAsc' in planning and 'conflictType = "BLACKOUT"' in planning)
check('planner exposes blackout identity in preview', 'conflictBlackoutId' in dtos and 'conflictBlackoutId' in planning)
check('maintenance admin page exists', 'Bảo trì & khóa phòng chiếu' in page)
check('maintenance page can create blackouts', '/admin/auditorium-blackouts' in page and 'Khóa phòng' in page)
check('maintenance page can delete blackouts', 'method:"DELETE"' in page and 'Mở lại phòng' in page)
check('maintenance page filters by auditorium', 'Lọc phòng bảo trì' in page)
check('showtime planner links maintenance operations', 'href="/admin/maintenance"' in planner_page and 'Bảo trì phòng' in planner_page)
check('admin dashboard links maintenance operations', 'href="/admin/maintenance"' in admin)
check('frontend blackout type exists', 'export type AuditoriumBlackout' in types)
check('Playwright uses Vietnam timezone for datetime-local determinism', 'timezoneId: "Asia/Ho_Chi_Minh"' in playwright)
check('V34 browser journey creates maintenance window', 'admin maintenance blackout blocks showtime planning' in e2e and 'V34 RC projector maintenance' in e2e)
check('V34 maintenance room selector is exact to avoid filter collision', 'getByLabel(\"Phòng bảo trì\", { exact: true })' in e2e)
check('V34 browser journey proves planner conflict', 'Có thể tạo: 0' in e2e and 'Trùng lịch: 1' in e2e and 'Xung đột: Bảo trì' in e2e)
check('V34 browser journey cleans up blackout', 'Mở lại phòng' in e2e and 'toHaveCount(0)' in e2e)
check('Testcontainers expects Flyway V34', 'isEqualTo("34")' in it and 'auditorium_blackout' in it)
check('Testcontainers proves blackout blocks planner', 'showtimePlannerTreatsAuditoriumBlackoutAsConflict' in it and 'conflictType()).isEqualTo("BLACKOUT")' in it)
check('main CI runs V34 verifier', 'python3 tools/verify_v34_auditorium_blackouts.py' in ci)
check('RC defaults to V34', 'default: "v34-rc1"' in rc)
check('RC label includes V34 browser coverage', 'V29.2 + V30 + V31.2 + V33 + V34' in rc)
check('V34 diagnostics chains V33 and verifier', 'diagnose-v33.ps1' in diag and 'verify_v34_auditorium_blackouts.py' in diag)
check('Makefile exposes V34 verify and diagnose', 'verify-v34:' in make and 'diagnose-v34:' in make)
check('README documents V34 maintenance feature', 'V34' in readme and 'Bảo trì & khóa phòng chiếu' in readme)
ignored={'.git','node_modules','.next','target','playwright-report','test-results'}
markdown=[p for p in ROOT.rglob('*.md') if not any(part in ignored for part in p.parts)]
check('source documentation is consolidated into one README.md', len(markdown)==1 and markdown[0].resolve()==(ROOT/'README.md').resolve())
check('reset safety remains blocked', 'destructive volume reset is disabled' in make and '@exit 1' in make)

failed=[n for n,o in checks if not o]
print(f'\n{len(checks)-len(failed)}/{len(checks)} checks passed')
if failed:
    print('Failed checks:')
    for n in failed: print(' -',n)
    sys.exit(1)
