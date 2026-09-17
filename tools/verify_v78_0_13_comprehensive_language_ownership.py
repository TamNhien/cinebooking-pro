from pathlib import Path
import re, subprocess, sys

ROOT = Path(__file__).resolve().parents[1]
checks = []
VI_RE = re.compile(r'[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]', re.I)

def text(rel):
    p = ROOT / rel
    return p.read_text(encoding='utf-8') if p.exists() else ''

def ok(cond, label):
    cond = bool(cond)
    checks.append(cond)
    print(f"[ {'OK' if cond else 'FAIL'} ] {label}")

bridge = text('frontend/components/LegacyUiLocalizationBridge.tsx')
cat13 = text('frontend/lib/presentation-ui-translations-v78-0-13.ts')
cat78 = text('frontend/lib/presentation-ui-translations-v78.ts')
cat43 = text('frontend/lib/presentation-ui-translations-v77-0-43.ts')
cat42 = text('frontend/lib/presentation-ui-translations-v77-0-42.ts')
interactive = text('frontend/lib/interactive-ui-translations.ts')
labels = text('frontend/lib/vi-labels.ts')
e2e = text('frontend/e2e/v78-language-accessibility-pwa.spec.ts')
sw = text('frontend/public/sw.js')
v78page = text('frontend/app/admin/ux-accessibility-pwa/page.tsx')
release = text('scripts/release.ps1')
ci = text('.github/workflows/ci.yml')
make = text('Makefile')
diag = text('tools/diagnose-v78.ps1')
readme = text('README.md')

# Parse exact map keys/values from all audited catalogs.
pair_re = re.compile(r'^\s*"((?:\\.|[^"\\])*)"\s*:\s*"((?:\\.|[^"\\])*)"\s*,?\s*$', re.M)
map13 = dict(pair_re.findall(cat13))
all_keys = set(map13)
for src in (cat78, cat43, cat42, interactive):
    all_keys.update(k for k, _ in pair_re.findall(src))
# vi-labels has identifier keys with VI values; those values are source-language labels.
all_keys.update(re.findall(r'^\s*[A-Z0-9_]+:\s*"([^"]+)"\s*,?$', labels, re.M))

ok(len(map13) >= 500, f'V78.0.13 adds comprehensive exact presentation ownership ({len(map13)} entries)')
ok('V78_0_13_PRESENTATION_UI_EN' in bridge and 'presentation-ui-translations-v78-0-13' in bridge,
   'Language bridge imports the V78.0.13 comprehensive catalog')
ok(bridge.index('V78_0_13_PRESENTATION_UI_EN[core]') < bridge.index('V78_FULL_SOURCE_UI_EN[core]'),
   'V78.0.13 exact ownership has highest translation priority')
ok(not [v for v in map13.values() if VI_RE.search(v)],
   'V78.0.13 English catalog values contain no Vietnamese presentation copy')

# Build exact direct t(vi,en) ownership set.
direct_owned = set()
for p in list((ROOT/'frontend/app').rglob('*.tsx')) + list((ROOT/'frontend/components').rglob('*.tsx')):
    s = p.read_text(encoding='utf-8', errors='ignore')
    direct_owned.update(re.findall(r'\bt\(\s*"([^"]+)"\s*,\s*"[^"]*"', s))
    direct_owned.update(re.findall(r"\bt\(\s*'([^']+)'\s*,\s*'[^']*'", s))

# Strict literal-level audit. Unlike the historical verifier, one t(...) elsewhere on
# the same source line does NOT exempt neighboring raw literals.
uncovered = []
audited = 0
files_seen = set()
version_uncovered = []
attr_names = ('placeholder', 'title', 'aria-label', 'alt')
text_node_re = re.compile(r'>([^<>{}\n]*?)<')
for p in list((ROOT/'frontend/app').rglob('*.tsx')) + list((ROOT/'frontend/components').rglob('*.tsx')):
    if p.name == 'LegacyUiLocalizationBridge.tsx':
        continue
    rel = str(p.relative_to(ROOT)).replace('\\','/')
    s = p.read_text(encoding='utf-8', errors='ignore')
    candidates = []
    for m in text_node_re.finditer(s):
        value = re.sub(r'\s+', ' ', m.group(1).strip())
        if value and VI_RE.search(value):
            candidates.append((s.count('\n', 0, m.start()) + 1, value, 'text'))
    for attr in attr_names:
        for m in re.finditer(rf'{re.escape(attr)}\s*=\s*"([^"]+)"', s):
            value = re.sub(r'\s+', ' ', m.group(1).strip())
            if value and VI_RE.search(value):
                candidates.append((s.count('\n', 0, m.start()) + 1, value, attr))
    for line_no, value, kind in candidates:
        audited += 1
        files_seen.add(rel)
        if value in all_keys or value in direct_owned:
            continue
        uncovered.append((rel, line_no, kind, value))
        if re.search(r'V\d{2}(?:\.\d+)?', value):
            version_uncovered.append((rel, line_no, kind, value))

ok(audited >= 1200 and len(files_seen) >= 55,
   f'Strict full-frontend static UI audit covers {audited} Vietnamese literals across {len(files_seen)} files')
ok(not uncovered,
   f'Every raw Vietnamese text/placeholder/title/aria-label/alt literal has explicit EN ownership (uncovered={len(uncovered)})')
ok(not version_uncovered,
   f'All version-bearing VI labels/titles/buttons are explicitly EN-owned (uncovered={len(version_uncovered)})')

