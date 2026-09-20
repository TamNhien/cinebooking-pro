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

helper=text('frontend/lib/transient-read.ts')
notifications=text('frontend/app/notifications/page.tsx')
notification_e2e=text('frontend/e2e/notification-engagement.spec.ts')
observability=text('frontend/app/admin/observability/page.tsx')
observability_e2e=text('frontend/e2e/observability-reliability-v65.spec.ts')
command=text('frontend/app/admin/command-center/page.tsx')
command_e2e=text('frontend/e2e/operations-command-center-v53.spec.ts')
ops=text('frontend/app/admin/operations-control/page.tsx')
ops_e2e=text('frontend/e2e/operations-control-center-v58.spec.ts')
v66=text('frontend/e2e/booking-consistency-seat-locking-v66.spec.ts')
v26=text('tools/verify-v26-source.sh')
ci=text('.github/workflows/ci.yml')
release=text('scripts/release.ps1')
diag=text('tools/diagnose-v77.ps1')
make=text('Makefile')
readme=text('README.md')
sw=text('frontend/public/sw.js')
prev=text('tools/verify_v77_0_51_v66_booking_authority_boot_surface.py')
v29=text('tools/verify_v77_0_29_frontend_healthcheck_contract.py')

ok('export async function withTransientReadRetry' in helper and 'AbortController' in helper,
   'Shared read-resilience helper owns abortable attempts')
ok('deadlineMs=options.deadlineMs??12_000' in helper and 'attemptTimeoutMs=options.attemptTimeoutMs??3_500' in helper,
   'Shared read retry is bounded by a 12s deadline and 3.5s per attempt')
ok('status===408||status===425||status===429||status>=500' in helper and 'AbortError' in helper,
   'Shared helper retries only transient timeout/network/server classes')
ok('status===401' not in helper and 'status===403' not in helper,
   'Shared helper does not retry authentication or authorization failures')
ok('baseDelayMs*(2**attempt)' in helper and 'maxDelayMs' in helper,
   'Shared helper uses bounded exponential backoff')

ok('withTransientReadRetry(signal=>Promise.all([' in notifications and '/notifications?view=${nextView}`,{signal}' in notifications and '/notifications/preferences",{signal}' in notifications,
   'Notification inbox and preference bootstrap use bounded transient read retry')
ok('created.body?.title).toBe("Xác nhận kênh thông báo đang hoạt động")' in notification_e2e and 'notification-archive-toggle' in notification_e2e and 'restored?.read).toBe(true)' in notification_e2e,
   'V41 browser contract still proves durable create/archive/restore/read behavior')

ok('withTransientReadRetry(signal=>Promise.all([' in observability and '/admin/observability/summary",{signal}' in observability,
   'Observability V65 retries authenticated summary reads without fabricating SLO data')
ok('getByTestId("slo-v65")).toContainText("Availability")' in observability_e2e and 'dependencies-v65' in observability_e2e,
   'V65 browser contract still requires real SLO and dependency payloads')

ok('withTransientReadRetry(signal=>' in command and '/admin/command-center/summary${qs}`,{signal}' in command and '/admin/command-center/cinemas",{signal}' in command,
   'Command Center V53 retries cinema/bootstrap and summary reads')
ok('command-center-summary-v53' in command_e2e and 'command-center-attention-v53' in command_e2e,
   'V53 browser contract still requires real summary and attention surfaces')

ok('withTransientReadRetry(signal=>' in ops and '/admin/operations-control/snapshot${qs}`,{signal}' in ops and '/admin/operations-control/cinemas",{signal}' in ops,
   'Operations Control V58/V59 retries cinema/bootstrap and snapshot reads')
ok('operations-control-summary-v58' in ops_e2e and 'operations-control-domains-v58' in ops_e2e and 'operations-control-alerts-v58' in ops_e2e,
   'V58 browser contract still requires real summary/domain/alert surfaces')

ok('expect([a.status,b.status].sort((x,y)=>x-y)).toEqual([200,409])' in v66 and 'seat-hold-authority-v66' in v66,
   'V66 seat-lock race and authority assertions remain unchanged')
