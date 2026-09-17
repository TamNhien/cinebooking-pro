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

page = text("frontend/app/admin/command-center/page.tsx")
e2e = text("frontend/e2e/v78-language-accessibility-pwa.spec.ts")
sw = text("frontend/public/sw.js")
readme = text("README.md")
release = text("scripts/release.ps1")
ci = text(".github/workflows/ci.yml")
make = text("Makefile")
diag = text("tools/diagnose-v78.ps1")
v78page = text("frontend/app/admin/ux-accessibility-pwa/page.tsx")

ok('data-testid="command-center-cinema-filter"' in page,
   "Command Center keeps the cinema scope selector")
ok('data-testid="command-center-cinema-option-v7809" data-i18n-skip="true">{c.cinemaName}</option>' in page,
   "Command Center cinema option uses an exact business-data boundary")
ok('{c.cinemaName}' in page,
   "Cinema names remain source-owned instead of machine-translated")
ok(not re.search(r'data-testid="operations-command-center-v53"[^>]*data-i18n-skip="true"', page),
   "Command Center root remains inside the fail-closed presentation sweep")
ok(not re.search(r'<label[^>]*data-i18n-skip="true"[^>]*>Phạm vi', page),
   "Scope label is not globally exempted")
ok('route === "/admin/command-center"' in e2e and 'command-center-cinema-option-v7809' in e2e,
   "Focused V78 journey explicitly proves the Command Center cinema boundary")
ok('clone.querySelectorAll(\'[data-i18n-skip="true"]\')' in e2e and 'closest(\'[data-i18n-skip="true"]\')' in e2e,
   "Browser leak scan still removes only explicit narrow business-data boundaries")
ok(any(x in sw for x in ['const VERSION = "v78-0-9";','const VERSION = "v78-0-10";','const VERSION = "v78-0-11";','const VERSION = "v78-0-12";','const VERSION = "v78-0-13";','const VERSION = "v78-0-14";','const VERSION = "v78-0-15";','const VERSION = "v78-0-16";','const VERSION = "v78-0-17";','const VERSION = "v78-0-18";']),
   "Service Worker generation is V78.0.9 or forward-compatible V78.0.10")
ok(any(x in v78page for x in ['>V78.0.9</span>','>V78.0.10</span>','>V78.0.11</span>','>V78.0.12</span>','>V78.0.13</span>','>V78.0.14</span>','>V78.0.15</span>','>V78.0.16</span>','>V78.0.17</span>','>V78.0.18</span>']),
   "Visible V78 Admin surface reports V78.0.9 or a forward patch generation")

migrations = list((ROOT / "backend/src/main/resources/db/migration").glob("V*.sql"))
latest = max(int(re.match(r"V(\d+)", x.name).group(1)) for x in migrations if re.match(r"V(\d+)", x.name))
ok(latest == 72 and not list((ROOT / "backend/src/main/resources/db/migration").glob("V78*.sql")),
   "V78.0.9 remains no-schema on Flyway V72")
name = "verify_v78_0_9_command_center_cinema_business_data_boundaries.py"
ok(name in release and name in ci and name in diag,
   "Release, CI and V78 diagnostics execute V78.0.9 verifier")
ok("verify-v78-0-9" in make and "release-v78-0-9" in make,
   "Makefile exposes V78.0.9 verify/release lifecycle")
ok(any(x in readme for x in ['Current release:** V78.0.9','Current release:** V78.0.10','Current release:** V78.0.11','Current release:** V78.0.12','Current release:** V78.0.13','Current release:** V78.0.14','Current release:** V78.0.15','Current release:** V78.0.16','Current release:** V78.0.17','Current release:** V78.0.18']) and any(x in readme for x in ['`v78.0.9`','`v78.0.10`','`v78.0.11`','`v78.0.12`','`v78.0.13`','`v78.0.14`','`v78.0.15`']) and 'Command Center Cinema Business-Data Boundaries' in readme,
   "README preserves V78.0.9 Command Center cinema boundary fix under forward release metadata")
ok([p.name for p in ROOT.glob("*.md")] == ["README.md"],
   "Source keeps one consolidated root README.md")

prev = subprocess.run([sys.executable, "-X", "utf8", str(ROOT / "tools/verify_v78_0_8_favorites_movie_business_data_boundaries.py")], cwd=ROOT, text=True, encoding="utf-8", errors="replace", capture_output=True)
ok(prev.returncode == 0 and "17/17 checks passed" in prev.stdout,
   "V78.0.8 and earlier V78 lineage remain forward-compatible with V78.0.9")
ok("Base V78 UX/Accessibility/PWA verifier remains green" in prev.stdout,
   "V78.0.8 chain confirms the base V78 verifier remains green")

passed = sum(checks)
print(f"\nV78.0.9 Command Center cinema business-data boundary verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed == len(checks) else 1)
