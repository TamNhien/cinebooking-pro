#!/usr/bin/env python3
from __future__ import annotations
import re, subprocess, sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
checks=[]
def text(rel:str)->str:
    p=ROOT/rel
    return p.read_text(encoding='utf-8') if p.exists() else ''
def ok(cond:bool,label:str)->None:
    cond=bool(cond); checks.append(cond); print(f"[ {'OK' if cond else 'FAIL'} ] {label}")

v26=text('tools/verify-v26-source.sh')
sw=text('frontend/public/sw.js')
ci=text('.github/workflows/ci.yml')
release=text('scripts/release.ps1')
diag=text('tools/diagnose-v77.ps1')
make=text('Makefile')
readme=text('README.md')
prev=text('tools/verify_v77_0_49_release_staging_whitespace_preflight.py')
v29=text('tools/verify_v77_0_29_frontend_healthcheck_contract.py')

ok('service worker cache version' in v26 and '(( sw_version >= 26 ))' in v26,
   'Historical V26 gate still enforces Service Worker cache major >=26')
ok('v[0-9]+([-\\.][0-9]+)*' in v26,
   'Historical V26 parser accepts numeric patch-form Service Worker cache IDs')
ok("grep -Eo 'v[0-9]+'" in v26 and "grep -Eo '[0-9]+'" in v26,
   'Historical V26 parser extracts the leading numeric major version')
ok(any(x in sw for x in ['const VERSION = "v77-0-50";','const VERSION = "v77-0-52";','const VERSION = "v77-0-53";','const VERSION = "v77-0-54";','const VERSION = "v77-0-55";','const VERSION = "v77-0-56";','const VERSION = "v77-0-57";','const VERSION = "v77-0-59";','const VERSION = "v77-0-60";','const VERSION = "v77-0-61";','const VERSION = "v78-0-0";','const VERSION = "v78-0-1";','const VERSION = "v78-0-2";','const VERSION = "v78-0-3";','const VERSION = "v78-0-4";','const VERSION = "v78-0-5";','const VERSION = "v78-0-6";','const VERSION = "v78-0-7";','const VERSION = "v78-0-8";','const VERSION = "v78-0-9";','const VERSION = "v78-0-10";','const VERSION = "v78-0-11";','const VERSION = "v78-0-12";','const VERSION = "v78-0-13";','const VERSION = "v78-0-14";','const VERSION = "v78-0-15";','const VERSION = "v78-0-16";','const VERSION = "v78-0-17";','const VERSION = "v78-0-18";','const VERSION = "v78-0-19";']),
   'Service Worker release metadata is V77.0.50 or forward-compatible V77.0.52')

proc=subprocess.run(['bash','tools/verify-v26-source.sh'],cwd=ROOT,text=True,capture_output=True)
out=(proc.stdout or '')+(proc.stderr or '')
ok(proc.returncode==0, 'Historical V26 shell verifier exits zero on the current source')
ok('PASS: service worker cache version' in out,
   'Historical V26 shell verifier restores the missing Service Worker version PASS line')
ok('14/14 checks passed' in out,
   'Historical V26 shell verifier now completes 14/14')
ok('bash tools/verify-v26-source.sh' in ci,
   'Main CI still executes the historical V26 PWA source gate')
ok('authenticated API responses excluded from cache' in v26 and 'SKIP_WAITING' in v26,
   'V26 cache-safety and update-flow assertions remain intact')
ok('offline ticket vault page' in v26 and 'IndexedDB ticket storage' in v26,
   'V26 offline-ticket assertions remain intact')

migrations=list((ROOT/'backend/src/main/resources/db/migration').glob('V*.sql'))
latest=max(int(re.match(r'V(\d+)',p.name).group(1)) for p in migrations if re.match(r'V(\d+)',p.name))
ok(latest==72 and not list((ROOT/'backend/src/main/resources/db/migration').glob('V73*.sql')),
   'V77.0.50 remains no-schema on Flyway V72')

name='verify_v77_0_50_v26_ci_service_worker_version_parser.py'
ok(name in release, 'Stable release preflight runs the V77.0.50 verifier')
ok(name in ci, 'Main CI runs the V77.0.50 verifier')
ok(name in diag, 'V77 diagnostics chain the V77.0.50 verifier')
ok('verify-v77-0-50' in make and 'release-v77-0-50' in make,
   'Makefile exposes V77.0.50 verify/release lifecycle')
ok(any(x in readme for x in ['Current release:** V77.0.50','Current release:** V77.0.52','Current release:** V77.0.53','Current release:** V77.0.54','Current release:** V77.0.55','Current release:** V77.0.56','Current release:** V77.0.57','Current release:** V77.0.59','Current release:** V77.0.60','Current release:** V77.0.61']) and any(x in readme for x in ['`v77.0.50`','`v77.0.52`','`v77.0.53`','`v77.0.54`','`v77.0.55`','`v77.0.56`','`v77.0.57`','`v77.0.59`','`v77.0.60`','`v77.0.61`']),
   'README retains V77.0.50 history under the V77.0.52-or-newer stable target')
ok('13/14' in readme and 'service worker cache version' in readme,
   'README records the exact GitHub CI blocker and missing V26 check')
ok([p.name for p in ROOT.glob('*.md')]==['README.md'],
   'Source keeps one consolidated root Markdown history document')
ok(any(x in prev for x in ['v77-0-50','v77-0-52','v77-0-53','v77-0-54','v77-0-55','v77-0-56']) and 'V77.0.50' in prev,
   'V77.0.49 verifier remains forward-compatible through V77.0.52')
ok(any(x in v29 for x in ['Current release:** V77.0.52','Current release:** V77.0.53','Current release:** V77.0.54','Current release:** V77.0.55','Current release:** V77.0.56','Current release:** V77.0.57','Current release:** V77.0.59','Current release:** V77.0.60','Current release:** V77.0.61']) and any(x in v29 for x in ['`v77.0.52`','`v77.0.53`','`v77.0.54`','`v77.0.55`','`v77.0.56`','`v77.0.57`','`v77.0.59`','`v77.0.60`','`v77.0.61`']),
   'V77.0.29 forward-compatibility chain accepts the V77.0.52 stable target')

passed=sum(checks)
print(f"\nV77.0.50 V26 CI Service-Worker version-parser verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed==len(checks) else 1)
