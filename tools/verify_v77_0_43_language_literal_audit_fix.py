from pathlib import Path
import re, sys

ROOT=Path(__file__).resolve().parents[1]
checks=[]
def text(rel):
    p=ROOT/rel
    return p.read_text(encoding='utf-8') if p.exists() else ''
def ok(cond,label):
    cond=bool(cond);checks.append(cond);print(f"[ {'OK' if cond else 'FAIL'} ] {label}")

bridge=text('frontend/components/LegacyUiLocalizationBridge.tsx')
extra43=text('frontend/lib/presentation-ui-translations-v77-0-43.ts')
lang_spec=text('frontend/e2e/realtime-operations-v59-language.spec.ts')
admin_payments=text('frontend/app/admin/payments/page.tsx')
sw=text('frontend/public/sw.js')

ok('V77_0_43_PRESENTATION_UI_EN' in bridge,
   'Legacy bridge includes the V77.0.43 presentation catalog')
ok('LEGACY_INTERACTIVE_UI_EN[core] ?? V77_0_43_PRESENTATION_UI_EN[core] ?? V77_0_42_PRESENTATION_UI_EN[core] ?? VI_LABEL_TO_EN[core]' in bridge,
   'V77.0.43 catalog is checked before the V77.0.42 fallback and machine labels')
entries=len(re.findall(r'^\s*".*":\s*".*",\s*$',extra43,re.M))
ok(entries >= 45, f'V77.0.43 adds focused runtime-gap coverage ({entries} entries)')
ok('"Lần thử": "Attempt"' in extra43,
   'Historical Admin Payments Attempt column has an explicit English presentation')
ok('"Đơn vị thanh toán / Cổng thanh toán": "Merchant / Payment gateway"' in extra43,
   'Historical Admin Payments merchant/gateway column has an explicit English presentation')
ok('getByRole("columnheader", { name: "Attempt", exact: true })' in lang_spec and
   'getByRole("columnheader", { name: "Merchant / Payment gateway", exact: true })' in lang_spec,
   'Browser regression directly asserts both table headers that failed on Windows')

# V77.0.43 fixes the V77.0.42 false-positive source audit.  The old verifier
# treated a whole source line as localized if any t()/localizedLabel() appeared
# on that line. Several compact JSX sections place many independent literals on
# one line, so audit at literal/text-node granularity instead.
vi_re=re.compile(r'[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]',re.I)
key_re=re.compile(r'^\s*"((?:\\.|[^"\\])*)"\s*:',re.M)
keys=set(key_re.findall(text('frontend/lib/interactive-ui-translations.ts')))
keys.update(key_re.findall(text('frontend/lib/presentation-ui-translations-v77-0-42.ts')))
keys.update(key_re.findall(extra43))
labels=text('frontend/lib/vi-labels.ts')
keys.update(re.findall(r'^\s*[A-Z0-9_]+:\s*"([^\"]*[À-ỹĐđ][^\"]*)"',labels,re.M))
files=[
 'frontend/app/page.tsx','frontend/app/movies/page.tsx','frontend/app/cinemas/page.tsx','frontend/app/payments/page.tsx','frontend/app/support/page.tsx',
 'frontend/app/admin/page.tsx','frontend/app/admin/payments/page.tsx','frontend/app/admin/staff/page.tsx','frontend/app/admin/support/page.tsx',
 'frontend/app/admin/crm-automation/page.tsx','frontend/app/admin/vouchers/page.tsx','frontend/app/admin/analytics-bi/page.tsx','frontend/app/admin/actions-runtime/page.tsx'
]
raw_uncovered=[]; quoted_uncovered=[]; raw_audited=0; quoted_audited=0
quoted=re.compile(r'(["\'`])((?:\\.|(?!\1).)*)\1')
for rel in files:
    src=re.sub(r'/\*.*?\*/','',text(rel),flags=re.S)
    # Literal JSX text nodes such as <th>Lần thử</th>.
    for m in re.finditer(r'>([^<>]+)<',src):
        value=re.sub(r'\s+',' ',m.group(1).strip())
        if not value or '{' in value or '}' in value or not vi_re.search(value):
            continue
        if 'throw new Error' in value or 'if(' in value:
            continue
        raw_audited += 1
        if value not in keys:
            raw_uncovered.append((rel,value))
    # Quoted static literals are checked independently; direct t(VI, EN) and
    # explicit language branches own their copy without requiring the bridge.
    for m in quoted.finditer(src):
        value=m.group(2)
        if not vi_re.search(value) or '${' in value:
            continue
        quoted_audited += 1
        if value in keys:
            continue
        line_start=src.rfind('\n',0,m.start())+1
        line_end=src.find('\n',m.end())
        if line_end < 0: line_end=len(src)
        line=src[line_start:line_end]
        if re.search(r'\bt\(\s*["\'`]'+re.escape(value)+r'["\'`]',src):
            continue
        if 'language===' in line or 'language ===' in line:
            continue
        quoted_uncovered.append((rel,value))

