from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
config = (ROOT / "frontend" / "eslint.config.mjs").read_text(encoding="utf-8")
workflow = (ROOT / ".github" / "workflows" / "ci.yml").read_text(encoding="utf-8")

checks = []
def check(label, ok):
    checks.append((label, bool(ok)))
    print(("PASS" if ok else "FAIL") + ": " + label)

check("set-state-in-effect remains enabled as warning", '"react-hooks/set-state-in-effect": "warn"' in config)
check("immutability remains enabled as warning", '"react-hooks/immutability": "warn"' in config)
check("no-explicit-any remains enabled as warning", '"@typescript-eslint/no-explicit-any": "warn"' in config)
check("prefer-const remains enabled as warning", '"prefer-const": "warn"' in config)
check("frontend lint still runs in CI", "npm run lint" in workflow)
check("frontend lint is no longer continue-on-error", "Lint legacy frontend (advisory)" not in workflow and "Lint frontend (legacy baseline)" in workflow)
check("production build remains required", "npm run build" in workflow)
check("baseline does not disable all ESLint rules", '"off"' not in config)

passed = sum(ok for _, ok in checks)
print(f"\n{passed}/{len(checks)} checks passed")
if passed != len(checks):
    sys.exit(1)
