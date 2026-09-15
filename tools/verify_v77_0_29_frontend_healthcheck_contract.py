from pathlib import Path
import re, sys

ROOT = Path(__file__).resolve().parents[1]
checks = []

def text(rel):
    p = ROOT / rel
    return p.read_text(encoding="utf-8") if p.exists() else ""

def ok(cond, label):
    cond = bool(cond)
    checks.append(cond)
    print(f"[ {'OK' if cond else 'FAIL'} ] {label}")

compose = text('docker-compose.yml')
dockerfile = text('frontend/Dockerfile')
healthz = text('frontend/app/healthz/route.ts')
v28 = text('tools/verify_v77_0_28_compose_readiness_hydration_gate.py')
layout = text('frontend/app/layout.tsx')
marker = text('frontend/components/RuntimeReadyMarker.tsx')
release = text('scripts/release.ps1')
ci = text('.github/workflows/ci.yml')
diag = text('tools/diagnose-v77.ps1')
make = text('Makefile')
readme = text('README.md')

ok('export const dynamic = "force-dynamic"' in healthz and 'export const revalidate = 0' in healthz,
   'Frontend exposes a dynamic no-cache health route')
ok('new Response("ok\\n"' in healthz and 'status: 200' in healthz and 'no-store' in healthz,
   'Health route returns a deterministic HTTP 200 without cache')
ok('api(' not in healthz and '/api/' not in healthz and 'process.env' not in healthz,
   'Health route has no backend/auth/environment dependency')
ok("require('http')" in compose and "path:'/healthz'" in compose and "r.statusCode===200" in compose,
   'Compose probes the dedicated Next health route with Node core HTTP')
ok("fetch('http://127.0.0.1:3000/login'" not in compose,
   'Compose no longer healthchecks the user-facing login page with fetch')
ok('HOSTNAME: 0.0.0.0' in compose and 'PORT: 3000' in compose,
   'Compose pins the standalone Next bind address and port explicitly')
ok('HOSTNAME=0.0.0.0' in dockerfile and 'PORT=3000' in dockerfile and 'CMD ["node", "server.js"]' in dockerfile,
   'Frontend image pins standalone Next host/port and keeps server.js entrypoint')
ok('backend-1:\n        condition: service_healthy' in compose and 'backend-2:\n        condition: service_healthy' in compose,
   'Frontend still waits for both healthy backend replicas')
ok('frontend:\n        condition: service_healthy' in compose and compose.count('backend-1:\n        condition: service_healthy') >= 2 and compose.count('backend-2:\n        condition: service_healthy') >= 2,
   'Nginx still opens only after frontend and both backend replicas are healthy')
ok('data-cinebooking-runtime-ready="pending"' in layout and 'cinebookingRuntimeReady = "true"' in marker,
   'V77.0.28 hydration readiness contract remains intact')
ok("or \"path:'/healthz'\" in compose" in v28,
   'V77.0.28 historical verifier accepts the forward-compatible health route')

migrations = list((ROOT/'backend/src/main/resources/db/migration').glob('V*.sql'))
latest = max(int(re.match(r'V(\d+)', x.name).group(1)) for x in migrations if re.match(r'V(\d+)', x.name))
ok(latest == 72 and not list((ROOT/'backend/src/main/resources/db/migration').glob('V77*.sql')),
   'V77.0.29 remains no-schema on Flyway V72')

name = 'verify_v77_0_29_frontend_healthcheck_contract.py'
ok(name in release and name in ci and name in diag,
   'Release/CI/diagnostics run the V77.0.29 verifier')
ok('verify-v77-0-29' in make and 'release-v77-0-29' in make,
   'Makefile exposes V77.0.29 verify/release targets')
ok('V77.0.29' in readme and '/healthz' in readme and 'frontend healthcheck' in readme.lower(),
   'README documents the V77.0.29 frontend healthcheck fix')
ok('V77.0.29' in readme and any(x in readme for x in ['Current release:** V77.0.29','Current release:** V77.0.30','Current release:** V77.0.31','Current release:** V77.0.32','Current release:** V77.0.33','Current release:** V77.0.34','Current release:** V77.0.35','Current release:** V77.0.36','Current release:** V77.0.37','Current release:** V77.0.38','Current release:** V77.0.39','Current release:** V77.0.40','Current release:** V77.0.41','Current release:** V77.0.42','Current release:** V77.0.43','Current release:** V77.0.44','Current release:** V77.0.45','Current release:** V77.0.46','Current release:** V77.0.47','Current release:** V77.0.48','Current release:** V77.0.49','Current release:** V77.0.50','Current release:** V77.0.52','Current release:** V77.0.53','Current release:** V77.0.54']) and any(x in readme for x in ['`v77.0.29`','`v77.0.30`','`v77.0.31`','`v77.0.32`','`v77.0.33`','`v77.0.34`','`v77.0.35`','`v77.0.36`','`v77.0.37`','`v77.0.38`','`v77.0.39`','`v77.0.40`','`v77.0.41`','`v77.0.42`','`v77.0.43`','`v77.0.44`','`v77.0.45`','`v77.0.46`','`v77.0.47`','`v77.0.48`','`v77.0.49`','`v77.0.50`','`v77.0.52`','`v77.0.53`','`v77.0.54`']),
   'README retains V77.0.29 history and a V77.0.29-or-newer stable target')

passed = sum(checks)
print(f"\nV77.0.29 frontend healthcheck contract verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed == len(checks) else 1)
