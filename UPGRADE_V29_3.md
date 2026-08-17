# Upgrade to CineBooking Pro V29.3

This upgrade is cumulative from V29.1: it includes the V29.2 Playwright E2E layer plus the V29.3 demo catalog/showtime migration.

## What changes

- adds six fictional sample movies, for eight active movies total;
- refreshes the two original demo movies;
- adds Phòng 02-05 and demo seats;
- adds two daily showtimes for every demo movie from 2026-08-18 through 2026-09-30;
- advances the latest Flyway migration from V25 to V29 without modifying V1-V25;
- updates Testcontainers assertions to validate the V29 catalog and September schedule;
- keeps the V29.2 Playwright browser journey and release-candidate workflow.

## Apply

Extract the cumulative V29.3 hotfix over the repository, then run:

```powershell
python .\tools\verify_v29_3_demo_schedule.py
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v29.ps1
```

If Docker is available, apply the database migration and rebuild the stack:

```powershell
docker compose up -d --build
docker compose ps
```

Do not use `docker compose down -v`. Existing database volumes are upgraded by Flyway when the backend starts.

## Git

```powershell
git add -A
git status --short
git commit -m "Add V29.3 demo movies and September showtimes"
git push
```

After normal CI is green, manually run **CineBooking Release Candidate** with version `v29.3-rc1`.