ok(raw_audited >= 120 and not raw_uncovered,
   f'Literal JSX text-node audit is clean ({raw_audited} audited; uncovered={len(raw_uncovered)})')
ok(quoted_audited >= 280 and not quoted_uncovered,
   f'Quoted presentation literal audit is clean ({quoted_audited} audited; uncovered={len(quoted_uncovered)})')

# Keep the concrete source strings present so this verifier cannot pass by only
# changing the test expectation.
ok('{t("Lần thử","Attempt")}' in admin_payments and '{t("Đơn vị thanh toán / Cổng thanh toán","Merchant / Payment gateway")}' in admin_payments,
   'Admin Payments owns both formerly leaking table headers directly through the live language state')
ok(any(x in sw for x in ['const VERSION = "v77-0-43";','const VERSION = "v77-0-44";','const VERSION = "v77-0-45";','const VERSION = "v77-0-46";','const VERSION = "v77-0-47";','const VERSION = "v77-0-48";','const VERSION = "v77-0-49";','const VERSION = "v77-0-50";','const VERSION = "v77-0-52";','const VERSION = "v77-0-53";','const VERSION = "v77-0-54";']),
   'Service Worker cache generation is V77.0.43 or forward-compatible V77.0.44/V77.0.45')

migrations=list((ROOT/'backend/src/main/resources/db/migration').glob('V*.sql'))
latest=max(int(re.match(r'V(\d+)',x.name).group(1)) for x in migrations if re.match(r'V(\d+)',x.name))
ok(latest==72 and not list((ROOT/'backend/src/main/resources/db/migration').glob('V77*.sql')),
   'V77.0.43 remains no-schema on Flyway V72')

release=text('scripts/release.ps1');ci=text('.github/workflows/ci.yml');diag=text('tools/diagnose-v77.ps1');make=text('Makefile');readme=text('README.md')
name='verify_v77_0_43_language_literal_audit_fix.py'
ok(name in release and name in ci and name in diag,
   'Release, CI and diagnostics run the V77.0.43 verifier')
ok('verify-v77-0-43' in make and 'release-v77-0-43' in make,
   'Makefile exposes V77.0.43 verify/release targets')
ok(any(x in readme for x in ['Current release:** V77.0.43','Current release:** V77.0.44','Current release:** V77.0.45','Current release:** V77.0.46','Current release:** V77.0.47','Current release:** V77.0.48','Current release:** V77.0.49','Current release:** V77.0.50','Current release:** V77.0.52','Current release:** V77.0.53','Current release:** V77.0.54']) and any(x in readme for x in ['`v77.0.43`','`v77.0.44`','`v77.0.45`','`v77.0.46`','`v77.0.47`','`v77.0.48`','`v77.0.49`','`v77.0.50`','`v77.0.52`','`v77.0.53`','`v77.0.54`']),
   'README retains V77.0.43 history under the V77.0.45-or-newer stable target')
ok('V77.0.43 - Literal-Level Language Audit Fix' in readme and 'Lần thử' in readme and 'Merchant / Payment gateway' in readme,
   'README records the Windows failure and literal-level audit correction')
ok([p.name for p in ROOT.glob('*.md')]==['README.md'],
   'Source keeps one consolidated root Markdown history document')

# Previous language verifiers must accept the new stable target/cache generation.
for rel in [
 'tools/verify_v77_0_39_zero_warning_full_ui_language_contract.py',
 'tools/verify_v77_0_40_runtime_language_boundary_fix.py',
 'tools/verify_v77_0_41_movies_language_surface_fix.py',
 'tools/verify_v77_0_42_full_ui_language_completion.py']:
    previous=text(rel)
    ok(any(x in previous for x in ['V77.0.43','V77.0.44','V77.0.45','V77.0.46','V77.0.47']) and any(x in previous for x in ['v77-0-43','v77-0-44','v77-0-45','v77-0-46','v77-0-47']),
       f'{Path(rel).name} accepts the V77.0.43/V77.0.44/V77.0.45 stable target/cache generation')

passed=sum(checks)
print(f"\nV77.0.43 literal-level language audit verification: {passed}/{len(checks)} checks passed")
if raw_uncovered:
    for rel,value in raw_uncovered[:10]: print(f'RAW UNCOVERED {rel}: {value}')
if quoted_uncovered:
    for rel,value in quoted_uncovered[:10]: print(f'QUOTED UNCOVERED {rel}: {value}')
sys.exit(0 if passed==len(checks) else 1)
