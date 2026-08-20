from pathlib import Path
import re
import sys

ROOT=Path(__file__).resolve().parents[1]
checks=[]
def text(rel):
    p=ROOT/rel
    return p.read_text(encoding='utf-8') if p.exists() else ''
def check(name, ok):
    ok=bool(ok);checks.append((name,ok));print(('PASS' if ok else 'FAIL')+': '+name)

dtos=text('backend/src/main/java/com/cinebooking/seat/SeatDtos.java')
holds=text('backend/src/main/java/com/cinebooking/seat/SeatHoldService.java')
engine=text('backend/src/main/java/com/cinebooking/seat/SeatRecommendationEngine.java')
service=text('backend/src/main/java/com/cinebooking/seat/SeatService.java')
controller=text('backend/src/main/java/com/cinebooking/seat/SeatController.java')
app=text('backend/src/main/resources/application.yml')
compose=text('docker-compose.yml')
env=text('.env.example')
types=text('frontend/lib/types.ts')
page=text('frontend/app/booking/[showtimeId]/page.tsx')
e2e=text('frontend/e2e/seat-map-ux.spec.ts')
unit=text('backend/src/test/java/com/cinebooking/seat/SeatRecommendationEngineTest.java')
ci=text('.github/workflows/ci.yml')
rc=text('.github/workflows/release-candidate.yml')
release=text('.github/workflows/release.yml')
diag=text('tools/diagnose-v39.ps1')
make=text('Makefile')
readme=text('README.md')
legacy_v38=text('tools/verify_v38_refund_automation.py')

check('V39 seat map exposes server hold remaining TTL', 'holdRemainingSeconds' in dtos and 'SeatMapResponse' in dtos)
check('V39 seat map exposes maximum selectable seats', 'maxSelectableSeats' in dtos)
check('V39 seat map exposes single-gap policy flag', 'preventSingleGap' in dtos)
check('V39 suggestion DTOs expose IDs, codes, price, score and reason', all(x in dtos for x in ['SeatSuggestion','seatIds','seatCodes','totalPrice','score','reason']))
check('V39 selection validation DTO exposes orphan seat codes', 'SelectionValidationResponse' in dtos and 'orphanSeatCodes' in dtos)

check('Redis hold service reads authoritative TTL', 'getExpire(redisKey, TimeUnit.SECONDS)' in holds)
check('Redis hold TTL uses minimum across multi-seat hold', 'Math.min(remaining, ttl)' in holds)
check('Redis hold TTL verifies current user ownership', 'userId.toString().equals(owner)' in holds)
check('Atomic Redis multi-seat acquire remains intact', "redis.call('set', key, ARGV[1], 'PX', ARGV[2])" in holds and 'return 0' in holds)
check('Atomic Redis owner-only release remains intact', "redis.call('get', key) == ARGV[1]" in holds)

check('V39 recommendation engine exists as a Spring component', '@Component' in engine and 'class SeatRecommendationEngine' in engine)
check('Recommendation engine ranks contiguous available groups', 'isContiguousAvailable' in engine and '"AVAILABLE".equals(s.status())' in engine)
check('Recommendation engine prefers row center', 'groupCenter' in engine and 'seatCenter' in engine and 'Math.abs(groupCenter-seatCenter)' in engine)
check('Recommendation engine considers vertical row center', 'rowCenter' in engine and 'Math.abs(rowIndex-rowCenter)' in engine)
check('Recommendation engine preserves accessible inventory', 'ACCESSIBLE' in engine and 'accessible*120' in engine)
check('Recommendation engine avoids new single-seat gaps', 'after.removeAll(before)' in engine and 'orphanCodes' in engine)
check('Single-gap rule requires occupied boundaries on both sides', 'isUnavailableAfterSelection(left,selected) && isUnavailableAfterSelection(right,selected)' in engine)
check('Recommendation candidates are validated by the same gap policy', 'if (!validate(seats, ids).allowed()) continue;' in engine)
check('Recommendation output is capped and score sorted', 'comparingInt(SeatSuggestion::score).reversed()' in engine and '.limit(safeLimit)' in engine)

