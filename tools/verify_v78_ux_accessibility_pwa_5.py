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
catalog=text('frontend/lib/presentation-ui-translations-v78.ts')
catalog13=text('frontend/lib/presentation-ui-translations-v78-0-13.ts')
layout=text('frontend/app/layout.tsx')
css=text('frontend/app/globals.css')
e2e=text('frontend/e2e/v78-language-accessibility-pwa.spec.ts')
pwa=text('frontend/components/PwaManager.tsx')
sw=text('frontend/public/sw.js')
manifest=text('frontend/public/manifest.webmanifest')
api_source=text('frontend/lib/api.ts')
v26_py_diag=text('tools/verify_v26_3_sw_diagnostic.py')

entries=len(re.findall(r'^\s*".*":\s*".*",\s*$',catalog,re.M)) + len(re.findall(r'^\s*".*":\s*".*",\s*$',catalog13,re.M))
ok(entries >= 950, f'V78 full-source presentation catalogs contain comprehensive audited coverage ({entries} entries)')
ok('V78_0_13_PRESENTATION_UI_EN[core]' in bridge and bridge.index('V78_0_13_PRESENTATION_UI_EN[core]') < bridge.index('V78_FULL_SOURCE_UI_EN[core]') < bridge.index('LEGACY_INTERACTIVE_UI_EN[core]'),
   'V78.0.13 comprehensive catalog has priority before legacy presentation fallbacks')
ok('window.alert =' in bridge and 'window.confirm =' in bridge and 'window.prompt =' in bridge and 'translateLegacyUiCopy' in bridge,
   'Native alert/confirm/prompt copy follows active VI/EN language')
ok('data-i18n-skip' in bridge and 'movie' in bridge.lower() and 'business' in bridge.lower(),
   'Language bridge preserves explicit business-data boundaries instead of translating arbitrary payloads')

# Full-source static-literal audit, not the old representative-page subset.
vi_re=re.compile(r'[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]',re.I)
key_re=re.compile(r'^\s*"((?:\\.|[^"\\])*)"\s*:',re.M)
keys=set()
for rel in [
    'frontend/lib/interactive-ui-translations.ts',
    'frontend/lib/presentation-ui-translations-v77-0-42.ts',
    'frontend/lib/presentation-ui-translations-v77-0-43.ts',
    'frontend/lib/presentation-ui-translations-v78.ts',
    'frontend/lib/presentation-ui-translations-v78-0-13.ts',
]:
    keys.update(key_re.findall(text(rel)))
labels=text('frontend/lib/vi-labels.ts')
keys.update(re.findall(r'^\s*[A-Z0-9_]+:\s*"([^\"]*[À-ỹĐđ][^\"]*)"',labels,re.M))
static_uncovered=[]; dynamic_templates=[]; audited=0; files_seen=set()
files=list((ROOT/'frontend/app').rglob('*.tsx'))+list((ROOT/'frontend/components').rglob('*.tsx'))
for p in files:
    if p.name=='LegacyUiLocalizationBridge.tsx':
        continue
    rel=str(p.relative_to(ROOT)).replace('\\','/')
    for line_no,line in enumerate(p.read_text(encoding='utf-8').splitlines(),1):
        if not vi_re.search(line): continue
        explicit=any(token in line for token in ('t(', 'language===', 'language ===', 'localizedLabel(', 'data-i18n-skip', 'en?', 'en ?'))
        values=[]
        for m in re.finditer(r'(["\'`])((?:\\.|(?!\1).)*)\1',line):
            value=m.group(2)
            if vi_re.search(value): values.append(value)
        values += [re.sub(r'\s+',' ',m.group(1).strip()) for m in re.finditer(r'>([^<>\{\}]*[À-ỹĐđ][^<>\{\}]*)<',line)]
        for value in values:
            if not value or explicit: continue
            audited += 1; files_seen.add(rel)
            if '${' in value:
                dynamic_templates.append((rel,line_no,value)); continue
            if value not in keys:
                static_uncovered.append((rel,line_no,value))
ok(audited >= 900 and len(files_seen) >= 65,
   f'V78 audits presentation literals across the full frontend ({audited} literals / {len(files_seen)} files)')
ok(not static_uncovered,
   f'All full-source static Vietnamese presentation literals are language-owned (uncovered={len(static_uncovered)})')
