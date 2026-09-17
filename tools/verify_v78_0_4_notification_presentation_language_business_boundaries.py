from pathlib import Path
import re, subprocess, sys

ROOT=Path(__file__).resolve().parents[1]
checks=[]

def text(rel):
    p=ROOT/rel
    return p.read_text(encoding='utf-8') if p.exists() else ''

def ok(cond,label):
    cond=bool(cond);checks.append(cond);print(f"[ {'OK' if cond else 'FAIL'} ] {label}")

page=text('frontend/app/notifications/page.tsx')
presentation=text('frontend/lib/notification-presentation.ts')
e2e=text('frontend/e2e/v78-language-accessibility-pwa.spec.ts')
sw=text('frontend/public/sw.js')
readme=text('README.md'); release=text('scripts/release.ps1'); ci=text('.github/workflows/ci.yml'); make=text('Makefile'); diag=text('tools/diagnose-v78.ps1')

ok('notificationPresentation(n,language)' in page and 'usePresentationLanguage' in page,
   'Notifications page renders backend rows through active presentation language')
ok('renderNotificationParts' in page and 'part.businessData?"true":undefined' in page,
   'Notification renderer exposes exact business-data boundaries')
ok('data-testid="notification-open"' in page and 'data-i18n-skip="true"' not in re.search(r'<button data-testid="notification-open".*?</button>',page,re.S).group(0),
   'Whole notification action remains inside the fail-closed presentation sweep')
ok('case "SUPPORT_REPLY"' in presentation and 'CineBooking replied to ' in presentation and 'message: [data(item.message)]' in presentation,
   'Support reply localizes system title while preserving staff-authored reply body')
ok('case "SUPPORT_STATUS"' in presentation and 'Support request update ' in presentation and 'New status: ' in presentation and 'data(match[2])' in presentation,
   'Support status localizes wrapper/status while preserving resolution note as business data')
ok('case "SHOWTIME_REMINDER_3H"' in presentation and 'Showtime coming up' in presentation and 'data(match[1])' in presentation,
   'Showtime reminder localizes template while preserving the movie title boundary')
ok('case "SHOWTIME_REMINDER_30M"' in presentation and 'Showtime starting soon' in presentation,
   'Final showtime reminder has explicit EN ownership')
ok(all(x in presentation for x in ['BOOKING_EXPIRED','BOOKING_CANCELLED','BOOKING_TRANSFER_RECEIVED','BOOKING_TRANSFER_SENT','PAYMENT_SUCCESS','PAYMENT_REVIEW']),
   'Booking/payment notification families have explicit EN presentation ownership')
ok(all(x in presentation for x in ['REFUND_REQUESTED','REFUND_APPROVED','REFUND_REJECTED','WAITLIST_SEAT_AVAILABLE']),
   'Refund/waitlist notification families have explicit EN presentation ownership')
ok(all(x in presentation for x in ['LOYALTY_REWARD','LOYALTY_BIRTHDAY','LOYALTY_ADJUST','LOYALTY_REWARD_CLAIMED','LOYALTY_EXPIRING_SOON','BIRTHDAY_REWARD_AVAILABLE','LOYALTY_EXPIRED']),
   'Loyalty notification family has explicit EN presentation ownership')
ok(all(x in presentation for x in ['STAFF_SHIFT_ASSIGNED','STAFF_SHIFT_UPDATED','STAFF_SHIFT_CANCELLED','STAFF_SHIFT_REMINDER','STAFF_SHIFT_LEAVE_APPROVED','STAFF_SHIFT_LEAVE_REJECTED']),
   'Staff notification family has explicit EN presentation ownership')
ok('PROMOTION_V64' in presentation and 'PROMOTION_V77' in presentation and 'Campaign title/body are administrator-authored business content' in presentation,
   'CRM/marketing campaign copy remains business-owned instead of being machine-translated')
ok('SECURITY_ALERT' in presentation and 'SECURITY_COPY' in presentation,
   'Known security alerts have explicit EN presentation ownership')
ok('Unknown notification producers are treated as backend/business payloads' in presentation and 'return { title: [data(item.title)], message: [data(item.message)] }' in presentation,
   'Unknown notification producers fail closed as backend-owned payloads')
