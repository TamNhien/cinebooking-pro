from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
checks = []

def check(name, ok):
    checks.append((name, bool(ok)))
    print(("PASS" if ok else "FAIL") + f": {name}")

pom_path = ROOT / "backend/pom.xml"
it_path = ROOT / "backend/src/test/java/com/cinebooking/integration/CineBookingIntegrationIT.java"
static_manifest = ROOT / "frontend/public/manifest.webmanifest"
dynamic_manifest = ROOT / "frontend/app/manifest.ts"
workflow_path = ROOT / ".github/workflows/ci.yml"

pom = pom_path.read_text(encoding="utf-8") if pom_path.is_file() else ""
it = it_path.read_text(encoding="utf-8") if it_path.is_file() else ""
workflow = workflow_path.read_text(encoding="utf-8") if workflow_path.is_file() else ""

check("backend pom exists", pom_path.is_file())
try:
    ET.parse(pom_path)
    pom_xml_ok = True
except Exception:
    pom_xml_ok = False
check("backend pom remains well-formed XML", pom_xml_ok)
check("Spring Boot Web MVC test starter is configured", "spring-boot-starter-webmvc-test" in pom)
check("integration test uses Boot 4 AutoConfigureMockMvc package",
      "org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc" in it)
check("static PWA manifest remains present", static_manifest.is_file())
check("stale dynamic manifest route is absent", not dynamic_manifest.exists())
check("CI still runs Maven unit tests", "mvn -B -ntp test" in workflow)
check("CI still runs V26.2 manifest regression", "verify_v26_2_manifest.py" in workflow)

failed = [name for name, ok in checks if not ok]
print(f"\n{len(checks)-len(failed)}/{len(checks)} checks passed")
if failed:
    print("Failed checks:")
    for name in failed:
        print(" - " + name)
    raise SystemExit(1)
