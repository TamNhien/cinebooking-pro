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

legacy=text('tools/verify_v31_ticket_wallet.py')
spec=text('frontend/e2e/booking-flow.spec.ts')
ci=text('.github/workflows/ci.yml')
release=text('scripts/release.ps1')
diag=text('tools/diagnose-v77.ps1')
make=text('Makefile')
readme=text('README.md')
sw=text('frontend/public/sw.js')
prev=text('tools/verify_v77_0_53_v29_2_playwright_contract_compatibility.py')
v29=text('tools/verify_v77_0_29_frontend_healthcheck_contract.py')

ok("'SUMMARY:CineBooking - Hành Trình Sao Hỏa' in e2e or 'SUMMARY:CineBooking - ${selectedMovie}' in e2e" in legacy,
   'Historical V31 calendar-summary check accepts legacy or current dynamic selected-movie contract')
ok("'STATUS:CONFIRMED' in e2e" in legacy,
   'Historical V31 calendar-summary check still requires confirmed calendar status')
ok("'ticket-add-calendar' in e2e" in legacy and "'ticket-copy-booking-code' in e2e" in legacy and "'ticket-print' in e2e" in legacy,
   'Historical V31 ticket-action check accepts stable current action test IDs')
ok("'Ví vé của tôi' in e2e" in legacy,
   'Historical V31 ticket-action check still requires the ticket-wallet journey')

ok('waitForEvent("download")' in spec and 'suggestedFilename()' in spec and 'BEGIN:VCALENDAR' in spec and 'END:VCALENDAR' in spec,
   'Current booking E2E still downloads and validates a real ICS file')
ok('SUMMARY:CineBooking - ${selectedMovie}' in spec,
   'Current booking E2E validates the calendar summary against the actually selected seeded movie')
ok('STATUS:CONFIRMED' in spec,
   'Current booking E2E still validates confirmed booking status inside the calendar file')
ok('getByRole("heading", { name: "Ví vé của tôi" })' in spec,
   'Current booking E2E still enters the V31 ticket wallet')
ok('getByTestId("ticket-add-calendar")' in spec,
   'Current ticket journey still verifies the add-calendar action')
ok('getByTestId("ticket-copy-booking-code")' in spec and 'data-booking-id' in spec,
   'Current ticket journey still verifies booking-code copy action ownership')
ok('getByTestId("ticket-print")' in spec,
   'Current ticket journey still verifies the print action')
ok('getByTestId("ticket-qr-v33")' in spec and '/api/tickets/${id}' in spec and 'qrUrl' in spec,
   'Current ticket journey still proves signed QR metadata before staff check-in')

ok(legacy.count('check(')==39 and 'failed = [name for name, ok in checks if not ok]' in legacy and 'sys.exit(1)' in legacy,
   'Historical V31 gate remains fail-closed with its full 38-check matrix')
ok('run: python3 tools/verify_v31_ticket_wallet.py' in ci,
   'Main CI still executes the historical V31 gate')
v31_run=subprocess.run([sys.executable, str(ROOT/'tools/verify_v31_ticket_wallet.py')], cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
ok(v31_run.returncode==0 and '38/38 checks passed' in v31_run.stdout,
   'Historical V31 verifier exits zero on the current source with all 38 checks')
ok(any(x in sw for x in ['const VERSION = "v77-0-54";','const VERSION = "v77-0-55";','const VERSION = "v77-0-56";','const VERSION = "v77-0-57";','const VERSION = "v77-0-59";','const VERSION = "v77-0-60";','const VERSION = "v77-0-61";','const VERSION = "v78-0-0";','const VERSION = "v78-0-1";','const VERSION = "v78-0-2";','const VERSION = "v78-0-3";','const VERSION = "v78-0-4";','const VERSION = "v78-0-5";','const VERSION = "v78-0-6";','const VERSION = "v78-0-7";','const VERSION = "v78-0-8";','const VERSION = "v78-0-9";','const VERSION = "v78-0-10";','const VERSION = "v78-0-11";','const VERSION = "v78-0-12";','const VERSION = "v78-0-13";','const VERSION = "v78-0-14";','const VERSION = "v78-0-15";','const VERSION = "v78-0-16";','const VERSION = "v78-0-17";','const VERSION = "v78-0-18";','const VERSION = "v78-0-19";','const VERSION = "v78-0-20";']),
   'Service Worker release metadata is V77.0.54 or forward-compatible V77.0.55')
migrations=list((ROOT/'backend/src/main/resources/db/migration').glob('V*.sql'))
latest=max(int(re.match(r'V(\d+)',p.name).group(1)) for p in migrations if re.match(r'V(\d+)',p.name))
ok(latest==72 and not list((ROOT/'backend/src/main/resources/db/migration').glob('V73*.sql')),
   'V77.0.54 remains no-schema on Flyway V72')
name='verify_v77_0_54_v31_ticket_wallet_contract_compatibility.py'
ok(name in release, 'Stable release preflight runs the V77.0.54 verifier')
ok(name in ci, 'Main CI runs the V77.0.54 verifier')
ok(name in diag, 'V77 diagnostics chain the V77.0.54 verifier')
ok('verify-v77-0-54' in make and 'release-v77-0-54' in make,
   'Makefile exposes V77.0.54 verify/release lifecycle')
ok(any(x in readme for x in ['Current release:** V77.0.54','Current release:** V77.0.55','Current release:** V77.0.56','Current release:** V77.0.57','Current release:** V77.0.59','Current release:** V77.0.60','Current release:** V77.0.61']) and any(x in readme for x in ['`v77.0.54`','`v77.0.55`','`v77.0.56`','`v77.0.57`','`v77.0.59`','`v77.0.60`','`v77.0.61`']),
   'README retains V77.0.54 history under the V77.0.55-or-newer stable target')
ok('36/38' in readme and 'verify_v31_ticket_wallet.py' in readme and '38/38' in readme,
   'README records the exact V31 CI blocker and restored 38/38 contract')
ok([p.name for p in ROOT.glob('*.md')]==['README.md'],
   'Source keeps one consolidated root Markdown history document')
ok(('v77-0-54' in prev or 'V77.0.54' in prev),
   'V77.0.53 verifier is forward-compatible with V77.0.54 release metadata')
ok(any(x in v29 for x in ['Current release:** V77.0.54','Current release:** V77.0.55','Current release:** V77.0.56','Current release:** V77.0.57','Current release:** V77.0.59','Current release:** V77.0.60','Current release:** V77.0.61']) and any(x in v29 for x in ['`v77.0.54`','`v77.0.55`','`v77.0.56`','`v77.0.57`','`v77.0.59`','`v77.0.60`','`v77.0.61`']),
   'V77.0.29 forward-compatibility chain accepts the V77.0.55 stable target')

passed=sum(checks)
print(f"\nV77.0.54 historical V31 Ticket Wallet contract compatibility verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed==len(checks) else 1)
