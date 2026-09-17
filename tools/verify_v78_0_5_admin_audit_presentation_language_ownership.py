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


page = text("frontend/app/admin/audit/page.tsx")
e2e = text("frontend/e2e/v78-language-accessibility-pwa.spec.ts")
sw = text("frontend/public/sw.js")
readme = text("README.md")
release = text("scripts/release.ps1")
ci = text(".github/workflows/ci.yml")
make = text("Makefile")
diag = text("tools/diagnose-v78.ps1")

ok("usePresentationLanguage" in page and "const { t } = usePresentationLanguage();" in page,
   "Admin Audit owns presentation language directly")
ok('t("BẢO MẬT & KIỂM TOÁN", "SECURITY & AUDIT")' in page,
   "Admin Audit section kicker has explicit EN ownership")
ok('t("Đối tượng", "Entity")' in page and 'data-testid="admin-audit-entity-header-v7805"' in page,
   "Admin Audit entity column header has explicit EN ownership")
ok(all(x in page for x in [
    't("Nhật ký hệ thống", "System audit log")',
    '"Track sign-ins, ticket checks, and important operational actions."',
    't("← Quản trị", "← Admin")',
    't("Tìm email, hành động, đối tượng...", "Search email, action, entity...")',
    't("Thời gian", "Time")',
    't("Người thực hiện", "Actor")',
    't("Thao tác", "Action")',
    't("Chi tiết", "Details")',
]), "Admin Audit remaining static presentation copy uses direct VI/EN pairs")
ok('data-testid="admin-audit-v7805"' in page and not re.search(r'data-testid="admin-audit-v7805"[^>]*data-i18n-skip="true"', page),
   "Admin Audit root remains inside fail-closed presentation sweep")
ok(page.count('data-i18n-skip="true"') >= 5 and all(x in page for x in [
    'x.actorEmail || "system"', 'x.action', 'x.entityType || "—"', 'x.details || "—"', 'x.ipAddress || "—"'
]), "Raw audit actor/action/entity/details/IP remain exact source-owned data boundaries")
ok('dateTime(x.createdAt)' in page,
   "Audit timestamp continues to use the shared presentation-locale formatter")
ok('"/admin/audit"' in e2e and 'presentationLeaks' in e2e,
   "V78 browser sweep still covers Admin Audit fail-closed")
ok('admin-audit-kicker-v7805' in e2e and 'toHaveText("SECURITY & AUDIT")' in e2e,
   "V78 browser journey explicitly proves Admin Audit EN section ownership")
ok('admin-audit-entity-header-v7805' in e2e and 'toHaveText("Entity")' in e2e,
   "V78 browser journey explicitly proves Admin Audit EN entity header")
ok(any(x in sw for x in ['const VERSION = "v78-0-5";', 'const VERSION = "v78-0-6";','const VERSION = "v78-0-7";','const VERSION = "v78-0-8";','const VERSION = "v78-0-9";','const VERSION = "v78-0-10";','const VERSION = "v78-0-11";','const VERSION = "v78-0-12";','const VERSION = "v78-0-13";','const VERSION = "v78-0-14";','const VERSION = "v78-0-15";','const VERSION = "v78-0-16";','const VERSION = "v78-0-17";','const VERSION = "v78-0-18";']),
   "Service Worker generation is V78.0.5 or a forward-compatible V78 patch")

migrations = list((ROOT / "backend/src/main/resources/db/migration").glob("V*.sql"))
latest = max(int(re.match(r"V(\d+)", x.name).group(1)) for x in migrations if re.match(r"V(\d+)", x.name))
ok(latest == 72 and not list((ROOT / "backend/src/main/resources/db/migration").glob("V78*.sql")),
   "V78.0.5 remains no-schema on Flyway V72")
name = "verify_v78_0_5_admin_audit_presentation_language_ownership.py"
ok(name in release and name in ci and name in diag,
   "Release, CI and V78 diagnostics execute V78.0.5 verifier")
ok("verify-v78-0-5" in make and "release-v78-0-5" in make,
   "Makefile exposes V78.0.5 verify/release lifecycle")
ok(any(x in readme for x in ["Current release:** V78.0.5", "Current release:** V78.0.6", "Current release:** V78.0.7", "Current release:** V78.0.8", "Current release:** V78.0.9", "Current release:** V78.0.10","Current release:** V78.0.11", "Current release:** V78.0.12", "Current release:** V78.0.13", "Current release:** V78.0.14", "Current release:** V78.0.15","Current release:** V78.0.16", "Current release:** V78.0.17", "Current release:** V78.0.18"]) and "V78.0.5" in readme and "Admin Audit Presentation-Language Ownership" in readme,
   "README preserves V78.0.5 Admin Audit fix under forward release metadata")
ok([p.name for p in ROOT.glob("*.md")] == ["README.md"],
   "Source keeps one consolidated root README.md")

prev4 = subprocess.run([sys.executable, "-X", "utf8", str(ROOT / "tools/verify_v78_0_4_notification_presentation_language_business_boundaries.py")], cwd=ROOT, text=True, encoding="utf-8", errors="replace", capture_output=True)
ok(prev4.returncode == 0 and "25/25 checks passed" in prev4.stdout,
   "V78.0.4 and the earlier V78 lineage remain forward-compatible with V78.0.5")

passed = sum(checks)
print(f"\nV78.0.5 Admin Audit presentation-language ownership verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed == len(checks) else 1)
