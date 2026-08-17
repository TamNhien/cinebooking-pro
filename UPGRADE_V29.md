# Upgrade to CineBooking V29

V29 is a release-candidate/staging-readiness upgrade on top of V28.8. It does not contain a database migration and does not require a production restart just to apply the source changes.

## Apply

Copy the V29 hotfix over the V28.8 working tree, then run:

```powershell
python .\tools\verify_v29_release_candidate.py
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v29.ps1
```

Expected V29 verifier result:

```text
29/29 checks passed
```

Then verify local secrets/backups remain untracked:

```powershell
git ls-files .env "backups/*.dump" "backups/*.dump.sha256"
```

The command above must print nothing.

Commit and push:

```powershell
git add -A
git status --short
git commit -m "Add V29 release candidate pipeline"
git push
```

Wait for the normal **CineBooking CI** run on the new commit to become green. Then manually run **CineBooking Release Candidate** with `v29-rc1`.

Do not add registry credentials or production secrets to the repository. V29 deliberately stops before image publication or production deployment.
