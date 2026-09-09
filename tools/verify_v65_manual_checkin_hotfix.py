from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
checks = []

def text(rel):
    return (ROOT / rel).read_text(encoding="utf-8")

def check(name, cond):
    ok = bool(cond)
    checks.append((name, ok))
    print(("PASS" if ok else "FAIL") + ": " + name)

checkin = text("backend/src/main/java/com/cinebooking/operations/CheckInService.java")
page = text("frontend/app/admin/bookings/page.tsx")
service = text("backend/src/main/java/com/cinebooking/booking/AdminBookingOperationsService.java")
migration_v11 = text("backend/src/main/resources/db/migration/V11__mobile_qr_checkin_and_shift_fix.sql")

admin_method = checkin.split("@Transactional public Result adminManualCheckIn", 1)[1].split("public List<HistoryItem>", 1)[0]
normal_method = checkin.split("@Transactional public Result checkIn", 1)[1].split("@Transactional public Result adminManualCheckIn", 1)[0]

check("normal QR/staff check-in still enforces time window", "if(!withinTicketWindow(st))" in normal_method)
check("admin manual check-in no longer rejects outside time window", "if(!withinTicketWindow(st))" not in admin_method)
check("admin manual check-in detects outside-window override", "boolean outsideTicketWindow=!withinTicketWindow(st);" in admin_method)
check("manual source stays compatible with V11 DB constraint", 'log.setSource("MANUAL")' in admin_method and 'MANUAL_OVERRIDE' not in admin_method)
check("override audit marker is recorded", "ADMIN_OVERRIDE_OUTSIDE_TICKET_WINDOW" in admin_method)
check("V11 ticket log constraint accepts MANUAL source", "CHECK (source IN ('QR','URL','MANUAL'))" in migration_v11)
check("admin endpoint still returns updated booking", 'new ActionResult("Check-in thủ công thành công.", detail(id))' in service)
check("modal renders action feedback", 'data-testid="booking-action-feedback"' in page)
check("action uses returned booking immediately", "setSelected(r.booking)" in page)
check("list row is updated from returned booking", "x.id===r.booking.id?r.booking:x" in page)
check("manual check-in button has stable test id", 'data-testid="admin-manual-checkin"' in page)
check("successful check-in has visible result card", 'data-testid="admin-manual-checkin-result"' in page)
check("success card shows checked-in actor", "selected.checkedInByEmail" in page and "Bởi {selected.checkedInByEmail}" in page)

failed = [name for name, ok in checks if not ok]
print(f"\n{len(checks)-len(failed)}/{len(checks)} checks passed")
if failed:
    raise SystemExit(1)
