from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
checks = []

def text(rel: str) -> str:
    p = ROOT / rel
    return p.read_text(encoding='utf-8') if p.exists() else ''

def check(name: str, ok):
    ok = bool(ok)
    checks.append((name, ok))
    print(('PASS' if ok else 'FAIL') + f': {name}')

migration = text('backend/src/main/resources/db/migration/V36__secure_ticket_transfer.sql')
booking = text('backend/src/main/java/com/cinebooking/domain/Booking.java')
service = text('backend/src/main/java/com/cinebooking/booking/TicketTransferService.java')
dtos = text('backend/src/main/java/com/cinebooking/booking/BookingDtos.java')
controller = text('backend/src/main/java/com/cinebooking/booking/BookingController.java')
tokens = text('backend/src/main/java/com/cinebooking/operations/TicketTokenService.java')
checkin = text('backend/src/main/java/com/cinebooking/operations/CheckInService.java')
ticket = text('backend/src/main/java/com/cinebooking/ticket/TicketController.java')
admin_ticket = text('backend/src/main/java/com/cinebooking/booking/AdminBookingOperationsController.java')
refund = text('backend/src/main/java/com/cinebooking/operations/RefundService.java')
app = text('backend/src/main/resources/application.yml')
compose = text('docker-compose.yml')
env = text('.env.example')
page = text('frontend/app/ticket/[bookingId]/page.tsx')
types = text('frontend/lib/types.ts')
e2e = text('frontend/e2e/ticket-transfer.spec.ts')
it = text('backend/src/test/java/com/cinebooking/integration/CineBookingIntegrationIT.java')
ci = text('.github/workflows/ci.yml')
rc = text('.github/workflows/release-candidate.yml')
release = text('.github/workflows/release.yml')
make = text('Makefile')
diag = text('tools/diagnose-v36.ps1')
readme = text('README.md')

