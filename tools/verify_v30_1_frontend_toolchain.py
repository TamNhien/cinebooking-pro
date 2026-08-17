import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
checks = []


def check(name: str, ok: bool):
    checks.append((name, ok))
    print(("PASS" if ok else "FAIL") + f": {name}")

package = json.loads((ROOT / "frontend/package.json").read_text(encoding="utf-8"))
dev = package.get("devDependencies", {})
dependabot = (ROOT / ".github/dependabot.yml").read_text(encoding="utf-8")
ci = (ROOT / ".github/workflows/ci.yml").read_text(encoding="utf-8")
eslint_config = (ROOT / "frontend/eslint.config.mjs").read_text(encoding="utf-8")

eslint_range = str(dev.get("eslint", ""))
ts_range = str(dev.get("typescript", ""))
next_eslint = str(dev.get("eslint-config-next", ""))

check("frontend keeps ESLint on major 9", bool(re.match(r"^\^?9(?:\.|$)", eslint_range)))
check("frontend keeps TypeScript on major 5", bool(re.match(r"^\^?5(?:\.|$)", ts_range)))
check("eslint-config-next remains aligned to Next 16.3.0", next_eslint == "16.3.0")
check("V28.7 lint baseline remains enabled", '"react-hooks/set-state-in-effect": "warn"' in eslint_config)

npm_block_match = re.search(
    r'- package-ecosystem: npm\s+directory: /frontend(?P<body>.*?)(?=\n\s*- package-ecosystem:|\Z)',
    dependabot,
    re.S,
)
npm_block = npm_block_match.group("body") if npm_block_match else ""

check(
    "Dependabot ignores ESLint semver-major updates",
    bool(re.search(r'dependency-name: eslint\s+update-types:\s+- version-update:semver-major', npm_block, re.S)),
)
check(
    "Dependabot ignores TypeScript semver-major updates",
    bool(re.search(r'dependency-name: typescript\s+update-types:\s+- version-update:semver-major', npm_block, re.S)),
)
check("Dependabot still monitors frontend npm", bool(npm_block_match))
check("CI runs V30.1 frontend toolchain verifier", "python3 tools/verify_v30_1_frontend_toolchain.py" in ci)
check("CI frontend lint remains a required command", "run: npm run lint" in ci)
check("CI frontend production build remains required", "run: npm run build" in ci)

passed = sum(1 for _, ok in checks if ok)
print(f"\n{passed}/{len(checks)} checks passed")
failed = [name for name, ok in checks if not ok]
if failed:
    print("Failed checks:")
    for name in failed:
        print(" -", name)
    raise SystemExit(1)
