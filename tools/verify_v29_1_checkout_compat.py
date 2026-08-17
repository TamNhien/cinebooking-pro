from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
checks = []

def check(name, ok):
    ok = bool(ok)
    checks.append((name, ok))
    print(("PASS" if ok else "FAIL") + f": {name}")

def text(rel):
    p = ROOT / rel
    return p.read_text(encoding="utf-8") if p.exists() else ""

ci = text(".github/workflows/ci.yml")
rc = text(".github/workflows/release-candidate.yml")
v28 = text("tools/verify_v28_ci.py")

check("main CI uses checkout v6 or v7", "actions/checkout@v6" in ci or "actions/checkout@v7" in ci)
check("release-candidate workflow uses checkout v6 or v7", "actions/checkout@v6" in rc or "actions/checkout@v7" in rc)
check("V28 verifier accepts checkout v6", '"actions/checkout@v6" in workflow' in v28)
check("V28 verifier accepts checkout v7", '"actions/checkout@v7" in workflow' in v28)
check("V28 verifier no longer requires checkout v6 only", '"Workflow uses actions/checkout@v6"' not in v28)
check("checkout v5 is not used by V29 workflows", "actions/checkout@v5" not in ci and "actions/checkout@v5" not in rc)

failed = [name for name, ok in checks if not ok]
print(f"\n{len(checks)-len(failed)}/{len(checks)} checks passed")
if failed:
    print("Failed checks:")
    for name in failed:
        print(f" - {name}")
    raise SystemExit(1)
