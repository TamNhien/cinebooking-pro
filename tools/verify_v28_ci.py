from pathlib import Path
import subprocess
import sys
import re
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
checks = []


def check(name, ok):
    ok = bool(ok)
    checks.append((name, ok))
    print(("PASS" if ok else "FAIL") + f": {name}")


def git_tracked_paths(*pathspecs):
    """Return tracked paths matching pathspecs, or None when Git/repo is unavailable."""
    try:
        proc = subprocess.run(
            ["git", "-C", str(ROOT), "ls-files", "--", *pathspecs],
            capture_output=True,
            text=True,
            check=False,
        )
    except FileNotFoundError:
        return None
    if proc.returncode != 0:
        return None
    return [line.strip().replace("\\", "/") for line in proc.stdout.splitlines() if line.strip()]


workflow_path = ROOT / ".github/workflows/ci.yml"
dependabot_path = ROOT / ".github/dependabot.yml"
pom_path = ROOT / "backend/pom.xml"
it_path = ROOT / "backend/src/test/java/com/cinebooking/integration/CineBookingIntegrationIT.java"
gitignore_path = ROOT / ".gitignore"

workflow = workflow_path.read_text(encoding="utf-8") if workflow_path.exists() else ""
dependabot = dependabot_path.read_text(encoding="utf-8") if dependabot_path.exists() else ""
pom = pom_path.read_text(encoding="utf-8") if pom_path.exists() else ""
it = it_path.read_text(encoding="utf-8") if it_path.exists() else ""
gitignore = gitignore_path.read_text(encoding="utf-8") if gitignore_path.exists() else ""

check("CI workflow exists", workflow_path.exists())
check("Dependabot configuration exists", dependabot_path.exists())
check("CI runs on push", "push:" in workflow)
check("CI runs on pull requests", "pull_request:" in workflow)
check("CI supports manual dispatch", "workflow_dispatch:" in workflow)
check("CI uses least-privilege contents read", "contents: read" in workflow)
check("CI cancels superseded runs", "cancel-in-progress: true" in workflow)

check("Backend unit-test job exists", "backend-unit:" in workflow and "mvn -B -ntp test" in workflow)
check("Backend integration job exists", "backend-integration:" in workflow and "-Pci-integration" in workflow)
check("Frontend lint runs", "npm run lint" in workflow)
check("Frontend production build runs", "npm run build" in workflow)
check("Docker Compose config is validated", "docker compose config --quiet" in workflow)
check("Docker backend image is built", "context: ./backend" in workflow and "cinebooking/backend:ci" in workflow)
check("Docker frontend image is built", "context: ./frontend" in workflow and "cinebooking/frontend:ci" in workflow)
check("Unit reports are uploaded", "backend-unit-reports" in workflow)
check("Integration reports are uploaded", "backend-integration-reports" in workflow)
check("Backend JAR is uploaded", "cinebooking-backend-jar" in workflow)
check("Frontend standalone artifact is uploaded", "cinebooking-frontend-standalone" in workflow)

check(
    "Workflow uses supported actions/checkout@v6 or @v7",
    "actions/checkout@v6" in workflow or "actions/checkout@v7" in workflow,
)

for action in [
    "actions/setup-java@v5",
    "actions/setup-node@v6",
    "actions/upload-artifact@v7",
    "docker/setup-buildx-action@v4",
    "docker/build-push-action@v7",
]:
    check(f"Workflow uses {action}", action in workflow)

check("V26-V28 source-regression job exists", "source-regression:" in workflow)
check("V27.2 regression remains in CI", "verify_v27_2_restore_probe.py" in workflow)
check("V28 self-verifier runs in CI", "verify_v28_ci.py" in workflow)

