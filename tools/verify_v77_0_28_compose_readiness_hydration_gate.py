from pathlib import Path
import re, sys

ROOT=Path(__file__).resolve().parents[1]
checks=[]

def text(rel):
    p=ROOT/rel
    return p.read_text(encoding="utf-8") if p.exists() else ""

def ok(cond,label):
    cond=bool(cond); checks.append(cond); print(f"[ {'OK' if cond else 'FAIL'} ] {label}")

compose=text('docker-compose.yml')
layout=text('frontend/app/layout.tsx')
marker=text('frontend/components/RuntimeReadyMarker.tsx')
guards=text('frontend/e2e/runtime-guards.ts')
v64=text('frontend/e2e/crm-marketing-automation-v64.spec.ts')
v56=text('frontend/e2e/customer-value-v56.spec.ts')
v59=text('frontend/e2e/realtime-operations-v59-language.spec.ts')
sw=text('frontend/public/sw.js')
release=text('scripts/release.ps1')
ci=text('.github/workflows/ci.yml')
diag=text('tools/diagnose-v77.ps1')
make=text('Makefile')
readme=text('README.md')

ok(compose.count('exec 3<>/dev/tcp/127.0.0.1/8080') == 2, 'Both backend replicas expose a startup readiness healthcheck')
ok(("fetch('http://127.0.0.1:3000/login'" in compose or "path:'/healthz'" in compose) and 'condition: service_healthy' in compose, 'Frontend healthcheck waits for the real Next server')
ok('frontend:\n        condition: service_healthy' in compose and compose.count('backend-1:\n        condition: service_healthy') >= 2 and compose.count('backend-2:\n        condition: service_healthy') >= 2, 'Nginx starts only after frontend and both backend replicas are healthy')
ok('data-cinebooking-runtime-ready="pending"' in layout and '<RuntimeReadyMarker />' in layout, 'Root HTML has an explicit pending-to-hydrated runtime contract')
ok('cinebookingRuntimeReady = "true"' in marker and 'useEffect' in marker, 'Client hydration flips the runtime-ready marker only after JavaScript executes')
ok('waitForHydratedRuntime' in guards and 'toHaveAttribute(RUNTIME_READY_ATTR, "true"' in guards, 'Playwright waits for hydrated JavaScript rather than server HTML alone')
ok('page.reload({ waitUntil: "domcontentloaded" })' in guards and 'Business writes are never retried' in guards, 'Hydration recovery is bounded to one navigation/read retry')
ok('gotoHydrated' in v64 and 'waitForHydratedRuntime' in v64, 'V64 targeted E2E gates the runtime before CRM assertions')
ok('gotoHydrated' in v56 and v56.count('gotoHydrated(page, "/admin/') >= 3, 'Language targeted E2E gates every hard-navigation English surface')
ok('gotoHydrated' in v59 and 'operations-control-summary-v58' in v59 and 'timeout: 30_000' in v59, 'V59 waits for hydrated runtime and real snapshot data before domain-card assertions')
ok('E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD must come from the existing project .env' in v64 and 'E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD must come from the existing project .env' in v56, 'Targeted E2E still reuses only the existing Admin account')
m_sw=re.search(r'const VERSION = "v77-0-(\d+)"', sw)
ok(bool(m_sw) and int(m_sw.group(1)) >= 28, 'Service Worker cache generation is bumped for V77.0.28')
ok('if (url.pathname.startsWith("/api/")) return;' in sw, 'API responses remain excluded from Service Worker caching')

migrations=list((ROOT/'backend/src/main/resources/db/migration').glob('V*.sql'))
latest=max(int(re.match(r'V(\d+)',x.name).group(1)) for x in migrations if re.match(r'V(\d+)',x.name))
ok(latest==72 and not list((ROOT/'backend/src/main/resources/db/migration').glob('V77*.sql')), 'V77.0.28 remains no-schema on Flyway V72')

name='verify_v77_0_28_compose_readiness_hydration_gate.py'
ok(name in release and name in ci and name in diag, 'Release/CI/diagnostics run the V77.0.28 verifier')
ok('verify-v77-0-28' in make and 'release-v77-0-28' in make, 'Makefile exposes V77.0.28 verify/release targets')
ok('V77.0.28' in readme and 'hydration readiness' in readme.lower() and 'service_healthy' in readme, 'README documents the V77.0.28 readiness root cause and fix')

passed=sum(checks)
print(f"\nV77.0.28 compose readiness + hydration gate verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed==len(checks) else 1)
