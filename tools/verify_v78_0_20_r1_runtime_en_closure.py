from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
checks: list[bool] = []

def text(rel: str) -> str:
    p = ROOT / rel
    return p.read_text(encoding="utf-8") if p.exists() else ""

def ok(condition, label: str) -> None:
    passed = bool(condition)
    checks.append(passed)
    print(f"[ {'OK' if passed else 'FAIL'} ] {label}")

crm = text("frontend/app/admin/crm-automation/page.tsx")
mobile = text("frontend/app/mobile/page.tsx")
notifications = text("frontend/app/notifications/page.tsx")
notification_helper = text("frontend/lib/notification-presentation.ts")
offline = text("frontend/app/offline-tickets/page.tsx")
inventory = text("frontend/app/admin/inventory/page.tsx")
commerce = text("frontend/app/admin/commerce/page.tsx")
reviews = text("frontend/app/admin/reviews/page.tsx")
audit = text("frontend/app/admin/audit/page.tsx")
helper = text("frontend/lib/controlled-business-presentation.ts")
e2e = text("frontend/e2e/v78-language-accessibility-pwa.spec.ts")
release = text("scripts/release.ps1")
ci = text(".github/workflows/ci.yml")
diag = text("tools/diagnose-v78.ps1")
make = text("Makefile")
readme = text("README.md")

# CRM V77 default editor values are controlled source copy, not arbitrary administrator data.
ok('CRM_DEFAULT_CAMPAIGN_COPY' in crm and 'An offer just for you' in crm and 'personalized offer suited to your current lifecycle stage' in crm,
   "CRM composer owns default Title/Content in VI/EN")
ok('Object.values(CRM_DEFAULT_CAMPAIGN_COPY).some' in crm and 'titleIsDefault' in crm and 'messageIsDefault' in crm,
   "CRM language switching preserves administrator edits and only swaps untouched defaults")
ok('data-testid="crm-title-v7820r1"' in crm and 'data-testid="crm-message-v7820r1"' in crm,
   "CRM default-value EN contract is browser-testable")

# V52/PWA dynamic device metadata.
ok('data-testid="pwa-device-count-v7820r1"' in mobile and 't("thiết bị","devices")' in mobile,
   "PWA device count owns its EN noun")
ok('data-testid="pwa-device-meta-v7820r1"' in mobile and 't("Đẩy","Push")' in mobile and 't("Đã xem","Last seen")' in mobile,
   "PWA device runtime metadata owns Push/Last seen EN labels")

# Notifications: persisted/system-owned payloads plus dynamic UI feedback.
ok('SUPPORT_SYSTEM_NOTE_EN' in notification_helper and 'V45 service recovery was completed' in notification_helper,
   "Known support-system notification note has bounded EN presentation")
ok('item.title==="Sắp đến giờ chiếu"' in notification_helper and 'showtimeReminder(item,false)' in notification_helper,
   "Older persisted 3-hour movie-reminder rows have an EN title-shape fallback")
ok('title.startsWith("Cập nhật yêu cầu ")' in notification_helper and 'title.startsWith("CineBooking đã phản hồi ")' in notification_helper,
   "Older persisted support notification rows have EN shape fallbacks")
ok('data-testid="notification-count-v7820r1"' in notifications and 't("thông báo","notifications")' in notifications,
   "Notification count renders an EN noun")
ok('Notification restored to the inbox.' in notifications and 'Notification preferences saved.' in notifications and 'Browser notification permission was not granted.' in notifications,
   "Notification action/permission feedback is language-owned")

# Offline-ticket dynamic sync result.
ok('data-testid="offline-sync-status-v7820r1"' in offline and 'last checked ${syncResult.checked} tickets' in offline,
   "Offline ticket sync status renders the dynamic EN checked-ticket count")

# Inventory/commerce controlled operational data.
ok('inventoryMovementNotePresentation' in helper and 'Loyalty points redemption' in helper and 'Inter-cinema inventory transfer' in helper,
   "Inventory known movement-note templates have bounded EN presentation")
ok('Branch restock' in helper and 'Waste recorded during the end-of-shift inventory count' in helper and 'Restock for the evening shift' in helper,
   "Inventory seeded/E2E note vocabulary covers the reported EN leaks")
ok(inventory.count('inventoryMovementNotePresentation(m.note,language)') >= 2 and 'data-testid="inventory-movement-note-v7820r1"' in inventory,
   "Inventory desktop/mobile movement notes use the controlled EN renderer")
ok('data-testid="commerce-stock-v7820r1"' in commerce and 't("Kho","Stock")' in commerce and 't("khả dụng","available")' in commerce and 't("đang giữ","reserved")' in commerce and 't("thực tế","on hand")' in commerce,
   "Commerce stock availability line owns all dynamic EN labels")

# Review seed copy is deterministic system/demo data; arbitrary review content remains untouched.
ok('movieReviewCommentPresentation' in helper and 'Engaging content with good pacing.' in helper and 'Beautiful visuals and impressive sound.' in helper,
   "Known demo review comments have bounded EN presentation")
