from pathlib import Path
import re
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
unit=text("backend/src/test/java/com/cinebooking/security/SecurityProtectionServiceTest.java")
readme=text("README.md")
makefile=text("Makefile")

ok("V77.0.3 historical Brave evidence helper exists", "repairLegacyBraveAlertsFromHistoricalEvidence" in security)
ok("V77.0.3 sync invokes historical evidence pass", "repairLegacyBraveAlertsFromHistoricalEvidence(userId,currentSessionId,session.getIpAddress(),detectedBrowser)" in security)
ok("Historical evidence pass runs before same-sync recent repair to prevent evidence chaining", security.index("repairLegacyBraveAlertsFromHistoricalEvidence(userId,currentSessionId,session.getIpAddress(),detectedBrowser)") < security.index("repairRecentLegacyBraveAlerts(userId,currentSessionId,ua,session.getIpAddress(),deviceName,detectedBrowser)"))
ok("Historical pass requires current positive Brave detection", '!"Brave".equals(detectedBrowser)' in security)
ok("Historical pass scans only bounded per-user session history", "findTop50ByUserIdOrderByLastSeenAtDesc(userId)" in security)
ok("Brave evidence preserves user ownership", "Objects.equals(s.getUserId(),userId)" in security)
ok("Brave evidence requires current IP", "Objects.equals(s.getIpAddress(),currentIp)" in security)
ok("Brave evidence requires auto browser/OS label", 'String expected="Brave · "+ClientDeviceDetector.operatingSystem(s.getUserAgent())' in security)
ok("Candidate must belong to same user", "Objects.equals(candidate.getUserId(),userId)" in security)
ok("Candidate must stay on exact current IP", "Objects.equals(candidate.getIpAddress(),currentIp)" in security)
ok("Candidate only targets legacy Chrome OS label", 'String legacyChromeName="Chrome · "+os' in security)
ok("Evidence requires exact historical User-Agent", "Objects.equals(evidence.getUserAgent(),candidate.getUserAgent())" in security)
ok("Evidence requires exact historical IP", "Objects.equals(evidence.getIpAddress(),candidate.getIpAddress())" in security)
ok("Evidence requires matching Brave OS label", "Objects.equals(evidence.getDeviceName(),braveName)" in security)
ok("Evidence must occur after or at candidate time", "!evidenceTime.isBefore(candidateTime)" in security)
ok("Evidence window remains bounded to 24 hours", "candidateTime.plus(24,ChronoUnit.HOURS)" in security)
ok("Historical repair requires linked NEW_DEVICE alert", '!"NEW_DEVICE".equals(alert.getEventType())' in security and "findByRelatedSessionId(candidate.getId())" in security)
ok("Historical alert requires exact candidate IP", "Objects.equals(alert.getIpAddress(),candidate.getIpAddress())" in security)
ok("Session changes only after linked alert repair", "if(linkedNewDeviceAlertRepaired)" in security and "candidate.setDeviceName(braveName)" in security)
ok("Unit test covers UA-version drift with later positive Brave evidence", "braveSyncRepairsHistoricalChromeAlertFromLaterPositiveBraveFingerprintEvidence" in unit and "LEGACY_BRAVE_UA" in unit)
ok("Unit test prevents reverse-time evidence rewrite", "historicalBraveEvidenceDoesNotRewriteChromeSessionCreatedAfterEvidence" in unit)
ok("Unit test requires exact IP match", "historicalBraveEvidenceRequiresExactIpMatch" in unit)
m = re.search(r"Current release:\*\* V77\.0\.(\d+)", readme)
current_patch = int(m.group(1)) if m else -1
ok("README current release is V77.0.3 or later", current_patch >= 3)
ok("README documents positive Brave fingerprint evidence", "POSITIVE_BRAVE_FINGERPRINT_EVIDENCE" in readme and "EXACT_USER_AGENT_MATCH" in readme)
ok("Patch remains no-schema", not any((ROOT/"backend/src/main/resources/db/migration").glob("V77*0*3*.sql")))
ok("CI runs V77.0.3 verifier", has(".github/workflows/ci.yml","verify_v77_0_3_historical_brave_evidence_reconciliation.py"))
ok("Release preflight runs V77.0.3 verifier", has("scripts/release.ps1","verify_v77_0_3_historical_brave_evidence_reconciliation.py"))
ok("Diagnose V77 chains V77.0.3 verifier", has("tools/diagnose-v77.ps1","verify_v77_0_3_historical_brave_evidence_reconciliation.py"))
release_match = re.search(r"release-v77-patch:\s*\n\tpowershell .* v77\.0\.(\d+)", makefile)
release_patch = int(release_match.group(1)) if release_match else -1
ok("Makefile exposes V77.0.3 verifier and a V77 patch release >= 3", "verify-v77-brave-evidence-reconciliation:" in makefile and release_patch >= 3)

passed=sum(1 for _,value in checks if value)
total=len(checks)
print(f"\nV77.0.3 historical Brave evidence reconciliation verification: {passed}/{total} checks passed")
sys.exit(0 if passed==total else 1)