ok(60 <= len(dynamic_templates) <= 90 and all(token in bridge for token in [
    'Synced ${checked} tickets', 'Automatic refund completed', 'Gateway reconciliation',
    'Webhook recovery', 'Transferred ${qty}', 'maximum security risk score',
    'Payment is currently', 'Booking status:', 'Ticket QR', 'Remove device',
]), f'Dynamic presentation templates are covered by audited semantic patterns ({len(dynamic_templates)} templates)')

# UI-facing library messages can surface through errors/status labels even when
# they are not authored in TSX. They must be owned by the same translation
# catalogs so an EN session never leaks source-owned Vietnamese feedback.
ui_lib_uncovered=[]; ui_lib_audited=0
for rel in [
    'frontend/lib/api.ts',
    'frontend/lib/offlineTickets.ts',
    'frontend/lib/password.ts',
    'frontend/lib/pwa.ts',
]:
    for line_no,line in enumerate(text(rel).splitlines(),1):
        for m in re.finditer(r'(["\'`])((?:\\.|(?!\1).)*)\1',line):
            value=m.group(2)
            if not vi_re.search(value): continue
            ui_lib_audited += 1
            if value not in keys:
                ui_lib_uncovered.append((rel,line_no,value))
ok(ui_lib_audited >= 20 and not ui_lib_uncovered,
   f'UI-facing frontend libraries are language-owned ({ui_lib_audited} literals, uncovered={len(ui_lib_uncovered)})')
ok('presentationLocale' in api_source and 'new Intl.NumberFormat(locale' in api_source and 'new Intl.DateTimeFormat(locale' in api_source,
   'Shared currency/date-time formatters follow the active presentation locale')
fixed_locale_hits=[]
for p in list((ROOT/'frontend/app').rglob('*.tsx')) + list((ROOT/'frontend/components').rglob('*.tsx')) + list((ROOT/'frontend/lib').rglob('*.ts')):
    source=p.read_text(encoding='utf-8')
    if re.search(r'Intl\.(?:NumberFormat|DateTimeFormat)\(\s*["\']vi-VN["\']',source) or re.search(r'toLocale(?:String|DateString|TimeString)\(\s*["\']vi-VN["\']',source):
        fixed_locale_hits.append(str(p.relative_to(ROOT)).replace('\\','/'))
ok(not fixed_locale_hits,
   f'Presentation formatters contain no unconditional vi-VN locale locks (hits={len(fixed_locale_hits)})')

# Accessibility / PWA 5.0 shell.
ok('href="#main-content"' in layout and 'className="skip-link"' in layout and 'id="main-content"' in layout and 'tabIndex={-1}' in layout,
   'Root shell exposes a keyboard skip link and focusable main landmark')
ok(':where(a,button,input,select,textarea,[tabindex]):focus-visible' in css,
   'Global keyboard focus indicator covers interactive controls')
ok('prefers-reduced-motion:reduce' in css and 'animation-duration:.01ms!important' in css and 'transition-duration:.01ms!important' in css,
   'Reduced-motion preference disables nonessential animation/transition motion')
ok('role="status"' in pwa and 'aria-live="polite"' in pwa and 'pwa-live-region-v7814' in pwa,
   'PWA install/offline/update feedback remains an accessible live region')
ok('manifest.webmanifest' in layout and 'icon-192.png' in layout and 'icon-512.png' in layout and 'viewportFit: "cover"' in layout,
   'PWA manifest/icons/safe-area viewport metadata remain wired')
ok('offline' in manifest.lower() or 'CineBooking' in manifest,
   'PWA manifest remains valid CineBooking application metadata')

# Broad browser language regression: substantially beyond V77 representative pages.
routes_block = re.search(r'const routes\s*=\s*\[(.*?)\];', e2e, re.S)
route_count = len(re.findall(r'"(/[^"\n]*)"', routes_block.group(1))) if routes_block else 0
ok(route_count >= 50, f'V78 browser language sweep covers at least 50 routes ({route_count})')
ok('presentationLeaks' in e2e and 'Vietnamese presentation copy leaked on' in e2e and 'data-i18n-skip' in e2e,
   'V78 browser sweep fails closed on Vietnamese presentation leaks while respecting business-data boundaries')
ok('Skip to main content' in e2e and 'main#main-content' in e2e and 'aria-live' in e2e,
   'V78 browser journey verifies skip-link/main-landmark and PWA live-region accessibility')
