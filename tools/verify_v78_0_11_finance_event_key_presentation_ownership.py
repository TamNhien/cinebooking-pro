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

finance = text("frontend/app/admin/finance/page.tsx")
e2e = text("frontend/e2e/v78-language-accessibility-pwa.spec.ts")
sw = text("frontend/public/sw.js")
readme = text("README.md")
release = text("scripts/release.ps1")
ci = text(".github/workflows/ci.yml")
make = text("Makefile")
diag = text("tools/diagnose-v78.ps1")
v78page = text("frontend/app/admin/ux-accessibility-pwa/page.tsx")

ok('usePresentationLanguage' in finance and 'const { t } = usePresentationLanguage();' in finance,
   "Admin Finance owns the ambiguous event-key header directly")
ok('data-testid="finance-event-key-header-v7811"' in finance and '{t("Khóa","Event key")}' in finance,
   "Finance ledger Khóa header has explicit EN Event key ownership")
ok('data-testid="finance-event-key-value-v7811" data-i18n-skip="true"' in finance and '{e.eventKey}' in finance,
   "Finance eventKey values use an exact source-data boundary")
ok(not re.search(r'<(?:div|section|table)[^>]*data-i18n-skip="true"[^>]*>.*finance', finance, re.S | re.I),
   "Finance page/table is not globally exempted from the language sweep")
ok('route === "/admin/finance"' in e2e and 'finance-event-key-header-v7811' in e2e and 'toHaveText("Event key")' in e2e,
   "Focused V78 journey explicitly proves Finance Event key EN ownership")
ok('finance-event-key-value-v7811' in e2e and 'toHaveAttribute("data-i18n-skip", "true")' in e2e,
   "Focused V78 journey proves the event-key value boundary when rows exist")
ok('clone.querySelectorAll(\'[data-i18n-skip="true"]\')' in e2e and 'closest(\'[data-i18n-skip="true"]\')' in e2e,
   "Browser leak scan still removes only explicit narrow source-data boundaries")
ok(any(x in sw for x in ['const VERSION = "v78-0-11";','const VERSION = "v78-0-12";','const VERSION = "v78-0-13";','const VERSION = "v78-0-14";','const VERSION = "v78-0-15";','const VERSION = "v78-0-16";','const VERSION = "v78-0-17";','const VERSION = "v78-0-18";']),
   "Service Worker generation is V78.0.11 or forward-compatible V78.0.12")
ok(any(x in v78page for x in ['>V78.0.11</span>','>V78.0.12</span>','>V78.0.13</span>','>V78.0.14</span>','>V78.0.15</span>','>V78.0.16</span>','>V78.0.17</span>','>V78.0.18</span>']),
   "Visible V78 Admin surface reports V78.0.11 or a forward patch generation")

migrations = list((ROOT / "backend/src/main/resources/db/migration").glob("V*.sql"))
latest = max(int(re.match(r"V(\d+)", x.name).group(1)) for x in migrations if re.match(r"V(\d+)", x.name))
ok(latest == 72 and not list((ROOT / "backend/src/main/resources/db/migration").glob("V78*.sql")),
   "V78.0.11 remains no-schema on Flyway V72")
name = "verify_v78_0_11_finance_event_key_presentation_ownership.py"
ok(name in release and name in ci and name in diag,
   "Release, CI and V78 diagnostics execute V78.0.11 verifier")
ok("verify-v78-0-11" in make and "release-v78-0-11" in make,
   "Makefile exposes V78.0.11 verify/release lifecycle")
ok(any(x in readme for x in ['Current release:** V78.0.11','Current release:** V78.0.12','Current release:** V78.0.13','Current release:** V78.0.14','Current release:** V78.0.15','Current release:** V78.0.16','Current release:** V78.0.17','Current release:** V78.0.18']) and any(x in readme for x in ['`v78.0.11`','`v78.0.12`','`v78.0.13`','`v78.0.14`','`v78.0.15`']) and 'Finance Event-Key Presentation Ownership' in readme,
   "README preserves V78.0.11 Finance event-key presentation fix under forward release metadata")
ok([p.name for p in ROOT.glob("*.md")] == ["README.md"],
   "Source keeps one consolidated root README.md")

prev_source = text("tools/verify_v78_0_10_customer_intelligence_cinema_business_data_boundaries.py")
ok('v78-0-11' in prev_source and 'V78.0.11' in prev_source,
   "V78.0.10 verifier is forward-compatible with V78.0.11 metadata")
base = subprocess.run([sys.executable, "-X", "utf8", str(ROOT / "tools/verify_v78_ux_accessibility_pwa_5.py")], cwd=ROOT, text=True, encoding="utf-8", errors="replace", capture_output=True)
ok(base.returncode == 0 and "27/27 checks passed" in base.stdout,
   "Base V78 UX/Accessibility/PWA verifier remains green")

passed = sum(checks)
print(f"\nV78.0.11 Finance event-key presentation ownership verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed == len(checks) else 1)
