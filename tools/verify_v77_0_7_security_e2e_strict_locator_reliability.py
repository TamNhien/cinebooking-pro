from pathlib import Path
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

e2e = text("frontend/e2e/security-account-protection.spec.ts")
admin_page = text("frontend/app/admin/security/page.tsx")
ci = text(".github/workflows/ci.yml")
release = text("scripts/release.ps1")
diagnose = text("tools/diagnose-v77.ps1")
makefile = text("Makefile")
readme = text("README.md")
v776 = text("tools/verify_v77_0_6_dependency_security_playwright_bootstrap.py")

ok("Admin security page exposes stable V68 root test id", 'data-testid="security-identity-v68"' in admin_page)
ok("Security E2E waits for stable admin security root", 'page.getByTestId("security-identity-v68")' in e2e)
ok("Security E2E uses exact level-1 admin security heading", 'getByRole("heading",{level:1,name:"Security Operations · Security & Identity",exact:true})' in e2e)
ok("Ambiguous Security Operations heading locator is removed", 'getByRole("heading",{name:"Security Operations"})' not in e2e)
ok("Login heading locator is exact", 'getByRole("heading",{name:"Đăng nhập",exact:true})' in e2e)
ok("Customer security heading locator is exact", 'getByRole("heading",{name:"Trung tâm bảo mật tài khoản",exact:true})' in e2e)
ok("Security E2E still blocks service workers for server-backed auth journey", 'serviceWorkers:"block"' in e2e.replace(" ", ""))
ok("Security E2E still validates stable login submit selector", 'getByTestId("login-submit")' in e2e)
ok("V77.0.6 verifier is forward-compatible with later V77 patch", 'V77.0.6 or later' in v776 and '>= 6' in v776)
m = re.search(r"Current release:\*\* V77\.0\.(\d+)", readme)
current_patch = int(m.group(1)) if m else -1
ok("README current release is V77.0.7 or later", current_patch >= 7)
ok("README documents Playwright strict-mode locator collision fix", "strict-mode locator collision" in readme.lower())
ok("V77.0.7 remains no-schema", "V77.0.7" in readme and "no-schema" in readme.lower())
ok("CI runs V77.0.7 verifier", "verify_v77_0_7_security_e2e_strict_locator_reliability.py" in ci)
ok("Release preflight runs V77.0.7 verifier", "verify_v77_0_7_security_e2e_strict_locator_reliability.py" in release)
ok("Diagnose V77 chains V77.0.7 verifier", "verify_v77_0_7_security_e2e_strict_locator_reliability.py" in diagnose)
ok("Makefile exposes V77.0.7 verifier", "verify-v77-security-e2e-locator:" in makefile)
ok("Makefile preserves immutable V77.0.6 release target", "release-v77-0-6:" in makefile and "v77.0.6" in makefile)
patch_target = re.search(r"release-v77-patch:\s*\n\s*powershell .* v77\.0\.(\d+)", makefile)
ok("Makefile latest patch target is v77.0.7 or later", bool(patch_target and int(patch_target.group(1)) >= 7))

failed = [name for name, passed in checks if not passed]
print(f"\nV77.0.7 security E2E strict-locator reliability verification: {len(checks)-len(failed)}/{len(checks)} checks passed")
if failed:
    print("Failed checks:")
    for name in failed:
        print(" -", name)
    sys.exit(1)
