#!/usr/bin/env python3
from __future__ import annotations
import re, sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
checks=[]
def text(rel:str)->str:
    p=ROOT/rel
    return p.read_text(encoding='utf-8') if p.exists() else ''
def ok(cond:bool,label:str)->None:
    cond=bool(cond); checks.append(cond); print(f"[ {'OK' if cond else 'FAIL'} ] {label}")

readme_path=ROOT/'README.md'
readme_bytes=readme_path.read_bytes() if readme_path.exists() else b''
readme=readme_bytes.decode('utf-8') if readme_bytes else ''
release=text('scripts/release.ps1')
ci=text('.github/workflows/ci.yml')
diag=text('tools/diagnose-v77.ps1')
make=text('Makefile')
sw=text('frontend/public/sw.js')
prev=text('tools/verify_v77_0_48_maintenance_success_feedback_timer_ownership.py')
v29=text('tools/verify_v77_0_29_frontend_healthcheck_contract.py')

ok(readme_bytes.endswith(b'\n'), 'README keeps a canonical terminal newline')
ok(not readme_bytes.endswith(b'\n\n'), 'README has no extra blank line at EOF')
ok(not readme_bytes.endswith(b'\r\n\r\n'), 'README has no duplicate CRLF blank line at EOF')
ok(readme_bytes.rstrip(b'\r\n') + b'\n' == readme_bytes, 'README EOF is normalized to exactly one LF byte')
ok('git diff --cached --check' in release, 'Stable release keeps the staged Git whitespace gate enabled')
ok("if ($LASTEXITCODE -ne 0) { throw 'git diff --cached --check failed' }" in release, 'Git whitespace gate remains fail-closed')
ok(release.index('git diff --cached --check') > release.index('Browser E2E PASS. GitHub publication is now allowed.'), 'Git whitespace gate still runs after local runtime gates and before publication')
ok(release.index('git diff --cached --check') < release.index('git push origin main'), 'Git whitespace gate still blocks push on source hygiene failure')
ok('new blank line at EOF' in readme and '46/46' in readme, 'README records the concrete V77.0.48 release blocker after a green browser gate')
ok('V77.0.49 - Release Staging Whitespace Preflight' in readme, 'README documents the V77.0.49 source-hygiene patch')
ok(any(x in sw for x in ['const VERSION = "v77-0-49";','const VERSION = "v77-0-50";','const VERSION = "v77-0-52";']), 'Service Worker release metadata is V77.0.49 or forward-compatible V77.0.50')

migrations=list((ROOT/'backend/src/main/resources/db/migration').glob('V*.sql'))
latest=max(int(re.match(r'V(\d+)',p.name).group(1)) for p in migrations if re.match(r'V(\d+)',p.name))
ok(latest==72 and not list((ROOT/'backend/src/main/resources/db/migration').glob('V73*.sql')), 'V77.0.49 remains no-schema on Flyway V72')

name='verify_v77_0_49_release_staging_whitespace_preflight.py'
ok(name in release, 'Stable release preflight runs the V77.0.49 verifier')
ok(name in ci, 'Main CI runs the V77.0.49 verifier')
ok(name in diag, 'V77 diagnostics chain the V77.0.49 verifier')
ok('verify-v77-0-49' in make and 'release-v77-0-49' in make, 'Makefile exposes V77.0.49 verify/release lifecycle')
ok(any(x in readme for x in ['Current release:** V77.0.49','Current release:** V77.0.50','Current release:** V77.0.52']) and any(x in readme for x in ['`v77.0.49`','`v77.0.50`','`v77.0.52`']), 'README retains V77.0.49 history under the V77.0.50-or-newer stable target')
ok([p.name for p in ROOT.glob('*.md')]==['README.md'], 'Source keeps one consolidated root Markdown history document')
ok(any(x in prev for x in ['v77-0-49','v77-0-50','v77-0-52']) and 'V77.0.49' in prev, 'V77.0.48 verifier remains forward-compatible through V77.0.50')
ok('Current release:** V77.0.50' in v29 and '`v77.0.50`' in v29, 'V77.0.29 forward-compatibility chain accepts the V77.0.50 stable target')

passed=sum(checks)
print(f"\nV77.0.49 release staging whitespace preflight verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed==len(checks) else 1)
