#!/usr/bin/env python3
from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]
checks=[]

def text(rel): return (ROOT/rel).read_text(encoding='utf-8')
def ok(cond,label):
    checks.append((bool(cond),label)); print(f"[ {'OK' if cond else 'FAIL'} ] {label}")

sql=text('tools/localize-vietnamese-display-data-v77-0-9.sql')
ps=text('tools/localize-vietnamese-display-data-v77-0-9.ps1')
wrapper=text('tools/localize-vietnamese-display-data-v77-0-10.ps1')
finance=text('backend/src/main/java/com/cinebooking/finance/FinancialLedgerService.java')
page=text('frontend/app/admin/finance/page.tsx')
maint=text('frontend/app/admin/maintenance/page.tsx')
labels=text('frontend/lib/vi-labels.ts')
readme=text('README.md')
ci=text('.github/workflows/ci.yml')
release=text('scripts/release.ps1')
diagnose=text('tools/diagnose-v77.ps1')
makefile=text('Makefile')
v779=text('tools/verify_v77_0_9_vietnamese_ui_maintenance_completion.py')

ok('BEGIN;' in sql and 'COMMIT;' in sql,'Localization SQL remains transactional')
ok('UPDATE financial_ledger_entry' not in sql,'Localization SQL never mutates immutable financial_ledger_entry')
ok('financial_ledger_entry is immutable' in sql,'Localization SQL documents immutable-ledger exception')
ok('UPDATE maintenance_work_order_event' not in sql,'Localization SQL never mutates immutable V44 maintenance event history')
ok('maintenance_work_order_event is immutable' in sql,'Localization SQL documents immutable maintenance-event exception')
ok('ON_ERROR_STOP=1' in ps,'PowerShell runner remains fail-closed')
ok(all(ord(c)<128 for c in ps),'PowerShell 5.1 runner source is ASCII-safe and cannot mojibake Vietnamese console literals')
ok('localize-vietnamese-display-data-v77-0-9.ps1' in wrapper,'V77.0.10 wrapper reuses corrected idempotent localizer')
ok('Đã ghi nhận thanh toán ' in finance,'New payment ledger descriptions are written in Vietnamese')
ok('Đã hoàn tiền ' in finance,'New refund ledger descriptions are written in Vietnamese')
ok('localizeLedgerDescription' in finance,'Legacy immutable ledger descriptions are localized at API presentation time')
ok('Captured ' in finance and 'Refunded ' in finance,'Legacy English ledger patterns are recognized without rewriting stored history')
ok('Số tiền bút toán ghi nhận khác số tiền thanh toán' in finance,'Reconciliation issue message is Vietnamese')
ok('Điểm thành viên trên tài khoản khác tổng điểm còn lại trong các lô điểm' in finance,'Loyalty reconciliation message is Vietnamese')
ok('Sổ cái tài chính & đối soát' in page,'Finance page heading is fully Vietnamese')
ok('Tạo work order' not in maint and 'Tạo phiếu bảo trì' in maint,'Maintenance UI no longer renders work order in English')
ok('maintenanceDisplayText(event.note)' in maint,'Legacy immutable maintenance-event notes are localized at render time')
ok('Hoàn tiềned' not in page,'Broken mixed-language finance label is removed')
ok('issue đang mở' not in page and 'Expected ' not in page,'Finance page no longer renders English issue/Expected wording')
ok('viLabel(e.eventType)' in page,'Ledger event type is localized for web display')
ok('viLabel(l.direction)' in page,'Ledger debit/credit direction is localized for web display')
ok('viLabel(i.severity)' in page and 'viLabel(i.issueType)' in page,'Finance issue metadata is localized for web display')
ok('viLabel(r.status)' in page,'Reconciliation run status is localized for web display')
for machine,vi in [('PAYMENT_CAPTURED','Ghi nhận thanh toán'),('REFUND_SETTLED','Ghi nhận hoàn tiền'),('DEBIT','Nợ'),('CREDIT','Có'),('CLEAN','Đã đối soát, không sai lệch'),('ISSUES','Có sai lệch cần xử lý')]:
    ok(re.search(rf'\b{re.escape(machine)}\s*:\s*"{re.escape(vi)}"',labels) is not None,f'Vietnamese label map covers {machine}')
ok('V77.0.10' in readme,'README current patch documents V77.0.10')
ok('verify_v77_0_10_vietnamese_localizer_immutable_ledger.py' in ci,'CI runs V77.0.10 verifier')
ok('verify_v77_0_10_vietnamese_localizer_immutable_ledger.py' in release,'Stable release preflight runs V77.0.10 verifier')
ok('verify_v77_0_10_vietnamese_localizer_immutable_ledger.py' in diagnose,'V77 diagnostics chain V77.0.10 verifier')
ok('v77.0.10' in makefile,'Makefile exposes V77.0.10 release target')
ok('UPDATE\\s+financial_ledger_entry' in v779 and 'preserves immutable V42 financial ledger history' in v779,'Historical V77.0.9 verifier is forward-compatible with corrected immutable ledger policy')

passed=sum(1 for c,_ in checks if c)
print(f"\nV77.0.10 Vietnamese localizer / immutable ledger verification: {passed}/{len(checks)} checks passed")
if passed!=len(checks): raise SystemExit(1)
