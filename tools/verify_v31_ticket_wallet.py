from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
checks = []

def text(rel: str) -> str:
    p = ROOT / rel
    return p.read_text(encoding="utf-8") if p.exists() else ""

def check(name: str, ok):
    ok = bool(ok)
    checks.append((name, ok))
    print(("PASS" if ok else "FAIL") + f": {name}")

service = text("backend/src/main/java/com/cinebooking/booking/BookingCalendarService.java")
controller = text("backend/src/main/java/com/cinebooking/booking/BookingCalendarController.java")
builder = text("backend/src/main/java/com/cinebooking/booking/IcsCalendarBuilder.java")
unit = text("backend/src/test/java/com/cinebooking/booking/IcsCalendarBuilderTest.java")
api = text("frontend/lib/api.ts")
calendar = text("frontend/lib/calendar.ts")
bookings = text("frontend/app/bookings/page.tsx")
ticket = text("frontend/app/ticket/[bookingId]/page.tsx")
css = text("frontend/app/globals.css")
e2e = text("frontend/e2e/booking-flow.spec.ts")
ci = text(".github/workflows/ci.yml")
rc = text(".github/workflows/release-candidate.yml")
makefile = text("Makefile")
diag = text("tools/diagnose-v31.ps1")

check("calendar backend service exists", bool(service))
check("calendar endpoint exists", '/{id}/calendar.ics' in controller and 'text/calendar;charset=UTF-8' in controller)
check("calendar endpoint is attachment download", 'ContentDisposition.attachment()' in controller and 'no-store' in controller)
check("calendar validates booking ownership", 'bookings.getOwned(bookingId, email)' in service)
check("calendar requires confirmed booking", '!"CONFIRMED".equals(booking.status())' in service and 'HttpStatus.CONFLICT' in service)
check("calendar resolves cinema and auditorium", 'AuditoriumRepository' in service and 'CinemaRepository' in service and 'cinema.getAddress()' in service)
check("calendar uses movie duration for end time", 'movie.getDurationMinutes()' in service and 'start.plusSeconds(duration * 60L)' in service)
check("ICS builder exists", bool(builder) and 'BEGIN:VCALENDAR' in builder and 'BEGIN:VEVENT' in builder)
check("ICS uses portable UTC timestamps", "yyyyMMdd'T'HHmmss'Z'" in builder and 'ZoneOffset.UTC' in builder)
check("ICS has stable booking UID", '@cinebooking.local' in builder and 'UID:' in builder)
check("ICS contains summary location description", 'SUMMARY:' in builder and 'LOCATION:' in builder and 'DESCRIPTION:' in builder)
check("ICS escapes separators and newlines", '.replace(";", "\\\\;")' in builder and '.replace(",", "\\\\,")' in builder and '\\n' in builder)
check("ICS unit tests exist", bool(unit) and 'buildsPortableUtcCalendarEvent' in unit and 'escapesIcsSeparatorsAndNewlines' in unit)

check("frontend supports authenticated blob downloads", 'export async function apiBlob' in api and 'refreshAccessToken()' in api)
check("calendar download helper exists", 'downloadBookingCalendar' in calendar and 'URL.createObjectURL' in calendar and '.ics' in calendar)
check("booking code copy helper exists", 'copyBookingCode' in calendar and 'navigator.clipboard.writeText' in calendar)
check("ticket wallet heading is present", 'Ví vé của tôi' in bookings and 'V31 · TICKET WALLET' in bookings)
check("ticket wallet has upcoming/past/all tabs", '"upcoming"' in bookings and '"past"' in bookings and '"all"' in bookings and 'Sắp chiếu' in bookings and 'Đã qua' in bookings)
check("ticket wallet searches movie booking and seat", 'Tìm phim / mã booking / ghế' in bookings and 'b.movieTitle' in bookings and 'b.seats.map' in bookings)
check("ticket wallet filters status", 'booking-status' in bookings and 'REFUND_REQUESTED' in bookings and 'REFUNDED' in bookings)
check("ticket wallet supports sorting", 'showtime-asc' in bookings and 'showtime-desc' in bookings and 'created-desc' in bookings)
check("ticket wallet shows summary counters", 'Tổng quan vé' in bookings and 'summary.upcoming' in bookings and 'summary.pending' in bookings and 'summary.refund' in bookings)
check("ticket wallet exposes calendar action", 'downloadBookingCalendar(b.id)' in bookings and 'Thêm vào lịch' in bookings)
check("ticket wallet exposes booking copy action", 'copyBookingCode(b.id)' in bookings and 'Sao chép' in bookings)
check("e-ticket exposes calendar action", 'downloadBookingCalendar(bookingId)' in ticket and 'Thêm vào lịch' in ticket)
check("e-ticket exposes copy and print actions", 'copyBookingCode(bookingId)' in ticket and 'window.print()' in ticket and 'In vé' in ticket)
check("print stylesheet exists", 'V31 printable e-ticket' in css and '@media print' in css and '.ticket-print-card' in css)

check("browser E2E downloads calendar file", 'waitForEvent("download")' in e2e and 'suggestedFilename()' in e2e and 'BEGIN:VCALENDAR' in e2e)
check("browser E2E validates calendar summary", 'SUMMARY:CineBooking - Hành Trình Sao Hỏa' in e2e and 'STATUS:CONFIRMED' in e2e)
check("browser E2E checks V31 ticket actions", 'Ví vé của tôi' in e2e and 'Mã booking' in e2e and 'In vé' in e2e)
check("CI runs V31 verifier", 'python3 tools/verify_v31_ticket_wallet.py' in ci)
check("RC default remains V31-compatible or newer", re.search(r'default: "v(?:31|3[2-9]|[4-9][0-9])(?:\.\d+)*-rc(?:\.\d+|\d+)"', rc) is not None)
check("RC browser step includes V31", 'V29.2 + V30 + V31' in rc and 'bash tools/e2e-v29.2.sh' in rc)
check("RC remains manual and read-only", 'workflow_dispatch:' in rc and '\n  push:' not in rc and re.search(r'permissions:\s*\n\s+contents:\s*read', rc) is not None)
check("RC still does not publish or deploy", 'push: true' not in rc and 'packages: write' not in rc and 'docker/login-action' not in rc and 'ghcr.io' not in rc)
check("V31 diagnostics include V30 baseline and verifier", 'diagnose-v30.ps1' in diag and 'verify_v31_ticket_wallet.py' in diag)
check("Makefile exposes V31 verifier and diagnostics", 'verify-v31:' in makefile and 'diagnose-v31:' in makefile)
check("destructive reset remains disabled", 'destructive volume reset is disabled' in makefile and '@exit 1' in makefile)

failed = [name for name, ok in checks if not ok]
print(f"\n{len(checks)-len(failed)}/{len(checks)} checks passed")
if failed:
    print("Failed checks:")
    for name in failed:
        print(" -", name)
    sys.exit(1)
