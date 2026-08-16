from pathlib import Path
root=Path(__file__).resolve().parents[1]
checks={
    'migration': (root/'backend/src/main/resources/db/migration/V19__concession_inventory.sql','CREATE TABLE inventory_movement'),
    'stock columns': (root/'backend/src/main/resources/db/migration/V19__concession_inventory.sql','stock_reserved'),
    'reserve lifecycle': (root/'backend/src/main/java/com/cinebooking/booking/BookingService.java','inventory.reserveForBooking'),
    'release lifecycle': (root/'backend/src/main/java/com/cinebooking/booking/BookingService.java','inventory.releaseReservation'),
    'sale lifecycle': (root/'backend/src/main/java/com/cinebooking/payment/PaymentService.java','inventory.finalizeSale'),
    'refund lifecycle': (root/'backend/src/main/java/com/cinebooking/operations/RefundService.java','inventory.restoreForRefund'),
    'admin controller': (root/'backend/src/main/java/com/cinebooking/commerce/AdminInventoryController.java','/api/admin/inventory'),
    'inventory page': (root/'frontend/app/admin/inventory/page.tsx','Sổ nhập / xuất kho'),
    'customer stock cap': (root/'frontend/app/booking/[showtimeId]/page.tsx','stockAvailable'),
    'menu link': (root/'frontend/components/Header.tsx','/admin/inventory'),
    'smoke test': (root/'tools/test-v19.ps1','ALL V19 INVENTORY SMOKE TESTS PASSED'),
}
failed=[]
for name,(path,needle) in checks.items():
    ok=path.exists() and needle in path.read_text(encoding='utf-8')
    print(('PASS' if ok else 'FAIL')+': '+name)
    if not ok: failed.append(name)
print(f'{len(checks)-len(failed)}/{len(checks)} checks passed')
raise SystemExit(1 if failed else 0)