# Target the exact regression visible in the supplied runtime log.
for vi, en in {
    'V40 · VẬN HÀNH KHÁCH HÀNG THÂN THIẾT': 'V40 · LOYALTY OPERATIONS',
    'Số dư': 'Balance',
    'Trọn đời': 'Lifetime',
    'Sắp hết hạn': 'Expiring soon',
    'Điều chỉnh': 'Adjustment',
}.items():
    ok(map13.get(vi) == en, f'Admin Loyalty owns {vi!r} as {en!r}')

# Protect the previously-fixed business-data boundaries and fail-closed browser semantics.
ok("clone.querySelectorAll('[data-i18n-skip=\"true\"]')" in e2e and "closest('[data-i18n-skip=\"true\"]')" in e2e,
   'Browser leak scan still honors only explicit narrow business-data boundaries')
ok('Vietnamese presentation copy leaked on' in e2e and 'presentationLeaks' in e2e,
   'Focused V78 browser regression remains fail-closed')
ok('test.setTimeout(600_000)' in e2e and 'V40 · LOYALTY OPERATIONS' in e2e and 'Expiring soon' in e2e,
   'Focused V78 browser journey explicitly proves Loyalty EN ownership with full-route timeout budget')
routes_block = re.search(r'const routes\s*=\s*\[(.*?)\];', e2e, re.S)
focused_route_count = len(re.findall(r'"(/[^"\n]*)"', routes_block.group(1))) if routes_block else 0
ok(focused_route_count == 67, f'Focused V78 fail-closed language sweep covers every static frontend page route ({focused_route_count}/67)')
version_titles = [
    'Command center V53', 'Performance V54', 'Customer retention V55', 'Customer value V56',
    'Booking & seat intelligence V57', 'Operations control V58', 'Realtime operations V59',
    'Payment production V60', 'Fraud & risk V61', 'Dynamic pricing V62', 'Recommendation V63',
    'CRM & marketing V64', 'Observability V65', 'Seat operations V66', 'Payment resilience V67',
    'Security & identity V68', 'Backup & recovery V69', 'Privacy governance V70',
    'Key governance V71', 'Software supply chain V72', 'Actions runtime V73', 'Reliability V74',
    'Analytics & BI V75', 'Recommendation V76', 'CRM automation V77', 'UX & PWA V78',
]
ok(all(title in e2e for title in version_titles),
   'Focused V78 browser journey explicitly proves every Admin version action V53-V78 switches to EN')
ok(any(x in sw for x in ['const VERSION = "v78-0-13";','const VERSION = "v78-0-14";','const VERSION = "v78-0-15";','const VERSION = "v78-0-16";','const VERSION = "v78-0-17";','const VERSION = "v78-0-18";']),
   'Service Worker generation is V78.0.13 or forward-compatible V78.0.14')
ok(any(x in v78page for x in ['>V78.0.13</span>','>V78.0.14</span>','>V78.0.15</span>','>V78.0.16</span>','>V78.0.17</span>','>V78.0.18</span>']),
   'Visible V78 Admin surface reports V78.0.13 or forward-compatible V78.0.14')

migrations = list((ROOT/'backend/src/main/resources/db/migration').glob('V*.sql'))
latest = max(int(re.match(r'V(\d+)', p.name).group(1)) for p in migrations if re.match(r'V(\d+)', p.name))
ok(latest == 72 and not list((ROOT/'backend/src/main/resources/db/migration').glob('V78*.sql')),
   'V78.0.13 remains no-schema on Flyway V72')

name = 'verify_v78_0_13_comprehensive_language_ownership.py'
ok(name in release and name in ci and name in diag,
   'Release, CI and V78 diagnostics execute the V78.0.13 comprehensive verifier')
ok('verify-v78-0-13' in make and 'release-v78-0-13' in make,
   'Makefile exposes V78.0.13 verify/release lifecycle')
ok(any(x in readme for x in ['Current release:** V78.0.13','Current release:** V78.0.14','Current release:** V78.0.15','Current release:** V78.0.16','Current release:** V78.0.17','Current release:** V78.0.18']) and '`v78.0.13`' in readme and 'Comprehensive Presentation-Language Ownership' in readme,
   'README preserves V78.0.13 comprehensive language ownership under forward release metadata')
ok([p.name for p in ROOT.glob('*.md')] == ['README.md'],
   'Source keeps one consolidated root README.md')

prev = text('tools/verify_v78_0_12_maintenance_asset_business_data_boundaries.py')
ok('v78-0-13' in prev and 'V78.0.13' in prev,
   'V78.0.12 verifier is forward-compatible with V78.0.13 metadata')

base = subprocess.run([sys.executable, '-X', 'utf8', str(ROOT/'tools/verify_v78_ux_accessibility_pwa_5.py')], cwd=ROOT, text=True, encoding='utf-8', errors='replace', capture_output=True)
ok(base.returncode == 0 and '27/27 checks passed' in base.stdout,
   'Base V78 UX/Accessibility/PWA verifier remains green with strict catalog integration')

passed = sum(checks)
print(f"\nV78.0.13 comprehensive presentation-language ownership verification: {passed}/{len(checks)} checks passed")
if uncovered:
    for rel, line, kind, value in uncovered[:50]:
        print(f'UNCOVERED {rel}:{line} [{kind}] {value}')
sys.exit(0 if passed == len(checks) else 1)
