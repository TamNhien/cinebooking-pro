from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
checks = []

def text(rel):
    p = ROOT / rel
    return p.read_text(encoding="utf-8") if p.exists() else ""

def check(name, ok):
    ok = bool(ok)
    checks.append((name, ok))
    print(("PASS" if ok else "FAIL") + f": {name}")

spec = text("frontend/e2e/booking-flow.spec.ts")
bookings = text("frontend/app/bookings/page.tsx")
bootstrap = text("backend/src/main/java/com/cinebooking/config/AdminBootstrap.java")
smoke = text("tools/smoke-v29.sh")
e2e = text("tools/e2e-v29.2.sh")
rc = text(".github/workflows/release-candidate.yml")
ci = text(".github/workflows/ci.yml")
diag = text("tools/diagnose-v31.ps1")
makefile = text("Makefile")
v293 = text("tools/verify_v29_3_demo_schedule.py")
v31 = text("tools/verify_v31_ticket_wallet.py")

check("booking status badge has a dedicated accessible label", 'aria-label={`Trạng thái booking: ${b.status}`}' in bookings)
check("Playwright CONFIRMED assertion uses the dedicated booking-status label", 'getByLabel("Trạng thái booking: CONFIRMED", { exact: true }).first()' in spec)
check("Playwright no longer uses ambiguous getByText CONFIRMED locator", 'getByText("CONFIRMED")' not in spec)
check("admin bootstrap is not wrapped in one outer transaction", "@Transactional" not in bootstrap)
check("admin bootstrap normalizes email deterministically", "toLowerCase(Locale.ROOT)" in bootstrap)
check("admin bootstrap flushes unique-email insert inside guarded call", "users.saveAndFlush(admin)" in bootstrap)
check("admin bootstrap handles concurrent unique-key race", "catch (DataIntegrityViolationException ex)" in bootstrap)
check("admin bootstrap rechecks winner before suppressing integrity error", "findByEmailIgnoreCase(normalizedEmail).isEmpty()" in bootstrap and "throw ex" in bootstrap)
check("V29 smoke asserts both backend replicas stay running", "assert_running_services" in smoke and "backend-1 backend-2" in smoke and "docker compose ps --status running --services" in smoke)
check("Playwright E2E asserts both backend replicas stay running", "assert_running_services" in e2e and "backend-1 backend-2" in e2e and "docker compose ps --status running --services" in e2e)
rc_version = re.search(r'default: "v(\d+)(?:\.(\d+))?(?:\.\d+)?-rc(?:\.\d+|\d+)"', rc)
rc_tuple = (int(rc_version.group(1)), int(rc_version.group(2) or 0)) if rc_version else (0, 0)
check("RC default remains v31.2 or newer", rc_tuple >= (31, 2))
check("RC browser step identifies V31.2", "V29.2 + V30 + V31.2" in rc)
check("main CI runs V31.2 determinism verifier", "python3 tools/verify_v31_2_rc_determinism.py" in ci)
check("V31 diagnostics run V31.2 verifier", "verify_v31_2_rc_determinism.py" in diag)
check("Makefile exposes V31.2 verifier", "verify-v31-2:" in makefile)
check("V29.3 verifier accepts patch-level RC labels", "v(?:3[0-9]|[4-9][0-9])(?:\\.\\d+)*" in v293)
check("V31 verifier accepts V31-compatible or newer RC labels", "V31-compatible or newer" in v31)
check("reset safety remains intact", "destructive volume reset is disabled" in makefile and "@exit 1" in makefile)

failed=[name for name,ok in checks if not ok]
print(f"\n{len(checks)-len(failed)}/{len(checks)} checks passed")
if failed:
    print("Failed checks:")
    for name in failed:
        print(" -", name)
    sys.exit(1)
