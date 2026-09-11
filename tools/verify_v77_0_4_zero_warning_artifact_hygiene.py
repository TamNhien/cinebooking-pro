from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
checks = []

def text(path):
    return (ROOT / path).read_text(encoding="utf-8")

def ok(label, cond):
    checks.append((label, bool(cond)))
    print(f"[ {'OK' if cond else 'FAIL'} ] {label}")

eslint = text("frontend/eslint.config.mjs")
package = text("frontend/package.json")
gitignore = text(".gitignore")
ci = text(".github/workflows/ci.yml")
release = text("scripts/release.ps1")
diagnose = text("tools/diagnose-v77.ps1")
makefile = text("Makefile")
readme = text("README.md")

required_eslint_ignores = [
    '"playwright-report/**"',
    '"test-results/**"',
    '"blob-report/**"',
    '".playwright/**"',
    '"coverage/**"',
    '"out/**"',
    '"dist/**"',
]
for needle in required_eslint_ignores:
    ok(f"ESLint ignores generated artifact {needle}", needle in eslint)

required_git_ignores = [
    "frontend/playwright-report/",
    "frontend/test-results/",
    "frontend/blob-report/",
    "frontend/.playwright/",
    "frontend/coverage/",
    "frontend/out/",
    "frontend/dist/",
]
for needle in required_git_ignores:
    ok(f"Git ignores generated artifact {needle}", needle in gitignore)

ok("Zero-warning lint gate remains strict", '"lint": "eslint . --max-warnings=0"' in package)
ok("No blanket disable for no-unused-expressions", '"@typescript-eslint/no-unused-expressions": "off"' not in eslint)
ok("No blanket disable for no-this-alias", '"@typescript-eslint/no-this-alias": "off"' not in eslint)
ok("No blanket disable for React hooks rules", '"react-hooks/rules-of-hooks": "off"' not in eslint)
ok("README current release is V77.0.4 or later", re.search(r"Current release:\*\* V77\.0\.(?:[4-9]|[1-9][0-9]+)", readme) is not None)
ok("README documents 3005 generated-report findings", "3005 problems (159 errors, 2846 warnings)" in readme)
ok("Patch remains no-schema", not any((ROOT / "backend/src/main/resources/db/migration").glob("V77*0*4*.sql")))
ok("CI runs V77.0.4 verifier", "verify_v77_0_4_zero_warning_artifact_hygiene.py" in ci)
ok("Release preflight runs V77.0.4 verifier", "verify_v77_0_4_zero_warning_artifact_hygiene.py" in release)
ok("Diagnose V77 chains V77.0.4 verifier", "verify_v77_0_4_zero_warning_artifact_hygiene.py" in diagnose)
ok("Makefile exposes V77.0.4 verifier", "verify-v77-zero-warning:" in makefile)
ok("Makefile latest patch release is v77.0.4", "release-v77-patch:" in makefile and "v77.0.4" in makefile)

passed = sum(1 for _, value in checks if value)
total = len(checks)
print(f"\nV77.0.4 zero-warning artifact hygiene verification: {passed}/{total} checks passed")
sys.exit(0 if passed == total else 1)
