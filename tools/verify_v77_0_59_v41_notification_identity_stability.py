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

ui=text('frontend/app/notifications/page.tsx')
e2e=text('frontend/e2e/notification-engagement.spec.ts')
legacy=text('tools/verify_v41_notification_engagement.py')
ci=text('.github/workflows/ci.yml')
release=text('scripts/release.ps1')
diag=text('tools/diagnose-v77.ps1')
make=text('Makefile')
readme=text('README.md')
sw=text('frontend/public/sw.js')
prev=text('tools/verify_v77_0_58_v41_notification_read_mutation_synchronization.py')
v29=text('tools/verify_v77_0_29_frontend_healthcheck_contract.py')

ok('data-testid="notification-card" data-notification-id={n.id}' in ui,'Notification cards expose exact notification identity')
ok('data-testid="notification-open" data-notification-id={n.id}' in ui,'Notification open actions expose exact notification identity')
ok('notificationCard=()=>page.locator(`[data-testid="notification-card"][data-notification-id="${id}"]`)' in e2e,'V41 E2E selects the exact notification card by UUID')
ok('notificationOpen=()=>page.locator(`[data-testid="notification-open"][data-notification-id="${id}"]`)' in e2e,'V41 E2E selects the exact open action by UUID')
ok('.filter({ hasText:"Xác nhận kênh thông báo đang hoạt động" }).first()' not in e2e,'V41 E2E no longer identifies mutable list rows by repeated title plus first')
ok('expect(card).toContainText("Xác nhận kênh thông báo đang hoạt động")' in e2e,'V41 E2E still proves the expected notification content')
ok('const preRead = await authedJson' in e2e and 'expect(beforeRead?.read).toBe(false)' in e2e,'V41 E2E proves the exact restored notification is unread before opening')
ok('expect(beforeRead?.archived).toBe(false)' in e2e,'V41 E2E proves the exact restored notification is ACTIVE before opening')
ok('const [readResponse]=await Promise.all([' in e2e and 'openAction.click()' in e2e,'V41 E2E synchronizes exact UI click and mutation response')
ok('url.pathname===`/api/notifications/${id}/read`' in e2e and 'response.request().method()==="POST"' in e2e,'V41 E2E matches the exact read mutation path and method')
ok('expect(readMutation.id).toBe(id)' in e2e and 'expect(readMutation.read).toBe(true)' in e2e,'V41 E2E binds successful read response to the created UUID')
ok('expect(restored?.archived).toBe(false)' in e2e and 'expect(restored?.read).toBe(true)' in e2e,'V41 E2E still proves durable final ACTIVE/read state')
ok('const updated=await api<NotificationItem>(`/notifications/${n.id}/read`,{method:"POST"})' in ui,'Notification UI keeps the read mutation direct and typed')
ok('setItems(current=>current.map(item=>item.id===updated.id?updated:item))' in ui,'Notification UI applies the mutation response to the exact item')
ok('const current=`${window.location.pathname}${window.location.search}`' in ui and 'if(next!==current)window.location.assign(n.linkUrl)' in ui,'Notification UI skips redundant same-route navigation')
ok('withTransientReadRetry' not in e2e,'V41 E2E still does not retry mutations')
run=subprocess.run([sys.executable,str(ROOT/'tools/verify_v41_notification_engagement.py')],cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
ok(run.returncode==0,'Historical V41 notification source gate remains green')

ok(any(x in sw for x in ['const VERSION = "v77-0-59";','const VERSION = "v77-0-60";','const VERSION = "v77-0-61";','const VERSION = "v78-0-0";','const VERSION = "v78-0-1";','const VERSION = "v78-0-2";','const VERSION = "v78-0-3";','const VERSION = "v78-0-4";','const VERSION = "v78-0-5";','const VERSION = "v78-0-6";','const VERSION = "v78-0-7";','const VERSION = "v78-0-8";','const VERSION = "v78-0-9";','const VERSION = "v78-0-10";','const VERSION = "v78-0-11";','const VERSION = "v78-0-12";','const VERSION = "v78-0-13";','const VERSION = "v78-0-14";','const VERSION = "v78-0-15";','const VERSION = "v78-0-16";','const VERSION = "v78-0-17";','const VERSION = "v78-0-18";']),'Service Worker release metadata is V77.0.59 or forward-compatible V77.0.60')
migrations=list((ROOT/'backend/src/main/resources/db/migration').glob('V*.sql'))
latest=max(int(re.match(r'V(\d+)',p.name).group(1)) for p in migrations if re.match(r'V(\d+)',p.name))
ok(latest==72 and not list((ROOT/'backend/src/main/resources/db/migration').glob('V73*.sql')),'V77.0.59 remains no-schema on Flyway V72')
name='verify_v77_0_59_v41_notification_identity_stability.py'
ok(name in release,'Stable release preflight runs the V77.0.59 verifier')
ok(name in ci,'Main CI runs the V77.0.59 verifier')
ok(name in diag,'V77 diagnostics chain the V77.0.59 verifier')
ok('verify-v77-0-59' in make and 'release-v77-0-59' in make,'Makefile exposes V77.0.59 verify/release lifecycle')
ok(any(x in readme for x in ['Current release:** V77.0.59','Current release:** V77.0.60','Current release:** V77.0.61']) and any(x in readme for x in ['`v77.0.59`','`v77.0.60`','`v77.0.61`']),'README retains V77.0.59 history under the V77.0.60-or-newer stable target')
ok('data-notification-id' in readme and 'same-route' in readme and '45/46' in readme,'README records the V41 identity/same-route stabilization context')
ok([p.name for p in ROOT.glob('*.md')]==['README.md'],'Source keeps one consolidated root Markdown history document')
ok(any(x in prev for x in ['v77-0-59','v77-0-60','V77.0.59','V77.0.60','V77.0.61']),'V77.0.58 verifier is forward-compatible with V77.0.59 release metadata')
ok(any(x in v29 for x in ['Current release:** V77.0.59','Current release:** V77.0.60','Current release:** V77.0.61']) and any(x in v29 for x in ['`v77.0.59`','`v77.0.60`','`v77.0.61`']),'V77.0.29 forward-compatibility chain accepts V77.0.59 or V77.0.60 stable target')

passed=sum(checks)
print(f"\nV77.0.59 V41 notification identity/same-route stability verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed==len(checks) else 1)
