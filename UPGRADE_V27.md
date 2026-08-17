# CineBooking Pro — Upgrade V26.3 to V27

V27 adds PostgreSQL backup/verification/protected restore tooling. It does not change Flyway migrations or application business logic.

## Apply the patch

Copy the V27 patch files over your existing V26.3 project, preserving folders.

Then recreate PostgreSQL once so the new `./backups:/backups` bind mount is attached. The existing named `postgres_data` volume is preserved:

```powershell
docker compose up -d --force-recreate postgres
docker compose up -d backend-1 backend-2 frontend nginx
```

Do not add `-v` to `docker compose down` during normal upgrades.

## Validate V27

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v27.ps1
powershell -ExecutionPolicy Bypass -File .\tools\backup-db.ps1
powershell -ExecutionPolicy Bypass -File .\tools\test-v27.ps1
```

A successful `test-v27.ps1` proves the current database can be dumped and restored into a temporary database without dropping the active CineBooking database.

## Real restore

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\verify-db-backup.ps1 `
  -BackupFile ".\backups\<file>.dump"

powershell -ExecutionPolicy Bypass -File .\tools\restore-db.ps1 `
  -BackupFile ".\backups\<file>.dump" `
  -ConfirmRestore
```

The restore script creates a verified pre-restore safety backup by default and attempts automatic rollback if restore fails after database recreation.

See `docs/V27_DATABASE_BACKUP_RESTORE.md` for full details.
