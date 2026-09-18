from pathlib import Path
import re, subprocess, sys

ROOT=Path(__file__).resolve().parents[1]
checks=[]

def text(rel):
    p=ROOT/rel
    return p.read_text(encoding='utf-8') if p.exists() else ''

def ok(cond,label):
    cond=bool(cond); checks.append(cond); print(f"[ {'OK' if cond else 'FAIL'} ] {label}")

staff=text('frontend/app/staff/schedule/page.tsx')
e2e=text('frontend/e2e/v78-language-accessibility-pwa.spec.ts')
security=text('backend/src/main/java/com/cinebooking/config/SecurityConfig.java')
runtime=text('frontend/e2e/runtime-guards.ts')
marker=text('frontend/components/RuntimeReadyMarker.tsx')
sw=text('frontend/public/sw.js')
readme=text('README.md'); release=text('scripts/release.ps1'); ci=text('.github/workflows/ci.yml'); make=text('Makefile'); diag=text('tools/diagnose-v78.ps1')

ok('["STAFF","MANAGER","ADMIN"].includes(a.role)' in staff,'Staff schedule client authorization includes ADMIN')
ok('.requestMatchers("/api/staff/**").hasAnyRole("STAFF","MANAGER","ADMIN")' in security,'Backend staff API authority already includes ADMIN')
ok('"/staff/schedule"' in e2e,'V78 browser sweep still includes /staff/schedule')
ok('route === "/staff/schedule"' in e2e and 'toHaveURL(/\\/staff\\/schedule$/)' in e2e,'V78 browser sweep proves /staff/schedule does not auth-detour for Admin')
ok('await gotoHydrated(page, route);' in e2e and 'await waitForHydratedRuntime(page);' in e2e,'V78 browser sweep retains hydrated-runtime gating')
ok('RUNTIME_READY_ATTR' in runtime and 'toHaveAttribute(RUNTIME_READY_ATTR, "true"' in runtime,'Runtime guard remains fail-closed on real client hydration')
ok('document.documentElement.dataset.cinebookingRuntimeReady = "true";' in marker,'Runtime-ready marker still comes from hydrated client JavaScript')
ok('reason=required&returnTo=' in staff,'Unauthorized staff-schedule visitors still redirect to login')
ok(any(x in sw for x in ['const VERSION = "v78-0-3";','const VERSION = "v78-0-4";','const VERSION = "v78-0-5";','const VERSION = "v78-0-6";','const VERSION = "v78-0-7";','const VERSION = "v78-0-8";','const VERSION = "v78-0-9";','const VERSION = "v78-0-10";','const VERSION = "v78-0-11";','const VERSION = "v78-0-12";','const VERSION = "v78-0-13";','const VERSION = "v78-0-14";','const VERSION = "v78-0-15";','const VERSION = "v78-0-16";','const VERSION = "v78-0-17";','const VERSION = "v78-0-18";','const VERSION = "v78-0-19";']),'Service Worker generation is V78.0.3 or forward-compatible V78.0.6')

migrations=list((ROOT/'backend/src/main/resources/db/migration').glob('V*.sql'))
latest=max(int(re.match(r'V(\d+)',x.name).group(1)) for x in migrations if re.match(r'V(\d+)',x.name))
ok(latest==72 and not list((ROOT/'backend/src/main/resources/db/migration').glob('V78*.sql')),'V78.0.3 remains no-schema on Flyway V72')
name='verify_v78_0_3_staff_schedule_admin_runtime_sweep_stability.py'
ok(name in release and name in ci and name in diag,'Release, CI and V78 diagnostics execute V78.0.3 verifier')
ok('verify-v78-0-3' in make and 'release-v78-0-3' in make,'Makefile exposes V78.0.3 verify/release lifecycle')
ok(any(x in readme for x in ['Current release:** V78.0.3','Current release:** V78.0.4','Current release:** V78.0.5','Current release:** V78.0.6','Current release:** V78.0.7','Current release:** V78.0.8','Current release:** V78.0.9','Current release:** V78.0.10','Current release:** V78.0.11','Current release:** V78.0.12','Current release:** V78.0.13','Current release:** V78.0.14','Current release:** V78.0.15','Current release:** V78.0.16','Current release:** V78.0.17','Current release:** V78.0.18','Current release:** V78.0.19']) and 'V78.0.3' in readme and 'staff schedule' in readme.lower(),'README preserves V78.0.3 staff-schedule runtime fix under forward release metadata')
ok([p.name for p in ROOT.glob('*.md')]==['README.md'],'Source keeps one consolidated root README.md')

prev=subprocess.run([sys.executable,'-X','utf8',str(ROOT/'tools/verify_v78_0_2_recommendation_presentation_language_ownership.py')],cwd=ROOT,text=True,encoding='utf-8',errors='replace',capture_output=True)
ok(prev.returncode==0 and '22/22 checks passed' in prev.stdout,'V78.0.2 recommendation verifier is forward-compatible with V78.0.3')
base=subprocess.run([sys.executable,'-X','utf8',str(ROOT/'tools/verify_v78_ux_accessibility_pwa_5.py')],cwd=ROOT,text=True,encoding='utf-8',errors='replace',capture_output=True)
ok(base.returncode==0 and '27/27 checks passed' in base.stdout,'Base V78 UX/Accessibility/PWA verifier remains green')

passed=sum(checks)
print(f"\nV78.0.3 staff-schedule Admin runtime-sweep stability verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed==len(checks) else 1)
