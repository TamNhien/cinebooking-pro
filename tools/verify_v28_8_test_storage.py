from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
test_file = ROOT / "backend" / "src" / "test" / "java" / "com" / "cinebooking" / "integration" / "CineBookingIntegrationIT.java"
app_yml = ROOT / "backend" / "src" / "main" / "resources" / "application.yml"
workflow_file = ROOT / ".github" / "workflows" / "ci.yml"

integration = test_file.read_text(encoding="utf-8")
application = app_yml.read_text(encoding="utf-8")
workflow = workflow_file.read_text(encoding="utf-8")

checks = []
def check(label, ok):
    checks.append((label, bool(ok)))
    print(("PASS" if ok else "FAIL") + ": " + label)

check("integration test overrides upload directory", '"app.upload.dir=target/it-uploads"' in integration)
check("integration test does not target /app uploads", '"app.upload.dir=/app/uploads"' not in integration)
check("production upload default remains /app/uploads", "dir: ${UPLOAD_DIR:/app/uploads}" in application)
check("integration profile still uses Testcontainers", "@Testcontainers" in integration)
check("PostgreSQL Testcontainer remains enabled", 'new PostgreSQLContainer("postgres:18.4-alpine")' in integration)
check("Redis Testcontainer remains enabled", 'DockerImageName.parse("redis:8.8-alpine")' in integration)
check("integration Maven gate remains required", "mvn -B -ntp verify -Pci-integration" in workflow)
check("CI runs V28.8 storage verifier", "python3 tools/verify_v28_8_test_storage.py" in workflow)

passed = sum(ok for _, ok in checks)
print(f"\n{passed}/{len(checks)} checks passed")
if passed != len(checks):
    sys.exit(1)
