#!/usr/bin/env python3
from __future__ import annotations
import re, subprocess, sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
checks=[]
def text(rel:str)->str:
    p=ROOT/rel
    return p.read_text(encoding="utf-8") if p.exists() else ""
def ok(cond:bool,label:str)->None:
    cond=bool(cond); checks.append(cond); print(f"[ {'OK' if cond else 'FAIL'} ] {label}")

e2e=text('frontend/e2e/showtime-smart-planner-v49.spec.ts')
ui=text('frontend/app/admin/showtimes/page.tsx')
legacy=text('tools/verify_v49_smart_showtime_planning_2.py')
ci=text('.github/workflows/ci.yml')
release=text('scripts/release.ps1')
diag=text('tools/diagnose-v77.ps1')
make=text('Makefile')
readme=text('README.md')
sw=text('frontend/public/sw.js')
prev=text('tools/verify_v77_0_56_v48_inventory_bootstrap_read_resilience.py')
v29=text('tools/verify_v77_0_29_frontend_healthcheck_contract.py')

ok('data-testid="smart-showtime-planner"' in ui,'Smart Planner keeps its stable root test surface')
ok('Lập lịch thông minh' in ui or 'Smart Planner' in ui,'Smart Planner keeps a presentation-owned semantic heading')
ok('toContainText(/THÔNG MINH|SMART/i)' in e2e,'V49 E2E checks Smart Planner semantic copy case-insensitively')
ok('toContainText(/THÔNG MINH|SMART/);' not in e2e,'V49 E2E no longer requires uppercase localized copy')
ok('selectOption({label:"CineHub Quận 1"})' in e2e,'V49 E2E still pins a real cinema deterministically')
ok('selectOptionContaining(movie,"Hành Trình Sao Hỏa")' in e2e,'V49 E2E still pins the seeded movie deterministically')
ok('smart-preview-button' in e2e and 'smart-suggested-metric' in e2e,'V49 E2E still proves a real smart preview')
ok('smart-commit-button' in e2e and '/api/admin/showtime-planner/smart/commit' in e2e,'V49 E2E still proves smart commit through the real API')
ok('smart-planning-run' in e2e and 'selectedMovie' in e2e,'V49 E2E still proves durable planning-run provenance')
ok('page.request.delete(`/api/admin/showtimes/${id}`' in e2e,'V49 E2E still cleans generated showtimes for repeatability')

run=subprocess.run([sys.executable,str(ROOT/'tools/verify_v49_smart_showtime_planning_2.py')],cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
ok(run.returncode==0,'Historical V49 source gate remains green on the corrected semantic assertion')

ok(any(x in sw for x in ['const VERSION = "v77-0-57";','const VERSION = "v77-0-59";','const VERSION = "v77-0-60";','const VERSION = "v77-0-61";']),'Service Worker release metadata is V77.0.57 or forward-compatible V77.0.59')
migrations=list((ROOT/'backend/src/main/resources/db/migration').glob('V*.sql'))
latest=max(int(re.match(r'V(\d+)',p.name).group(1)) for p in migrations if re.match(r'V(\d+)',p.name))
ok(latest==72 and not list((ROOT/'backend/src/main/resources/db/migration').glob('V73*.sql')),'V77.0.57 remains no-schema on Flyway V72')
name='verify_v77_0_57_v49_smart_planner_language_assertion.py'
ok(name in release,'Stable release preflight runs the V77.0.57 verifier')
ok(name in ci,'Main CI runs the V77.0.57 verifier')
ok(name in diag,'V77 diagnostics chain the V77.0.57 verifier')
ok('verify-v77-0-57' in make and 'release-v77-0-57' in make,'Makefile exposes V77.0.57 verify/release lifecycle')
ok(any(x in readme for x in ['Current release:** V77.0.57','Current release:** V77.0.59','Current release:** V77.0.60','Current release:** V77.0.61']) and any(x in readme for x in ['`v77.0.57`','`v77.0.59`','`v77.0.60`','`v77.0.61`']),'README retains V77.0.57 history under the V77.0.59-or-newer stable target')
ok('THÔNG MINH|SMART' in readme and 'case-insensitive' in readme.lower(),'README records the exact V49 language-assertion blocker and fix')
ok([p.name for p in ROOT.glob('*.md')]==['README.md'],'Source keeps one consolidated root Markdown history document')
ok(any(x in prev for x in ['v77-0-57','v77-0-59','v77-0-60','V77.0.57','V77.0.59','V77.0.60','V77.0.61']),'V77.0.56 verifier is forward-compatible with V77.0.59 release metadata')
ok(any(x in v29 for x in ['Current release:** V77.0.57','Current release:** V77.0.59','Current release:** V77.0.60','Current release:** V77.0.61']) and any(x in v29 for x in ['`v77.0.57`','`v77.0.59`','`v77.0.60`','`v77.0.61`']),'V77.0.29 forward-compatibility chain accepts the V77.0.59 stable target')

passed=sum(checks)
print(f"\nV77.0.57 V49 Smart Planner language-assertion verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed==len(checks) else 1)
