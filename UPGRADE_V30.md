# Upgrade to CineBooking Pro V30

V30 adds advanced movie discovery and full showtime calendar navigation.

1. Copy the V30 hotfix over a V29.3 tree.
2. Run `python .\tools\verify_v30_discovery_showtimes.py`.
3. Run `powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v30.ps1`.
4. Commit and push.
5. Confirm the normal CineBooking CI run is green.
6. Open `/movies`, `/cinemas`, and a movie-detail page to verify the new filters/calendar UI.
7. Optionally run the Release Candidate workflow to exercise Playwright E2E on a clean runner.

V30 does not require a new Flyway migration and does not modify production secrets or deployment settings.

The manual Release Candidate run also executes `frontend/e2e/discovery-calendar.spec.ts`, covering V30 filters and the September 30 calendar in Chromium in addition to the V29.2 booking/payment/QR journey.