ok('"/notifications"' in e2e and 'presentationLeaks' in e2e and 'data-i18n-skip' in e2e,
   'V78 browser regression still sweeps notifications with exact boundary semantics')
ok(any(x in sw for x in ['const VERSION = "v78-0-4";','const VERSION = "v78-0-5";','const VERSION = "v78-0-6";','const VERSION = "v78-0-7";','const VERSION = "v78-0-8";','const VERSION = "v78-0-9";','const VERSION = "v78-0-10";','const VERSION = "v78-0-11";','const VERSION = "v78-0-12";','const VERSION = "v78-0-13";','const VERSION = "v78-0-14";','const VERSION = "v78-0-15";','const VERSION = "v78-0-16";','const VERSION = "v78-0-17";','const VERSION = "v78-0-18";']),'Service Worker generation is V78.0.4 or forward-compatible V78.0.6')

migrations=list((ROOT/'backend/src/main/resources/db/migration').glob('V*.sql'))
latest=max(int(re.match(r'V(\d+)',x.name).group(1)) for x in migrations if re.match(r'V(\d+)',x.name))
ok(latest==72 and not list((ROOT/'backend/src/main/resources/db/migration').glob('V78*.sql')),'V78.0.4 remains no-schema on Flyway V72')
name='verify_v78_0_4_notification_presentation_language_business_boundaries.py'
ok(name in release and name in ci and name in diag,'Release, CI and V78 diagnostics execute V78.0.4 verifier')
ok('verify-v78-0-4' in make and 'release-v78-0-4' in make,'Makefile exposes V78.0.4 verify/release lifecycle')
ok(any(x in readme for x in ['Current release:** V78.0.4','Current release:** V78.0.5','Current release:** V78.0.6','Current release:** V78.0.7','Current release:** V78.0.8','Current release:** V78.0.9','Current release:** V78.0.10','Current release:** V78.0.11','Current release:** V78.0.12','Current release:** V78.0.13','Current release:** V78.0.14','Current release:** V78.0.15','Current release:** V78.0.16','Current release:** V78.0.17','Current release:** V78.0.18']) and any(x in readme for x in ['`v78.0.4`','`v78.0.5`','`v78.0.6`','`v78.0.7`','`v78.0.8`','`v78.0.9`','`v78.0.10`','`v78.0.11`','`v78.0.12`','`v78.0.13`','`v78.0.14`','`v78.0.15`']) and 'notification presentation' in readme.lower(),
   'README records V78.0.4 notification presentation-language boundary fix')
ok([p.name for p in ROOT.glob('*.md')]==['README.md'],'Source keeps one consolidated root README.md')

prev3=subprocess.run([sys.executable,'-X','utf8',str(ROOT/'tools/verify_v78_0_3_staff_schedule_admin_runtime_sweep_stability.py')],cwd=ROOT,text=True,encoding='utf-8',errors='replace',capture_output=True)
ok(prev3.returncode==0 and '16/16 checks passed' in prev3.stdout,'V78.0.3 verifier is forward-compatible with V78.0.4')
prev2=subprocess.run([sys.executable,'-X','utf8',str(ROOT/'tools/verify_v78_0_2_recommendation_presentation_language_ownership.py')],cwd=ROOT,text=True,encoding='utf-8',errors='replace',capture_output=True)
ok(prev2.returncode==0 and '22/22 checks passed' in prev2.stdout,'V78.0.2 recommendation verifier remains green')
prev1=subprocess.run([sys.executable,'-X','utf8',str(ROOT/'tools/verify_v78_0_1_runtime_language_business_data_boundaries.py')],cwd=ROOT,text=True,encoding='utf-8',errors='replace',capture_output=True)
ok(prev1.returncode==0 and '15/15 checks passed' in prev1.stdout,'V78.0.1 runtime language verifier remains green')
base=subprocess.run([sys.executable,'-X','utf8',str(ROOT/'tools/verify_v78_ux_accessibility_pwa_5.py')],cwd=ROOT,text=True,encoding='utf-8',errors='replace',capture_output=True)
ok(base.returncode==0 and '27/27 checks passed' in base.stdout,'Base V78 UX/Accessibility/PWA verifier remains green')

passed=sum(checks)
print(f"\nV78.0.4 notification presentation-language/business-data boundary verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed==len(checks) else 1)
