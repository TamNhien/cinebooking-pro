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

inventory=text('frontend/app/admin/inventory/page.tsx')
helper=text('frontend/lib/transient-read.ts')
e2e=text('frontend/e2e/inventory-operations-v48.spec.ts')
legacy=text('tools/verify_v48_concession_inventory_2.py')
ci=text('.github/workflows/ci.yml')
release=text('scripts/release.ps1')
diag=text('tools/diagnose-v77.ps1')
make=text('Makefile')
readme=text('README.md')
sw=text('frontend/public/sw.js')
prev=text('tools/verify_v77_0_55_v31_2_confirmed_status_contract_compatibility.py')
v29=text('tools/verify_v77_0_29_frontend_healthcheck_contract.py')

ok(('import { withTransientReadRetry } from "@/lib/transient-read";' in inventory or 'withTransientReadRetry } from "@/lib/transient-read";' in inventory),
   'Inventory Admin uses the shared bounded transient-read helper')
ok('api<InventoryBranchOverview[]>("/admin/inventory/branches",{signal})' in inventory,
   'Inventory branch bootstrap is abortable and retryable')
ok('withTransientReadRetry(signal=>Promise.all([' in inventory and
   'api<InventorySummary>(`/admin/inventory?cinemaId=${encodeURIComponent(cid)}`,{signal})' in inventory and
   'api<InventoryMovement[]>(`/admin/inventory/movements?${query}`,{signal})' in inventory,
   'Inventory summary and movement bootstrap share one bounded read attempt')
ok(inventory.count('withTransientReadRetry(') >= 4,
   'Inventory history scope reads also use bounded transient resilience')
ok('api<InventoryProduct>("/admin/inventory/adjustments",{method:"POST"' in inventory and
   'api("/admin/inventory/prices",{method:"PUT"' in inventory and
   'api<InventoryTransfer>("/admin/inventory/transfers",{method:"POST"' in inventory,
   'Inventory mutations remain direct non-retried writes')
ok('deadlineMs=options.deadlineMs??12_000' in helper and 'attemptTimeoutMs=options.attemptTimeoutMs??3_500' in helper,
   'Shared retry remains deadline-bounded')
ok('status===408||status===425||status===429||status>=500' in helper,
   'Shared retry remains limited to transient HTTP classes')
ok('error instanceof ApiError?error.status:0' in helper,
   'Shared retry still distinguishes API status failures')
ok('status===401' not in helper and 'status===403' not in helper,
   'Authentication and authorization failures are not promoted to retryable reads')

ok('/api/admin/inventory/branches' in e2e and ('expect(existingBranches.ok()).toBeTruthy()' in e2e or ('branchSnapshot()' in e2e and 'expect(response.ok()).toBeTruthy()' in e2e)),
   'V48 E2E still proves the real branch endpoint before UI navigation')
ok('cinema.locator("option").count()' in e2e and '.toBeGreaterThan(1)' in e2e,
   'V48 E2E still requires more than one real cinema option')
ok('product.locator("option").count()' in e2e and '.toBeGreaterThan(0)' in e2e,
   'V48 E2E still requires real inventory products')
ok(all(x in e2e for x in ['Đã nhập kho cho chi nhánh','Đã ghi nhận hao hụt','branch-price-save','inventory-transfer-button','TRANSFER_OUT']),
   'V48 E2E still covers restock waste price and transfer mutations')
ok('Dedicated V48 E2E covers restock waste branch price and transfer' in legacy,
   'Historical V48 source gate remains present')

ok(any(x in sw for x in ['const VERSION = "v77-0-56";','const VERSION = "v77-0-57";','const VERSION = "v77-0-59";','const VERSION = "v77-0-60";','const VERSION = "v77-0-61";','const VERSION = "v78-0-0";','const VERSION = "v78-0-1";','const VERSION = "v78-0-2";','const VERSION = "v78-0-3";','const VERSION = "v78-0-4";','const VERSION = "v78-0-5";','const VERSION = "v78-0-6";','const VERSION = "v78-0-7";','const VERSION = "v78-0-8";','const VERSION = "v78-0-9";','const VERSION = "v78-0-10";','const VERSION = "v78-0-11";','const VERSION = "v78-0-12";','const VERSION = "v78-0-13";','const VERSION = "v78-0-14";','const VERSION = "v78-0-15";','const VERSION = "v78-0-16";','const VERSION = "v78-0-17";','const VERSION = "v78-0-18";','const VERSION = "v78-0-19";','const VERSION = "v78-0-20";']),
   'Service Worker release metadata is V77.0.56 or forward-compatible V77.0.57')
