from pathlib import Path
root=Path(__file__).resolve().parents[1]
checks={
 'migration': (root/'backend/src/main/resources/db/migration/V24__booking_idempotency_and_contention.sql','uq_booking_user_idempotency'),
 'booking columns': (root/'backend/src/main/java/com/cinebooking/domain/Booking.java','requestFingerprint'),
 'repository lookup': (root/'backend/src/main/java/com/cinebooking/booking/BookingRepository.java','findByUserIdAndIdempotencyKey'),
 'controller header': (root/'backend/src/main/java/com/cinebooking/booking/BookingController.java','Idempotency-Replayed'),
 'service replay': (root/'backend/src/main/java/com/cinebooking/booking/BookingService.java','BookingCreateResult'),
 'service fingerprint': (root/'backend/src/main/java/com/cinebooking/booking/BookingService.java','SHA-256'),
 'seat race 409': (root/'backend/src/main/java/com/cinebooking/booking/BookingService.java','uq_showtime_seat_active'),
 'frontend idempotency': (root/'frontend/app/booking/[showtimeId]/page.tsx','Idempotency-Key'),
 'frontend retry note': (root/'frontend/app/booking/[showtimeId]/page.tsx','Chống tạo đơn trùng'),
 'diagnostics': (root/'tools/diagnose-v24.ps1','Duplicate active seat ownership'),
 'smoke test': (root/'tools/test-v24.ps1','ALL V24 HIGH-TRAFFIC BOOKING SMOKE TESTS PASSED'),
 'k6 idempotency': (root/'loadtest/idempotency-retry.js','Idempotency-Replayed'),
 'k6 contention key': (root/'loadtest/contention.js','Idempotency-Key'),
 'docs': (root/'README.md','High-Traffic Booking'),
}
failed=[]
for name,(path,needle) in checks.items():
    ok=path.exists() and needle in path.read_text(encoding='utf-8')
    print(('PASS' if ok else 'FAIL')+': '+name)
    if not ok: failed.append(name)
print(f'{len(checks)-len(failed)}/{len(checks)} checks passed')
raise SystemExit(1 if failed else 0)
