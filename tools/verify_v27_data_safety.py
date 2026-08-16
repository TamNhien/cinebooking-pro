from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
checks = []

def check(name, ok):
    ok = bool(ok)
    checks.append((name, ok))
    print(("PASS" if ok else "FAIL") + f": {name}")

compose = (ROOT / "docker-compose.yml").read_text(encoding="utf-8")
gitignore = (ROOT / ".gitignore").read_text(encoding="utf-8")
makefile = (ROOT / "Makefile").read_text(encoding="utf-8")
common = (ROOT / "tools/db-common.ps1").read_text(encoding="utf-8")
backup = (ROOT / "tools/backup-db.ps1").read_text(encoding="utf-8")
verify = (ROOT / "tools/verify-db-backup.ps1").read_text(encoding="utf-8")
restore = (ROOT / "tools/restore-db.ps1").read_text(encoding="utf-8")
test = (ROOT / "tools/test-v27.ps1").read_text(encoding="utf-8")
diag = (ROOT / "tools/diagnose-v27.ps1").read_text(encoding="utf-8")
doc = (ROOT / "docs/V27_DATABASE_BACKUP_RESTORE.md").read_text(encoding="utf-8")
readme = (ROOT / "README.md").read_text(encoding="utf-8")

check("postgres exposes /backups bind mount", "./backups:/backups" in compose)
check("backup dumps are git-ignored", "backups/*" in gitignore and "!backups/.gitkeep" in gitignore)
check("backup directory is tracked safely", (ROOT / "backups/.gitkeep").exists() and (ROOT / "backups/README.md").exists())
check("Makefile no longer runs docker compose down -v", not re.search(r"(?m)^\s*docker compose down -v(?:\s|$)", makefile))
check("Makefile reset is explicitly blocked", "V27 SAFETY" in makefile and re.search(r"(?m)^reset:\s*$", makefile))

check("backup uses PostgreSQL custom archive", "--format=custom" in backup and "pg_dump" in backup)
check("backup avoids binary PowerShell redirection", "pg_dump" in backup and ">" not in "\n".join(line for line in backup.splitlines() if "pg_dump" in line))
check("backup refuses overwrite", "Refusing to overwrite existing backup" in backup)
check("backup writes SHA-256", "Write-BackupHash" in backup and "SHA-256" in backup)
check("backup automatically verifies", "verify-db-backup.ps1" in backup)

check("verify checks SHA-256 sidecar", "Test-BackupHash" in verify)
check("verify uses pg_restore --list", "pg_restore --list" in verify)
check("backup filenames are constrained to backups directory", "direct children of .\\backups" in common and "Unsafe container backup path" in common)

check("restore requires explicit confirmation flag", "[switch]$ConfirmRestore" in restore and "if(-not $ConfirmRestore)" in restore)
check("restore creates pre-restore safety backup by default", "pre-restore-$stamp.dump" in restore and "SkipSafetyBackup" in restore)
check("restore stops backend writers", '@("stop", "backend-1", "backend-2")' in restore)
check("restore recreates a clean database from template0", "dropdb --force" in common and "createdb -T template0" in common)
check("restore uses pg_restore exit-on-error", "--exit-on-error" in common)
check("restore attempts automatic rollback", "AUTO-ROLLBACK PASSED" in restore and "NoAutoRollback" in restore)
check("restore leaves backends stopped after unrecovered DB failure", "BACKENDS LEFT STOPPED" in restore)

check("V27 test restores only into temporary database", "cinebooking_v27_test_$stamp" in test and "production database was not dropped" in test)
check("V27 test cleans up temporary database", "dropdb --force" in test)
check("V27 test validates Flyway metadata", "flyway_schema_history" in test)
check("V27 diagnostic is non-destructive", "pg_dump --" not in diag and "dropdb" not in diag and "pg_restore -U" not in diag)
check("V27 diagnostic checks backup mount", "test -d /backups && test -w /backups" in diag)

check("docs warn against down -v", "Do not use `docker compose down -v`" in doc and "down -v" in readme)
check("docs include backup verify test restore flow", all(x in doc for x in ["backup-db.ps1", "verify-db-backup.ps1", "test-v27.ps1", "restore-db.ps1"]))
check("no real .env is packaged", not (ROOT / ".env").exists())
check("no dump files are packaged", not any((ROOT / "backups").glob("*.dump")))

# PowerShell 5.1 reads ASCII source reliably; keep the operational scripts ASCII-only.
for name in ["db-common.ps1", "backup-db.ps1", "verify-db-backup.ps1", "restore-db.ps1", "diagnose-v27.ps1", "test-v27.ps1"]:
    data = (ROOT / "tools" / name).read_bytes()
    check(f"{name} is ASCII-safe for Windows PowerShell 5.1", all(b < 128 for b in data))

failed = [name for name, ok in checks if not ok]
print(f"\n{len(checks)-len(failed)}/{len(checks)} checks passed")
if failed:
    print("Failed checks:")
    for name in failed:
        print(" -", name)
    sys.exit(1)
