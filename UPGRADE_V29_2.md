# Upgrade V29.2

V29.2 adds the Playwright Chromium E2E release-candidate gate.

1. Apply this patch on top of V29.1.
2. Run `python .\tools\verify_v29_2_playwright_e2e.py`.
3. Run `powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v29.ps1`.
4. Confirm `.env` and `backups/*.dump*` remain untracked.
5. Commit and push.
6. After normal `CineBooking CI` is green, manually run `CineBooking Release Candidate` with version `v29.2-rc1`.

The RC workflow now performs the full browser journey and uploads Playwright evidence. It still does not publish images or deploy production.
