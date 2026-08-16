from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
test = (ROOT / "tools/test-v27.ps1").read_text(encoding="utf-8")
checks = []

def check(name, ok):
    ok = bool(ok)
    checks.append((name, ok))
    print(("PASS" if ok else "FAIL") + ": " + name)

check("V27.2 smoke-test banner", "V27.2 non-destructive restore smoke test" in test)
check("count SQL is stored in a probe file", "v27-table-count-$stamp.sql" in test and "WriteAllText($probeSqlPath" in test)
check("source count uses psql -f", "$sourceCountCommand" in test and "-f \"/backups/{0}\"" in test)
check("restored count uses psql -f", "$restoredCountCommand" in test and "-f \"/backups/{1}\"" in test)
check("count SQL is not embedded in sh command substitution", "source_count=$(psql" not in test and "restored_count=$(psql" not in test)
check("source count result file is validated", "Source table-count result file was not created" in test)
check("restored count result file is validated", "Restored table-count result file was not created" in test)
check("counts are parsed as integers", "[int]::TryParse($sourceCountText" in test and "[int]::TryParse($restoredCountText" in test)
check("restored count must equal source", "$restoredCount -ne $sourceCount" in test)
check("source must contain at least one public table", "$sourceCount -lt 1" in test)
check("probe files are cleaned in finally", "foreach($probeFile in $probeFiles)" in test and "Remove-Item -LiteralPath $probeFile" in test)
check("production database remains non-destructive", "production database was not dropped or recreated" in test)
check("V27.2 success marker", "ALL V27.2 DATABASE SAFETY TESTS PASSED" in test)
check("script is ASCII-safe for Windows PowerShell 5.1", all(b < 128 for b in (ROOT / "tools/test-v27.ps1").read_bytes()))

failed = [name for name, ok in checks if not ok]
print(f"\n{len(checks)-len(failed)}/{len(checks)} checks passed")
if failed:
    for name in failed:
        print(" -", name)
    sys.exit(1)
