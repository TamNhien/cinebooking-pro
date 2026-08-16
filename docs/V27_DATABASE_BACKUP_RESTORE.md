# V27.1 — PostgreSQL Backup, Verification & Protected Restore

V27 focuses on protecting project data during upgrades and troubleshooting. It does **not** change the booking schema or delete existing Docker volumes.

## What V27 adds

- PostgreSQL custom-format backup (`pg_dump --format=custom`).
- SHA-256 checksum sidecar for every backup.
- Archive verification with `pg_restore --list`.
- Non-destructive restore smoke test using a temporary database.
- Protected restore that requires `-ConfirmRestore`.
- A pre-restore safety backup by default.
- Automatic rollback to the safety backup when restore fails after the target database has been recreated.
- Backend writers are stopped during a real restore and restarted only after the database is usable.
- The old destructive `make reset` behavior is disabled.
- `backups/` is bind-mounted to `/backups` in the PostgreSQL container and dump files are ignored by Git.

## Upgrade V26.3 -> V27

After copying the V27 patch over V26.3, recreate the PostgreSQL container once so it receives the new `/backups` bind mount. The named `postgres_data` volume is preserved:

```powershell
docker compose up -d --force-recreate postgres
```

Then make sure the application services are running:

```powershell
docker compose up -d backend-1 backend-2 frontend nginx
```

Do **not** use `docker compose down -v` for an upgrade. `-v` deletes named volumes, including the PostgreSQL data volume.

## 1. Diagnose V27.1

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v27.ps1
```

This checks Docker Compose, PostgreSQL readiness, `pg_dump`, `pg_restore`, the `/backups` mount and database connectivity without changing the database. Flyway metadata is reported when present, but its absence is a warning rather than a backup-safety failure.

## 2. Create a backup

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\backup-db.ps1
```

Output example:

```text
backups\cinebooking-20260816-204500.dump
backups\cinebooking-20260816-204500.dump.sha256
```

The backup script verifies the archive automatically. A backup with an existing filename is never overwritten.

## 3. Verify a backup again

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\verify-db-backup.ps1 `
  -BackupFile ".\backups\cinebooking-20260816-204500.dump"
```

Verification checks file size, SHA-256 when the sidecar exists, and `pg_restore --list` archive readability.

## 4. Test that restore actually works — without touching the real database

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\test-v27.ps1
```

The smoke test:

1. Creates a fresh backup of the active CineBooking database.
2. Creates a temporary PostgreSQL database.
3. Restores the dump into the temporary database.
4. Checks restored public tables. If the source database contains `flyway_schema_history`, the restored database must contain it too.
5. Drops the temporary database.
6. Removes the smoke-test dump unless `-KeepBackup` is used.

The production `POSTGRES_DB` is never dropped or recreated by `test-v27.ps1`.

## 5. Protected real restore

First verify the dump, then restore only when you intentionally want to replace the current database state:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\restore-db.ps1 `
  -BackupFile ".\backups\cinebooking-20260816-204500.dump" `
  -ConfirmRestore
```

Default restore sequence:

1. Verify requested backup.
2. Create and verify `pre-restore-<timestamp>.dump`.
3. Stop `backend-1` and `backend-2` to prevent writes.
4. Recreate only the configured CineBooking database.
5. Restore the requested archive with `--exit-on-error`.
6. Run `ANALYZE`.
7. Restart backends.

If restore fails after database recreation, V27 attempts an automatic rollback from the pre-restore safety backup. If rollback also fails, backends remain stopped so they do not write into a broken/partial database.

### Advanced flags

`-SkipSafetyBackup` disables the default safety backup. Use only when you already have a separately verified current-state backup.

`-NoAutoRollback` keeps a failed restore from automatically restoring the pre-restore dump. This is intended only for controlled troubleshooting.

## Important safety rules

- Never commit `.dump`, `.sha256`, `.env`, JWT secrets, payment secrets or SMTP passwords.
- Restore only trusted dump files created by your own/controlled PostgreSQL environment; archive restores can execute SQL/code stored in the dump.
- Copy important verified backups to another disk/cloud location; a backup stored only beside the database is not disaster recovery.
- Do not use `docker compose down -v` during normal rebuilds/upgrades.
- `docker compose down` without `-v` keeps named volumes.
- Restore is intentionally gated by `-ConfirmRestore`.
- V27 database backup does not back up uploaded poster files under `uploads/`; back those up separately if they matter.
