#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
page = (ROOT / 'frontend/app/bookings/page.tsx').read_text(encoding='utf-8')
ci = (ROOT / '.github/workflows/ci.yml').read_text(encoding='utf-8')
diag = (ROOT / 'tools/diagnose-v31.ps1').read_text(encoding='utf-8')
makefile = (ROOT / 'Makefile').read_text(encoding='utf-8')

checks = [
    ('ticket wallet no longer calls Date.now directly in render', 'const now=Date.now()' not in page),
    ('ticket wallet stores clock in state', 'const [now,setNow]=useState<number|null>(null)' in page),
    ('clock is refreshed outside render', 'const refresh=()=>setNow(Date.now())' in page),
    ('clock refreshes once per minute', 'setInterval(refresh,60000)' in page),
    ('clock timer cleanup is present', 'clearTimeout(first);clearInterval(timer);' in page),
    ('render derives a stable currentTime value', 'const currentTime=now??0;' in page),
    ('ticket summary uses stable currentTime', 'getTime()>=currentTime&&b.status==="CONFIRMED"' in page),
    ('ticket filters use stable currentTime', 'start<currentTime' in page and 'start>=currentTime' in page),
    ('CI runs V31.1 purity verifier', 'python3 tools/verify_v31_1_lint_purity.py' in ci),
    ('V31 diagnostics include V31.1 verifier', 'verify_v31_1_lint_purity.py' in diag),
    ('Makefile exposes V31.1 verifier', 'verify-v31-1:' in makefile and 'verify_v31_1_lint_purity.py' in makefile),
]

passed = 0
for name, ok in checks:
    print(('PASS' if ok else 'FAIL') + ': ' + name)
    passed += int(ok)

print(f'\n{passed}/{len(checks)} checks passed')
if passed != len(checks):
    raise SystemExit(1)
