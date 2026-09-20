from pathlib import Path
import re, subprocess, sys

ROOT = Path(__file__).resolve().parents[1]
checks=[]

def text(rel):
    p=ROOT/rel
    return p.read_text(encoding='utf-8') if p.exists() else ''

def ok(cond,label):
    cond=bool(cond); checks.append(cond); print(f"[ {'OK' if cond else 'FAIL'} ] {label}")

pricing=text('frontend/app/admin/pricing/page.tsx')
v78e2e=text('frontend/e2e/v78-language-accessibility-pwa.spec.ts')
sw=text('frontend/public/sw.js')
v78page=text('frontend/app/admin/ux-accessibility-pwa/page.tsx')
release=text('scripts/release.ps1'); ci=text('.github/workflows/ci.yml'); diag=text('tools/diagnose-v78.ps1'); make=text('Makefile'); readme=text('README.md')

ok(('data-testid="pricing-rule-name-v7816" data-i18n-skip="true" className="text-lg font-bold">{r.name}</h3>' in pricing) or ('data-testid="pricing-rule-name-v7816" data-i18n-skip="true" className="text-lg font-bold">{pricingRuleDisplayName(r.name,language)}</h3>' in pricing),
   'Admin Pricing rule-name H3 uses a source-owned or bounded controlled-vocabulary presentation boundary')
ok('filtered.map(r=><article' in pricing,
   'Pricing rule cards remain rendered through the normal fail-closed page surface')
ok('<article key={r.id} className={`card p-5 ${!r.active?"opacity-65":""}`}>' in pricing,
   'Whole pricing rule card is not globally exempted from presentation scanning')
ok('if (route === "/admin/pricing")' in v78e2e and 'getByTestId("pricing-rule-name-v7816")' in v78e2e,
   'Focused V78 journey explicitly proves the populated Pricing rule-name boundary')
ok('Vietnamese presentation copy leaked on' in v78e2e and "clone.querySelectorAll('[data-i18n-skip=\"true\"]')" in v78e2e,
   'Fail-closed Vietnamese presentation scan remains intact')
ok('"/admin/pricing"' in v78e2e,
   'V78 browser sweep still covers Admin Pricing')

# This field is admin-authored/source-owned business data. It must not be machine translated.
# Later presentation patches may need the language hook for controlled auditorium labels,
# while the admin-authored pricing-rule name itself must remain raw source data.
helper=text('frontend/lib/controlled-business-presentation.ts')
ok((('{r.name}</h3>' in pricing and not re.search(r'(?:localizedLabel|presentationText|\bt)\(\s*r\.name', pricing)) or
    ('pricingRuleDisplayName(r.name,language)' in pricing and 'PRICING_RULE_PREFIX_EN' in helper and 'return raw;' in helper and 'name:r.name' in pricing)),
   'Pricing rule names preserve raw stored data; only bounded known seed vocabulary may localize at render time')

# Historical SW lists that knew V78.0.15 must accept V78.0.16.
stale=[]
for p in (ROOT/'tools').glob('verify_*.py'):
    body=p.read_text(encoding='utf-8')
    if 'const VERSION = "v78-0-15";' in body and ('any(x in sw' in body or 'v78_sw' in body) and 'const VERSION = "v78-0-16";' not in body:
        stale.append(p.name)
ok(not stale, f'Historical Service Worker verifiers are forward-compatible with V78.0.16 (stale={len(stale)})')

stale_readme=[]
for p in (ROOT/'tools').glob('verify_v78*.py'):
    body=p.read_text(encoding='utf-8')
    if 'Current release:** V78.0.15' in body and p.name != 'verify_v78_0_16_pricing_rule_business_data_boundary.py' and 'Current release:** V78.0.16' not in body:
        stale_readme.append(p.name)
ok(not stale_readme, f'Historical V78 current-release guards accept V78.0.16 (stale={len(stale_readme)})')

ok(any(x in sw for x in ['const VERSION = "v78-0-16";','const VERSION = "v78-0-17";','const VERSION = "v78-0-18";','const VERSION = "v78-0-19";','const VERSION = "v78-0-20";']), 'Service Worker generation is V78.0.16 or forward-compatible V78.0.17')
ok(any(x in v78page for x in ['>V78.0.16</span>','>V78.0.17</span>','>V78.0.18</span>','>V78.0.19</span>','>V78.0.20</span>']), 'Visible V78 Admin surface reports V78.0.16 or forward-compatible V78.0.17')

migrations=list((ROOT/'backend/src/main/resources/db/migration').glob('V*.sql'))
latest=max(int(re.match(r'V(\d+)',p.name).group(1)) for p in migrations if re.match(r'V(\d+)',p.name))
ok(latest==72 and not list((ROOT/'backend/src/main/resources/db/migration').glob('V78*.sql')),
   'V78.0.16 remains no-schema on Flyway V72')
name='verify_v78_0_16_pricing_rule_business_data_boundary.py'
ok(name in release and name in ci and name in diag,
   'Release, CI and V78 diagnostics execute the V78.0.16 verifier')
ok('verify-v78-0-16' in make and 'release-v78-0-16' in make,
   'Makefile exposes V78.0.16 verify/release lifecycle')
ok(any(x in readme for x in ['Current release:** V78.0.16','Current release:** V78.0.17','Current release:** V78.0.18','Current release:** V78.0.19','Current release:** V78.0.20']) and '`v78.0.16`' in readme and 'Pricing Rule Business-Data Boundary' in readme,
   'README records the V78.0.16 Pricing rule business-data boundary release')
ok([p.name for p in ROOT.glob('*.md')]==['README.md'], 'Source keeps one consolidated root README.md')

prev=subprocess.run([sys.executable,'-X','utf8',str(ROOT/'tools/verify_v78_0_15_full_suite_runtime_business_data_hardening.py')],cwd=ROOT,text=True,encoding='utf-8',errors='replace',capture_output=True)
ok(prev.returncode==0 and ('34/34 checks passed' in prev.stdout),
   'V78.0.15 full-suite/runtime hardening remains green under V78.0.16 metadata')
base=subprocess.run([sys.executable,'-X','utf8',str(ROOT/'tools/verify_v78_ux_accessibility_pwa_5.py')],cwd=ROOT,text=True,encoding='utf-8',errors='replace',capture_output=True)
ok(base.returncode==0 and '27/27 checks passed' in base.stdout,
   'Base V78 UX/Accessibility/PWA verifier remains green')

passed=sum(checks)
print(f"\nV78.0.16 Pricing rule business-data boundary verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed==len(checks) else 1)
