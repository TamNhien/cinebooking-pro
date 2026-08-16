# CineBooking Pro V28.3 CI Runtime Hotfix

Fixes the two GitHub Actions failures observed on the real runner:

1. Backend test compilation cannot resolve Spring Boot 4 `AutoConfigureMockMvc`.
2. V26.2 manifest regression detects stale `frontend/app/manifest.ts`.

## Apply

Extract this ZIP over the project root with overwrite enabled, then **run the apply script** so the stale manifest file is deleted:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\apply-v28.3.ps1
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v28.ps1
git add -A
git status --short
git commit -m "Fix V28 CI Spring Boot tests and manifest regression"
git push
```

`git add -A` is important because the manifest fix is a file deletion.

No Docker rebuild and no database operation are required.
