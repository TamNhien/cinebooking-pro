import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
checks = []


def check(name: str, ok: bool):
    ok = bool(ok)
    checks.append((name, ok))
    print(("PASS" if ok else "FAIL") + f": {name}")

pkg = json.loads((ROOT / "frontend/package.json").read_text(encoding="utf-8"))
dev = pkg.get("devDependencies", {})
playwright = str(dev.get("@playwright/test", ""))
dependabot = (ROOT / ".github/dependabot.yml").read_text(encoding="utf-8")
ci = (ROOT / ".github/workflows/ci.yml").read_text(encoding="utf-8")
v292 = (ROOT / "tools/verify_v29_2_playwright_e2e.py").read_text(encoding="utf-8")

npm_match = re.search(
    r'- package-ecosystem: npm\s+directory: /frontend(?P<body>.*?)(?=\n\s*- package-ecosystem:|\Z)',
    dependabot,
    re.S,
)
npm_block = npm_match.group("body") if npm_match else ""

check(
    "Playwright package is exact-pinned on validated 1.60 patch line",
    re.fullmatch(r"1\.60\.\d+(?:-[0-9A-Za-z.-]+)?", playwright) is not None,
)
check("Playwright package does not use caret or tilde range", not playwright.startswith(("^", "~", ">", "<", "*")))
check("V29.2 verifier validates a 1.60 patch pin rather than one literal patch", 'r"1\\.60\\.\\d+' in v292 and '== "1.60.0"' not in v292)
check("Dependabot still monitors frontend npm", bool(npm_match))
check(
    "Dependabot blocks Playwright semver-minor updates",
    bool(re.search(r'dependency-name:\s*["\']?@playwright/test["\']?\s+update-types:.*?version-update:semver-minor', npm_block, re.S)),
)
check(
    "Dependabot blocks Playwright semver-major updates",
    bool(re.search(r'dependency-name:\s*["\']?@playwright/test["\']?\s+update-types:.*?version-update:semver-major', npm_block, re.S)),
)
check("CI runs V30.2 Playwright pin verifier", "python3 tools/verify_v30_2_playwright_pin_policy.py" in ci)
check("V29.2 Playwright verifier remains a CI gate", "python3 tools/verify_v29_2_playwright_e2e.py" in ci)

failed = [name for name, ok in checks if not ok]
print(f"\n{len(checks)-len(failed)}/{len(checks)} checks passed")
if failed:
    print("Failed checks:")
    for name in failed:
        print(" -", name)
    raise SystemExit(1)
