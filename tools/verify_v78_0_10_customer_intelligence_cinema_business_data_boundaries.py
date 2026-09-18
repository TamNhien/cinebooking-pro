from pathlib import Path
import re, subprocess, sys

ROOT = Path(__file__).resolve().parents[1]
checks = []

def text(rel):
    p = ROOT / rel
    return p.read_text(encoding="utf-8") if p.exists() else ""

def ok(cond, label):
    cond = bool(cond)
    checks.append(cond)
    print(f"[ {'OK' if cond else 'FAIL'} ] {label}")

customer = text("frontend/app/admin/customer-value/page.tsx")
retention = text("frontend/app/admin/retention/page.tsx")
performance = text("frontend/app/admin/performance/page.tsx")
e2e = text("frontend/e2e/v78-language-accessibility-pwa.spec.ts")
sw = text("frontend/public/sw.js")
readme = text("README.md")
release = text("scripts/release.ps1")
ci = text(".github/workflows/ci.yml")
make = text("Makefile")
diag = text("tools/diagnose-v78.ps1")
v78page = text("frontend/app/admin/ux-accessibility-pwa/page.tsx")

ok('data-testid="customer-value-cinema-filter-v56"' in customer,
   "Customer Value keeps the V56 cinema scope selector")
ok('data-testid="customer-value-cinema-option-v7810" data-i18n-skip="true">{c.cinemaName}</option>' in customer,
   "Customer Value cinema option uses an exact business-data boundary")
ok('data-testid="performance-cinema-option-v7810" data-i18n-skip="true">{c.cinemaName}</option>' in performance,
   "Performance cinema option uses the same exact business-data boundary")
ok('data-testid="retention-cinema-option-v7810" data-i18n-skip="true">{c.cinemaName}</option>' in retention,
   "Retention cinema option uses the same exact business-data boundary")
ok(all('{c.cinemaName}' in page for page in (customer, performance, retention)),
   "Cinema names remain source-owned instead of machine-translated")
ok(not re.search(r'data-testid="customer-value-intelligence-v56"[^>]*data-i18n-skip="true"', customer),
   "Customer Value root remains inside the fail-closed presentation sweep")
ok(not re.search(r'<label[^>]*data-i18n-skip="true"[^>]*>.*Scope', customer, re.S),
   "Customer Value Scope label is not globally exempted")
ok('route === "/admin/customer-value"' in e2e and 'customer-value-cinema-option-v7810' in e2e,
   "Focused V78 journey explicitly proves the Customer Value cinema boundary")
ok('route === "/admin/performance"' in e2e and 'performance-cinema-option-v7810' in e2e and
   'route === "/admin/retention"' in e2e and 'retention-cinema-option-v7810' in e2e,
   "Focused V78 journey proactively covers the remaining V54/V55 cinema selectors")
ok('clone.querySelectorAll(\'[data-i18n-skip="true"]\')' in e2e and 'closest(\'[data-i18n-skip="true"]\')' in e2e,
   "Browser leak scan still removes only explicit narrow business-data boundaries")
ok(any(x in sw for x in ['const VERSION = "v78-0-10";','const VERSION = "v78-0-11";','const VERSION = "v78-0-12";','const VERSION = "v78-0-13";','const VERSION = "v78-0-14";','const VERSION = "v78-0-15";','const VERSION = "v78-0-16";','const VERSION = "v78-0-17";','const VERSION = "v78-0-18";','const VERSION = "v78-0-19";']),
   "Service Worker generation is V78.0.10 or forward-compatible V78.0.11")
ok(any(x in v78page for x in ['>V78.0.10</span>','>V78.0.11</span>','>V78.0.12</span>','>V78.0.13</span>','>V78.0.14</span>','>V78.0.15</span>','>V78.0.16</span>','>V78.0.17</span>','>V78.0.18</span>','>V78.0.19</span>']),
   "Visible V78 Admin surface reports V78.0.10 or a forward patch generation")

migrations = list((ROOT / "backend/src/main/resources/db/migration").glob("V*.sql"))
latest = max(int(re.match(r"V(\d+)", x.name).group(1)) for x in migrations if re.match(r"V(\d+)", x.name))
ok(latest == 72 and not list((ROOT / "backend/src/main/resources/db/migration").glob("V78*.sql")),
   "V78.0.10 remains no-schema on Flyway V72")
name = "verify_v78_0_10_customer_intelligence_cinema_business_data_boundaries.py"
ok(name in release and name in ci and name in diag,
   "Release, CI and V78 diagnostics execute V78.0.10 verifier")
ok("verify-v78-0-10" in make and "release-v78-0-10" in make,
   "Makefile exposes V78.0.10 verify/release lifecycle")
ok(any(x in readme for x in ['Current release:** V78.0.10','Current release:** V78.0.11','Current release:** V78.0.12','Current release:** V78.0.13','Current release:** V78.0.14','Current release:** V78.0.15','Current release:** V78.0.16','Current release:** V78.0.17','Current release:** V78.0.18','Current release:** V78.0.19']) and any(x in readme for x in ['`v78.0.10`','`v78.0.11`','`v78.0.12`','`v78.0.13`','`v78.0.14`','`v78.0.15`']) and 'Customer Intelligence Cinema Business-Data Boundaries' in readme,
   "README records V78.0.10 customer-intelligence cinema boundary fix")
ok([p.name for p in ROOT.glob("*.md")] == ["README.md"],
   "Source keeps one consolidated root README.md")

prev_source = text("tools/verify_v78_0_9_command_center_cinema_business_data_boundaries.py")
ok('v78-0-10' in prev_source and 'V78.0.10' in prev_source,
   "V78.0.9 verifier is forward-compatible with V78.0.10 metadata")
base = subprocess.run([sys.executable, "-X", "utf8", str(ROOT / "tools/verify_v78_ux_accessibility_pwa_5.py")], cwd=ROOT, text=True, encoding="utf-8", errors="replace", capture_output=True)
ok(base.returncode == 0 and "27/27 checks passed" in base.stdout,
   "Base V78 UX/Accessibility/PWA verifier remains green")

passed = sum(checks)
print(f"\nV78.0.10 Customer intelligence cinema business-data boundary verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed == len(checks) else 1)
