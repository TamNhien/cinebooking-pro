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


page = text("frontend/app/admin/inventory/page.tsx")
e2e = text("frontend/e2e/v78-language-accessibility-pwa.spec.ts")
sw = text("frontend/public/sw.js")
readme = text("README.md")
release = text("scripts/release.ps1")
ci = text(".github/workflows/ci.yml")
make = text("Makefile")
diag = text("tools/diagnose-v78.ps1")

ok("const { language, t } = usePresentationLanguage();" in page,
   "Admin Inventory owns the targeted runtime presentation labels directly")
ok('t("Chi nhánh đang quản lý", "Managed branch")' in page,
   "Managed-branch wrapper keeps explicit VI/EN ownership")
ok('data-testid="inventory-alert-threshold-label-v7806"' in page and 't("Ngưỡng cảnh báo", "Alert threshold")' in page,
   "Inventory alert-threshold label has explicit EN ownership")
ok('data-testid="inventory-target-stock-label-v7806"' in page and 't("Tồn mục tiêu", "Target stock")' in page,
   "Inventory target-stock label has explicit EN ownership")
ok(re.search(r'branches\.map\(b=><option[^>]*data-i18n-skip="true"[^>]*>\{b\.cinemaName\}', page) is not None,
   "Managed-branch cinema option uses a narrow business-data boundary")
ok(re.search(r'branches\.filter\(b=>b\.cinemaId!==cinemaId\)\.map\(b=><option[^>]*data-i18n-skip="true"[^>]*>\{b\.cinemaName\}', page) is not None,
   "Transfer cinema option uses a narrow business-data boundary")
ok('data-i18n-skip="true">{p.name} · {language === "en" ? "available" : "còn"}' in page,
   "Product-name option keeps its existing exact business-data boundary")
ok('data-testid="inventory-v48"' in page and not re.search(r'data-testid="inventory-v48"[^>]*data-i18n-skip="true"', page),
   "Inventory root remains inside the fail-closed presentation sweep")
ok('route === "/admin/inventory"' in e2e and 'inventory-alert-threshold-label-v7806' in e2e and 'toHaveText("Alert threshold")' in e2e,
   "V78 browser journey explicitly proves the EN alert-threshold label")
ok('inventory-target-stock-label-v7806' in e2e and 'toHaveText("Target stock")' in e2e,
   "V78 browser journey explicitly proves the EN target-stock label")
ok('inventory-cinema-select' in e2e and 'toHaveAttribute("data-i18n-skip", "true")' in e2e,
   "V78 browser journey proves the cinema option business-data boundary")
ok(any(x in sw for x in ['const VERSION = "v78-0-6";', 'const VERSION = "v78-0-7";','const VERSION = "v78-0-8";','const VERSION = "v78-0-9";','const VERSION = "v78-0-10";','const VERSION = "v78-0-11";','const VERSION = "v78-0-12";','const VERSION = "v78-0-13";','const VERSION = "v78-0-14";','const VERSION = "v78-0-15";','const VERSION = "v78-0-16";','const VERSION = "v78-0-17";','const VERSION = "v78-0-18";']),
   "Service Worker generation is V78.0.6 or a forward-compatible V78 patch")

migrations = list((ROOT / "backend/src/main/resources/db/migration").glob("V*.sql"))
latest = max(int(re.match(r"V(\d+)", x.name).group(1)) for x in migrations if re.match(r"V(\d+)", x.name))
ok(latest == 72 and not list((ROOT / "backend/src/main/resources/db/migration").glob("V78*.sql")),
   "V78.0.6 remains no-schema on Flyway V72")
name = "verify_v78_0_6_inventory_presentation_language_business_boundaries.py"
ok(name in release and name in ci and name in diag,
   "Release, CI and V78 diagnostics execute V78.0.6 verifier")
ok("verify-v78-0-6" in make and "release-v78-0-6" in make,
   "Makefile exposes V78.0.6 verify/release lifecycle")
ok(any(x in readme for x in ["Current release:** V78.0.6", "Current release:** V78.0.7", "Current release:** V78.0.8", "Current release:** V78.0.9", "Current release:** V78.0.10","Current release:** V78.0.11", "Current release:** V78.0.12", "Current release:** V78.0.13", "Current release:** V78.0.14", "Current release:** V78.0.15","Current release:** V78.0.16", "Current release:** V78.0.17", "Current release:** V78.0.18"]) and "V78.0.6" in readme and "Inventory Presentation-Language / Business-Data Boundaries" in readme,
   "README records V78.0.6 inventory runtime-boundary fix")
ok([p.name for p in ROOT.glob("*.md")] == ["README.md"],
   "Source keeps one consolidated root README.md")

prev5 = subprocess.run([sys.executable, "-X", "utf8", str(ROOT / "tools/verify_v78_0_5_admin_audit_presentation_language_ownership.py")], cwd=ROOT, text=True, encoding="utf-8", errors="replace", capture_output=True)
ok(prev5.returncode == 0 and "17/17 checks passed" in prev5.stdout,
   "V78.0.5 and the earlier V78 lineage remain forward-compatible with V78.0.6")

passed = sum(checks)
print(f"\nV78.0.6 Inventory presentation-language/business-data boundary verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed == len(checks) else 1)