check('SeatService exposes configurable max seat count', '${app.seat-selection.max-seats:8}' in service and 'maxSelectableSeats' in service)
check('SeatService exposes configurable single-gap guard', '${app.seat-selection.prevent-single-gap:true}' in service and 'preventSingleGap' in service)
check('SeatService validates sane max seat configuration', 'maxSelectableSeats < 1 || maxSelectableSeats > 20' in service)
check('Seat map calculates current-user Redis hold remaining TTL', 'holds.remainingSeconds(showtimeId,mine,currentUserId)' in service)
check('SeatService exposes recommendation response', 'SeatSuggestionResponse suggestions' in service and 'recommendations.suggest' in service)
check('SeatService limits suggestion count to booking maximum', 'count > maxSelectableSeats' in service)
check('SeatService exposes explicit selection validation', 'SelectionValidationResponse validateSelection' in service)
check('Hold endpoint enforces max seats', 'Mỗi booking được chọn tối đa' in service and 'unique.size() > maxSelectableSeats' in service)
check('Hold endpoint applies single-gap validation before Redis claim', 'recommendations.validate(current,unique)' in service and 'holds.acquire(showtimeId, unique, userId)' in service)
check('Hold endpoint still rejects reserved seats', 'Có ghế đã được đặt' in service and 'findReservedSeatIds(showtimeId)' in service)
check('Hold endpoint still publishes realtime HELD event', 'events.publish(showtimeId,"HELD",unique)' in service)
check('Release endpoint still publishes realtime RELEASED event', 'events.publish(showtimeId,"RELEASED",seatIds)' in service)

check('Seat controller exposes V39 suggestion endpoint', '@GetMapping("/seat-suggestions")' in controller and '@RequestParam(defaultValue="2") int count' in controller)
check('Seat controller exposes V39 selection-validation endpoint', '@PostMapping("/selection-validation")' in controller)
check('Suggestion endpoint remains available without forced authentication', 'optionalUserId(auth)' in controller)
check('Actual hold endpoint still requires authenticated user identity', 'service.hold(showtimeId, req.seatIds(), userId(auth))' in controller)

check('Application config documents V39 seat knobs', all(x in app for x in ['SEAT_HOLD_TTL_SECONDS','SEAT_MAX_PER_BOOKING','SEAT_PREVENT_SINGLE_GAP']))
check('Compose passes V39 seat knobs to both backend replicas', all(x in compose for x in ['SEAT_HOLD_TTL_SECONDS','SEAT_MAX_PER_BOOKING','SEAT_PREVENT_SINGLE_GAP']) and 'environment: *backend_env' in compose)
check('Example env documents V39 non-secret seat settings', all(x in env for x in ['SEAT_HOLD_TTL_SECONDS=300','SEAT_MAX_PER_BOOKING=8','SEAT_PREVENT_SINGLE_GAP=true']))
check('V39 intentionally requires no Flyway migration', not any((ROOT/'backend/src/main/resources/db/migration').glob('V39__*.sql')))

check('Frontend types expose V39 seat map policy and TTL fields', all(x in types for x in ['holdRemainingSeconds','maxSelectableSeats','preventSingleGap']))
check('Frontend types expose V39 seat suggestions', 'export type SeatSuggestion' in types and 'SeatSuggestionResponse' in types)
check('Booking page offers smart seat recommendation UI', 'Gợi ý ghế thông minh' in page and 'Gợi ý cụm ghế đẹp' in page)
check('Booking page supports configurable party size', 'Số người cần xếp ghế' in page and 'partySize' in page)
check('Booking page calls backend seat suggestion API', '/seat-suggestions?count=${partySize}' in page)
check('Booking page can select a recommended contiguous group', 'chooseSuggestion' in page and 'setSelected(ids)' in page)
check('Booking page validates selection before hold', '/selection-validation' in page and 'validation.allowed' in page)
check('Booking page enforces backend-provided max seat count in UI', 'map?.maxSelectableSeats||8' in page and 'Mỗi booking được chọn tối đa' in page)
check('Booking page restores active hold from server TTL', 'm.holdRemainingSeconds>0' in page and 'setSeconds(m.holdRemainingSeconds)' in page)
check('Booking page re-syncs active hold every 15 seconds', 'setInterval(()=>load().catch(()=>{}),15000)' in page)
check('Booking page warns when less than one minute remains', 'seconds<=60' in page and 'thời gian giữ ghế còn dưới 1 phút' in page)
check('Booking page surfaces realtime STOMP seat updates', 'Sơ đồ ghế vừa được cập nhật realtime.' in page and '/topic/showtimes/${showtimeId}/seats' in page)
check('Realtime refresh prunes seats that are no longer available', 'current.filter(id=>{const seat=m.seats.find' in page and 'seat?.status==="AVAILABLE"' in page)

