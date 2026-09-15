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

legacy=text('tools/verify_v77_0_9_vietnamese_ui_maintenance_completion.py')
legacy_v14=text('tools/verify_v77_0_14_navigation_language_dropdown_localization.py')
payments=text('frontend/app/payments/page.tsx')
support=text('frontend/app/admin/support/page.tsx')
labels=text('frontend/lib/vi-labels.ts')
release=text('scripts/release.ps1')
ci=text('.github/workflows/ci.yml')
diag=text('tools/diagnose-v77.ps1')
make=text('Makefile')
readme=text('README.md')
sw=text('frontend/public/sw.js')
prev=text('tools/verify_v77_0_46_pwa_readiness_language_sweep_stabilization.py')

ok('payment_localized = (' in legacy and 'localizedLabel(value,language)' in legacy and '{label(p.status)}' in legacy,
   'Historical V77.0.9 payment check accepts current language-aware localizedLabel rendering')
ok('support_localized = (' in legacy and '{label(c.status)}' in legacy and '{label(c.category)}' in legacy,
   'Historical V77.0.9 support check accepts current status/category localizedLabel rendering')
ok('"viLabel(payment.status)" in payments' in legacy and '"viLabel(c.status)" in support' in legacy,
   'Historical V77.0.9 verifier still preserves the original viLabel compatibility path')
ok('import { localizedLabel } from "@/lib/vi-labels";' in payments and 'localizedLabel(value,language)' in payments and '{label(p.status)}' in payments,
   'Payments still localizes the rendered payment status through the active language')
ok('import { localizedLabel } from "@/lib/vi-labels";' in support and 'localizedLabel(value,language)' in support and '{label(c.status)}' in support and '{label(c.category)}' in support,
   'Admin Support still localizes rendered case status and category through the active language')
ok('export function localizedLabel' in labels and 'language: "vi" | "en"' in labels,
   'Canonical localizedLabel helper remains explicitly VI/EN-aware')
ok(any(x in sw for x in ['const VERSION = "v77-0-47";','const VERSION = "v77-0-48";','const VERSION = "v77-0-49";','const VERSION = "v77-0-50";','const VERSION = "v77-0-52";','const VERSION = "v77-0-53";']),
   'Service Worker release metadata is V77.0.47 or forward-compatible V77.0.48')

migrations=list((ROOT/'backend/src/main/resources/db/migration').glob('V*.sql'))
latest=max(int(re.match(r'V(\d+)',p.name).group(1)) for p in migrations if re.match(r'V(\d+)',p.name))
ok(latest==72 and not list((ROOT/'backend/src/main/resources/db/migration').glob('V73*.sql')),
   'V77.0.47 remains no-schema on Flyway V72')

name='verify_v77_0_47_historical_release_gate_forward_compatibility.py'
ok(name in release, 'Stable release preflight runs the V77.0.47 verifier')
ok(name in ci, 'Main CI runs the V77.0.47 verifier')
ok(name in diag, 'V77 diagnostics chain the V77.0.47 verifier')
ok('verify-v77-0-47' in make and 'release-v77-0-47' in make,
   'Makefile exposes V77.0.47 verify/release lifecycle')
ok(any(x in readme for x in ['Current release:** V77.0.47','Current release:** V77.0.48','Current release:** V77.0.49','Current release:** V77.0.50','Current release:** V77.0.52','Current release:** V77.0.53']) and any(x in readme for x in ['`v77.0.47`','`v77.0.48`','`v77.0.49`','`v77.0.50`','`v77.0.52`','`v77.0.53`']),
   'README retains V77.0.47 history under the V77.0.50-or-newer stable target')
ok('46/46' in readme and '64/66' in readme and 'verify_v77_0_9_vietnamese_ui_maintenance_completion.py' in readme,
   'README records the green V77.0.46 runtime gate and exact historical release-preflight blocker')
ok('V77.0.47 - Historical Release-Gate Forward Compatibility' in readme,
   'README contains the V77.0.47 detailed patch section')
ok([p.name for p in ROOT.glob('*.md')]==['README.md'],
   'Source keeps one consolidated root Markdown history document')
ok('v77-0-47' in prev and 'V77.0.47' in prev,
   'V77.0.46 verifier is forward-compatible with V77.0.47 release metadata')
ok('Current release:** V77.0.49' in text('tools/verify_v77_0_29_frontend_healthcheck_contract.py') and '`v77.0.49`' in text('tools/verify_v77_0_29_frontend_healthcheck_contract.py'),
   'V77.0.29 forward-compatibility chain accepts the V77.0.49 stable target')
ok('safe_showtime_selection = (' in legacy_v14 and 'unsafe_option_evaluate' in legacy_v14 and 'page.evaluate() only to read' in legacy_v14,
   'Historical V77.0.14 gate distinguishes safe page.evaluate auth cleanup from forbidden option-node evaluate')

passed=sum(checks)
print(f"\nV77.0.47 historical release-gate forward-compatibility verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed==len(checks) else 1)
