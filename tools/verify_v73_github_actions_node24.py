from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
checks = []


def text(rel: str) -> str:
    p = ROOT / rel
    return p.read_text(encoding="utf-8") if p.exists() else ""


def check(name: str, ok):
    ok = bool(ok)
    checks.append((name, ok))
    print(("[ OK ]" if ok else "[ FAIL ]") + f" {name}")


ci = text('.github/workflows/ci.yml')
rc = text('.github/workflows/release-candidate.yml')
release_workflow = text('.github/workflows/release.yml')
release_script = text('scripts/release.ps1')
v28 = text('tools/verify_v28_ci.py')
v72 = text('tools/verify_v72_software_supply_chain_5.py')
dependabot = text('.github/dependabot.yml')
readme = text('README.md')
make = text('Makefile')
diag = text('tools/diagnose-v73.ps1')
itest = text('backend/src/test/java/com/cinebooking/integration/CineBookingIntegrationIT.java')

workflow_texts = {
    '.github/workflows/ci.yml': ci,
    '.github/workflows/release-candidate.yml': rc,
    '.github/workflows/release.yml': release_workflow,
}
all_workflows = '\n'.join(workflow_texts.values())
uses_refs = []
for workflow_name, body in workflow_texts.items():
    for ref in re.findall(r'^\s*uses:\s*([^\s#]+)', body, re.M):
        uses_refs.append((workflow_name, ref))

check('V73 strategy is documented', 'V73-GITHUB-ACTIONS-NODE24-5' in readme)
check('V73 is tooling-only with no Flyway migration', not any((ROOT / 'backend/src/main/resources/db/migration').glob('V73__*.sql')))
check('V73 preserves Flyway V72 schema authority', 'Flyway latest: V72' in readme)
check('V73 preserves 67 public-table contract', '67 public tables' in readme or 'Public tables: 67' in readme)
check('Integration remains Flyway >=72', 'isGreaterThanOrEqualTo(72)' in itest)
check('Integration remains at least 67 public tables', 'publicTables).isGreaterThanOrEqualTo(67)' in itest)

# Node 24 action baseline. These are the validated majors for the V73 source.
expected_refs = [
    'actions/checkout@v7',
    'actions/setup-java@v6',
    'actions/setup-node@v7',
    'actions/upload-artifact@v7',
    'docker/setup-buildx-action@v4',
    'docker/build-push-action@v7',
]
for ref in expected_refs:
    check(f'Validated action major present: {ref}', ref in all_workflows)

legacy_refs = [
    'actions/checkout@v4',
    'actions/setup-java@v4',
    'actions/setup-node@v4',
    'actions/upload-artifact@v4',
    'actions/upload-artifact@v5',
    'actions/cache@v4',
    'docker/setup-buildx-action@v3',
    'docker/build-push-action@v6',
]
for ref in legacy_refs:
    check(f'Legacy Node 20-era action absent: {ref}', ref not in all_workflows)

check('All upload-artifact usages are v7', all(ref == 'actions/upload-artifact@v7' for _, ref in uses_refs if ref.startswith('actions/upload-artifact@')))
check('All setup-java usages are v6', all(ref == 'actions/setup-java@v6' for _, ref in uses_refs if ref.startswith('actions/setup-java@')))
check('All checkout usages are v7', all(ref == 'actions/checkout@v7' for _, ref in uses_refs if ref.startswith('actions/checkout@')))
check('All setup-node usages are v7', all(ref == 'actions/setup-node@v7' for _, ref in uses_refs if ref.startswith('actions/setup-node@')))
check('V72 dependency inventory upload moved to upload-artifact v7', 'cinebooking-v72-dependency-inventory' in ci and 'actions/upload-artifact@v4' not in ci and 'actions/upload-artifact@v7' in ci)
check('No insecure Node 20 opt-out is configured', 'ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION' not in all_workflows)
check('No force-runtime workaround masks legacy actions', 'FORCE_JAVASCRIPT_ACTIONS_TO_NODE24' not in all_workflows)
check('GitHub Actions Dependabot remains enabled', 'package-ecosystem: github-actions' in dependabot)

# Historical gates must remain forward-compatible.
check('V28 verifier accepts setup-java v5 or v6', 'supported actions/setup-java@v5 or @v6' in v28 and 'actions/setup-java@v6' in v28)
check('V72 verifier expects Node 24 upload-artifact generation', 'actions/upload-artifact@v7' in v72 and 'actions/upload-artifact@v4' not in v72)
check('V59 clipping regression verifier remains in CI lineage', 'verify_v59_realtime_operations_4.py' in ci)

# V73 lifecycle wiring.
check('CI source regression names V73', 'V26-V73 source regression' in ci)
check('CI runs V73 Node24 verifier', 'verify_v73_github_actions_node24.py' in ci)
check('Makefile exposes verify-v73', 'verify-v73:' in make and 'verify_v73_github_actions_node24.py' in make)
check('Makefile exposes diagnose-v73', 'diagnose-v73:' in make and 'diagnose-v73.ps1' in make)
check('Makefile exposes stable release-v73', 'release-v73:' in make and 'v73.0.0' in make)
check('Diagnose V73 runs CI baseline verifier', 'verify_v28_ci.py' in diag)
check('Diagnose V73 runs setup-node compatibility verifier', 'verify_v35_setup_node_compat.py' in diag)
check('Diagnose V73 runs V59 clipping regression gate', 'verify_v59_realtime_operations_4.py' in diag)
check('Diagnose V73 runs V72 and V73 gates', 'verify_v72_software_supply_chain_5.py' in diag and 'verify_v73_github_actions_node24.py' in diag)
check('Release preflight runs V73 verifier', 'verify_v73_github_actions_node24.py' in release_script)
check('Release example is V73 stable', 'such as v73.0.0' in release_script)
check('Release remains stable-only', 'Pre-release tags are disabled' in release_script and '-rc.' not in release_script)

# Documentation/current release.
check('README title is V73', re.search(r'^# CineBooking Pro V73$', readme, re.M) is not None)
check('README current release is V73', 'Current release:** V73' in readme or 'Current release: **V73**' in readme)
check('README history includes V73 after V72', '| **V72** |' in readme and '| **V73** |' in readme and readme.index('| **V72** |') < readme.index('| **V73** |'))
check('README detailed V73 section exists', '## V73 - GitHub Actions Runtime Modernization 5.0' in readme)
check('README documents upload-artifact v7 migration', 'actions/upload-artifact@v7' in readme and 'actions/upload-artifact@v4' in readme)
check('README documents setup-java v6 baseline', 'actions/setup-java@v6' in readme)
check('README documents self-hosted runner minimum', '2.327.1' in readme)
check('README documents Node 20 removal date', '23/09/2026' in readme or 'September 23, 2026' in readme)
check('README says no insecure Node 20 fallback', 'ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION' in readme and 'không' in readme.lower())
check('README documents V73 stable release', 'Stable only: v73.0.0' in readme)
check('README preserves real-data policy through V73', 'V52/V65/V66/V67/V68/V69/V70/V71/V72/V73' in readme and '**không tạo phim/khách/booking/payment giả**' in readme)

passed = sum(ok for _, ok in checks)
print(f"\nV73 verification: {passed}/{len(checks)} checks passed")
if passed != len(checks):
    print('\nFailed checks:')
    for name, ok in checks:
        if not ok:
            print(' - ' + name)
    sys.exit(1)