check('V39 recommendation unit test exists', bool(unit) and 'SeatRecommendationEngineTest' in unit)
check('Unit test proves centered contiguous recommendation', 'D5", "D6' in unit and 'recommendsCenteredContiguousGroupWithoutSingleGap' in unit)
check('Unit test proves new single-gap rejection', 'rejectsOnlyNewlyCreatedSingleSeatGap' in unit and '"E2"' in unit)
check('Unit test preserves pre-existing gaps', 'doesNotPunishPreExistingSingleGap' in unit)

check('V39 Playwright journey exists', bool(e2e) and 'V39 smart seat suggestion and atomic contention guard' in e2e)
check('V39 Playwright creates two independent customers', 'v39-seat-a-' in e2e and 'v39-seat-b-' in e2e and 'browser.newContext' in e2e)
check('V39 Playwright exercises smart two-seat suggestion', 'Số người cần xếp ghế' in e2e and 'Gợi ý ghế' in e2e and 'toHaveLength(2)' in e2e)
check('V39 Playwright races the exact same seat pair concurrently', 'Promise.all([' in e2e and 'candidate.seatIds' in e2e)
check('V39 Playwright requires exactly one hold winner and one conflict', 'toEqual([200,409])' in e2e)
check('V39 Playwright verifies loser sees HELD seats', 'toHaveAttribute("title", /HELD/)' in e2e)
check('V39 Playwright releases winner hold for cleanup', 'method: "DELETE"' in e2e and 'release.status' in e2e)

check('Main CI runs V39 verifier', 'python3 tools/verify_v39_seat_map_ux.py' in ci and 'V26-V39 source regression' in ci)
check('Standalone RC defaults to V39 candidate', 'default: "v39.0.0-rc.1"' in rc and 'cinebooking_v39_rc_${{ github.run_id }}' in rc)
check('Standalone RC names V39 browser coverage', 'V38 + V39' in rc)
check('Stable release defaults to V39', 'default: "39.0.0"' in release and 'cinebooking_v39_release_${{ github.run_id }}' in release)
check('V39 diagnostics chains V38 and V39 verifier', 'diagnose-v38.ps1' in diag and 'verify_v39_seat_map_ux.py' in diag)
check('Makefile exposes V39 verify and diagnose', 'verify-v39:' in make and 'diagnose-v39:' in make)
check('V38 regression verifier tolerates V39 current version', 'V38-or-newer candidate' in legacy_v38 and 'V26-V(?:3[8-9]' in legacy_v38)
check('README documents V39 booking UX and release lifecycle', 'V39 - Seat Map & Booking UX 2.0' in readme and 'v39.0.0-rc.1' in readme and 'v39.0.0' in readme)

ignored={'.git','node_modules','.next','target','playwright-report','test-results'}
markdown=[p for p in ROOT.rglob('*.md') if not any(part in ignored for part in p.parts)]
check('source still contains exactly one README.md', len(markdown)==1 and markdown[0].resolve()==(ROOT/'README.md').resolve())
check('destructive volume reset remains blocked', 'destructive volume reset is disabled' in make and '@exit 1' in make)
check('real gateway credentials remain blank in example env', re.search(r'^VNPAY_HASH_SECRET=\s*$',env,re.M) and re.search(r'^MOMO_SECRET_KEY=\s*$',env,re.M))

failed=[n for n,ok in checks if not ok]
print(f'\n{len(checks)-len(failed)}/{len(checks)} checks passed')
if failed:
    print('Failed checks:')
    for n in failed: print(' -',n)
    sys.exit(1)
