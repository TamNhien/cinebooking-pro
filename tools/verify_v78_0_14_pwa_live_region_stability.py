from pathlib import Path
import re, subprocess, sys

ROOT = Path(__file__).resolve().parents[1]
checks=[]

def text(rel):
    p=ROOT/rel
    return p.read_text(encoding='utf-8') if p.exists() else ''

def ok(cond,label):
    cond=bool(cond); checks.append(cond); print(f"[ {'OK' if cond else 'FAIL'} ] {label}")

pwa=text('frontend/components/PwaManager.tsx')
css=text('frontend/app/globals.css')
e2e=text('frontend/e2e/v78-language-accessibility-pwa.spec.ts')
sw=text('frontend/public/sw.js')
v78page=text('frontend/app/admin/ux-accessibility-pwa/page.tsx')
release=text('scripts/release.ps1'); ci=text('.github/workflows/ci.yml'); diag=text('tools/diagnose-v78.ps1'); make=text('Makefile'); readme=text('README.md')

ok('data-testid="pwa-live-region-v7814"' in pwa and 'aria-live="polite"' in pwa and 'role="status"' in pwa,
   'PWA manager exposes one stable polite status live region')
ok('aria-atomic="true"' in pwa, 'PWA live region is atomic for complete status announcements')
ok('const mode = !online' in pwa and 'const active = mode !== "idle"' in pwa,
   'PWA visual state is modeled explicitly instead of environment-dependent early returns')
ok('return null;' not in pwa[pwa.find('const showIosHint'):],
   'PWA live region is not conditionally unmounted in idle/online states')
ok('pwa-manager-idle' in pwa and '.pwa-manager-idle' in css,
   'Idle PWA live region uses a dedicated visually-hidden presentation')
ok('display:none' not in re.search(r'\.pwa-manager-idle\s*\{([^}]*)\}', css, re.S).group(1),
   'Idle live region is not removed from the accessibility tree with display:none')
ok('clip-path:inset(50%)' in css and 'width:1px !important' in css and 'height:1px !important' in css,
   'Idle live region is visually clipped without taking layout space')
ok('mode === "offline"' in pwa and 'mode === "update"' in pwa and 'mode === "install"' in pwa and 'mode === "ios"' in pwa,
   'Offline/update/install/iOS visual PWA modes remain intact')
ok('getByTestId("pwa-live-region-v7814")' in e2e and 'toHaveAttribute("aria-live", "polite")' in e2e and 'toHaveAttribute("aria-atomic", "true")' in e2e,
   'Focused V78 E2E verifies the persistent live-region accessibility contract')
ok('page.locator(".pwa-manager")' not in e2e,
   'Focused V78 E2E no longer assumes an environment-dependent visible PWA banner')
routes_block=re.search(r'const routes\s*=\s*\[(.*?)\];',e2e,re.S)
route_count=len(re.findall(r'"(/[^"\n]*)"',routes_block.group(1))) if routes_block else 0
ok(route_count==67 and 'Vietnamese presentation copy leaked on' in e2e,
   f'Comprehensive fail-closed VI/EN sweep remains intact across all static routes ({route_count}/67)')
ok(all(x in e2e for x in ['Command center V53','CRM automation V77','UX & PWA V78']),
   'Admin version-title EN assertions remain intact through V78')
ok(any(x in sw for x in ['const VERSION = "v78-0-14";','const VERSION = "v78-0-15";','const VERSION = "v78-0-16";','const VERSION = "v78-0-17";','const VERSION = "v78-0-18";','const VERSION = "v78-0-19";']), 'Service Worker generation is V78.0.14 or forward-compatible V78.0.15')
ok(any(x in v78page for x in ['>V78.0.14</span>','>V78.0.15</span>','>V78.0.16</span>','>V78.0.17</span>','>V78.0.18</span>','>V78.0.19</span>']), 'Visible V78 Admin surface reports V78.0.14 or forward-compatible V78.0.15')

migrations=list((ROOT/'backend/src/main/resources/db/migration').glob('V*.sql'))
latest=max(int(re.match(r'V(\d+)',p.name).group(1)) for p in migrations if re.match(r'V(\d+)',p.name))
ok(latest==72 and not list((ROOT/'backend/src/main/resources/db/migration').glob('V78*.sql')),
   'V78.0.14 remains no-schema on Flyway V72')
name='verify_v78_0_14_pwa_live_region_stability.py'
ok(name in release and name in ci and name in diag,
   'Release, CI and V78 diagnostics execute the V78.0.14 verifier')
ok('verify-v78-0-14' in make and 'release-v78-0-14' in make,
   'Makefile exposes V78.0.14 verify/release lifecycle')
ok(any(x in readme for x in ['Current release:** V78.0.14','Current release:** V78.0.15','Current release:** V78.0.16','Current release:** V78.0.17','Current release:** V78.0.18','Current release:** V78.0.19']) and '`v78.0.14`' in readme and 'Persistent PWA Live-Region Stability' in readme,
   'README preserves the V78.0.14 live-region fix under forward release metadata')
ok([p.name for p in ROOT.glob('*.md')]==['README.md'], 'Source keeps one consolidated root README.md')

prev=subprocess.run([sys.executable,'-X','utf8',str(ROOT/'tools/verify_v78_0_13_comprehensive_language_ownership.py')],cwd=ROOT,text=True,encoding='utf-8',errors='replace',capture_output=True)
ok(prev.returncode==0 and '26/26 checks passed' in prev.stdout,
   'V78.0.13 comprehensive language ownership remains green')
base=subprocess.run([sys.executable,'-X','utf8',str(ROOT/'tools/verify_v78_ux_accessibility_pwa_5.py')],cwd=ROOT,text=True,encoding='utf-8',errors='replace',capture_output=True)
ok(base.returncode==0 and '27/27 checks passed' in base.stdout,
   'Base V78 UX/Accessibility/PWA verifier remains green')

passed=sum(checks)
print(f"\nV78.0.14 persistent PWA live-region stability verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed==len(checks) else 1)
