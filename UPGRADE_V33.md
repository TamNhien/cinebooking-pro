# Upgrade to CineBooking V33

V33 adds the admin Showtime Planner & Conflict Guard. It does not add a Flyway migration and does not rewrite V29/V32 data.

## Verify

```powershell
python .\tools\verify_v33_showtime_planner.py
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v33.ps1
```

Expected V33 verifier result:

```text
35/35 checks passed
```

## Commit

```powershell
git ls-files .env "backups/*.dump" "backups/*.dump.sha256"
git add -A
git status --short
git commit -m "Add V33 showtime planner and conflict guard"
git push
```

The `git ls-files` command above must print nothing.

After normal CI is green, manually run **CineBooking Release Candidate** on `main` with version `v33-rc1`.
