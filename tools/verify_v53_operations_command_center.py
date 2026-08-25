from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]
checks=[]
def text(rel):
    p=ROOT/rel
    return p.read_text(encoding='utf-8') if p.exists() else ''
def check(name,cond):
    ok=bool(cond);checks.append((name,ok));print(f"[ {'OK' if ok else 'FAIL'} ] {name}")

service=text('backend/src/main/java/com/cinebooking/commandcenter/CommandCenterService.java')
dtos=text('backend/src/main/java/com/cinebooking/commandcenter/CommandCenterDtos.java')
controller=text('backend/src/main/java/com/cinebooking/commandcenter/AdminCommandCenterController.java')
security=text('backend/src/main/java/com/cinebooking/config/SecurityConfig.java')
page=text('frontend/app/admin/command-center/page.tsx')
types=text('frontend/lib/types.ts')
header=text('frontend/components/Header.tsx')
admin=text('frontend/app/admin/page.tsx')
e2e=text('frontend/e2e/operations-command-center-v53.spec.ts')
ci=text('.github/workflows/ci.yml')
rc=text('.github/workflows/release-candidate.yml')
release=text('.github/workflows/release.yml')
make=text('Makefile')
diagnose=text('tools/diagnose-v53.ps1')
readme=text('README.md')
integration=text('backend/src/test/java/com/cinebooking/integration/CineBookingIntegrationIT.java')
seed_verify=text('tools/verify_seed_demo_57.py')

