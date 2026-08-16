# V19 Test Notes

Static checks performed while generating V19:

- V19 migration present and contains stock invariants + inventory movement ledger.
- Booking creation calls `reserveForBooking`.
- pending cancellation/expiry calls `releaseReservation`.
- payment success calls `finalizeSale`.
- approved refund calls `restoreForRefund`.
- customer food UI caps quantity by `stockAvailable` and disables sold-out products.
- Admin inventory route, menu entry and dashboard shortcut are present.
- TypeScript/TSX syntax parser check and Java source structural/import checks are included in generation validation.

Run on the Windows Docker environment after upgrade:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v19.ps1
powershell -ExecutionPolicy Bypass -File .\tools\test-v19.ps1
```
