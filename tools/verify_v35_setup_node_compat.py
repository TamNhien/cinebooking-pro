from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
checks = []

def text(rel: str) -> str:
    p = ROOT / rel
    return p.read_text(encoding="utf-8") if p.exists() else ""

def check(name: str, ok):
    ok = bool(ok)
    checks.append((name, ok))
    print(("PASS" if ok else "FAIL") + f": {name}")

ci = text('.github/workflows/ci.yml')
rc = text('.github/workflows/release-candidate.yml')
release = text('.github/workflows/release.yml')
v28 = text('tools/verify_v28_ci.py')
diag = text('tools/diagnose-v35.ps1')
make = text('Makefile')
readme = text('README.md')

check('main CI uses actions/setup-node@v7', 'actions/setup-node@v7' in ci)
check('standalone RC uses actions/setup-node@v7', 'actions/setup-node@v7' in rc)
check('stable release uses actions/setup-node@v7', 'actions/setup-node@v7' in release)
check('V28 verifier accepts setup-node v6 or v7', 'supported actions/setup-node@v6 or @v7' in v28 and 'actions/setup-node@v6' in v28 and 'actions/setup-node@v7' in v28)
check('V28 verifier no longer requires setup-node@v6 only', '"actions/setup-node@v6",' not in v28)
check('main CI runs setup-node compatibility verifier', 'python3 tools/verify_v35_setup_node_compat.py' in ci)
check('V35 diagnostics runs setup-node compatibility verifier', 'verify_v35_setup_node_compat.py' in diag)
check('Makefile exposes setup-node compatibility verifier', 'verify-v35-node:' in make and 'verify_v35_setup_node_compat.py' in make)
check('README documents setup-node v7 compatibility', 'actions/setup-node@v7' in readme and 'setup-node v6 hoặc v7' in readme)

failed = [name for name, ok in checks if not ok]
print(f"\n{len(checks)-len(failed)}/{len(checks)} checks passed")
if failed:
    print('Failed checks:')
    for name in failed:
        print(' -', name)
    sys.exit(1)
