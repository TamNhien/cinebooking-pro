from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
checks = []

def text(rel):
    return (ROOT / rel).read_text(encoding='utf-8')

def ok(cond, msg):
    checks.append(bool(cond))
    print(f"[ {'OK' if cond else 'FAIL'} ] {msg}")

bookings = text('frontend/app/admin/bookings/page.tsx')
booking = text('frontend/app/booking/[showtimeId]/page.tsx')
crm = text('frontend/app/admin/crm-automation/page.tsx')
observability = text('frontend/app/admin/observability/page.tsx')
showtimes = text('frontend/app/admin/showtimes/page.tsx')
labels = text('frontend/lib/vi-labels.ts')
readme = text('README.md')
ci = text('.github/workflows/ci.yml')
release = text('scripts/release.ps1')
diagnose = text('tools/diagnose-v77.ps1')
makefile = text('Makefile')
old = text('tools/verify_v77_0_11_docker_windows_node_modules_hygiene.py')

ok('import { viLabel } from "@/lib/vi-labels";' in bookings, 'Admin bookings imports viLabel used for translated status display')
ok('import { viLabel } from "@/lib/vi-labels";' in booking, 'Booking page imports viLabel used for seat/status display')
ok('membershipHạng' not in crm, 'CRM page no longer contains accidentally translated TypeScript property membershipHạng')
ok('a.membershipTier' in crm, 'CRM page uses machine-contract membershipTier property')
ok('"Chưa đặt vé"' in crm, 'CRM empty-booking display text is Vietnamese')
ok('liveLuồng' not in observability, 'Observability page no longer contains accidentally translated TypeScript property liveLuồng')
ok('summary?.runtime.liveThreads' in observability, 'Observability page uses machine-contract liveThreads property')
ok('planningĐiểm' not in showtimes, 'Showtime planner no longer contains accidentally translated TypeScript property planningĐiểm')
ok('s.planningScore' in showtimes, 'Showtime planner uses machine-contract planningScore property')
ok('Bộ lập lịch thông minh' in showtimes, 'Showtime planner visible Smart Planner wording is Vietnamese')
ok(labels.count('RECEIVED:') == 1, 'Vietnamese label map contains RECEIVED only once')

# Guard against future accidental Vietnamese diacritics in property identifiers while allowing Vietnamese strings/comments.
frontend_roots = [ROOT/'frontend/app', ROOT/'frontend/components', ROOT/'frontend/lib', ROOT/'frontend/e2e']
prop_pat = re.compile(r'\.([A-Za-z_$\u0080-\uffff][\w$\u0080-\uffff]*)')
bad_props = []
for base in frontend_roots:
    if not base.exists():
        continue
    for p in base.rglob('*'):
        if p.suffix not in {'.ts', '.tsx'}:
            continue
        src = p.read_text(encoding='utf-8')
        for m in prop_pat.finditer(src):
            ident = m.group(1)
            if any(ord(ch) > 127 for ch in ident):
                bad_props.append(f'{p.relative_to(ROOT)}:{src.count(chr(10), 0, m.start())+1}:{ident}')
ok(not bad_props, 'Frontend property identifiers remain machine-safe ASCII while visible strings may be Vietnamese')

# Catch the exact Docker build errors observed on V77.0.11.
for token in ['membershipHạng', 'liveLuồng', 'planningĐiểm']:
    ok(token not in '\n'.join([bookings, booking, crm, observability, showtimes]), f'Observed broken identifier {token} is absent from affected pages')
ok('viLabel(selected.status)' in bookings and 'viLabel(p.status)' in bookings, 'Admin booking status/payment display still uses Vietnamese label mapping')
ok('viLabel(s.seatType)' in booking and 'viLabel(s.status)' in booking, 'Booking seat tooltip still uses Vietnamese label mapping')
ok('V77.0.12' in readme and 'TypeScript' in readme, 'README documents V77.0.12 TypeScript localization-contract repair')
ok('verify_v77_0_12_typescript_localization_contract_hygiene.py' in ci, 'CI runs V77.0.12 TypeScript localization verifier')
ok('verify_v77_0_12_typescript_localization_contract_hygiene.py' in release, 'Stable release preflight runs V77.0.12 verifier')
ok('verify_v77_0_12_typescript_localization_contract_hygiene.py' in diagnose, 'V77 diagnostics chain V77.0.12 verifier')
ok('verify-v77-typescript-localization-hygiene' in makefile, 'Makefile exposes V77.0.12 verification target')
ok('release-v77-0-11' in makefile and 'v77.0.11' in makefile, 'Makefile preserves explicit V77.0.11 release target')
ok('v77.0.12' in makefile, 'Makefile latest V77 patch target is v77.0.12')
ok('V77.0.11' in old, 'Historical V77.0.11 verifier remains present and immutable in scope')
ok('V72' in readme and '67 public tables' in readme, 'V77.0.12 remains no-schema on Flyway V72 / 67 public tables')

passed = sum(checks)
print(f"\nV77.0.12 TypeScript localization contract hygiene verification: {passed}/{len(checks)} checks passed")
if bad_props:
    print('Non-ASCII property identifiers:')
    for item in bad_props:
        print(' -', item)
raise SystemExit(0 if all(checks) else 1)
