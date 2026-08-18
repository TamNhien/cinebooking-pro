from pathlib import Path
import sys
import re

ROOT=Path(__file__).resolve().parents[1]
checks=[]
def text(rel):
    p=ROOT/rel
    return p.read_text(encoding='utf-8') if p.exists() else ''
def check(name, ok):
    ok=bool(ok); checks.append((name,ok)); print(('PASS' if ok else 'FAIL')+f': {name}')

migration=text('backend/src/main/resources/db/migration/V32__showtime_waitlist.sql')
entity=text('backend/src/main/java/com/cinebooking/domain/ShowtimeWaitlist.java')
repo=text('backend/src/main/java/com/cinebooking/waitlist/ShowtimeWaitlistRepository.java')
service=text('backend/src/main/java/com/cinebooking/waitlist/ShowtimeWaitlistService.java')
controller=text('backend/src/main/java/com/cinebooking/waitlist/ShowtimeWaitlistController.java')
job=text('backend/src/main/java/com/cinebooking/waitlist/ShowtimeWaitlistJob.java')
notif=text('backend/src/main/java/com/cinebooking/notification/NotificationService.java')
booking=text('frontend/app/booking/[showtimeId]/page.tsx')
waitpage=text('frontend/app/waitlist/page.tsx')
types=text('frontend/lib/types.ts')
header=text('frontend/components/Header.tsx')
ci=text('.github/workflows/ci.yml')
diag=text('tools/diagnose-v32.ps1')
make=text('Makefile')
it=text('backend/src/test/java/com/cinebooking/integration/CineBookingIntegrationIT.java')

check('V32 Flyway migration exists', bool(migration))
check('waitlist table has unique user/showtime constraint', 'UNIQUE (user_id, showtime_id)' in migration)
check('waitlist status constraint exists', "'ACTIVE','NOTIFIED','CANCELLED','EXPIRED'" in migration)
check('waitlist indexes active status/showtime', 'idx_showtime_waitlist_status_showtime' in migration)
check('waitlist entity maps database table', '@Table(name="showtime_waitlist"' in entity)
check('repository supports atomic notification claim', 'claimNotification' in repo and "w.status='ACTIVE'" in repo)
check('repository can expire stale active entries', 'expireActive' in repo)
check('service only subscribes future sold-out showtimes', 'available>0' in service and 'getStartTime().isAfter(Instant.now())' in service)
check('service re-arms an existing waitlist row safely', 'w.setStatus("ACTIVE")' in service and 'w.setNotifiedAt(null)' in service)
check('service counts live AVAILABLE seats through seat map', '"AVAILABLE".equals(s.status())' in service)
check('service sends deduplicated seat-available notification', 'WAITLIST_SEAT_AVAILABLE' in service and 'createOnce' in service and 'WAITLIST:' in service)
check('service links alert back to booking page', '"/booking/"+showtimeId' in service)
check('service reactivates waitlist if no notification channel delivered', 'if(!delivered)repo.reactivate' in service)
check('scheduled scanner is configurable and recurring', '@Scheduled(fixedDelayString="${app.waitlist.scan-ms:60000}")' in job)
check('controller exposes status subscribe unsubscribe and mine endpoints', all(x in controller for x in ['@GetMapping("/showtimes/{showtimeId}")','@PostMapping("/showtimes/{showtimeId}")','@DeleteMapping("/showtimes/{showtimeId}")','@GetMapping("/me")']))
check('waitlist notification follows booking notification preference', 't.startsWith("WAITLIST")' in notif and 'return "BOOKING"' in notif)
check('frontend waitlist types exist', 'export type WaitlistStatus' in types and 'export type WaitlistItem' in types)
check('booking page loads waitlist state', 'loadWaitlist' in booking and '/waitlist/showtimes/${showtimeId}' in booking)
check('booking page detects sold-out seat map', 'const soldOut=' in booking and 'status==="AVAILABLE"' in booking)
check('booking page exposes notify/cancel seat alert CTA', 'Báo khi có ghế' in booking and 'Huỷ theo dõi' in booking)
check('dedicated waitlist management page exists', 'Danh sách chờ suất chiếu' in waitpage and '/waitlist/me' in waitpage)
check('waitlist page supports cancellation and booking deep link', 'method:"DELETE"' in waitpage and 'href={`/booking/${x.showtimeId}`}' in waitpage)
check('header exposes waitlist navigation', 'href="/waitlist"' in header)
latest_versions=[int(x) for x in re.findall(r'isEqualTo\(\"(\d+)\"\)',it)]
check('integration test expects Flyway V32 or newer and waitlist table', bool(latest_versions) and max(latest_versions)>=32 and 'showtime_waitlist' in it)
check('main CI runs V32 verifier', 'python3 tools/verify_v32_waitlist.py' in ci)
check('V32 diagnostics chain V31 and V32 verifiers', 'diagnose-v31.ps1' in diag and 'verify_v32_waitlist.py' in diag)
check('Makefile exposes V32 verification', 'verify-v32:' in make and 'diagnose-v32:' in make)
check('reset safety remains intact', 'destructive volume reset is disabled' in make and '@exit 1' in make)

failed=[n for n,o in checks if not o]
print(f'\n{len(checks)-len(failed)}/{len(checks)} checks passed')
if failed:
    print('Failed checks:')
    for n in failed: print(' -',n)
    sys.exit(1)