migrations=list((ROOT/'backend/src/main/resources/db/migration').glob('V*.sql'))
latest=max(int(re.match(r'V(\d+)',p.name).group(1)) for p in migrations if re.match(r'V(\d+)',p.name))
ok(latest==72 and not list((ROOT/'backend/src/main/resources/db/migration').glob('V73*.sql')),
   'V77.0.56 remains no-schema on Flyway V72')
name='verify_v77_0_56_v48_inventory_bootstrap_read_resilience.py'
ok(name in release,'Stable release preflight runs the V77.0.56 verifier')
ok(name in ci,'Main CI runs the V77.0.56 verifier')
ok(name in diag,'V77 diagnostics chain the V77.0.56 verifier')
ok('verify-v77-0-56' in make and 'release-v77-0-56' in make,
   'Makefile exposes V77.0.56 verify/release lifecycle')
ok(any(x in readme for x in ['Current release:** V77.0.56','Current release:** V77.0.57','Current release:** V77.0.59','Current release:** V77.0.60','Current release:** V77.0.61']) and any(x in readme for x in ['`v77.0.56`','`v77.0.57`','`v77.0.59`','`v77.0.60`','`v77.0.61`']),
   'README retains V77.0.56 history under the V77.0.57-or-newer stable target')
ok('45/46' in readme and 'inventory-cinema-select' in readme and 'bounded' in readme.lower(),
   'README records the exact V48 full-suite blocker and bounded-read fix')
ok([p.name for p in ROOT.glob('*.md')]==['README.md'],
   'Source keeps one consolidated root Markdown history document')
ok(any(x in prev for x in ['v77-0-56','v77-0-57','v77-0-59','v77-0-60','V77.0.56','V77.0.57','V77.0.59','V77.0.60','V77.0.61']),
   'V77.0.55 verifier is forward-compatible with V77.0.57 release metadata')
ok(any(x in v29 for x in ['Current release:** V77.0.56','Current release:** V77.0.57','Current release:** V77.0.59','Current release:** V77.0.60','Current release:** V77.0.61']) and any(x in v29 for x in ['`v77.0.56`','`v77.0.57`','`v77.0.59`','`v77.0.60`','`v77.0.61`']),
   'V77.0.29 forward-compatibility chain accepts the V77.0.57 stable target')

# Replay the historical CI gates that were proven stale during the V77.0.56 sweep.
historical_gates=[
    ('V36 ticket transfer','verify_v36_ticket_transfer.py'),
    ('V37 payment gateway','verify_v37_payment_gateway.py'),
    ('V38 refund automation','verify_v38_refund_automation.py'),
    ('V40 loyalty membership','verify_v40_loyalty_membership.py'),
    ('V41 notification engagement','verify_v41_notification_engagement.py'),
    ('V42 financial ledger','verify_v42_financial_ledger.py'),
    ('V47 payment operations','verify_v47_payment_gateway_operations.py'),
    ('V49 smart showtime planning','verify_v49_smart_showtime_planning_2.py'),
    ('V51 UTF-8 real-data','verify_v51_utf8_real_data.py'),
    ('V52 PWA/mobile','verify_v52_pwa_mobile_3.py'),
    ('V58 operations control','verify_v58_operations_control_center.py'),
]
for label,gate in historical_gates:
    run=subprocess.run([sys.executable,str(ROOT/'tools'/gate)],cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
    ok(run.returncode==0,f'Historical {label} gate is forward-compatible with current source')

passed=sum(checks)
print(f"\nV77.0.56 V48 inventory bootstrap read-resilience verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed==len(checks) else 1)
