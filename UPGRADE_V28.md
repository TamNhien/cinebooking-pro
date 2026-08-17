# Upgrade V27.2 -> V28

V28 is a CI/testing upgrade. It does not add a Flyway migration and does not change the production database schema.

## Files added or changed

- `.github/workflows/ci.yml`
- `.github/dependabot.yml`
- `backend/pom.xml`
- `backend/src/test/java/com/cinebooking/integration/CineBookingIntegrationIT.java`
- `tools/verify_v28_ci.py`
- `tools/diagnose-v28.ps1`
- `docs/V28_CI_CD_TESTCONTAINERS.md`
- `UPGRADE_V28.md`
- `README.md`
- `Makefile`

## Upgrade

Copy the V28 upgrade patch over V27.2 while preserving your local `.env`, `uploads/` and `backups/` data.

No PostgreSQL recreate is required for V28.

Run the local structural diagnostic:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v28.ps1
```

Then commit and push to GitHub. The `CineBooking CI` workflow will run automatically on `main`/`develop` pushes and pull requests.

## First GitHub run

The Testcontainers job needs a GitHub-hosted Linux runner with Docker available. No external PostgreSQL or Redis service needs to be configured because the test creates temporary containers itself.

After all jobs are green, enable branch protection/rulesets and require the checks listed in `docs/V28_CI_CD_TESTCONTAINERS.md`.
