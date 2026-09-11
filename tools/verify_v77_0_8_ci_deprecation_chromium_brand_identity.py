from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
checks = []

def text(rel: str) -> str:
    p = ROOT / rel
    return p.read_text(encoding="utf-8") if p.exists() else ""

def ok(name: str, condition: bool):
    condition = bool(condition)
    checks.append((name, condition))
    print(("[ OK ]" if condition else "[FAIL]") + " " + name)

seat = text("backend/src/main/java/com/cinebooking/seat/SeatHoldService.java")
handler = text("backend/src/main/java/com/cinebooking/common/GlobalExceptionHandler.java")
poster = text("backend/src/main/java/com/cinebooking/movie/PosterStorageService.java")
detector = text("backend/src/main/java/com/cinebooking/auth/ClientDeviceDetector.java")
detector_test = text("backend/src/test/java/com/cinebooking/auth/ClientDeviceDetectorTest.java")
api = text("frontend/lib/api.ts")
pwa = text("frontend/lib/pwa.ts")
security = text("backend/src/main/java/com/cinebooking/security/SecurityProtectionService.java")
v773 = text("tools/verify_v77_0_3_historical_brave_evidence_reconciliation.py")
v777 = text("tools/verify_v77_0_7_security_e2e_strict_locator_reliability.py")
ci = text(".github/workflows/ci.yml")
release = text("scripts/release.ps1")
diagnose = text("tools/diagnose-v77.ps1")
makefile = text("Makefile")
readme = text("README.md")

ok("Deprecated Redis TimeUnit TTL overload is absent from SeatHoldService", "TimeUnit.MILLISECONDS" not in seat)
ok("SeatHoldService uses Duration TTL overload", "Duration.ofMillis(ms)" in seat)
ok("SeatHoldService no longer imports TimeUnit", "java.util.concurrent.TimeUnit" not in seat)
ok("Deprecated HttpStatus.PAYLOAD_TOO_LARGE is absent from backend main source targets", "PAYLOAD_TOO_LARGE" not in handler and "PAYLOAD_TOO_LARGE" not in poster)
ok("Global exception handler uses HttpStatus.CONTENT_TOO_LARGE", "HttpStatus.CONTENT_TOO_LARGE" in handler)
ok("Poster storage uses HttpStatus.CONTENT_TOO_LARGE", "HttpStatus.CONTENT_TOO_LARGE" in poster)
ok("HTTP 413 user-facing message remains unchanged", "Poster tối đa 5 MB." in handler and "Poster tối đa 5 MB." in poster)

ok("Backend recognizes Microsoft Edge Sec-CH-UA brand", 'hasClientHintBrand(clientHints, "Microsoft Edge")' in detector)
ok("Backend recognizes Edge Sec-CH-UA alias", 'hasClientHintBrand(clientHints, "Edge")' in detector)
edge_pos = detector.find('hasClientHintBrand(clientHints, "Microsoft Edge")')
hint_fallback_pos = detector.find('if (hint != null) return hint;')
ok("Edge-specific client hint precedes generic browser fallback", edge_pos >= 0 and hint_fallback_pos >= 0 and edge_pos < hint_fallback_pos)
ok("Brave-specific precedence remains before Edge", detector.find('hasClientHintBrand(clientHints, "Brave")') < edge_pos)
ok("Backend unit test covers Edge brand overriding generic Chrome hint", "edgeSecChUaOverridesGenericChromeFallbackHint" in detector_test and '"Chrome", secChUa' in detector_test and '"Edge · Windows"' in detector_test)
ok("Existing normal Edge User-Agent fallback test remains", "edgeWinsBeforeChromeInChromiumUserAgent" in detector_test)

ok("Frontend API checks navigator.userAgentData Edge brand", 'brand === "microsoft edge" || brand === "edge"' in api)
api_edge_pos = api.find('brand === "microsoft edge" || brand === "edge"')
api_ua_pos = api.find('const ua = navigator.userAgent || "";')
ok("Frontend Edge brand check runs before generic User-Agent fallback", api_edge_pos >= 0 and api_ua_pos >= 0 and api_edge_pos < api_ua_pos)
ok("Frontend Brave detection still precedes Edge", api.find('item.brand.toLowerCase() === "brave"') < api_edge_pos)
ok("PWA device label recognizes Edge userAgentData brand", 'const edgeBrand=' in pwa and 'brand==="microsoft edge"||brand==="edge"' in pwa)
ok("PWA Brave label keeps precedence over Edge", pwa.find('const braveBrand=') < pwa.find('const edgeBrand='))

ok("Historical Brave reconciliation still requires later evidence", '!evidenceTime.isBefore(candidateTime)' in security)
ok("Historical Brave evidence forward window remains 24 hours", '!evidenceTime.isAfter(candidateTime.plus(24,ChronoUnit.HOURS))' in security)
ok("V77.0.3 verifier still protects reverse-time evidence", "prevents reverse-time evidence rewrite" in v773.lower())
ok("No symmetric Brave time-window rewrite was introduced", "Duration.between(candidateTime,evidenceTime).abs" not in security and "candidateTime.minus(24" not in security)

m = re.search(r"Current release:\*\* V77\.0\.(\d+)", readme)
current_patch = int(m.group(1)) if m else -1
ok("README current release is V77.0.8 or later", current_patch >= 8)
ok("README documents Java 25 deprecation cleanup", "V77.0.8 addresses the exact GitHub Actions failure" in readme and "HttpStatus.CONTENT_TOO_LARGE" in readme)
ok("README documents Microsoft Edge Chromium-brand identity fix", "Microsoft Edge" in readme and "Chrome-like User-Agent" in readme)
ok("README documents Brave chronology remains intact", "Brave historical reconciliation is intentionally **not** widened" in readme)
ok("V77.0.8 remains no-schema", "V77.0.8 remains a **no-schema patch**" in readme and "Flyway stays at V72 / 67 public tables" in readme)
ok("README V77 patch history is ascending through V77.0.8", readme.find("### V77.0.6") < readme.find("### V77.0.7") < readme.find("### V77.0.8"))

ok("V77.0.7 verifier is forward-compatible with V77.0.8", "V77.0.7 or later" in v777 and ">= 7" in v777)
ok("CI runs V77.0.8 verifier", "verify_v77_0_8_ci_deprecation_chromium_brand_identity.py" in ci)
ok("Release preflight runs V77.0.8 verifier", "verify_v77_0_8_ci_deprecation_chromium_brand_identity.py" in release)
ok("Diagnose V77 chains V77.0.8 verifier", "verify_v77_0_8_ci_deprecation_chromium_brand_identity.py" in diagnose)
ok("Makefile exposes V77.0.8 verifier", "verify-v77-ci-deprecation-browser-identity:" in makefile)
ok("Makefile preserves explicit V77.0.7 release target", "release-v77-0-7:" in makefile and "v77.0.7" in makefile)
patch_block = makefile.split("release-v77-patch:", 1)[1].split("\n\n", 1)[0] if "release-v77-patch:" in makefile else ""
patch_match = re.search(r"v77\.0\.(\d+)", patch_block)
patch_version = int(patch_match.group(1)) if patch_match else -1
ok("Makefile latest V77 patch target is v77.0.8 or later", patch_version >= 8)

failed = [name for name, passed in checks if not passed]
print(f"\nV77.0.8 CI deprecation / Chromium brand identity verification: {len(checks)-len(failed)}/{len(checks)} checks passed")
if failed:
    print("Failed checks:")
    for name in failed:
        print(" -", name)
    sys.exit(1)
