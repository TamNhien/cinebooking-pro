from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
checks = []


def text(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def has(path: str, *needles: str) -> bool:
    p = ROOT / path
    return p.exists() and all(n in p.read_text(encoding="utf-8") for n in needles)


def ok(label: str, condition: bool) -> None:
    checks.append((label, bool(condition)))
    print(f"[ {'OK' if condition else 'FAIL'} ] {label}")


detector = text("backend/src/main/java/com/cinebooking/auth/ClientDeviceDetector.java")
security = text("backend/src/main/java/com/cinebooking/security/SecurityProtectionService.java")
api = text("frontend/lib/api.ts")
pwa = text("frontend/lib/pwa.ts")
nginx_http = text("infra/nginx/nginx.conf")
nginx_https = text("infra/nginx/nginx.https.conf")
unit = text("backend/src/test/java/com/cinebooking/auth/ClientDeviceDetectorTest.java")
readme = text("README.md")

ok("Browser detector declares Sec-CH-UA client hint header", 'CLIENT_HINT_HEADER = "Sec-CH-UA"' in detector)
ok("Request detector consumes both custom browser hint and Sec-CH-UA", 'request.getHeader(BROWSER_HEADER), request.getHeader(CLIENT_HINT_HEADER)' in detector)
ok("Detector exposes three-signal deviceName overload", "deviceName(String userAgent, String browserHint, String clientHints)" in detector)
ok("Detector gives Brave-specific signal precedence over generic fallback", '"Brave".equals(hint) || hasClientHintBrand(clientHints, "Brave")' in detector)
ok("Detector parses quoted Sec-CH-UA brands", "hasClientHintBrand" in detector and "value.split(\",\")" in detector)
ok("Detector keeps normal Chromium UA fallback", 'u.contains("chrome/")' in detector)
ok("Detector supports current iOS Brave token fallback", 'u.endsWith(" brave")' in detector)
ok("Frontend still uses official navigator.brave.isBrave API", "nav.brave?.isBrave" in api and "await nav.brave.isBrave()" in api)
ok("Frontend falls back to navigator.userAgentData Brave brand", "nav.userAgentData?.brands" in api and 'item.brand.toLowerCase() === "brave"' in api)
ok("Frontend supports Brave token in iOS-style UA", "Brave(?:\\/\\d+)?" in api)
ok("PWA device label no longer assumes every Chromium UA is Chrome", "braveBrand" in pwa and "nav.brave?.isBrave" in pwa)
ok("Security current-client reconciliation consumes Sec-CH-UA", "ClientDeviceDetector.CLIENT_HINT_HEADER" in security and "browserHint,clientHints" in security)
ok("Security reconciliation still repairs current related alerts", "findByRelatedSessionId(currentSessionId)" in security and "alert.setDeviceName(deviceName)" in security)
ok("CORS recognizes browser identity client hint", has("backend/src/main/java/com/cinebooking/config/SecurityConfig.java", "X-CineBooking-Browser", "Sec-CH-UA"))
ok("HTTP nginx explicitly forwards custom browser hint", "proxy_set_header X-CineBooking-Browser $http_x_cinebooking_browser;" in nginx_http)
ok("HTTP nginx explicitly forwards Sec-CH-UA", "proxy_set_header Sec-CH-UA $http_sec_ch_ua;" in nginx_http)
ok("HTTPS nginx explicitly forwards custom browser hint", "proxy_set_header X-CineBooking-Browser $http_x_cinebooking_browser;" in nginx_https)
ok("HTTPS nginx explicitly forwards Sec-CH-UA", "proxy_set_header Sec-CH-UA $http_sec_ch_ua;" in nginx_https)
ok("Unit test covers Brave Sec-CH-UA overriding Chrome fallback hint", "braveSecChUaOverridesGenericChromeFallbackHint" in unit and 'deviceName(CHROMIUM_WINDOWS, "Chrome", secChUa)' in unit)
ok("Unit test keeps non-Brave Chromium behavior", "chromiumSecChUaWithoutBraveKeepsNormalUserAgentFallback" in unit)
ok("README documents V77 Brave Sec-CH-UA reliability fix", "V77.0.1" in readme and "Sec-CH-UA" in readme and "Brave browser identity reliability fix" in readme)
ok("Patch remains no-schema", not any((ROOT / "backend/src/main/resources/db/migration").glob("V77*brave*.sql")))
ok("Patch adds no synthetic seed file", not any(ROOT.glob("tools/*brave*seed*.sql")))
ok("CI runs V77 browser identity reliability verifier", has(".github/workflows/ci.yml", "verify_v77_brave_browser_identity_fix.py"))
ok("Stable release preflight runs browser identity verifier", has("scripts/release.ps1", "verify_v77_brave_browser_identity_fix.py"))
ok("V77 diagnose chains browser identity verifier", has("tools/diagnose-v77.ps1", "verify_v77_brave_browser_identity_fix.py"))
ok("Makefile exposes browser identity verifier and immutable V77.0.1 release", has("Makefile", "verify-v77-browser-identity:", "verify_v77_brave_browser_identity_fix.py", "release-v77-0-1:", "v77.0.1"))

passed = sum(1 for _, value in checks if value)
total = len(checks)
print(f"\nV77 Brave browser identity reliability verification: {passed}/{total} checks passed")
sys.exit(0 if passed == total else 1)
