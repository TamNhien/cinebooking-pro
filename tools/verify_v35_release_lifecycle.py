from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
checks = []

def text(rel: str) -> str:
    p = ROOT / rel
    return p.read_text(encoding='utf-8') if p.exists() else ''

def check(name: str, ok):
    ok = bool(ok)
    checks.append((name, ok))
    print(('PASS' if ok else 'FAIL') + f': {name}')

release = text('.github/workflows/release.yml')
rc = text('.github/workflows/release-candidate.yml')
ci = text('.github/workflows/ci.yml')
readme = text('README.md')
make = text('Makefile')
diag = text('tools/diagnose-v35.ps1')

check('V35 stable-release workflow exists', bool(release))
check('stable-release workflow is manual-only', 'workflow_dispatch:' in release and '\n  push:' not in release and '\n  pull_request:' not in release)
check('stable-release workflow defaults to 35.0.0', 'default: "35.0.0"' in release)
check('stable-release workflow defaults to RC number 1', re.search(r'rc_number:.*?default: "1"', release, re.S) is not None)
check('release input requires strict MAJOR.MINOR.PATCH', r'^[0-9]+\.[0-9]+\.[0-9]+$' in release)
check('release input requires positive RC sequence', r'^[1-9][0-9]*$' in release)
check('release derives semantic RC tag', 'rc_tag=v${version}-rc.${rc_number}' in release)
check('release derives stable tag', 'stable_tag=v${version}' in release)
check('release must be dispatched from main', 'refs/heads/main' in release and 'Stable releases must be dispatched from main' in release)
check('preflight uses read-only source plus actions read', re.search(r'preflight:.*?permissions:\s*\n\s+contents: read\s*\n\s+actions: read', release, re.S) is not None)
check('preflight verifies successful CI for exact SHA', '/actions/workflows/ci.yml/runs?head_sha=${GITHUB_SHA}' in release and 'No successful CineBooking CI run found' in release)
check('stable tag collision is rejected before RC', 'Refusing to overwrite an immutable release' in release)
check('RC tag cannot move to a different commit', 'Use the next rc_number' in release)
check('same-commit RC tag may be safely reused', 'may be reused' in release)
check('RC tag job has contents write', re.search(r'rc_tag:.*?permissions:\s*\n\s+contents: write', release, re.S) is not None)
check('RC tag is annotated and pushed before E2E', 'git tag -a "$RC_TAG"' in release and 'git push origin "refs/tags/${RC_TAG}"' in release and 'needs: [preflight, rc_tag]' in release)
check('RC E2E job remains read-only', re.search(r'rc_e2e:.*?permissions:\s*\n\s+contents: read', release, re.S) is not None)
check('RC E2E uses disposable full-stack smoke', 'bash tools/smoke-v29.sh' in release and 'cinebooking_v35_release_${{ github.run_id }}' in release)
check('RC E2E installs Playwright Chromium', 'npx playwright install --with-deps chromium' in release)
check('RC E2E runs browser suite', 'bash tools/e2e-v29.2.sh' in release and 'E2E_SKIP_BUILD: "true"' in release)
check('RC E2E uploads evidence even on failure', 'if: always()' in release and 'frontend/playwright-report/' in release and 'frontend/test-results/' in release)
check('stable publish depends on successful RC E2E', 'needs: [preflight, rc_tag, rc_e2e]' in release)
check('publish job has contents write', re.search(r'publish:.*?permissions:\s*\n\s+contents: write', release, re.S) is not None)
check('publish re-verifies RC tag commit', 'Verify RC tag still points to tested commit' in release and 'git rev-list -n 1 "$RC_TAG"' in release)
check('stable tag is annotated and immutable', 'git tag -a "$STABLE_TAG"' in release and 'refusing to overwrite it' in release)
check('GitHub Release is created after E2E', 'gh release create "$STABLE_TAG"' in release and '--verify-tag' in release and '--generate-notes' in release)
check('release manifest records CI and RC success', '"ci_verified": True' in release and '"release_candidate_e2e": "passed"' in release)
check('release manifest records published but not deployed', '"published": True' in release and '"deployed": False' in release)
check('release workflow does not publish container packages', 'docker/login-action' not in release and 'packages: write' not in release and 'ghcr.io' not in release and 'push: true' not in release)
check('release workflow does not deploy production', not any(token in release.lower() for token in ['kubectl ', 'helm ', 'production deploy', 'scp ', 'ssh ']))
check('standalone RC defaults to semantic V35 candidate', 'default: "v35.0.0-rc.1"' in rc)
check('standalone RC remains manual and contents read-only', 'workflow_dispatch:' in rc and re.search(r'permissions:\s*\n\s+contents:\s*read', rc) is not None)
check('main CI runs V35 lifecycle verifier', 'python3 tools/verify_v35_release_lifecycle.py' in ci)
check('V35 diagnostics chain V34 and V35 verifier', 'diagnose-v34.ps1' in diag and 'verify_v35_release_lifecycle.py' in diag)
check('Makefile exposes V35 verify and diagnose', 'verify-v35:' in make and 'diagnose-v35:' in make)
check('README documents feature-to-release lifecycle', all(token in readme for token in ['v35.0.0-rc.1', 'Release Candidate E2E', 'v35.0.0', 'GitHub Release']))
check('README documents failed RC progression to rc.2', 'rc.2' in readme)
ignored = {'.git', 'node_modules', '.next', 'target', 'playwright-report', 'test-results'}
markdown = [p for p in ROOT.rglob('*.md') if not any(part in ignored for part in p.parts)]
check('source still contains exactly one README.md', len(markdown) == 1 and markdown[0].resolve() == (ROOT / 'README.md').resolve())
check('reset safety remains blocked', 'destructive volume reset is disabled' in make and '@exit 1' in make)

failed = [name for name, ok in checks if not ok]
print(f'\n{len(checks)-len(failed)}/{len(checks)} checks passed')
if failed:
    print('Failed checks:')
    for name in failed:
        print(' -', name)
    sys.exit(1)