check("Testcontainers BOM is configured", "testcontainers-bom" in pom and "2.0.5" in pom)
check("Testcontainers JUnit dependency is configured", "testcontainers-junit-jupiter" in pom)
check("PostgreSQL Testcontainers dependency is configured", "testcontainers-postgresql" in pom)
check("Spring Boot Testcontainers integration is configured", "spring-boot-testcontainers" in pom)
check("Failsafe integration-test plugin is configured", "maven-failsafe-plugin" in pom and "<goal>integration-test</goal>" in pom and "<goal>verify</goal>" in pom)
check("Integration tests are opt-in outside CI", "<skipITs>true</skipITs>" in pom)
check("CI integration profile enables ITs", "<id>ci-integration</id>" in pom and "<skipITs>false</skipITs>" in pom)
check("Surefire excludes IT classes from unit-test job", "maven-surefire-plugin" in pom and "**/*IT.java" in pom)

try:
    ET.parse(pom_path)
    pom_valid = True
except Exception:
    pom_valid = False
check("backend/pom.xml is well-formed XML", pom_valid)

check("Integration test exists", it_path.exists())
check("Integration test starts PostgreSQL 18.4", 'PostgreSQLContainer("postgres:18.4-alpine")' in it)
check("Integration test starts Redis 8.8", 'redis:8.8-alpine' in it)
check("Integration test uses Spring Boot service connections", "@ServiceConnection" in it)
check("Integration test validates current Flyway V29 or newer", "flyway_schema_history" in it and re.search(r'isEqualTo\("(?:29|[3-9][0-9])"\)', it) is not None)
check("Integration test validates Redis read/write", "redisTemplate.opsForValue().set" in it and "redisTemplate.opsForValue().get" in it)
check("Integration test covers register", '/api/auth/register' in it)
check("Integration test covers login", '/api/auth/login' in it)
check("Integration test covers JWT protected profile", '/api/me' in it and 'Authorization' in it and 'Bearer ' in it)
check("Integration JWT secret is test-only and >=32 chars", "v28-ci-test-secret-0123456789-ABCDEFGHIJKLMNOPQRSTUVWXYZ" in it)

check("Dependabot monitors Maven", "package-ecosystem: maven" in dependabot)
check("Dependabot monitors npm", "package-ecosystem: npm" in dependabot)
check("Dependabot monitors GitHub Actions", "package-ecosystem: github-actions" in dependabot)
check("Dependabot monitors Dockerfiles", dependabot.count("package-ecosystem: docker") >= 2)

check("CI does not use destructive docker compose down -v", "docker compose down -v" not in workflow)

# V28.1: local runtime secrets/backups are expected to exist. The security property is
# that they are excluded from source control, not that the developer machine is empty.
ignore_lines = {line.strip() for line in gitignore.splitlines() if line.strip() and not line.lstrip().startswith("#")}
tracked_sensitive = git_tracked_paths(".env", "backups/*.dump")
if tracked_sensitive is None:
    env_safe = ".env" in ignore_lines
    dump_safe = "backups/*" in ignore_lines or "backups/*.dump" in ignore_lines or "*.dump" in ignore_lines
    print("INFO: Git repository metadata unavailable; validating .gitignore rules instead")
else:
    env_safe = ".env" not in tracked_sensitive
    dump_safe = not any(path.startswith("backups/") and path.endswith(".dump") for path in tracked_sensitive)
    if tracked_sensitive:
        print("INFO: tracked sensitive candidates: " + ", ".join(tracked_sensitive))

check("No real .env is tracked by Git", env_safe)
check("No database dump is tracked by Git", dump_safe)

if (ROOT / ".env").exists():
    print("INFO: local .env exists (allowed; must remain untracked)")
local_dumps = list((ROOT / "backups").glob("*.dump")) if (ROOT / "backups").exists() else []
if local_dumps:
    print(f"INFO: {len(local_dumps)} local database dump(s) exist under backups/ (allowed; must remain untracked)")

failed = [name for name, ok in checks if not ok]
print(f"\n{len(checks) - len(failed)}/{len(checks)} checks passed")
if failed:
    print("Failed checks:")
    for name in failed:
        print(" -", name)
    sys.exit(1)
