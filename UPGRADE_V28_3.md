# Upgrade V28.2 -> V28.3

1. Extract the V28.3 hotfix into the project root with overwrite enabled.
2. Run the apply step (required so Git records deletion of the stale dynamic manifest):

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\apply-v28.3.ps1
```

3. Run diagnostics:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v28.ps1
```

4. Stage all modifications **including deletions**:

```powershell
git add -A
git status --short
```

Expected important entries include:

```text
M  backend/pom.xml
D  frontend/app/manifest.ts
```

5. Commit and push:

```powershell
git commit -m "Fix V28 CI Spring Boot tests and manifest regression"
git push
```

No Docker rebuild or database operation is required for this CI-only hotfix.
