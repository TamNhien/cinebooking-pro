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

page=text('frontend/app/admin/maintenance/page.tsx')
e2e=text('frontend/e2e/maintenance-reliability.spec.ts')
release=text('scripts/release.ps1')
ci=text('.github/workflows/ci.yml')
diag=text('tools/diagnose-v77.ps1')
make=text('Makefile')
readme=text('README.md')
sw=text('frontend/public/sw.js')
prev=text('tools/verify_v77_0_47_historical_release_gate_forward_compatibility.py')
v29=text('tools/verify_v77_0_29_frontend_healthcheck_contract.py')

ok('useRef' in page and 'messageTimerRef = useRef<number | null>(null)' in page,
   'Maintenance page owns one success-message timer through a React ref')
ok('if (messageTimerRef.current !== null)' in page and 'window.clearTimeout(messageTimerRef.current)' in page,
   'Every new maintenance announcement cancels the previous timer before publishing new feedback')
ok('setMsg(text);' in page and 'messageTimerRef.current = window.setTimeout' in page,
   'Maintenance announcement publishes the new message before scheduling its bounded clear')
ok('setMsg("");' in page and 'messageTimerRef.current = null;' in page,
   'Owned success timer clears both rendered feedback and timer ownership when it fires')
ok('useEffect(() => () => {' in page and 'window.clearTimeout(messageTimerRef.current)' in page,
   'Maintenance success-message timer is cleaned up on component unmount')
ok('announce(transitionSuccess(target, order.title, language));' in page and page.index('announce(transitionSuccess(target, order.title, language));') < page.index('await load();', page.index('async function executeTransition')),
   'Transition success feedback is published before authoritative work-order reload')
ok('if (target === "RESOLVED") return `Đã hoàn tất phiếu bảo trì' in page,
   'Vietnamese maintenance completion success copy remains intact')
ok('if (target === "RESOLVED") return `Maintenance work order' in page,
   'English maintenance completion success copy remains intact')
ok('data-testid="maintenance-success-message"' in page and '{msg}' in page,
   'Maintenance success feedback keeps its stable browser test surface')
ok('getByTestId("maintenance-success-message")' in e2e and 'Đã hoàn tất phiếu bảo trì' in e2e,
   'V44 browser regression still requires visible completion success feedback')
ok('maintenance-transition-note' in e2e and '.fill("ok")' in e2e,
   'V44 browser regression preserves the exact two-character completion result')
ok('maintenance-work-order-status' in e2e and 'Đã hoàn tất' in e2e and 'Kết quả: ok' in e2e,
   'V44 browser regression still proves authoritative resolved state and stored repair result')
ok(any(x in sw for x in ['const VERSION = "v77-0-48";','const VERSION = "v77-0-49";','const VERSION = "v77-0-50";','const VERSION = "v77-0-52";','const VERSION = "v77-0-53";']),
   'Service Worker release metadata is V77.0.48 or forward-compatible V77.0.49')

migrations=list((ROOT/'backend/src/main/resources/db/migration').glob('V*.sql'))
latest=max(int(re.match(r'V(\d+)',p.name).group(1)) for p in migrations if re.match(r'V(\d+)',p.name))
ok(latest==72 and not list((ROOT/'backend/src/main/resources/db/migration').glob('V73*.sql')),
   'V77.0.48 remains no-schema on Flyway V72')

name='verify_v77_0_48_maintenance_success_feedback_timer_ownership.py'
ok(name in release, 'Stable release preflight runs the V77.0.48 verifier')
ok(name in ci, 'Main CI runs the V77.0.48 verifier')
ok(name in diag, 'V77 diagnostics chain the V77.0.48 verifier')
ok('verify-v77-0-48' in make and 'release-v77-0-48' in make,
   'Makefile exposes V77.0.48 verify/release lifecycle')
ok(any(x in readme for x in ['Current release:** V77.0.48','Current release:** V77.0.49','Current release:** V77.0.50','Current release:** V77.0.52','Current release:** V77.0.53']) and any(x in readme for x in ['`v77.0.48`','`v77.0.49`','`v77.0.50`','`v77.0.52`','`v77.0.53`']) and 'V77.0.48 - Maintenance Success-Feedback Timer Ownership' in readme,
   'README retains V77.0.48 history under the V77.0.50-or-newer stable target')
ok([p.name for p in ROOT.glob('*.md')]==['README.md'],
   'Source keeps one consolidated root Markdown history document')
ok(any(x in prev for x in ['v77-0-48','v77-0-49']) and 'V77.0.48' in prev,
   'V77.0.47 historical-gate verifier remains forward-compatible through V77.0.49')
ok('Current release:** V77.0.49' in v29 and '`v77.0.49`' in v29,
   'V77.0.29 forward-compatibility chain accepts the V77.0.49 stable target')

passed=sum(checks)
print(f"\nV77.0.48 maintenance success-feedback timer ownership verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed==len(checks) else 1)
