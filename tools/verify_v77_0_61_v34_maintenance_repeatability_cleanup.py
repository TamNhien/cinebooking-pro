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
prev=text('tools/verify_v77_0_60_v34_maintenance_load_ownership.py')
ci=text('.github/workflows/ci.yml')
release=text('scripts/release.ps1')
diag=text('tools/diagnose-v77.ps1')
make=text('Makefile')
readme=text('README.md')
sw=text('frontend/public/sw.js')
v29=text('tools/verify_v77_0_29_frontend_healthcheck_contract.py')

ok('data-testid="maintenance-blackout-card" data-blackout-id={item.id} data-auditorium-id={item.auditoriumId}' in page,
   'Maintenance blackout cards expose durable auditorium identity')
ok('data-blackout-start={item.startTime}' in page and 'data-blackout-end={item.endTime}' in page,
   'Maintenance blackout cards expose durable window boundaries')
ok('const auditoriumId = await maintenanceRoom.inputValue();' in e2e,
   'V34 E2E captures the exact selected auditorium UUID')
ok('Date.parse("2026-10-01T10:00:00+07:00")' in e2e and 'Date.parse("2026-10-01T13:00:00+07:00")' in e2e,
   'V34 E2E pins stale-window matching to Vietnam timezone instants')
ok('data-auditorium-id="${auditoriumId}"' in e2e and '.filter({ hasText: reason })' in e2e,
   'V34 E2E limits stale cleanup candidates to the selected auditorium and test reason')
ok('Date.parse(start) === expectedStart' in e2e and 'Date.parse(end) === expectedEnd' in e2e,
   'V34 E2E only identifies an exact leftover window')
ok('if (staleIndex < 0) break;' in e2e,
   'V34 E2E skips pre-cleanup when no exact leftover exists')
ok('const staleId = await staleCard.getAttribute("data-blackout-id")' in e2e and 'expect(staleId).toBeTruthy()' in e2e and 'const staleIdentityCard = page.locator' in e2e,
   'V34 E2E binds stale cleanup to the durable blackout UUID')
ok('page.once("dialog", dialog => dialog.accept());' in e2e,
   'V34 stale cleanup still confirms the real UI action')
ok('`/api/admin/auditorium-blackouts/${staleId}`' in e2e and 'response.request().method() === "DELETE"' in e2e,
   'V34 stale cleanup synchronizes the exact real DELETE mutation')
ok('expect(deleteResponse.status()).toBe(204)' in e2e,
   'V34 stale cleanup requires backend DELETE success')
ok('await expect(staleIdentityCard).toHaveCount(0)' in e2e,
   'V34 stale cleanup proves the exact leftover identity is gone before recreation')
ok('response.request().method() === "POST"' in e2e and 'expect(createBlackoutResponse.status()).toBe(201)' in e2e,
   'V34 fresh blackout creation still requires real HTTP 201')
ok('createBlackoutResponse.status()).toBe(409)' not in e2e and 'status()).toBe(409)' not in e2e,
   'V34 does not accept overlap conflict 409 as a successful create')
ok('createdBlackout.id' in e2e and e2e.count('data-blackout-id="${createdBlackout.id}"') >= 2,
   'V34 fresh blackout still uses exact durable identity through cleanup')
ok('Có thể tạo: 0' in e2e and 'Trùng lịch: 1' in e2e and 'Xung đột: Bảo trì' in e2e,
   'V34 planner conflict semantics remain strict')
ok('test.setTimeout' not in e2e and 'timeout:30_000' not in e2e,
   'V34 repeatability fix does not increase Playwright timeout budgets')
ok('page.request.delete' not in e2e and 'request.delete' not in e2e,
   'V34 repeatability cleanup remains UI-driven rather than direct test mutation')
run=subprocess.run([sys.executable,str(ROOT/'tools/verify_v34_auditorium_blackouts.py')],cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
ok(run.returncode==0,'Historical V34 blackout source gate remains green')

ok('const VERSION = "v77-0-61";' in sw,'Service Worker release metadata advances to V77.0.61')
migrations=list((ROOT/'backend/src/main/resources/db/migration').glob('V*.sql'))
latest=max(int(re.match(r'V(\d+)',p.name).group(1)) for p in migrations if re.match(r'V(\d+)',p.name))
ok(latest==72 and not list((ROOT/'backend/src/main/resources/db/migration').glob('V73*.sql')),'V77.0.61 remains no-schema on Flyway V72')
name='verify_v77_0_61_v34_maintenance_repeatability_cleanup.py'
ok(name in release,'Stable release preflight runs the V77.0.61 verifier')
ok(name in ci,'Main CI runs the V77.0.61 verifier')
ok(name in diag,'V77 diagnostics chain the V77.0.61 verifier')
ok('verify-v77-0-61' in make and 'release-v77-0-61' in make,'Makefile exposes V77.0.61 verify/release lifecycle')
ok('Current release:** V77.0.61' in readme and '`v77.0.61`' in readme,'README records V77.0.61 as the stable target')
ok('409' in readme and 'repeatable' in readme.lower() and 'V77.0.61' in readme,'README records the stale-blackout repeatability blocker and fix')
ok([p.name for p in ROOT.glob('*.md')]==['README.md'],'Source keeps one consolidated root Markdown history document')
ok(any(x in prev for x in ['v77-0-61','V77.0.61']),'V77.0.60 verifier is forward-compatible with V77.0.61 release metadata')
ok('Current release:** V77.0.61' in v29 and '`v77.0.61`' in v29,'V77.0.29 forward-compatibility chain accepts the V77.0.61 stable target')

passed=sum(checks)
print(f"\nV77.0.61 V34 maintenance repeatability cleanup verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed==len(checks) else 1)
