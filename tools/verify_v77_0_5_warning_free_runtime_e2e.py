from pathlib import Path
import json
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


pom = text("backend/pom.xml")
it = text("backend/src/test/java/com/cinebooking/integration/CineBookingIntegrationIT.java")
e2e = text("frontend/e2e/security-account-protection.spec.ts")
pkg = json.loads(text("frontend/package.json"))
ci = text(".github/workflows/ci.yml")
release = text("scripts/release.ps1")
diagnose = text("tools/diagnose-v77.ps1")
makefile = text("Makefile")
readme = text("README.md")
v29 = text("tools/verify_v29_2_playwright_e2e.py")
v30 = text("tools/verify_v30_2_playwright_pin_policy.py")

backend_java = "\n".join(p.read_text(encoding="utf-8") for p in (ROOT / "backend/src").rglob("*.java"))

ok("Jackson 3 deprecated JsonNode.asText is absent from backend source/tests", ".asText(" not in backend_java and ".asText()" not in backend_java)
ok("Jackson 3 replacement JsonNode.asString is used", ".asString(" in backend_java or ".asString()" in backend_java)
ok("Maven compiler exposes warnings", "<showWarnings>true</showWarnings>" in pom)
ok("Maven compiler fails the build on Java warnings", "<failOnWarning>true</failOnWarning>" in pom)
ok("Maven compiler enables deprecation lint", "<arg>-Xlint:deprecation</arg>" in pom)
ok("Mockito core is an explicit test dependency", "<groupId>org.mockito</groupId>" in pom and "<artifactId>mockito-core</artifactId>" in pom)
ok("Maven dependency plugin resolves the Mockito agent path", "<artifactId>maven-dependency-plugin</artifactId>" in pom and "<goal>properties</goal>" in pom)
ok("Surefire uses explicit Mockito javaagent", re.search(r"maven-surefire-plugin.*?-javaagent:\$\{org\.mockito:mockito-core:jar\}", pom, re.S) is not None)
ok("Failsafe uses explicit Mockito javaagent", re.search(r"maven-failsafe-plugin.*?-javaagent:\$\{org\.mockito:mockito-core:jar\}", pom, re.S) is not None)
ok("Test JVM disables CDS when instrumentation is active", pom.count("-Xshare:off") >= 2)
ok("Integration test stops Lettuce before Testcontainers teardown", "@AfterAll" in it and "stopRedisClientBeforeTestcontainersTeardown" in it and "redisConnectionFactory.stop()" in it)
ok("Integration test suppresses only immutable historical Flyway executor noise", "logging.level.org.flywaydb.core.internal.sqlscript.DefaultSqlScriptExecutor=ERROR" in it)
ok("Historical Flyway V15 migration remains present and immutable by this patch", (ROOT / "backend/src/main/resources/db/migration/V15__pending_booking_lifecycle.sql").exists())
ok("Security E2E blocks service workers only for the server-backed auth journey", 'test.use({ serviceWorkers: "block" });' in e2e)
ok("Security E2E requires a real HTTP login document", "loginDocument" in e2e and "login navigation must be HTTP 200" in e2e)
ok("Security E2E still uses stable login-submit selector", 'getByTestId("login-submit")' in e2e)
ok("Playwright is exact-pinned to warning-free 1.63 patch line", re.fullmatch(r"1\.63\.\d+", str(pkg.get("devDependencies", {}).get("@playwright/test", ""))) is not None)
ok("Historical V29.2 verifier accepts validated Playwright 1.63 line", r'1\.63\.\d+' in v29)
ok("V30.2 pin policy accepts validated Playwright 1.63 line", r'1\.63\.\d+' in v30 and "validated 1.63 patch line" in v30)
current_match = re.search(r"Current release:\*\* V77\.0\.(\d+)", readme)
current_patch = int(current_match.group(1)) if current_match else -1
ok("README current release is V77.0.5 or later", current_patch >= 5)
ok("README documents Java warning cleanup", "Jackson 3" in readme and "Mockito" in readme and "-javaagent" in readme)
ok("README documents Playwright DEP0205 cleanup", "DEP0205" in readme and "Playwright 1.63" in readme)
ok("README documents service-worker E2E isolation", "service worker" in readme.lower() and "offline fallback" in readme.lower())
ok("V77.0.5 remains no-schema", "V77.0.5" in readme and "no-schema" in readme.lower())
ok("CI runs V77.0.5 verifier", "verify_v77_0_5_warning_free_runtime_e2e.py" in ci)
ok("Release preflight runs V77.0.5 verifier", "verify_v77_0_5_warning_free_runtime_e2e.py" in release)
ok("Diagnose V77 chains V77.0.5 verifier", "verify_v77_0_5_warning_free_runtime_e2e.py" in diagnose)
ok("Makefile exposes V77.0.5 verifier", "verify-v77-warning-free-runtime:" in makefile)
patch_target = re.search(r"release-v77-patch:\s*\n\s*powershell .*? v77\.0\.(\d+)", makefile, re.S)
ok("Makefile latest V77 patch target is v77.0.5 or later", bool(patch_target and int(patch_target.group(1)) >= 5))
ok("V77.0.4 immutable release target remains available", "release-v77-0-4:" in makefile and "v77.0.4" in makefile)

failed = [name for name, passed in checks if not passed]
print(f"\nV77.0.5 warning-free runtime/E2E verification: {len(checks)-len(failed)}/{len(checks)} checks passed")
if failed:
    print("Failed checks:")
    for name in failed:
        print(" -", name)
    sys.exit(1)
