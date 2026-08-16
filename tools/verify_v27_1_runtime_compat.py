from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
checks = []

def check(name, ok):
    ok = bool(ok)
    checks.append((name, ok))
    print(("PASS" if ok else "FAIL") + ": " + name)

paths = {
    "diag": ROOT / "tools/diagnose-v27.ps1",
    "verify": ROOT / "tools/verify-db-backup.ps1",
    "test": ROOT / "tools/test-v27.ps1",
}
text = {k: p.read_text(encoding="utf-8") for k, p in paths.items()}

check("diagnostic does not use Invoke-ComposeCapture", "Invoke-ComposeCapture" not in text["diag"])
check("diagnostic database metadata is printed directly", "PASS: database query succeeded" in text["diag"] and "Invoke-Compose -Arguments" in text["diag"])
check("diagnostic Flyway absence is warning, not fatal", "WARN: flyway_schema_history was not confirmed" in text["diag"])
check("backup verification does not capture pg_restore output", "Invoke-ComposeCapture" not in text["verify"])
check("backup verification validates listing inside container", "pg_restore --list" in text["verify"] and "grep -q ." in text["verify"])
check("restore smoke test does not use Invoke-ComposeCapture", "Invoke-ComposeCapture" not in text["test"])
check("restore smoke test compares public-table counts robustly", (('$restored_count' in text["test"] and '$source_count' in text["test"] and '-eq "$source_count"' in text["test"]) or ("v27-table-count-$stamp.sql" in text["test"] and '-f "/backups/{0}"' in text["test"] and "$restoredCount -ne $sourceCount" in text["test"])))
check("Flyway round-trip is conditional on source presence", "$sourceHasFlyway" in text["test"] and "Source had Flyway metadata" in text["test"])
check("production database remains non-destructive", "production database was not dropped or recreated" in text["test"])

for name, p in paths.items():
    data = p.read_bytes()
    check(name + " is ASCII-safe for Windows PowerShell 5.1", all(b < 128 for b in data))

failed = [name for name, ok in checks if not ok]
print(f"\n{len(checks)-len(failed)}/{len(checks)} checks passed")
if failed:
    for name in failed:
        print(" -", name)
    sys.exit(1)
