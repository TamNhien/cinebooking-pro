# Upgrade to V31 - Ticket Wallet & Calendar

V31 is a source-only upgrade from V30.2. It adds the customer ticket wallet, authenticated `.ics` calendar export, copy/print ticket actions, and browser E2E coverage. There is no new Flyway migration.

## Apply

Overlay the V31 source on the current project, then run:

```powershell
python .\tools\verify_v31_ticket_wallet.py
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v31.ps1
```

Do not use `docker compose down -v`. Existing PostgreSQL data and V29 demo showtimes remain intact.

After CI is green, run **CineBooking Release Candidate** manually with version `v31-rc1` to execute the full browser booking + calendar + QR/check-in journey on a disposable stack.