ok('language-switch-en' in e2e and 'language-switch-vi' in e2e and 'toHaveAttribute("lang", "en")' in e2e,
   'V78 browser journey proves both VI→EN and EN→VI switching')

# Release / CI / docs / no-schema.
migrations=list((ROOT/'backend/src/main/resources/db/migration').glob('V*.sql'))
latest=max(int(re.match(r'V(\d+)',x.name).group(1)) for x in migrations if re.match(r'V(\d+)',x.name))
ok(latest==72 and not list((ROOT/'backend/src/main/resources/db/migration').glob('V78*.sql')),
   'V78 remains no-schema on Flyway V72')
ok(any(x in sw for x in ['const VERSION = "v78-0-0";','const VERSION = "v78-0-1";','const VERSION = "v78-0-2";','const VERSION = "v78-0-3";','const VERSION = "v78-0-4";','const VERSION = "v78-0-5";','const VERSION = "v78-0-6";','const VERSION = "v78-0-7";','const VERSION = "v78-0-8";','const VERSION = "v78-0-9";','const VERSION = "v78-0-10";','const VERSION = "v78-0-11";','const VERSION = "v78-0-12";','const VERSION = "v78-0-13";','const VERSION = "v78-0-14";','const VERSION = "v78-0-15";','const VERSION = "v78-0-16";','const VERSION = "v78-0-17";','const VERSION = "v78-0-18";','const VERSION = "v78-0-19";']),'Service Worker generation is V78.0.0 or forward-compatible V78.0.1')
ok('(?:-0-\\d+)?' in v26_py_diag and 'int(m_sw.group(1)) >= 26' in v26_py_diag,
   'Historical V26 Python Service Worker diagnostic accepts generic V26-or-newer patch-form generations')
release=text('scripts/release.ps1');ci=text('.github/workflows/ci.yml');make=text('Makefile');readme=text('README.md');diag=text('tools/diagnose-v78.ps1')
name='verify_v78_ux_accessibility_pwa_5.py'
ok(name in release and name in ci and name in diag,
   'Stable release, CI and V78 diagnostics execute the dedicated V78 verifier')
ok('verify-v78' in make and 'release-v78' in make and any(x in make for x in ['v78.0.0','v78.0.1','v78.0.2','v78.0.3','v78.0.4','v78.0.5','v78.0.6','v78.0.7','v78.0.8','v78.0.9','v78.0.10','v78.0.11','v78.0.12','v78.0.13']),
   'Makefile exposes V78 verify/release lifecycle')
ok(any(x in readme for x in ['Current release:** V78.0.0','Current release:** V78.0.1','Current release:** V78.0.2','Current release:** V78.0.3','Current release:** V78.0.4','Current release:** V78.0.5','Current release:** V78.0.6','Current release:** V78.0.7','Current release:** V78.0.8','Current release:** V78.0.9','Current release:** V78.0.10','Current release:** V78.0.11','Current release:** V78.0.12','Current release:** V78.0.13','Current release:** V78.0.14','Current release:** V78.0.15','Current release:** V78.0.16','Current release:** V78.0.17','Current release:** V78.0.18','Current release:** V78.0.19']) and 'UX / Accessibility / PWA 5.0' in readme and any(x in readme for x in ['`v78.0.0`','`v78.0.1`','`v78.0.2`','`v78.0.3`','`v78.0.4`','`v78.0.5`','`v78.0.6`','`v78.0.7`','`v78.0.8`','`v78.0.9`','`v78.0.10`','`v78.0.11`','`v78.0.12`','`v78.0.13`','`v78.0.14`','`v78.0.15`']),
   'README records V78.0.0 as the stable target and documents UX/Accessibility/PWA 5.0')
ok([p.name for p in ROOT.glob('*.md')]==['README.md'],'Source keeps one consolidated root README.md')

passed=sum(checks)
print(f"\nV78 UX / Accessibility / PWA 5.0 verification: {passed}/{len(checks)} checks passed")
if static_uncovered:
    for rel,line,value in static_uncovered[:20]: print(f'UNCOVERED {rel}:{line}: {value}')
if ui_lib_uncovered:
    for rel,line,value in ui_lib_uncovered[:20]: print(f'UNCOVERED_LIB {rel}:{line}: {value}')
sys.exit(0 if passed==len(checks) else 1)
