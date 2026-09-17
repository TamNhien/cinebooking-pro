from pathlib import Path
import re, subprocess, sys
ROOT=Path(__file__).resolve().parents[1]
checks=[]
def text(rel):
    p=ROOT/rel
    return p.read_text(encoding='utf-8') if p.exists() else ''
def ok(cond,label):
    cond=bool(cond);checks.append(cond);print(f"[ {'OK' if cond else 'FAIL'} ] {label}")

profile=text('frontend/app/profile/page.tsx')
loyalty=text('frontend/lib/loyalty-presentation.ts')
catalog=text('frontend/lib/presentation-ui-translations-v78.ts')
e2e=text('frontend/e2e/v78-language-accessibility-pwa.spec.ts')
sw=text('frontend/public/sw.js')
readme=text('README.md'); release=text('scripts/release.ps1'); ci=text('.github/workflows/ci.yml'); make=text('Makefile'); diag=text('tools/diagnose-v78.ps1')

seeded=['Mã ưu đãi thành viên 10.000đ','Mã ưu đãi cuối tuần 10.000đ','Mã ưu đãi sinh nhật 10.000đ','Mã ưu đãi đặt vé trực tuyến 10.000đ','Mã ưu đãi bắp nước 10.000đ','Mã ưu đãi suất tối 10.000đ','Mã ưu đãi khách hàng thân thiết 10.000đ','Mã ưu đãi gia đình 10.000đ','Mã ưu đãi học sinh sinh viên 10.000đ','Mã ưu đãi tri ân 10.000đ','Bắp Caramel miễn phí']
ok(all(x in loyalty for x in seeded),'System-owned seeded loyalty labels have explicit EN presentation ownership')
ok('systemLoyaltyPresentation(r.name, language)' in profile and 'systemLoyaltyPresentation(r.description, language)' in profile,'Profile directly localizes seeded reward names and descriptions')
ok('systemLoyaltyPresentation(v.name, language)' in profile and 'systemLoyaltyPresentation(r.rewardName, language)' in profile,'Reward wallet directly localizes known system-owned loyalty labels')
ok('isSystemLoyaltyPresentation' in profile and 'data-i18n-skip' in profile,'Unknown loyalty/business labels remain protected by explicit business-data boundaries')
ok(all(x in catalog for x in seeded),'Legacy language bridge catalog also owns seeded loyalty labels for other surfaces')

boundary_files=['frontend/components/MovieCard.tsx','frontend/app/cinemas/page.tsx','frontend/app/waitlist/page.tsx','frontend/app/promotions/page.tsx','frontend/app/support/page.tsx','frontend/app/staff/operations/page.tsx','frontend/app/admin/attendance/page.tsx','frontend/app/admin/analytics/page.tsx','frontend/app/admin/pricing/page.tsx','frontend/app/admin/showtimes/page.tsx','frontend/app/admin/page.tsx','frontend/app/admin/maintenance/page.tsx','frontend/app/admin/inventory/page.tsx']
ok(all('data-i18n-skip' in text(x) for x in boundary_files),'Dynamic movie/cinema/product/user-owned labels expose explicit business-data boundaries across swept routes')
ok('language === "en" ? "available" : "còn"' in text('frontend/app/admin/inventory/page.tsx'),'Inventory option keeps presentation token language-owned while product name stays business-owned')
ok('presentationLeaks' in e2e and 'data-i18n-skip' in e2e and len(re.findall(r'"(/[^"\n]*)"',e2e)) >= 50,'V78 browser sweep still fails closed across 50+ routes and honors only explicit business-data boundaries')
ok(any(x in sw for x in ['const VERSION = "v78-0-1";','const VERSION = "v78-0-2";','const VERSION = "v78-0-3";','const VERSION = "v78-0-4";','const VERSION = "v78-0-5";','const VERSION = "v78-0-6";','const VERSION = "v78-0-7";','const VERSION = "v78-0-8";','const VERSION = "v78-0-9";','const VERSION = "v78-0-10";','const VERSION = "v78-0-11";','const VERSION = "v78-0-12";','const VERSION = "v78-0-13";','const VERSION = "v78-0-14";','const VERSION = "v78-0-15";','const VERSION = "v78-0-16";','const VERSION = "v78-0-17";','const VERSION = "v78-0-18";']),'Service Worker generation is V78.0.1 or forward-compatible V78.0.6')

migrations=list((ROOT/'backend/src/main/resources/db/migration').glob('V*.sql'))
latest=max(int(re.match(r'V(\d+)',x.name).group(1)) for x in migrations if re.match(r'V(\d+)',x.name))
ok(latest==72 and not list((ROOT/'backend/src/main/resources/db/migration').glob('V78*.sql')),'V78.0.1 remains no-schema on Flyway V72')
name='verify_v78_0_1_runtime_language_business_data_boundaries.py'
ok(name in release and name in ci and name in diag,'Release, CI and V78 diagnostics execute V78.0.1 verifier')
ok('verify-v78-0-1' in make and 'release-v78-0-1' in make,'Makefile exposes V78.0.1 verify/release lifecycle')
ok(any(x in readme for x in ['Current release:** V78.0.1','Current release:** V78.0.2','Current release:** V78.0.3','Current release:** V78.0.4','Current release:** V78.0.5','Current release:** V78.0.6','Current release:** V78.0.7','Current release:** V78.0.8','Current release:** V78.0.9','Current release:** V78.0.10','Current release:** V78.0.11','Current release:** V78.0.12','Current release:** V78.0.13','Current release:** V78.0.14','Current release:** V78.0.15','Current release:** V78.0.16','Current release:** V78.0.17','Current release:** V78.0.18']) and 'V78.0.1' in readme and 'runtime language' in readme.lower(),'README preserves V78.0.1 runtime-language blocker and accepts forward release metadata')
ok([p.name for p in ROOT.glob('*.md')]==['README.md'],'Source keeps one consolidated root README.md')
proc=subprocess.run([sys.executable,'-X','utf8',str(ROOT/'tools/verify_v78_ux_accessibility_pwa_5.py')],cwd=ROOT,text=True,encoding='utf-8',errors='replace',capture_output=True)
ok(proc.returncode==0 and '27/27 checks passed' in proc.stdout,'Base V78 UX/Accessibility/PWA verifier remains green')
passed=sum(checks)
print(f"\nV78.0.1 runtime language/business-data boundary verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed==len(checks) else 1)
