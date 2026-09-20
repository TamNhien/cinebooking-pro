#!/usr/bin/env python3
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
checks = []


def read(rel):
    path = ROOT / rel
    return path.read_text(encoding="utf-8") if path.exists() else ""


def ok(condition, label):
    condition = bool(condition)
    checks.append(condition)
    print(f"[ {'OK' if condition else 'FAIL'} ] {label}")


historical = read("tools/verify_v78_0_5_admin_audit_presentation_language_ownership.py")
audit = read("frontend/app/admin/audit/page.tsx")
controlled = read("frontend/lib/controlled-business-presentation.ts")
r3 = read("tools/verify_v78_0_20_r3_audit_ip_release_gate_closure.py")
r4 = read("tools/verify_v78_0_20_r4_inventory_full_suite_closure.py")
inventory = read("frontend/app/admin/inventory/page.tsx")
inventory_e2e = read("frontend/e2e/inventory-operations-v48.spec.ts")
release = read("scripts/release.ps1")
ci = read(".github/workflows/ci.yml")
diag = read("tools/diagnose-v78.ps1")
make = read("Makefile")
readme = read("README.md")

ok(
    're.search(r"const\\s*\\{[^}]*\\bt\\b[^}]*\\}\\s*=\\s*usePresentationLanguage\\(\\\\\\);", page)' not in historical
    and 're.search(r"const\\s*\\{[^}]*\\bt\\b[^}]*\\}\\s*=\\s*usePresentationLanguage\\(\\);", page)' in historical,
    "Historical V78.0.5 verifier accepts presentation-language destructuring with forward-compatible context",
)
ok(
    'const { language, t } = usePresentationLanguage();' in audit
    and 'auditDetailPresentation(x.details,language) || "—"' in audit,
    "Current Admin Audit keeps the R1/R2 language-aware controlled-detail renderer",
)
ok(
    all(token in historical for token in [
        'x.actorEmail || "system"',
        'x.action',
        'x.entityType || "—"',
        'x.ipAddress || "—"',
        'auditDetailPresentation(x.details,language) || "—"',
    ]),
    "Historical V78.0.5 source gate still protects exact actor/action/entity/IP data and the bounded detail renderer",
)
ok(
    'export function auditDetailPresentation' in controlled
    and 'if(language!=="en"||!raw)return raw;' in controlled
    and controlled.count('return raw;') >= 2,
    "Audit detail presentation remains bounded and falls back to the exact source payload",
)
ok(
    all(token in audit for token in [
        'data-testid="admin-audit-ip-header-v7820r3"',
        'data-testid="admin-audit-ip-v7820r3"',
        '[overflow-wrap:normal]',
        '[word-break:normal]',
        'tabular-nums',
    ]),
    "Audit IP R3 no-wrap presentation contract is preserved",
)
ok(
    'admin-audit-ip-v7820r3' in r3
    and 'V78.0.20-R3 Audit IP / Historical Release Gate Closure verification' in r3,
    "R3 dedicated verifier remains intact",
)
ok(
    all(token in inventory for token in [
        'INVENTORY_BRANCH_BOOTSTRAP_READ_OPTIONS',
        'const deadline=Date.now()+60_000',
        'inventory-branch-load-state-v7820r4',
        'setBranchLoadState("READY")',
    ]),
    "Inventory R4 bounded branch-convergence runtime contract is preserved",
)
ok(
    'cinema.locator("option").count()' in inventory_e2e
    and 'timeout:75000' in inventory_e2e
    and 'inventory-branch-load-state-v7820r4' in inventory_e2e
    and 'page.route(' not in inventory_e2e,
    "Inventory R4 E2E keeps real branch options, READY proof and no API mocks",
)
ok(
    'V78.0.20-R4 Inventory Full-Suite Closure verification' in r4
    and 'verify_v78_0_20_r3_audit_ip_release_gate_closure.py' in r4,
    "R4 dedicated verifier still chains the R3 lineage",
)
ok(
    '"17/17 checks passed"' in read("tools/verify_v78_0_19_r2_table_language_release_closure.py")
    and 'verify_v78_0_5_admin_audit_presentation_language_ownership.py' in read("tools/verify_v78_0_19_r2_table_language_release_closure.py"),
    "Historical R2 release-preflight aggregate still requires the exact V78.0.5 17/17 gate",
)
ok(
    'subprocess.run' not in historical
    and 'V78.0.4 remains an explicit earlier release/CI/diagnostic gate without recursive preflight replay' in historical,
    "Historical V78.0.5 gate is bounded and relies on the explicit earlier preflight gate instead of recursively replaying it",
)
name = "verify_v78_0_20_r5_v7805_release_preflight_forward_compatibility.py"
ok(name in release and name in ci and name in diag,
   "Stable preflight, GitHub CI and V78 diagnostics execute the R5 verifier")
ok('verify-v78-0-20-r5' in make,
   "Makefile exposes V78.0.20-R5 verification")
ok('verify_v78_0_20_r4_inventory_full_suite_closure.py' in release and 'verify_v78_0_20_r3_audit_ip_release_gate_closure.py' in release,
   "R3 and R4 remain first-class stable release-preflight gates")
ok('V78.0.20-R5' in readme and 'V78.0.5' in readme and 'release-preflight' in readme.lower(),
   "Single README records the exact historical V78.0.5 release-preflight correction")
ok([p.name for p in ROOT.glob('*.md')] == ['README.md'],
   "Source keeps exactly one consolidated root README.md")

migrations = list((ROOT / 'backend/src/main/resources/db/migration').glob('V*.sql'))
latest = max(int(re.match(r'V(\d+)', p.name).group(1)) for p in migrations if re.match(r'V(\d+)', p.name))
ok(latest == 72 and not list((ROOT / 'backend/src/main/resources/db/migration').glob('V73*.sql')),
   "V78.0.20-R5 remains no-schema on Flyway V72")

owned = [
    'tools/verify_v78_0_5_admin_audit_presentation_language_ownership.py',
    'tools/' + name,
    'scripts/release.ps1',
    '.github/workflows/ci.yml',
    'tools/diagnose-v78.ps1',
    'Makefile',
    'README.md',
]
hits = []
for rel in owned:
    for idx, line in enumerate((ROOT / rel).read_text(encoding='utf-8').splitlines(), 1):
        if line.rstrip() != line:
            hits.append(f'{rel}:{idx}')
ok(not hits, f'V78.0.20-R5 owned files are staging-whitespace clean (hits={len(hits)})')

passed = sum(checks)
print(f"\nV78.0.20-R5 V78.0.5 Historical Release-Preflight Forward Compatibility verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed == len(checks) else 1)
