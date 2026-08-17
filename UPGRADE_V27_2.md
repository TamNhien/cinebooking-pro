# Upgrade V27.1 to V27.2

This is a host-script-only hotfix for `tools/test-v27.ps1`. No Docker image rebuild, database migration, PostgreSQL recreation, or new backup is required.

Copy the patch files over the existing project, then run:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v27.ps1
powershell -ExecutionPolicy Bypass -File .\tools\test-v27.ps1
```

Your existing verified `.dump` backup remains valid. The smoke test creates its own temporary backup and temporary restore database, then removes them unless `-KeepBackup` is specified.

Expected final line:

```text
ALL V27.2 DATABASE SAFETY TESTS PASSED
```
