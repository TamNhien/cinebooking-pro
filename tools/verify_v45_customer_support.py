from pathlib import Path
import re
import sys
ROOT=Path(__file__).resolve().parents[1]
checks=[]
def has(path,*needles):
    text=(ROOT/path).read_text(encoding="utf-8")
    return all(x in text for x in needles)
def ok(label,cond):
    checks.append((label,bool(cond)));print(f"[ {'OK' if cond else 'FAIL'} ] {label}")

ok("V45 migration creates support case and event tables",has("backend/src/main/resources/db/migration/V45__customer_support_service_recovery.sql","CREATE TABLE customer_support_case","CREATE TABLE customer_support_case_event"))
ok("V45 migration constrains category priority and status",has("backend/src/main/resources/db/migration/V45__customer_support_service_recovery.sql","ck_support_category","ck_support_priority","ck_support_status"))
ok("V45 support history is append-only",has("backend/src/main/resources/db/migration/V45__customer_support_service_recovery.sql","trg_v45_support_event_immutable","append-only"))
ok("Support case entity exists",has("backend/src/main/java/com/cinebooking/domain/CustomerSupportCase.java","@Table(name=\"customer_support_case\")","slaDueAt","assignedTo"))
ok("Support event entity exists",has("backend/src/main/java/com/cinebooking/domain/CustomerSupportCaseEvent.java","@Table(name=\"customer_support_case_event\")","visibility","actorUserId"))
ok("Support rules define SLA and guarded lifecycle",has("backend/src/main/java/com/cinebooking/support/SupportCaseRules.java","Duration.ofHours(4)","WAITING_CUSTOMER","RESOLVED","CLOSED"))
ok("Customer support API creates and lists own cases",has("backend/src/main/java/com/cinebooking/support/CustomerSupportController.java","@RequestMapping(\"/api/support\")","@PostMapping(\"/cases\")","@GetMapping(\"/cases\")"))
ok("Customer support API exposes conversation",has("backend/src/main/java/com/cinebooking/support/CustomerSupportController.java","/events","/messages"))
ok("Admin support API exposes summary and cinema scope",has("backend/src/main/java/com/cinebooking/support/AdminCustomerSupportController.java","/summary","/cinemas","/staff-options"))
ok("Admin support API exposes planning reply and transition",has("backend/src/main/java/com/cinebooking/support/AdminCustomerSupportController.java","/plan","/reply","/transition"))
ok("Support service validates booking ownership",has("backend/src/main/java/com/cinebooking/support/CustomerSupportService.java","Booking không thuộc tài khoản của bạn","cinemaForBooking"))
ok("Support service applies priority SLA",has("backend/src/main/java/com/cinebooking/support/CustomerSupportService.java","SupportCaseRules.sla","setSlaDueAt"))
ok("Support service restricts manager to own cinema",has("backend/src/main/java/com/cinebooking/support/CustomerSupportService.java","Manager chỉ xử lý yêu cầu thuộc rạp của mình","managerCinema"))
ok("Support service sends customer notifications",has("backend/src/main/java/com/cinebooking/support/CustomerSupportService.java","SUPPORT_REPLY","SUPPORT_STATUS","notifications.create"))
ok("Support unit tests cover lifecycle and SLA",has("backend/src/test/java/com/cinebooking/support/SupportCaseRulesTest.java","lifecycleGuardsTerminalClosed","slaMatchesPriority","openStatusSetExcludesResolvedAndClosed"))
ok("Security allows Manager/Admin support operations",has("backend/src/main/java/com/cinebooking/config/SecurityConfig.java","/api/admin/support/**","MANAGER","ADMIN"))
ok("Customer support frontend exists",has("frontend/app/support/page.tsx","Trung tâm hỗ trợ khách hàng","Gửi yêu cầu hỗ trợ","/support/cases"))
ok("Admin support frontend exists",has("frontend/app/admin/support/page.tsx","Support Operations","Rạp hỗ trợ","OVERDUE"))
ok("Frontend types include V45 contracts",has("frontend/lib/types.ts","SupportCase","SupportCaseEvent","SupportSummary"))
ok("Header links customer support",has("frontend/components/Header.tsx","href=\"/support\"","href=\"/admin/support\""))
ok("Admin dashboard links support operations",has("frontend/app/admin/page.tsx","/admin/support","Hỗ trợ khách hàng"))
ok("V45 Playwright covers create and resolve journey",has("frontend/e2e/customer-support.spec.ts","V45 customer opens a support case","Nhận xử lý","Giải quyết"))
integration_text=(ROOT/"backend/src/test/java/com/cinebooking/integration/CineBookingIntegrationIT.java").read_text(encoding="utf-8")
flyway_versions=[int(v) for v in re.findall(r'isEqualTo\("(\d+)"\)', integration_text)]
ok("Integration test retains V45 schema coverage on current Flyway", "customer_support_case" in integration_text and "trg_v45_support_event_immutable" in integration_text and bool(flyway_versions) and max(flyway_versions)>=45)
ci_text=(ROOT/".github/workflows/ci.yml").read_text(encoding="utf-8")
ci_versions=[int(v) for v in re.findall(r'V26-V(\d+) source regression', ci_text)]
ok("Main CI retains V45 verifier in current regression", "verify_v45_customer_support.py" in ci_text and bool(ci_versions) and max(ci_versions)>=45)
rc_text=(ROOT/".github/workflows/release-candidate.yml").read_text(encoding="utf-8")
rc_versions=[int(v) for v in re.findall(r'Verify V(\d+) source gate', rc_text)]
ok("Standalone RC retains V45 verifier in current source gate", "verify_v45_customer_support.py" in rc_text and bool(rc_versions) and max(rc_versions)>=45)
release_text=(ROOT/".github/workflows/release.yml").read_text(encoding="utf-8")
release_versions=[int(v) for v in re.findall(r'default: "(\d+)\.0\.0"', release_text)]
ok("Stable release retains V45 verifier in current source gate", "verify_v45_customer_support.py" in release_text and bool(release_versions) and max(release_versions)>=45)
ok("Makefile exposes V45 verify and diagnose",has("Makefile","verify-v45:","diagnose-v45:"))
ok("V45 diagnostics chains V44 and V45",has("tools/diagnose-v45.ps1","verify_v44_maintenance_reliability.py","verify_v45_customer_support.py","V45 source diagnostics passed."))

ok("Admin all-cinema support view loads assignment candidates",has("frontend/app/admin/support/page.tsx","api<SupportStaff[]>(\"/admin/support/staff-options\")","setStaff(p)"))
ok("Support assignment accepts active Staff or Manager",has("backend/src/main/java/com/cinebooking/support/CustomerSupportService.java","a.getRole()!=Role.MANAGER&&a.getRole()!=Role.STAFF","Staff/Manager đang hoạt động"))
ok("Admin support assignment candidates include branch metadata",has("backend/src/main/java/com/cinebooking/support/SupportDtos.java","UUID cinemaId,String cinemaName") and has("frontend/lib/types.ts","cinemaName?:string"))
ok("Manager support assignment remains cinema-scoped",has("backend/src/main/java/com/cinebooking/support/CustomerSupportService.java","actor.getRole()==Role.MANAGER","Manager chỉ phân công nhân sự thuộc cùng rạp của yêu cầu"))
passed=sum(1 for _,v in checks if v);total=len(checks)
print(f"\nV45 verification: {passed}/{total} checks passed")
sys.exit(0 if passed==total else 1)
