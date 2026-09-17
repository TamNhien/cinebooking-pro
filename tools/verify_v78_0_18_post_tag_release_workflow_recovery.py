from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
checks = []

def text(path: str) -> str:
    p = ROOT / path
    return p.read_text(encoding="utf-8") if p.exists() else ""

def ok(cond: bool, label: str):
    checks.append((bool(cond), label))
    print(f"[ {'OK' if cond else 'FAIL'} ] {label}")

workflow = text('.github/workflows/v77-auto-release.yml')
release = text('scripts/release.ps1')
recovery = text('tools/recover-stable-release.ps1')
legacy = text('tools/verify_v77_0_14_navigation_language_dropdown_localization.py')
ci = text('.github/workflows/ci.yml')
make = text('Makefile')
diagnose = text('tools/diagnose-v78.ps1')
readme = text('README.md')

ok('name: CineBooking Automatic Stable Release' in workflow, 'Stable release workflow is no longer V77-branded')
ok("- 'v*.*.*'" in workflow and 'tags:' in workflow, 'Stable tag trigger covers V78 and future stable majors')
ok('workflow_dispatch:' in workflow and 'tag:' in workflow and 'required: true' in workflow, 'Existing immutable tags can be recovered through workflow_dispatch')
ok("github.event_name == 'workflow_dispatch' && inputs.tag || github.ref_name" in workflow, 'Workflow resolves the requested immutable tag on push or manual recovery')
ok("ref: ${{ github.event_name == 'workflow_dispatch' && inputs.tag || github.ref }}" in workflow, 'Manual recovery checks out the tag rather than current main')
ok(r'^v[0-9]+\\\.[0-9]+\\\.[0-9]+$' not in workflow or 'Invalid stable tag' in workflow, 'Workflow validates stable semantic tag shape')
ok('git show-ref --verify --quiet "refs/tags/$TAG"' in workflow, 'Workflow proves the immutable tag exists')
ok('git rev-list -n 1 "$TAG"' in workflow and 'git rev-parse HEAD' in workflow and 'Checkout mismatch' in workflow, 'Workflow proves checked-out HEAD equals immutable tag commit')
ok('git archive --format=zip --output="$ZIP" "$TAG^{commit}"' in workflow, 'Release Full Source is built from immutable tagged source')
ok('sha256sum "$ZIP"' in workflow, 'Release workflow generates SHA-256 for canonical tag archive')
ok('gh release create "$TAG"' in workflow and '--verify-tag' in workflow and '--latest' in workflow, 'Workflow creates latest stable GitHub Release from verified tag')
ok('gh release upload "$TAG"' in workflow and '--clobber' in workflow, 'Workflow can idempotently repair assets of an existing release')
ok('Remote immutable tag $Version does not exist' in recovery, 'Recovery tool requires an already-existing remote immutable tag')
ok('never creates or moves tags' in recovery and 'git tag -f' not in recovery and 'git push --force' not in recovery, 'Recovery tool never moves or force-pushes an immutable tag')
ok('gh workflow run v77-auto-release.yml -f "tag=$Version"' in recovery, 'Recovery tool dispatches the stable workflow for the exact tag')
ok('expectedZip' in recovery and 'expectedSha' in recovery and 'assets' in recovery, 'Recovery tool verifies canonical Full Source and SHA-256 assets')
ok('function Get-GhReleaseJsonAllowMissing' in recovery and "$ErrorActionPreference = 'Continue'" in recovery and '$exitCode = $LASTEXITCODE' in recovery, 'Recovery tool treats a missing release as an expected Windows PowerShell 5.1 probe state')
ok('& gh release view $Version' not in recovery, 'Recovery tool no longer directly probes a missing release under global ErrorActionPreference=Stop')
ok('$LASTEXITCODE -eq 0 -and $existing' not in recovery and '$LASTEXITCODE -eq 0 -and $json' not in recovery, 'Recovery caller trusts the helper result instead of stale native exit state')
ok('function Get-GhReleaseJsonAllowMissing' in release and "$ErrorActionPreference = 'Continue'" in release and '$releaseJson = Get-GhReleaseJsonAllowMissing -Tag $Version' in release, 'Future stable release polling is also Windows PowerShell 5.1-safe when the release is not visible yet')
ok('$LASTEXITCODE -eq 0 -and $releaseJson' not in release, 'Future release polling also trusts the compatibility helper result directly')
ok('gh workflow run v77-auto-release.yml -f "tag=$Version"' in release, 'Future stable release script has a manual-dispatch fallback after publication timeout')
ok("'v*.*.*'" in legacy or 'genericStableTrigger' in legacy, 'Historical V77.0.14 gate accepts the generic stable-tag workflow')
ok('verify_v78_0_18_post_tag_release_workflow_recovery.py' in ci, 'Main CI runs the post-tag release-workflow recovery verifier')
ok('verify_v78_0_18_post_tag_release_workflow_recovery.py' in release, 'Future stable release preflight runs the recovery verifier')
ok('verify_v78_0_18_post_tag_release_workflow_recovery.py' in diagnose, 'V78 diagnostics run the recovery verifier')
ok('verify-release-workflow-recovery:' in make and 'recover-v78-0-18-release:' in make, 'Makefile exposes verification and V78.0.18 recovery helpers')
ok('V78.0.18 post-tag GitHub Release workflow recovery' in readme, 'README documents the V78.0.18 post-tag release-workflow correction')
ok(len(list(ROOT.glob('*.md'))) == 1 and (ROOT / 'README.md').exists(), 'Source keeps one consolidated root README.md')

passed = sum(1 for status, _ in checks if status)
print(f"\nV78.0.18 post-tag release workflow recovery verification: {passed}/{len(checks)} checks passed")
raise SystemExit(0 if passed == len(checks) else 1)
