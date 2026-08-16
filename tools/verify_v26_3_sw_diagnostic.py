from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
checks = []

def check(name, ok):
    checks.append((name, bool(ok)))
    print(("PASS" if ok else "FAIL") + f": {name}")

sw = (ROOT / "frontend/public/sw.js").read_text(encoding="utf-8")
diag = (ROOT / "tools/diagnose-v26.ps1").read_text(encoding="utf-8")
smoke = (ROOT / "tools/test-v26.ps1").read_text(encoding="utf-8")

check("service worker declares v26", 'const VERSION = "v26"' in sw)
check("service worker derives shell cache from VERSION", 'cinebooking-shell-${VERSION}' in sw)
check("diagnostic no longer expects expanded cache literal", "-notmatch 'cinebooking-shell-v26'" not in diag)
check("diagnostic validates VERSION", "$swText.Contains('const VERSION = \"v26\"')" in diag and 'Service worker VERSION is not v26' in diag)
check("diagnostic validates shell-cache naming", "$swText.Contains('cinebooking-shell-${VERSION}')" in diag and 'Service worker shell-cache naming rule not found' in diag)
check("smoke test validates VERSION", "$sw.Contains('const VERSION = \"v26\"')" in smoke and 'Service worker is not V26' in smoke)
check("smoke test validates shell-cache naming", "$sw.Contains('cinebooking-shell-${VERSION}')" in smoke and 'Service worker shell-cache naming rule missing' in smoke)
check("diagnostic still checks offline tickets", '/offline-tickets' in diag)
check("diagnostic still checks API cache exclusion", 'Service worker API-cache exclusion not found' in diag)

failed = [name for name, ok in checks if not ok]
print(f"\n{len(checks)-len(failed)}/{len(checks)} checks passed")
if failed:
    raise SystemExit(1)