check('V36 migration exists', bool(migration))
check('migration stores original purchaser', 'purchaser_user_id' in migration and 'UPDATE booking' in migration and 'purchaser_user_id = user_id' in migration)
check('migration adds rotatable ticket version', 'ticket_version INTEGER NOT NULL DEFAULT 1' in migration)
check('migration tracks transfer count and provenance', all(x in migration for x in ['transfer_count', 'transferred_at', 'transferred_from_user_id']))
check('booking entity maps V36 transfer fields', all(x in booking for x in ['purchaserUserId', 'ticketVersion', 'transferCount', 'transferredAt', 'transferredFromUserId']))
check('new bookings preserve purchaser identity', 'b.setPurchaserUserId(user.getId())' in text('backend/src/main/java/com/cinebooking/booking/BookingService.java'))
check('transfer request validates recipient email', 'TransferTicketRequest' in dtos and '@Email' in dtos and '@NotBlank' in dtos)
check('transfer API exposes eligibility', '/transfer-eligibility' in controller and 'transfers.eligibility' in controller)
check('transfer API exposes authenticated transfer command', '@PostMapping("/{id}/transfer")' in controller and 'transfers.transfer' in controller)
check('transfer locks booking row before ownership change', 'findByIdForUpdate' in service)
check('transfer requires current owner', 'booking.getUserId().equals(sender.getId())' in service)
check('transfer requires confirmed unchecked ticket', 'BookingStatus.CONFIRMED' in service and 'getCheckedInAt()' in service)
check('transfer blocks refund lifecycle', 'getRefundRequestedAt()' in service and 'getRefundedAt()' in service)
check('transfer enforces configurable cutoff', 'transfer-cutoff-minutes' in service and 'cutoffAt' in service)
check('transfer enforces configurable max count', 'max-transfers' in service and 'count >= maxTransfers' in service)
check('transfer accepts only enabled customer recipient', 'recipient.isAccountEnabled()' in service and 'recipient.getRole() != Role.USER' in service)
check('transfer rotates ownership and QR version atomically', 'booking.setUserId(recipient.getId())' in service and 'setTicketVersion' in service and 'setTransferCount' in service)
check('transfer notifies both sender and recipient', 'BOOKING_TRANSFER_RECEIVED' in service and 'BOOKING_TRANSFER_SENT' in service)
check('transfer writes audit trail', 'TICKET_TRANSFER' in service and 'audit.record' in service)
check('V2 QR embeds ticket version', 'CINEBOOKING|V2|' in tokens and 'ticket:v2|' in tokens)
check('legacy V1 QR remains readable for untransferred tickets', '"V1".equals(p[1])' in tokens and 'ticket:v1|' in tokens and 'new Parsed(booking,showtime,1,"V1")' in tokens)
check('check-in rejects stale QR version', 'parsed.ticketVersion()!=currentVersion' in checkin and 'QR vé đã hết hiệu lực' in checkin)
check('customer ticket generation uses current ticket version', 'tokens.create(b.getId(),b.getShowtimeId(),b.getTicketVersion()==null?1:b.getTicketVersion())' in ticket)
check('admin ticket generation uses current ticket version', 'tokens.create(b.getId(), b.getShowtimeId(), b.getTicketVersion()==null?1:b.getTicketVersion())' in admin_ticket)
check('refund returns loyalty benefits to original purchaser', 'getPurchaserUserId()' in refund and 'benefitOwnerId' in refund)
check('application config exposes transfer policy', 'transfer-cutoff-minutes' in app and 'max-transfers' in app)
check('Compose passes transfer policy to both backend replicas', 'TICKET_TRANSFER_CUTOFF_MINUTES' in compose and 'TICKET_MAX_TRANSFERS' in compose and 'environment: *backend_env' in compose)
check('example env documents non-secret transfer policy', 'TICKET_TRANSFER_CUTOFF_MINUTES=60' in env and 'TICKET_MAX_TRANSFERS=1' in env)
check('ticket page exposes gift-transfer action', '🎁 Chuyển/tặng vé' in page and 'Email người nhận vé' in page)
check('ticket page requires explicit transfer confirmation', 'Tôi xác nhận chuyển quyền sở hữu vé này' in page and 'transferConfirmed' in page)
check('ticket page removes stale offline ticket after transfer', 'deleteOfflineTicket(bookingId)' in page and 'QR cũ' in page)
check('frontend defines transfer API types', 'TicketTransferEligibility' in types and 'TicketTransferResult' in types)
check('V36 browser journey exists', 'confirmed ticket can be transferred once and old QR becomes invalid' in e2e)
check('browser journey creates sender and recipient', 'v36-sender-' in e2e and 'v36-recipient-' in e2e)
check('browser journey proves ownership transfer through UI', 'Xác nhận chuyển vé' in e2e and 'Đã chuyển vé' in e2e)
check('browser journey proves QR rotation', 'not.toEqual(oldQrUrl)' in e2e and 'CINEBOOKING%7CV2%7C' in e2e)
check('browser journey proves stale QR rejection and new QR check-in', 'QR vé đã hết hiệu lực' in e2e and 'Check-in vé thành công.' in e2e)
check('Testcontainers expects Flyway V36 or newer', bool(re.search(r'isEqualTo\("(?:3[6-9]|[4-9][0-9])"\)', it)) and 'transferColumns' in it)
check('Testcontainers covers transfer ownership and stale QR rejection', 'secureTicketTransferMovesOwnershipAndInvalidatesOldQr' in it and 'getPurchaserUserId()' in it and 'QR vé đã hết hiệu lực' in it)
check('main CI runs V36 verifier in V36-or-newer source regression', 'python3 tools/verify_v36_ticket_transfer.py' in ci and bool(re.search(r'V26-V(?:3[6-9]|[4-9][0-9]) source regression', ci)))
check('standalone RC defaults to V36-or-newer semantic candidate', bool(re.search(r'default:\s*"v(?:3[6-9]|[4-9][0-9])\.\d+\.\d+-rc\.\d+"', rc)))
check('standalone RC label includes V36 browser journey', 'V29.2 + V30 + V31.2 + V33 + V34 + V36' in rc)
check('stable release defaults to V36 or newer', bool(re.search(r'default:\s*"(?:3[6-9]|[4-9][0-9])\.\d+\.\d+"', release)) and bool(re.search(r'cinebooking_v(?:3[6-9]|[4-9][0-9])_release_\$\{\{ github\.run_id \}\}', release)))
check('V36 diagnostics chains V35 and verifier', 'diagnose-v35.ps1' in diag and 'verify_v36_ticket_transfer.py' in diag)
check('Makefile exposes V36 verify and diagnose', 'verify-v36:' in make and 'diagnose-v36:' in make)
check('README documents V36 secure ticket transfer', 'V36' in readme and 'Secure Ticket Transfer' in readme and 'v36.0.0-rc.1' in readme)
ignored = {'.git', 'node_modules', '.next', 'target', 'playwright-report', 'test-results'}
markdown = [p for p in ROOT.rglob('*.md') if not any(part in ignored for part in p.parts)]
check('source still contains exactly one README.md', len(markdown) == 1 and markdown[0].resolve() == (ROOT / 'README.md').resolve())
check('reset safety remains blocked', 'destructive volume reset is disabled' in make and '@exit 1' in make)

failed = [name for name, ok in checks if not ok]
print(f'\n{len(checks)-len(failed)}/{len(checks)} checks passed')
if failed:
    print('Failed checks:')
    for name in failed:
        print(' -', name)
    sys.exit(1)
