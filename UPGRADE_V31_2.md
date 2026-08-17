# CineBooking Pro V31.2 — Release Candidate Determinism

V31.2 fixes two runtime issues found by the V31 release-candidate browser run.

## Fixes

1. The booking E2E no longer uses the ambiguous `getByText("CONFIRMED")` locator. The booking status badge now has a dedicated accessible label and Playwright targets that label exactly.
2. `AdminBootstrap` is safe when `backend-1` and `backend-2` start concurrently. The unique-email race is flushed and handled only when the peer replica has already created the configured admin. Unrelated integrity failures are still re-thrown.
3. The disposable smoke and Playwright stacks now fail if either backend replica exits after startup.

No database migration is added and no production credentials are stored in Git.

## Verify

```powershell
python .\tools\verify_v31_2_rc_determinism.py
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v31.ps1
```

Expected source verifier result: `18/18 checks passed`.

After normal CI is green, manually run `CineBooking Release Candidate` with version `v31.2-rc1`.
