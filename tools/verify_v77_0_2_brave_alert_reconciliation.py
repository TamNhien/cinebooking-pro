from pathlib import Path
import sys

ROOT=Path(__file__).resolve().parents[1]
checks=[]

def text(path): return (ROOT/path).read_text(encoding="utf-8")
def has(path,*needles):
    p=ROOT/path
    return p.exists() and all(n in p.read_text(encoding="utf-8") for n in needles)
def ok(label,cond):
    checks.append((label,bool(cond)))
    print(f"[ {'OK' if cond else 'FAIL'} ] {label}")

security=text("backend/src/main/java/com/cinebooking/security/SecurityProtectionService.java")
e2e=text("frontend/e2e/security-account-protection.spec.ts")
login=text("frontend/app/login/page.tsx")
readme=text("README.md")
unit=text("backend/src/test/java/com/cinebooking/security/SecurityProtectionServiceTest.java")

ok("V77.0.2 bounded Brave alert repair helper exists", "repairRecentLegacyBraveAlerts" in security)
ok("Repair requires positive Brave detection", '\"Brave\".equals(detectedBrowser)' in security)
ok("Repair window is bounded to 24 hours", "minus(24,ChronoUnit.HOURS)" in security)
ok("Repair requires exact prior User-Agent", "Objects.equals(candidate.getUserAgent(),ua)" in security)
ok("Repair requires exact prior IP", "Objects.equals(candidate.getIpAddress(),ip)" in security)
ok("Repair only targets legacy Chrome OS label", 'legacyChromeName=\"Chrome · \"+ClientDeviceDetector.operatingSystem(ua)' in security)
ok("Repair skips current session in historical scan", "Objects.equals(candidate.getId(),currentSessionId)" in security)
ok("Repair requires linked NEW_DEVICE alert", '!\"NEW_DEVICE\".equals(alert.getEventType())' in security and "findByRelatedSessionId(candidate.getId())" in security)
ok("Repair preserves user ownership", "Objects.equals(alert.getUserId(),userId)" in security)
ok("Prior session changes only after linked alert repair", "if(linkedNewDeviceAlertRepaired)" in security and "sessions.save(candidate)" in security)
ok("Focused unit test covers recent linked Brave reconciliation", "braveSyncRepairsOnlyRecentLinkedLegacyNewDeviceAlert" in unit)
ok("Focused unit test preserves alerts outside 24h window", "braveSyncDoesNotRewriteLegacyChromeAlertOutsideTwentyFourHourWindow" in unit)
ok("Login submit has stable E2E test id", 'data-testid=\"login-submit\"' in login and 'type=\"submit\"' in login)
ok("Security E2E uses stable login selector", 'getByTestId(\"login-submit\")' in e2e)
ok("Security E2E waits for explicit login URL", "toHaveURL(/\\/login" in e2e)
ok("README retains V77.0.2 and current release is V77.0.2 or later", "| **V77.0.2** |" in readme and "Current release:** V77.0." in readme)
ok("README documents bounded legacy Brave alert reconciliation", "bounded legacy Brave alert reconciliation" in readme)
ok("Patch remains no-schema", not any((ROOT/"backend/src/main/resources/db/migration").glob("V77*0*2*.sql")))
ok("CI runs V77.0.2 verifier", has(".github/workflows/ci.yml","verify_v77_0_2_brave_alert_reconciliation.py"))
ok("Release preflight runs V77.0.2 verifier", has("scripts/release.ps1","verify_v77_0_2_brave_alert_reconciliation.py"))
ok("Diagnose V77 chains V77.0.2 verifier", has("tools/diagnose-v77.ps1","verify_v77_0_2_brave_alert_reconciliation.py"))
ok("Makefile exposes V77.0.2 verifier and immutable release target", has("Makefile","verify-v77-brave-alert-reconciliation:","release-v77-0-2:","v77.0.2"))

passed=sum(1 for _,v in checks if v)
total=len(checks)
print(f"\nV77.0.2 Brave alert reconciliation verification: {passed}/{total} checks passed")
sys.exit(0 if passed==total else 1)
