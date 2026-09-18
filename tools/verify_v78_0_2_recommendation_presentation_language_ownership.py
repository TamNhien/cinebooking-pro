from pathlib import Path
import re, subprocess, sys

ROOT=Path(__file__).resolve().parents[1]
checks=[]

def text(rel):
    p=ROOT/rel
    return p.read_text(encoding='utf-8') if p.exists() else ''

def ok(cond,label):
    cond=bool(cond); checks.append(cond); print(f"[ {'OK' if cond else 'FAIL'} ] {label}")

page=text('frontend/app/for-you/page.tsx')
helper=text('frontend/lib/recommendation-presentation.ts')
catalog=text('frontend/lib/presentation-ui-translations-v78.ts')
e2e=text('frontend/e2e/v78-language-accessibility-pwa.spec.ts')
sw=text('frontend/public/sw.js')
readme=text('README.md'); release=text('scripts/release.ps1'); ci=text('.github/workflows/ci.yml'); make=text('Makefile'); diag=text('tools/diagnose-v78.ps1')

score_keys=['GENRE_TASTE','LANGUAGE_FIT','RATING_FIT','DURATION_FIT','SCHEDULE_FIT','ANCHOR','POPULARITY','NOVELTY']
score_vi=['Gu thể loại','Ngôn ngữ','Phân loại','Thời lượng','Lịch xem','Phim neo','Xu hướng','Khám phá']
evidence_vi=['Tổng affinity từ thể loại đã học','Khớp ngôn ngữ phim thường xem','Khớp nhóm phân loại nội dung','Khớp thời lượng phim thường chọn','Rạp, khung giờ và ngày xem quen thuộc','Khớp phản hồi Thêm tương tự','Tín hiệu cộng đồng 30 ngày','Chưa thấy trong lịch sử tín hiệu cá nhân']

ok(all(k in helper for k in score_keys),'Recommendation presentation owns all score components by stable machine key')
ok(all(v in helper for v in ['Taste match','Language fit','Content rating','Duration fit','Schedule fit','Anchor movie','Trend','Discovery','30-day community signal','Matches your More like this feedback']),'Recommendation presentation maps score labels and evidence to EN explicitly')
ok('recommendationScoreCopy(part, language)' in page and 'title={copy.evidence}' in page and '{copy.label}' in page,'For-you score breakdown renders language-owned label and tooltip copy')
ok('recommendationReason(item.reason, language)' in page,'For-you recommendation reasons follow active presentation language')
ok('recommendationSignal(s, language)' in page,'For-you recommendation signal chips follow active presentation language')
ok('recommendationProfileSummary(profile' in page,'For-you profile summary is reconstructed from structured fields in EN')
ok('recommendationDurationLabel(profile.preferredDurationBand' in page,'For-you preferred duration uses machine-owned duration band for EN')
ok('recommendationWeekdayLabel(profile.preferredWeekday' in page and 'recommendationDaypartLabel(profile.preferredDaypart' in page,'For-you schedule labels use structured weekday/daypart values for EN')
ok('recommendationFeedbackMessage(r.message, language)' in page,'Recommendation feedback response is presentation-owned')
ok('{en?"NEW TO YOU":"MỚI VỚI BẠN"}' in page,'New-to-you badge switches VI/EN directly')
ok(all(v in catalog for v in score_vi+evidence_vi),'V78 bridge catalog also owns recommendation score copy as a fallback')
ok('if (language !== "en") return { label: part.label, evidence: part.evidence };' in helper,'VI keeps backend presentation copy unchanged')
ok('profile.preferredCinemaName' in helper and 'profile.topGenres' in helper and 'profile.topLanguages' in helper,'EN profile summary preserves real cinema/genre/language business values')
ok('presentationLeaks' in e2e and '"/for-you"' in e2e and 'Vietnamese presentation copy leaked on' in e2e,'V78 browser sweep remains fail-closed on /for-you')
ok(any(x in sw for x in ['const VERSION = "v78-0-2";','const VERSION = "v78-0-3";','const VERSION = "v78-0-4";','const VERSION = "v78-0-5";','const VERSION = "v78-0-6";','const VERSION = "v78-0-7";','const VERSION = "v78-0-8";','const VERSION = "v78-0-9";','const VERSION = "v78-0-10";','const VERSION = "v78-0-11";','const VERSION = "v78-0-12";','const VERSION = "v78-0-13";','const VERSION = "v78-0-14";','const VERSION = "v78-0-15";','const VERSION = "v78-0-16";','const VERSION = "v78-0-17";','const VERSION = "v78-0-18";','const VERSION = "v78-0-19";']),'Service Worker generation is V78.0.2 or forward-compatible V78.0.6')

migrations=list((ROOT/'backend/src/main/resources/db/migration').glob('V*.sql'))
latest=max(int(re.match(r'V(\d+)',x.name).group(1)) for x in migrations if re.match(r'V(\d+)',x.name))
ok(latest==72 and not list((ROOT/'backend/src/main/resources/db/migration').glob('V78*.sql')),'V78.0.2 remains no-schema on Flyway V72')
name='verify_v78_0_2_recommendation_presentation_language_ownership.py'
ok(name in release and name in ci and name in diag,'Release, CI and V78 diagnostics execute V78.0.2 verifier')
ok('verify-v78-0-2' in make and 'release-v78-0-2' in make,'Makefile exposes V78.0.2 verify/release lifecycle')
ok(any(x in readme for x in ['Current release:** V78.0.2','Current release:** V78.0.3','Current release:** V78.0.4','Current release:** V78.0.5','Current release:** V78.0.6','Current release:** V78.0.7','Current release:** V78.0.8','Current release:** V78.0.9','Current release:** V78.0.10','Current release:** V78.0.11','Current release:** V78.0.12','Current release:** V78.0.13','Current release:** V78.0.14','Current release:** V78.0.15','Current release:** V78.0.16','Current release:** V78.0.17','Current release:** V78.0.18','Current release:** V78.0.19']) and 'V78.0.2' in readme and 'recommendation' in readme.lower(),'README preserves V78.0.2 recommendation presentation-language fix under forward release metadata')
ok([p.name for p in ROOT.glob('*.md')]==['README.md'],'Source keeps one consolidated root README.md')

base=subprocess.run([sys.executable,'-X','utf8',str(ROOT/'tools/verify_v78_ux_accessibility_pwa_5.py')],cwd=ROOT,text=True,encoding='utf-8',errors='replace',capture_output=True)
ok(base.returncode==0 and '27/27 checks passed' in base.stdout,'Base V78 UX/Accessibility/PWA verifier remains green')
prev=subprocess.run([sys.executable,'-X','utf8',str(ROOT/'tools/verify_v78_0_1_runtime_language_business_data_boundaries.py')],cwd=ROOT,text=True,encoding='utf-8',errors='replace',capture_output=True)
ok(prev.returncode==0 and '15/15 checks passed' in prev.stdout,'V78.0.1 runtime-language verifier is forward-compatible with V78.0.2')

passed=sum(checks)
print(f"\nV78.0.2 recommendation presentation-language ownership verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed==len(checks) else 1)
