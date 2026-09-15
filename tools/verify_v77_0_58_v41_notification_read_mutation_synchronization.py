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
service=text('backend/src/main/java/com/cinebooking/notification/NotificationService.java')
legacy=text('tools/verify_v41_notification_engagement.py')
ci=text('.github/workflows/ci.yml')
release=text('scripts/release.ps1')
diag=text('tools/diagnose-v77.ps1')
make=text('Makefile')
readme=text('README.md')
sw=text('frontend/public/sw.js')
prev=text('tools/verify_v77_0_57_v49_smart_planner_language_assertion.py')
v29=text('tools/verify_v77_0_29_frontend_healthcheck_contract.py')

ok('data-testid="notification-open"' in ui,'Notification card exposes a stable open-action test surface')
ok('page.waitForResponse(response=>' in e2e and '/api/notifications/${id}/read' in e2e,'V41 E2E waits for the exact notification read mutation response')
ok('response.request().method()==="POST"' in e2e,'V41 E2E requires the read mutation to be POST')
ok(('card.getByTestId("notification-open").click()' in e2e) or ('notificationOpen=()=>page.locator' in e2e and 'openAction.click()' in e2e),'V41 E2E uses the stable notification-open action')
ok('expect(readResponse.status()).toBe(200)' in e2e,'V41 E2E requires successful read mutation status')
ok('expect(readMutation.id).toBe(id)' in e2e,'V41 E2E binds the mutation response to the exact notification')
ok('expect(readMutation.archived).toBe(false)' in e2e and 'expect(readMutation.read).toBe(true)' in e2e,'V41 E2E proves the mutation response is restored and read')
ok('expect(restored?.archived).toBe(false)' in e2e and 'expect(restored?.read).toBe(true)' in e2e,'V41 E2E still proves durable ACTIVE-inbox persistence after the mutation')
ok('await expect(page).toHaveURL(/\\/notifications$/);' not in e2e,'V41 E2E no longer treats an already-satisfied same-route URL as mutation completion')
ok('withTransientReadRetry' not in e2e,'V41 E2E does not retry the read mutation')
ok(('api(`/notifications/${n.id}/read`,{method:"POST"})' in ui) or ('api<NotificationItem>(`/notifications/${n.id}/read`,{method:"POST"})' in ui),'Notification UI keeps the read mutation as a direct non-retried write')
ok('@Transactional public NotificationResponse read' in service and 'n.setRead(true)' in service and 'n.setReadAt(Instant.now())' in service,'Backend read mutation remains transactional and durable')
archive_line=next((line for line in service.splitlines() if 'NotificationResponse archive(' in line),'')
unarchive_line=next((line for line in service.splitlines() if 'NotificationResponse unarchive(' in line),'')
ok('setRead(' not in archive_line and 'setRead(' not in unarchive_line,'Archive and restore mutations do not overwrite read state')
run=subprocess.run([sys.executable,str(ROOT/'tools/verify_v41_notification_engagement.py')],cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
ok(run.returncode==0,'Historical V41 notification source gate remains green')

ok(any(x in sw for x in ['const VERSION = "v77-0-59";','const VERSION = "v77-0-60";','const VERSION = "v77-0-61";']),'Service Worker release metadata is V77.0.59 or forward-compatible V77.0.60')
migrations=list((ROOT/'backend/src/main/resources/db/migration').glob('V*.sql'))
latest=max(int(re.match(r'V(\d+)',p.name).group(1)) for p in migrations if re.match(r'V(\d+)',p.name))
ok(latest==72 and not list((ROOT/'backend/src/main/resources/db/migration').glob('V73*.sql')),'V77.0.59 remains no-schema on Flyway V72')
name='verify_v77_0_58_v41_notification_read_mutation_synchronization.py'
ok(name in release,'Stable release preflight runs the V77.0.59 verifier')
ok(name in ci,'Main CI runs the V77.0.59 verifier')
ok(name in diag,'V77 diagnostics chain the V77.0.59 verifier')
ok('verify-v77-0-59' in make and 'release-v77-0-59' in make,'Makefile exposes V77.0.59 verify/release lifecycle')
ok(any(x in readme for x in ['Current release:** V77.0.59','Current release:** V77.0.60','Current release:** V77.0.61']) and any(x in readme for x in ['`v77.0.59`','`v77.0.60`','`v77.0.61`']),'README retains V77.0.59 history under the V77.0.60-or-newer stable target')
ok('45/46' in readme and 'notification-open' in readme and '/api/notifications/{id}/read' in readme,'README records the exact V41 synchronization blocker and fix')
ok([p.name for p in ROOT.glob('*.md')]==['README.md'],'Source keeps one consolidated root Markdown history document')
ok(any(x in prev for x in ['v77-0-59','v77-0-60','V77.0.59','V77.0.60','V77.0.61']),'V77.0.57 verifier is forward-compatible with V77.0.59 release metadata')
ok(any(x in v29 for x in ['Current release:** V77.0.59','Current release:** V77.0.60','Current release:** V77.0.61']) and any(x in v29 for x in ['`v77.0.59`','`v77.0.60`','`v77.0.61`']),'V77.0.29 forward-compatibility chain accepts V77.0.59 or V77.0.60 stable target')

passed=sum(checks)
print(f"\nV77.0.59 V41 notification read-mutation synchronization verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed==len(checks) else 1)
