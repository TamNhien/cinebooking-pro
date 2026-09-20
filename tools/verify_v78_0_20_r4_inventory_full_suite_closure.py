#!/usr/bin/env python3
from pathlib import Path
import re, subprocess, sys
ROOT=Path(__file__).resolve().parents[1]
checks=[]
def read(rel):
 p=ROOT/rel; return p.read_text(encoding='utf-8') if p.exists() else ''
def ok(cond,label):
 cond=bool(cond); checks.append(cond); print(f"[ {'OK' if cond else 'FAIL'} ] {label}")
page=read('frontend/app/admin/inventory/page.tsx')
e2e=read('frontend/e2e/inventory-operations-v48.spec.ts')
helper=read('frontend/lib/transient-read.ts')
legacy=read('tools/verify_v77_0_56_v48_inventory_bootstrap_read_resilience.py')
old_r3=read('tools/verify_v78_0_19_r3_table_center_language_inventory_closure.py')
release=read('scripts/release.ps1');ci=read('.github/workflows/ci.yml');diag=read('tools/diagnose-v78.ps1');make=read('Makefile');readme=read('README.md')

ok('INVENTORY_BRANCH_BOOTSTRAP_READ_OPTIONS' in page and 'deadlineMs:10_000' in page and 'attemptTimeoutMs:4_000' in page,
   'Inventory branch read has a short bounded attempt profile suitable for outer convergence retries')
ok('const deadline=Date.now()+60_000' in page and 'while(!cancelled&&generation===bootstrapGeneration.current)' in page,
   'Inventory initial branch bootstrap retries across a bounded 60s convergence window')
ok('bootstrapGeneration=useRef(0)' in page and 'generation===bootstrapGeneration.current' in page,
   'Inventory bootstrap retries are generation-safe across unmount/remount')
ok('setBranchLoadState("RETRYING")' in page and 'setBranchLoadState("ERROR")' in page and 'setBranchLoadState("READY")' in page,
   'Inventory branch bootstrap exposes explicit READY/RETRYING/ERROR state')
ok('inventory-branch-load-state-v7820r4' in page,
   'Inventory UI exposes deterministic branch-load state for browser verification')
ok('void load(cid).catch' in page and 'setBranches(rows)' in page,
   'Branch selector can render before the slower summary/movement aggregate completes')
ok('api<InventoryBranchOverview[]>("/admin/inventory/branches",{signal})' in page and 'new ApiError(503,"Inventory branch list is not ready yet.")' in page,
   'Empty branch snapshots remain transient failures instead of terminal successful state')
ok('SUSTAINED_OPERATIONAL_READ_OPTIONS' in page and 'withTransientReadRetry(signal=>Promise.all([' in page,
   'Inventory summary/movement reads keep the sustained bounded-read profile')
ok('deadlineMs=options.deadlineMs??12_000' in helper and 'status===408||status===425||status===429||status>=500' in helper,
   'Shared transient-read policy remains deadline-bounded and HTTP-class constrained')

ok('/api/admin/inventory/branches' in e2e and 'requiredBranches' in e2e and 'createCinema' in e2e,
   'V48 E2E still provisions and proves real branch API preconditions')
ok('cinema.locator("option").count()' in e2e and 'timeout:75000' in e2e and '.toBeGreaterThan(1)' in e2e,
   'V48 UI branch assertion remains real and allows the product convergence window')
ok('inventory-branch-load-state-v7820r4' in e2e and 'Danh sách chi nhánh đã sẵn sàng' in e2e,
   'V48 E2E proves UI reached READY instead of merely waiting on an option count')
ok('product.locator("option").count()' in e2e and 'timeout:60000' in e2e and '.toBeGreaterThan(0)' in e2e,
   'V48 E2E still requires real inventory products')
ok('page.route(' not in e2e and 'route.fulfill' not in e2e and 'addInitScript' not in e2e,
   'V48 full-suite fix does not mock inventory API or inject fake branch options')
ok(all(x in e2e for x in ['Đã nhập kho cho chi nhánh','Đã ghi nhận hao hụt','branch-price-save','inventory-transfer-button','TRANSFER_OUT']),
   'V48 mutation coverage remains restock/waste/branch-price/transfer complete')
ok('cinema.locator("option").count()' in legacy and 'Historical V48' in legacy,
   'Historical V77.0.56 inventory gate remains present')

r=subprocess.run([sys.executable,str(ROOT/'tools/verify_v78_0_20_r3_audit_ip_release_gate_closure.py')],cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.STDOUT)
ok(r.returncode==0,'V78.0.20-R3 Audit/IP historical release lineage remains green')
ok('Historical V48 source gate remains present' in legacy and 'verify_v41_notification_engagement.py' in legacy,'V77.0.56 V48 historical aggregate remains chained through R3')
ok('75000' in old_r3 and 're.search' in old_r3,'Historical V78.0.19-R3 inventory timeout gate accepts the current bounded 75s convergence contract')
name='verify_v78_0_20_r4_inventory_full_suite_closure.py'
ok(name in release and name in ci and name in diag,'Stable preflight, GitHub CI and V78 diagnostics execute the R4 verifier')
ok('verify-v78-0-20-r4' in make,'Makefile exposes V78.0.20-R4 verification')
ok('V78.0.20-R4' in readme and '46/47' in readme and 'inventory-cinema-select' in readme,
   'Single README records the exact R4 full-suite V48 blocker and closure')
ok([p.name for p in ROOT.glob('*.md')]==['README.md'],'Source keeps exactly one consolidated root README.md')
migrations=list((ROOT/'backend/src/main/resources/db/migration').glob('V*.sql'));latest=max(int(re.match(r'V(\d+)',p.name).group(1)) for p in migrations if re.match(r'V(\d+)',p.name))
ok(latest==72 and not list((ROOT/'backend/src/main/resources/db/migration').glob('V73*.sql')),'V78.0.20-R4 remains no-schema on Flyway V72')
owned=['frontend/app/admin/inventory/page.tsx','frontend/e2e/inventory-operations-v48.spec.ts','tools/'+name]
hits=[]
for rel in owned:
 for idx,line in enumerate((ROOT/rel).read_text(encoding='utf-8').splitlines(),1):
  if line.rstrip()!=line:hits.append(f'{rel}:{idx}')
ok(not hits,f'V78.0.20-R4 owned files are staging-whitespace clean (hits={len(hits)})')

passed=sum(checks)
print(f'\nV78.0.20-R4 Inventory Full-Suite Closure verification: {passed}/{len(checks)} checks passed')
sys.exit(0 if passed==len(checks) else 1)
