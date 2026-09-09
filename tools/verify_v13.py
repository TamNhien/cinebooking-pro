from pathlib import Path

checks = []
def check(name, ok):
    checks.append((name, bool(ok)))
    print(("PASS" if ok else "FAIL") + ": " + name)

root = Path(__file__).resolve().parents[1]
controller = (root/'backend/src/main/java/com/cinebooking/booking/AdminBookingOperationsController.java').read_text(encoding="utf-8")
service = (root/'backend/src/main/java/com/cinebooking/booking/AdminBookingOperationsService.java').read_text(encoding="utf-8")
checkin = (root/'backend/src/main/java/com/cinebooking/operations/CheckInService.java').read_text(encoding="utf-8")
refund = (root/'backend/src/main/java/com/cinebooking/operations/RefundService.java').read_text(encoding="utf-8")
page = (root/'frontend/app/admin/bookings/page.tsx').read_text(encoding="utf-8")
header = (root/'frontend/components/Header.tsx').read_text(encoding="utf-8")
migration = (root/'backend/src/main/resources/db/migration/V13__booking_operations_indexes.sql').read_text(encoding="utf-8")
booking_service = (root/'backend/src/main/java/com/cinebooking/booking/BookingService.java').read_text(encoding="utf-8")

check('admin booking operations route', '/api/admin/booking-ops' in controller)
check('admin detail endpoint', '@GetMapping("/{id}")' in controller)
check('admin QR endpoint', '/ticket' in controller and 'qrImageDataUrl' in (root/'backend/src/main/java/com/cinebooking/booking/AdminBookingDtos.java').read_text(encoding="utf-8"))
check('manual check-in endpoint', 'manual-checkin' in controller and 'adminManualCheckIn' in checkin)
check('admin manual check-in bypasses staff QR time window', 'boolean outsideTicketWindow=!withinTicketWindow(st);' in checkin and 'log.setSource("MANUAL")' in checkin and 'ADMIN_OVERRIDE_OUTSIDE_TICKET_WINDOW' in checkin)
check('resend ticket endpoint', 'resend-ticket' in controller and 'AdminTicketMailService' in service)
check('admin refund request', 'refund-request' in controller and 'adminRequest' in refund)
check('approve refund', 'refund-approve' in controller)
check('reject refund', 'refund-reject' in controller)
check('pending cancel', '/cancel' in controller and 'BOOKING_CANCEL_ADMIN' in service)
check('booking detail includes payment history', 'PaymentView' in service and 'payments.findByBookingIdOrderByCreatedAtDesc' in service)
check('booking detail includes audit timeline', 'findTop100ByEntityTypeAndEntityIdOrderByCreatedAtDesc' in service)
check('frontend booking operations page', 'Booking Operations · V13' in page)
check('frontend search/filter', 'Mã booking, khách, phim, ghế' in page and 'paymentStatuses' in page)
check('frontend manual checkin action', 'Check-in thủ công' in page)
check('manual check-in feedback is visible inside modal', 'data-testid="booking-action-feedback"' in page and 'data-testid="admin-manual-checkin-result"' in page)
check('frontend applies action response without stale refetch', 'setSelected(r.booking)' in page and 'setItems(v=>v.map(x=>x.id===r.booking.id?r.booking:x))' in page)
check('frontend refund actions', 'Duyệt hoàn tiền' in page and 'Tạo yêu cầu hoàn tiền' in page)
check('frontend resend email', 'Gửi lại vé qua email' in page)
check('frontend QR preview', 'QR vé' in page and 'qrImageDataUrl' in page)
check('admin header booking link', 'href="/admin/bookings"' in header)
check('no hard delete booking in V13 service', 'V13 không cho xoá cứng booking' in booking_service)
check('V13 performance indexes', migration.count('CREATE INDEX IF NOT EXISTS') >= 5)

failed = [n for n,ok in checks if not ok]
print(f"\n{len(checks)-len(failed)}/{len(checks)} checks passed")
if failed:
    raise SystemExit(1)