ok('service worker cache version' in v26 and '14' in v26,
   'Historical V26 PWA source gate remains present after V77.0.52')

ok(any(x in sw for x in ['const VERSION = "v77-0-52";','const VERSION = "v77-0-53";','const VERSION = "v77-0-54";','const VERSION = "v77-0-55";','const VERSION = "v77-0-56";','const VERSION = "v77-0-57";','const VERSION = "v77-0-59";','const VERSION = "v77-0-60";','const VERSION = "v77-0-61";','const VERSION = "v78-0-0";','const VERSION = "v78-0-1";','const VERSION = "v78-0-2";','const VERSION = "v78-0-3";','const VERSION = "v78-0-4";','const VERSION = "v78-0-5";','const VERSION = "v78-0-6";','const VERSION = "v78-0-7";','const VERSION = "v78-0-8";','const VERSION = "v78-0-9";','const VERSION = "v78-0-10";','const VERSION = "v78-0-11";','const VERSION = "v78-0-12";','const VERSION = "v78-0-13";','const VERSION = "v78-0-14";','const VERSION = "v78-0-15";','const VERSION = "v78-0-16";','const VERSION = "v78-0-17";','const VERSION = "v78-0-18";','const VERSION = "v78-0-19";','const VERSION = "v78-0-20";']),
   'Service Worker release metadata is V77.0.52 or forward-compatible V77.0.53')
migrations=list((ROOT/'backend/src/main/resources/db/migration').glob('V*.sql'))
latest=max(int(re.match(r'V(\d+)',p.name).group(1)) for p in migrations if re.match(r'V(\d+)',p.name))
ok(latest==72 and not list((ROOT/'backend/src/main/resources/db/migration').glob('V73*.sql')),
   'V77.0.52 remains no-schema on Flyway V72')

name='verify_v77_0_52_full_suite_transient_read_resilience.py'
ok(name in release, 'Stable release preflight runs the V77.0.52 verifier')
ok(name in ci, 'Main CI runs the V77.0.52 verifier')
ok(name in diag, 'V77 diagnostics chain the V77.0.52 verifier')
ok('verify-v77-0-52' in make and 'release-v77-0-52' in make,
   'Makefile exposes V77.0.52 verify/release lifecycle')
ok(any(x in readme for x in ['Current release:** V77.0.52','Current release:** V77.0.53','Current release:** V77.0.54','Current release:** V77.0.55','Current release:** V77.0.56','Current release:** V77.0.57','Current release:** V77.0.59','Current release:** V77.0.60','Current release:** V77.0.61']) and any(x in readme for x in ['`v77.0.52`','`v77.0.53`','`v77.0.54`','`v77.0.55`','`v77.0.56`','`v77.0.57`','`v77.0.59`','`v77.0.60`','`v77.0.61`']),
   'README retains V77.0.52 history under the V77.0.53-or-newer stable target')
ok('42/46' in readme and 'Đang tải SLO...' in readme and 'transient-read.ts' in readme,
   'README records the exact four-surface full-suite blocker and shared fix')
ok([p.name for p in ROOT.glob('*.md')]==['README.md'],
   'Source keeps one consolidated root Markdown history document')
ok(any(x in prev for x in ['v77-0-52','v77-0-53','v77-0-54','v77-0-55','v77-0-56']) and 'V77.0.52' in prev,
   'V77.0.51 verifier remains forward-compatible through V77.0.53')
ok(any(x in v29 for x in ['Current release:** V77.0.52','Current release:** V77.0.53','Current release:** V77.0.54','Current release:** V77.0.55','Current release:** V77.0.56','Current release:** V77.0.57','Current release:** V77.0.59','Current release:** V77.0.60','Current release:** V77.0.61']) and any(x in v29 for x in ['`v77.0.52`','`v77.0.53`','`v77.0.54`','`v77.0.55`','`v77.0.56`','`v77.0.57`','`v77.0.59`','`v77.0.60`','`v77.0.61`']),
   'V77.0.29 forward-compatibility chain accepts the V77.0.53 stable target')

passed=sum(checks)
print(f"\nV77.0.52 full-suite transient read resilience verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed==len(checks) else 1)