check('V53 is a no-schema command-center release', not (ROOT/'backend/src/main/resources/db/migration/V53__operations_command_center_3.sql').exists())
check('V52 remains the latest Flyway migration for V53', (ROOT/'backend/src/main/resources/db/migration/V52__pwa_mobile_experience_3.sql').exists() and 'assertThat(latest).isEqualTo("52")' in integration)
check('V53 keeps the 57-table data contract', 'Final verification enumerates all 57 pgAdmin tables' in seed_verify and 'pwa_device' in seed_verify)
check('Command Center DTOs expose cinema scope status metrics and attention items', all(x in dtos for x in ['CinemaOption','AttentionItem','todayRevenue','forecastNext7d','overdueSupportCases','overdueMaintenanceOrders','lowStockItems','soldOutItems']))
check('Command Center controller exposes cinema and summary endpoints', '@RequestMapping("/api/admin/command-center")' in controller and '@GetMapping("/cinemas")' in controller and '@GetMapping("/summary")' in controller)
check('Security allows Manager/Admin into V53 before generic admin rule', '.requestMatchers("/api/admin/command-center/**").hasAnyRole("MANAGER","ADMIN")' in security and security.index('/api/admin/command-center/**') < security.index('/api/admin/**'))
check('V53 service restricts access to Manager/Admin', 'actor.getRole() != Role.ADMIN && actor.getRole() != Role.MANAGER' in service and 'Operations Command Center' in service)
check('Manager command-center scope is locked to assigned cinema', 'Manager chỉ xem Operations Command Center của rạp mình' in service and 'managerCinema(actor)' in service)
check('Admin can use all-cinema or explicit cinema scope', 'actor.getRole() == Role.ADMIN' in service and 'requestedCinemaId' in service and 'Toàn hệ thống' in service)
check('V53 revenue is based only on successful payments from the current business day', "p.status='SUCCESS'" in service and "date(p.paid_at at time zone 'Asia/Ho_Chi_Minh')" in service)
check('V53 booking and ticket pulse uses confirmed business data', "b.status='CONFIRMED'" in service and 'booking_seat' in service and 'released_at is null' in service)
check('V53 occupancy derives sold seats and auditorium capacity instead of synthetic percentages', 'seat_type<>\'BLOCKED\'' in service and 'new long[]{rs.getLong("sold"), rs.getLong("capacity")}' in service)
check('V53 surfaces payment REVIEW operations', "p.status='REVIEW'" in service and '/admin/payments' in service)
check('V53 surfaces open and overdue support SLA', 'customer_support_case' in service and 'sla_due_at<now()' in service and '/admin/support' in service)
check('V53 surfaces open and overdue maintenance work orders', 'maintenance_work_order' in service and 'm.due_at<now()' in service and '/admin/maintenance' in service)
check('V53 surfaces open staff incidents', "staff_incident" in service and "i.status='OPEN'" in service and '/staff/operations' in service)
check('V53 inventory pulse uses branch available stock and real low-stock thresholds', 'cinema_concession_inventory' in service and 'stock_on_hand-inv.stock_reserved' in service and 'low_stock_threshold' in service)
check('V53 forecast reuses V51 weekday-weighted forecasting', 'AnalyticsForecastingService' in service and 'forecasting.forecast(cinemaId).next7DaysRevenue()' in service)
check('V53 command center is read-only and does not mutate business state', 'jdbc.update(' not in service and 'jdbc.batchUpdate(' not in service)
check('V53 derives overall HEALTHY WATCH ACTION_REQUIRED status from real counts', all(x in service for x in ['ACTION_REQUIRED','WATCH','HEALTHY']))
check('Frontend V53 page exists with command-center source marker', 'Operations Command Center · V53' in page and 'operations-command-center-v53' in page)
check('Frontend supports Admin all-cinema filter and Manager fixed branch scope', 'command-center-cinema-filter' in page and 'profile.role==="MANAGER"' in page and 'me?.role==="ADMIN"' in page)
check('Frontend renders revenue forecast occupancy and critical pulse', all(x in page for x in ['Doanh thu hôm nay','Forecast 7 ngày','Occupancy hôm nay','Điểm critical']))
check('Frontend makes honest empty-attention state explicit', 'Không có tín hiệu cần xử lý' in page and 'không tạo cảnh báo giả' in page)
check('Frontend types include V53 command center contracts', all(x in types for x in ['CommandCenterCinemaV53','CommandCenterAttentionV53','CommandCenterSummaryV53']))
check('Header exposes V53 Command Center to Manager/Admin menus', header.count('/admin/command-center') >= 4)
check('Admin dashboard links V53 Command Center', '/admin/command-center' in admin and 'Command Center V53' in admin)
check('V53 Playwright covers admin all-cinema and cinema-scoped read journey', all(x in e2e for x in ['V53 admin sees a cinema-scoped operations command center','command-center-summary-v53','command-center-cinema-filter']))
ci_match=re.search(r'name:\s*V26-V(\d+) source regression',ci)
check('Main CI extends source regression through V53', bool(ci_match) and int(ci_match.group(1))>=53 and 'verify_v53_operations_command_center.py' in ci)
rc_versions=[int(v) for v in re.findall(r'default: "v(\d+)\.0\.0-rc\.1"',rc)]
check('Standalone RC retains V53 verifier in current-or-newer source gate', bool(rc_versions) and max(rc_versions)>=53 and 'verify_v53_operations_command_center.py' in rc)
release_versions=[int(v) for v in re.findall(r'default: "(\d+)\.0\.0"',release)]
check('Stable release retains V53 verifier in current-or-newer source gate', bool(release_versions) and max(release_versions)>=53 and 'verify_v53_operations_command_center.py' in release)
check('Makefile exposes V53 verify diagnostics and unchanged 57-table checks', all(x in make for x in ['verify-v53:','diagnose-v53:','verify-seed-demo-v53:','seed-demo-v53:','check-seed-demo-v53:','verify-reference-v53:','seed-reference-v53:']))
check('V53 diagnostics chain V52 plus V53 and 57-table verifier', all(x in diagnose for x in ['verify_v52_pwa_mobile_3.py','verify_v53_operations_command_center.py','verify_seed_demo_57.py','V53 source diagnostics passed.']))
check('README retains V53 Operations Command Center release history', 'V53 - Operations Command Center 3.0' in readme)
check('README states V53 does not change schema and keeps 57 public tables', 'V53 không tạo migration Flyway mới' in readme and '57 public tables' in readme)
check('README release lifecycle defaults to v53.0.0-rc.1 and v53.0.0', 'v53.0.0-rc.1' in readme and 'v53.0.0' in readme)

passed=sum(ok for _,ok in checks)
print(f"\nV53 verification: {passed}/{len(checks)} checks passed")
if passed != len(checks):
    print("\nFailed checks:")
    for name,ok in checks:
        if not ok: print(f" - {name}")
raise SystemExit(0 if passed==len(checks) else 1)
