from pathlib import Path
import sys

root = Path(__file__).resolve().parents[1]
checks = []

def text(rel):
    return (root / rel).read_text(encoding='utf-8')

def has(rel, needle, label):
    ok = needle in text(rel)
    checks.append((ok, label, rel))

has('backend/src/main/resources/db/migration/V11__mobile_qr_checkin_and_shift_fix.sql',
    'DROP CONSTRAINT IF EXISTS uq_staff_shift_start', 'V11 drops old cancelled-blocking unique constraint')
has('backend/src/main/resources/db/migration/V11__mobile_qr_checkin_and_shift_fix.sql',
    "WHERE status <> 'CANCELLED'", 'V11 partial unique index ignores CANCELLED shifts')
has('backend/src/main/resources/db/migration/V11__mobile_qr_checkin_and_shift_fix.sql',
    'CREATE TABLE IF NOT EXISTS ticket_checkin_log', 'V11 creates ticket check-in log')
has('backend/src/main/java/com/cinebooking/operations/TicketTokenService.java',
    'public String normalize(String value)', 'Token service accepts URL or raw token')
has('backend/src/main/java/com/cinebooking/operations/TicketTokenService.java',
    '"ticket".equals(key)', 'Token service extracts ticket query parameter')
has('backend/src/main/java/com/cinebooking/ticket/TicketController.java',
    '/staff/check-in?ticket=', 'Ticket QR encodes check-in URL')
has('backend/src/main/java/com/cinebooking/ticket/TicketController.java',
    '${app.ticket.public-base-url:}', 'Ticket controller supports configurable public base URL')
has('backend/src/main/resources/application.yml',
    'public-base-url: ${TICKET_PUBLIC_BASE_URL:}', 'Application maps TICKET_PUBLIC_BASE_URL')
has('docker-compose.yml',
    'TICKET_PUBLIC_BASE_URL: ${TICKET_PUBLIC_BASE_URL:-}', 'Compose passes ticket public base URL')
has('backend/src/main/java/com/cinebooking/operations/StaffCheckInController.java',
    '@GetMapping("/history")', 'Staff scan-history endpoint exists')
has('backend/src/main/java/com/cinebooking/operations/CheckInService.java',
    'TicketCheckInLog log=new TicketCheckInLog()', 'Successful check-ins are logged')
has('backend/src/main/java/com/cinebooking/staffops/StaffOpsDtos.java',
    'long checkedTickets', 'Shift DTO exposes ticket count')
has('frontend/app/admin/shifts/page.tsx',
    'Hiển thị ca đã huỷ', 'Admin can show/hide cancelled shifts')
has('frontend/app/admin/shifts/page.tsx',
    'không còn chiếm khung giờ', 'Admin explains cancelled-slot fix')
has('frontend/app/staff/check-in/page.tsx',
    'window.location.href', 'Phone-opened QR URL can auto-submit')
has('frontend/app/staff/check-in/page.tsx',
    'Lịch sử quét gần đây', 'Staff scan history is displayed')
has('frontend/app/staff/schedule/page.tsx',
    'returnTo', 'Attendance flow returns to pending scanned ticket')
has('frontend/app/ticket/[bookingId]/page.tsx',
    'camera mặc định', 'Ticket UI explains normal phone camera support')
has('tools/set-lan-qr-url.ps1',
    'TICKET_PUBLIC_BASE_URL', 'LAN QR setup helper exists')
has('tools/test-v11.ps1',
    'Recreate same slot after cancellation', 'V11 smoke test covers cancelled-slot regression')

bad = [c for c in checks if not c[0]]
for ok, label, rel in checks:
    print(('PASS' if ok else 'FAIL') + f': {label} [{rel}]')
print(f'\n{len(checks)-len(bad)}/{len(checks)} checks passed')
sys.exit(1 if bad else 0)
