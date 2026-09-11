from pathlib import Path
import json
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

pkg = json.loads(text("frontend/package.json"))
playwright = text("frontend/playwright.config.ts")
installer = text("frontend/scripts/install-playwright-chromium.mjs")
ci = text(".github/workflows/ci.yml")
release_wf = text(".github/workflows/release.yml")
rc_wf = text(".github/workflows/release-candidate.yml")
release_ps = text("scripts/release.ps1")
diagnose = text("tools/diagnose-v77.ps1")
makefile = text("Makefile")
readme = text("README.md")
v301 = text("tools/verify_v30_1_frontend_toolchain.py")
v775 = text("tools/verify_v77_0_5_warning_free_runtime_e2e.py")

next_version = str(pkg.get("dependencies", {}).get("next", ""))
eslint_next = str(pkg.get("devDependencies", {}).get("eslint-config-next", ""))
allow_scripts = pkg.get("allowScripts", {})
scripts = pkg.get("scripts", {})

ok("Next.js is patched to 16.3.4", next_version == "16.3.4")
ok("eslint-config-next is aligned to Next 16.3.4", eslint_next == next_version == "16.3.4")
ok("unrs-resolver install script is explicitly reviewed and version-pinned", allow_scripts.get("unrs-resolver@1.12.2") is True)
ok("No blanket install-script approval exists", all(k != "*" for k in allow_scripts))
ok("Frontend exposes high/critical dependency audit gate", scripts.get("security:audit") == "npm audit --audit-level=high")
ok("Frontend exposes production-only audit gate", scripts.get("security:audit:prod") == "npm audit --omit=dev --audit-level=high")
ok("Frontend exposes resilient Playwright Chromium installer", scripts.get("e2e:install:chromium") == "node scripts/install-playwright-chromium.mjs")
ok("Playwright installer defaults connection timeout to 120 seconds", 'PLAYWRIGHT_DOWNLOAD_CONNECTION_TIMEOUT' in installer and '"120000"' in installer)
ok("Playwright installer retains explicit Chromium install", '["playwright", "install", "chromium"]' in installer)
ok("Playwright config supports managed system-browser channel fallback", "PLAYWRIGHT_BROWSER_CHANNEL" in playwright and "channel: browserChannel" in playwright)
ok("CI audits frontend dependencies before lint/build", "Audit frontend dependencies (high/critical gate)" in ci and "npm audit --audit-level=high" in ci)
ok("Stable release preflight audits frontend dependencies", "npm run security:audit" in release_ps)
ok("Stable release workflow audits frontend dependencies", "npm audit --audit-level=high" in release_wf)
ok("RC workflow audits frontend dependencies", "npm audit --audit-level=high" in rc_wf)
ok("Release workflow extends Playwright CDN timeout", 'PLAYWRIGHT_DOWNLOAD_CONNECTION_TIMEOUT: "120000"' in release_wf)
ok("RC workflow extends Playwright CDN timeout", 'PLAYWRIGHT_DOWNLOAD_CONNECTION_TIMEOUT: "120000"' in rc_wf)
ok("Historical V30.1 verifier accepts reviewed Next 16.3 patch line", "reviewed 16.3 security patch line" in v301 and "exactly aligned to Next" in v301)
ok("Historical V77.0.5 verifier is forward-compatible", "V77.0.5 or later" in v775)
m = re.search(r"Current release:\*\* V77\.0\.(\d+)", readme)
current_patch = int(m.group(1)) if m else -1
ok("README current release is V77.0.6 or later", current_patch >= 6)
ok("README documents Next 16.3.4 security patch", "Next.js 16.3.4" in readme and "August 2026" in readme)
ok("README documents explicit unrs-resolver install-script approval", "unrs-resolver@1.12.2" in readme and "allowScripts" in readme)
ok("README documents 120-second Playwright download timeout", "PLAYWRIGHT_DOWNLOAD_CONNECTION_TIMEOUT" in readme and "120000" in readme)
ok("README documents system Edge fallback", "PLAYWRIGHT_BROWSER_CHANNEL" in readme and "msedge" in readme)
ok("V77.0.6 remains no-schema", "V77.0.6" in readme and "no-schema" in readme.lower())
ok("CI runs V77.0.6 verifier", "verify_v77_0_6_dependency_security_playwright_bootstrap.py" in ci)
ok("Stable release preflight runs V77.0.6 verifier", "verify_v77_0_6_dependency_security_playwright_bootstrap.py" in release_ps)
ok("Diagnose V77 chains V77.0.6 verifier", "verify_v77_0_6_dependency_security_playwright_bootstrap.py" in diagnose)
ok("Makefile exposes V77.0.6 verifier", "verify-v77-dependency-security:" in makefile)
ok("Makefile preserves immutable V77.0.5 release target", "release-v77-0-5:" in makefile and "v77.0.5" in makefile)
patch_target = re.search(r"release-v77-patch:\s*\n\s*powershell .* v77\.0\.(\d+)", makefile)
ok("Makefile latest patch target is v77.0.6 or later", bool(patch_target and int(patch_target.group(1)) >= 6))

failed = [name for name, passed in checks if not passed]
print(f"\nV77.0.6 dependency security / Playwright bootstrap verification: {len(checks)-len(failed)}/{len(checks)} checks passed")
if failed:
    print("Failed checks:")
    for name in failed:
        print(" -", name)
    sys.exit(1)
