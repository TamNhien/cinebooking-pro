from pathlib import Path
root=Path(__file__).resolve().parents[1]
checks={
    'migration': (root/'backend/src/main/resources/db/migration/V22__notification_center_v2.sql','CREATE TABLE notification_preference'),
    'preference trigger': (root/'backend/src/main/resources/db/migration/V22__notification_center_v2.sql','trg_app_user_notification_preference'),
    'dedupe index': (root/'backend/src/main/resources/db/migration/V22__notification_center_v2.sql','uq_notification_user_dedupe'),
    'preference entity': (root/'backend/src/main/java/com/cinebooking/domain/NotificationPreference.java','class NotificationPreference'),
    'email after commit': (root/'backend/src/main/java/com/cinebooking/notification/NotificationService.java','afterCommit(()->delivery.deliverEmail'),
    'email delivery service': (root/'backend/src/main/java/com/cinebooking/notification/NotificationDeliveryService.java','MimeMessageHelper'),
    'browser feed API': (root/'backend/src/main/java/com/cinebooking/notification/NotificationController.java','/browser-feed'),
    'preference API': (root/'backend/src/main/java/com/cinebooking/notification/NotificationController.java','/preferences'),
    'test notification API': (root/'backend/src/main/java/com/cinebooking/notification/NotificationController.java','/test'),
    'two-backend dedupe insert': (root/'backend/src/main/java/com/cinebooking/notification/NotificationRepository.java','on conflict (user_id,dedupe_key)'),
    'staff reminder job': (root/'backend/src/main/java/com/cinebooking/notification/StaffShiftReminderJob.java','SHIFT_REMINDER:'),
    'shift assignment notification': (root/'backend/src/main/java/com/cinebooking/staffops/StaffShiftService.java','STAFF_SHIFT_ASSIGNED'),
    'frontend preferences UI': (root/'frontend/app/notifications/page.tsx','Kênh nhận thông báo'),
    'browser notification poller': (root/'frontend/components/Header.tsx','/notifications/browser-feed'),
    'diagnostics': (root/'tools/diagnose-v22.ps1','missing_preferences'),
    'smoke test': (root/'tools/test-v22.ps1','ALL V22 NOTIFICATION CENTER SMOKE TESTS PASSED'),
}
failed=[]
for name,(path,needle) in checks.items():
    ok=path.exists() and needle in path.read_text(encoding='utf-8')
    print(('PASS' if ok else 'FAIL')+': '+name)
    if not ok: failed.append(name)
print(f'{len(checks)-len(failed)}/{len(checks)} checks passed')
raise SystemExit(1 if failed else 0)
