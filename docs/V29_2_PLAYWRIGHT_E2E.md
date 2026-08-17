# V29.2 - Playwright browser E2E gate

V29.2 adds a deterministic Chromium E2E journey on top of the V29 release-candidate stack. It is intended to catch browser/UI integration failures that backend Testcontainers, frontend build, and HTTP smoke tests cannot detect.

## Browser journey

The Playwright test drives the real UI through nginx:

1. Register a unique customer account.
2. End the registration session and log in again.
3. Use Quick Booking with the Flyway-seeded movie/showtime data.
4. Select an available seat and hold it.
5. Create a booking and complete the MOCK payment gateway.
6. Open the confirmed electronic ticket and verify the QR image.
7. Read the signed ticket check-in URL while still authenticated as the ticket owner.
8. Log in as the disposable RC Admin account.
9. Open `/staff/check-in`, submit the signed QR URL, and verify successful check-in.

The Admin role is deliberately used for the gate step because `StaffGatePolicyService` has an emergency Admin path that does not require creating a staff profile, shift, and attendance record. This keeps the release-candidate test deterministic while still exercising the same staff check-in UI and backend check-in service.

## Isolation and safety

`tools/e2e-v29.2.sh` uses a unique Compose project and a disposable PostgreSQL database. Defaults are `HTTP_PORT=18080` and `POSTGRES_PORT=15433`. Cleanup uses `docker compose down --remove-orphans --volumes` only for the disposable Compose project. It does not use the forbidden `docker compose down -v` shorthand and does not touch the normal local/production Compose project.

The test uses only test credentials and the MOCK payment provider. It does not call external payment gateways, publish container images, or deploy production infrastructure.

## GitHub Release Candidate

The manual `CineBooking Release Candidate` workflow now:

- runs the existing V29 full-stack HTTP smoke test;
- installs frontend dependencies;
- installs Playwright Chromium and its Linux dependencies;
- reuses the already-built V29 RC images;
- runs the Playwright browser journey;
- uploads `frontend/playwright-report/` and `frontend/test-results/` as evidence;
- creates the RC manifest only when all prior gates succeed.

## Local source checks

```powershell
python .\tools\verify_v29_2_playwright_e2e.py
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v29.ps1
```

For a full local browser run, Node/npm, Docker, and the Playwright Chromium browser must be installed. Then use Git Bash/WSL:

```bash
cd frontend
npm install
npx playwright install --with-deps chromium
cd ..
bash tools/e2e-v29.2.sh
```