ok('SEEDED_REVIEW_COMMENT_EN[raw]??raw' in helper,
   "Unknown/user-authored review text remains raw business content")
ok('t("Mã phim","Movie ID")' in reviews and 'movieReviewCommentPresentation(r.comment,language)' in reviews,
   "Review cards localize Movie ID and known seeded comments")

# Audit details are backend/system templates; identifiers/action codes remain machine data.
ok('auditDetailPresentation' in helper and 'V68 step-up granted for' in helper and 'Open incident' in helper,
   "Audit V68 and incident details have bounded EN presentation")
ok('Low stock' in helper and 'Degraded equipment / service overdue' in helper and 'No available stock' in helper and 'Support past SLA' in helper,
   "Audit operations-alert details cover reported known EN leaks")
ok('FAILED payments in ${match[1]} minutes' in helper and 'return raw' in helper,
   "Audit dynamic FAILED-payment template is EN while unknown detail remains raw")
ok('auditDetailPresentation(x.details,language)' in audit and 'whitespace-nowrap' in audit and 'data-testid="audit-details-v7820r1"' in audit,
   "Admin Audit renders known details in EN and keeps action machine words unbroken")

# Focused browser contract catches these dynamic blind spots, which the static literal sweep cannot see.
for marker, label in [
    ('crm-title-v7820r1', 'CRM runtime defaults'),
    ('pwa-device-meta-v7820r1', 'PWA device metadata'),
    ('notification-list-v7820r1', 'notification payloads'),
    ('offline-sync-status-v7820r1', 'offline ticket sync status'),
    ('inventory-movement-note-v7820r1', 'inventory notes'),
    ('commerce-stock-v7820r1', 'commerce stock text'),
    ('review-comment-v7820r1', 'seeded review comments'),
    ('audit-details-v7820r1', 'audit details'),
]:
    ok(marker in e2e, f"Focused V78 browser journey asserts {label}")

# Lifecycle/release wiring: same stable version, refined release candidate.
name = 'verify_v78_0_20_r1_runtime_en_closure.py'
ok(name in release and name in ci and name in diag,
   "Stable preflight, GitHub CI and diagnostics execute V78.0.20-R1 runtime EN verifier")
ok('verify-v78-0-20-r1' in make,
   "Makefile exposes V78.0.20-R1 verification")
ok('V78.0.20-R1 - Runtime EN Presentation Closure' in readme,
   "Single README records the V78.0.20-R1 runtime EN refinement")
ok([p.name for p in ROOT.glob('*.md')] == ['README.md'],
   "Source keeps exactly one consolidated root README.md")

# No schema change.
migrations = list((ROOT / 'backend/src/main/resources/db/migration').glob('V*.sql'))
latest = max(int(re.match(r'V(\d+)', p.name).group(1)) for p in migrations if re.match(r'V(\d+)', p.name))
ok(latest == 72 and not list((ROOT / 'backend/src/main/resources/db/migration').glob('V78*.sql')),
   "V78.0.20-R1 remains no-schema on Flyway V72")

# Staging hygiene for files owned by this refinement.
changed = [
    'frontend/app/admin/crm-automation/page.tsx', 'frontend/app/mobile/page.tsx',
    'frontend/app/notifications/page.tsx', 'frontend/app/offline-tickets/page.tsx',
    'frontend/app/admin/inventory/page.tsx', 'frontend/app/admin/commerce/page.tsx',
    'frontend/app/admin/reviews/page.tsx', 'frontend/app/admin/audit/page.tsx',
    'frontend/lib/notification-presentation.ts', 'frontend/lib/controlled-business-presentation.ts',
    'frontend/e2e/v78-language-accessibility-pwa.spec.ts', 'tools/'+name,
    'scripts/release.ps1', '.github/workflows/ci.yml', 'tools/diagnose-v78.ps1', 'Makefile', 'README.md',
]
hygiene=[]
for rel in changed:
    p=ROOT/rel
    if not p.exists(): hygiene.append(rel+':missing'); continue
    raw=p.read_bytes(); lines=p.read_text(encoding='utf-8').splitlines()
    if any(line.endswith(' ') or line.endswith('\t') for line in lines): hygiene.append(rel+':trailing')
    if not raw.endswith(b'\n') or raw.endswith(b'\n\n'): hygiene.append(rel+':eof')
ok(not hygiene, f"V78.0.20-R1 owned files are staging-whitespace clean (hits={len(hygiene)})")

# Existing V78.0.20 release contract must remain green.
proc=subprocess.run([sys.executable,'-X','utf8',str(ROOT/'tools/verify_v78_0_20_v70_v77_en_release_tag_closure.py')],cwd=ROOT,text=True,encoding='utf-8',errors='replace',capture_output=True)
ok(proc.returncode==0 and '42/42 checks passed' in proc.stdout,
   "V78.0.20 V70-V77 EN / release-tag closure remains green")

passed=sum(checks)
print(f"\nV78.0.20-R1 Runtime EN Presentation Closure verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed==len(checks) else 1)
