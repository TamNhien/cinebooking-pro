# CineBooking Pro V31.1 - Ticket Wallet lint purity hotfix

V31.1 fixes the only blocking frontend lint error introduced by the V31 Ticket Wallet.

## Root cause

`frontend/app/bookings/page.tsx` called `Date.now()` directly while rendering. The React hooks purity rule treats this as an impure render operation because repeated renders can observe different values.

## Fix

The page now keeps the current clock value in React state. A timer refreshes that state outside the render phase and is cleaned up when the component unmounts. Ticket summary and upcoming/past filtering consume the stable state value.

This preserves the V31 behavior while removing the `react-hooks/purity` error.

## CI note: GitHub 429 while downloading setup-java

A `429 Too Many Requests` returned by `codeload.github.com` while the runner is downloading `actions/setup-java` occurs before the action executes. It is an external/transient action-download failure, not a Java, Maven, application, or repository failure. Re-run that failed job/workflow after the GitHub-side rate limit clears. Do not add application secrets or downgrade Java to work around it.

## Verify

```powershell
python .\tools\verify_v31_ticket_wallet.py
python .\tools\verify_v31_1_lint_purity.py
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v31.ps1
```

Expected V31.1 verifier result: `11/11 checks passed`.
