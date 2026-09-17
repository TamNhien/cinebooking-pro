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

page=text('frontend/app/admin/maintenance/page.tsx')
e2e=text('frontend/e2e/maintenance-blackout.spec.ts')
legacy=text('tools/verify_v34_auditorium_blackouts.py')
ci=text('.github/workflows/ci.yml')
release=text('scripts/release.ps1')
diag=text('tools/diagnose-v77.ps1')
make=text('Makefile')
readme=text('README.md')
sw=text('frontend/public/sw.js')
prev=text('tools/verify_v77_0_59_v41_notification_identity_stability.py')
v29=text('tools/verify_v77_0_29_frontend_healthcheck_contract.py')
helper=text('frontend/lib/transient-read.ts')

ok('import { withTransientReadRetry } from "@/lib/transient-read";' in page,'Maintenance Admin uses the shared bounded transient-read helper')
ok('withTransientReadRetry((signal) => api<MaintenanceCinema[]>("/admin/maintenance/cinemas", { signal }))' in page,'Maintenance cinema bootstrap is abortable and transient-resilient')
ok('const loadGenerationRef = useRef(0);' in page,'Maintenance page owns a monotonic load generation')
ok('const generation = ++loadGenerationRef.current;' in page,'Every maintenance cinema snapshot receives a new generation')
ok('const read = <T,>(path: string) => withTransientReadRetry' in page,'Maintenance snapshot GETs share the bounded read contract')
ok(all(x in page for x in ['read<MaintenanceSummary>','read<MaintenanceAsset[]>','read<MaintenanceWorkOrder[]>','read<MaintenanceAuditorium[]>','read<MaintenanceStaff[]>','read<MaintenanceIncident[]>']),'Maintenance core snapshot reads are batched through the owned generation')
ok('canReadBlackouts ? read<AuditoriumBlackout[]>("/admin/auditorium-blackouts")' in page,'Admin blackout feed is committed with the selected-cinema snapshot')
ok(page.count('if (generation !== loadGenerationRef.current) return;') >= 2,'Superseded maintenance success and error paths cannot overwrite current state')
commit_order=['setSummary(sum);','setAssets(assetItems);','setOrders(workOrders);','setAuditoriums(rooms);','setStaff(people);','setIncidents(incidentItems);','setBlackouts(blackoutItems)']
ok(all(x in page for x in commit_order),'Maintenance snapshot commits summary/assets/orders/auditoriums/staff/incidents/blackouts together')
ok('deadlineMs=options.deadlineMs??12_000' in helper and 'attemptTimeoutMs=options.attemptTimeoutMs??3_500' in helper,'Shared read retry remains deadline-bounded')
ok('status===408||status===425||status===429||status>=500' in helper,'Shared read retry remains restricted to transient HTTP classes')
ok('status===401' not in helper and 'status===403' not in helper,'Authentication/authorization failures are not promoted to retryable reads')
ok('await api("/admin/auditorium-blackouts", {' in page and 'method: "POST"' in page,'Blackout creation mutation remains a direct write')
ok('await api(`/admin/auditorium-blackouts/${id}`, { method: "DELETE" })' in page,'Blackout deletion mutation remains a direct write')
ok('data-testid="maintenance-blackout-card" data-blackout-id={item.id}' in page,'Maintenance blackout cards expose exact durable blackout identity')
ok('page.waitForResponse(response => new URL(response.url()).pathname === "/api/admin/auditorium-blackouts"' in e2e and 'response.request().method() === "POST"' in e2e,'V34 E2E synchronizes the real blackout creation response')
ok('expect(createBlackoutResponse.status()).toBe(201)' in e2e,'V34 E2E requires the backend create status')
ok('const createdBlackout = await createBlackoutResponse.json() as { id:string; reason:string }' in e2e and 'expect(createdBlackout.reason).toBe(reason)' in e2e,'V34 E2E captures and validates the created blackout identity')
ok(e2e.count('data-blackout-id="${createdBlackout.id}"') >= 2,'V34 E2E reuses the exact blackout UUID for creation visibility and cleanup')
ok('const cleanupCinema = page.getByLabel("Rạp bảo trì")' in e2e and e2e.count('selectOption({ label: "CineHub Quận 1" })') >= 2,'V34 E2E still re-pins the migration-backed cinema before cleanup')
ok('await expect(blackoutCard).toContainText(reason)' in e2e,'V34 E2E still proves the blackout reason on the exact card')
ok('await blackoutCard.getByRole("button", { name: "Mở lại phòng" }).click()' in e2e and 'await expect(blackoutCard).toHaveCount(0)' in e2e,'V34 E2E still deletes the blackout through the UI')
ok('Có thể tạo: 0' in e2e and 'Trùng lịch: 1' in e2e and 'Xung đột: Bảo trì' in e2e,'V34 E2E still proves planner conflict semantics')
ok('test.setTimeout' not in e2e and 'timeout:30_000' not in e2e,'V34 fix does not increase Playwright timeout budgets')
run=subprocess.run([sys.executable,str(ROOT/'tools/verify_v34_auditorium_blackouts.py')],cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
ok(run.returncode==0,'Historical V34 blackout source gate remains green')

ok(any(x in sw for x in ['const VERSION = "v77-0-60";','const VERSION = "v77-0-61";','const VERSION = "v78-0-0";','const VERSION = "v78-0-1";','const VERSION = "v78-0-2";','const VERSION = "v78-0-3";','const VERSION = "v78-0-4";','const VERSION = "v78-0-5";','const VERSION = "v78-0-6";','const VERSION = "v78-0-7";','const VERSION = "v78-0-8";','const VERSION = "v78-0-9";','const VERSION = "v78-0-10";','const VERSION = "v78-0-11";','const VERSION = "v78-0-12";','const VERSION = "v78-0-13";','const VERSION = "v78-0-14";','const VERSION = "v78-0-15";','const VERSION = "v78-0-16";','const VERSION = "v78-0-17";','const VERSION = "v78-0-18";']),'Service Worker release metadata advances to V77.0.60 or a forward-compatible patch')
migrations=list((ROOT/'backend/src/main/resources/db/migration').glob('V*.sql'))
latest=max(int(re.match(r'V(\d+)',p.name).group(1)) for p in migrations if re.match(r'V(\d+)',p.name))
ok(latest==72 and not list((ROOT/'backend/src/main/resources/db/migration').glob('V73*.sql')),'V77.0.60 remains no-schema on Flyway V72')
name='verify_v77_0_60_v34_maintenance_load_ownership.py'
ok(name in release,'Stable release preflight runs the V77.0.60 verifier')
ok(name in ci,'Main CI runs the V77.0.60 verifier')
ok(name in diag,'V77 diagnostics chain the V77.0.60 verifier')
ok('verify-v77-0-60' in make and 'release-v77-0-60' in make,'Makefile exposes V77.0.60 verify/release lifecycle')
ok(any(x in readme for x in ['Current release:** V77.0.60','Current release:** V77.0.61']) and any(x in readme for x in ['`v77.0.60`','`v77.0.61`']),'README records V77.0.60 or a forward-compatible stable target')
ok('45/46' in readme and 'loadGenerationRef' in readme and 'latest-generation-owned' in readme,'README records the exact maintenance stale-load blocker and ownership fix')
ok([p.name for p in ROOT.glob('*.md')]==['README.md'],'Source keeps one consolidated root Markdown history document')
ok(any(x in prev for x in ['v77-0-60','V77.0.60','V77.0.61']),'V77.0.59 verifier is forward-compatible with V77.0.60 release metadata')
ok(any(x in v29 for x in ['Current release:** V77.0.60','Current release:** V77.0.61']) and any(x in v29 for x in ['`v77.0.60`','`v77.0.61`']),'V77.0.29 forward-compatibility chain accepts V77.0.60 or a later patch target')

passed=sum(checks)
print(f"\nV77.0.60 V34 maintenance load-ownership verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed==len(checks) else 1)
