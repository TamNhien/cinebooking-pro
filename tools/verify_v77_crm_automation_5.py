from pathlib import Path
import re
import sys

ROOT=Path(__file__).resolve().parents[1]
checks=[]

def text(rel):
    p=ROOT/rel
    return p.read_text(encoding='utf-8') if p.exists() else ''

def check(name,cond):
    ok=bool(cond); checks.append((name,ok)); print(f"[ {'OK' if ok else 'FAIL'} ] {name}")

service=text('backend/src/main/java/com/cinebooking/crm/CrmAutomationService.java')
dtos=text('backend/src/main/java/com/cinebooking/crm/CrmAutomationDtos.java')
controller=text('backend/src/main/java/com/cinebooking/crm/AdminCrmAutomationController.java')
stepup=text('backend/src/main/java/com/cinebooking/identity/StepUpAuthorizationFilter.java')
security=text('backend/src/main/java/com/cinebooking/config/SecurityConfig.java')
page=text('frontend/app/admin/crm-automation/page.tsx')
admin=text('frontend/app/admin/page.tsx')
header=text('frontend/components/Header.tsx')
types=text('frontend/lib/types.ts')
legacy_marketing_page=text('frontend/app/admin/marketing/page.tsx')
tsconfig=text('frontend/tsconfig.json')
e2e=text('frontend/e2e/crm-automation-5-v77.spec.ts')
v76e2e=text('frontend/e2e/recommendation-5-v76.spec.ts')
v76verify=text('tools/verify_v76_recommendation_5.py')
ci=text('.github/workflows/ci.yml')
release=text('scripts/release.ps1')
make=text('Makefile')
diag=text('tools/diagnose-v77.ps1')
readme=text('README.md')
seed=text('tools/seed-demo-57-tables-10-rows.sql')

# Backend core / strategy
check('V77 CRM service is Spring service','@Service' in service and 'JdbcTemplate' in service and 'NotificationService' in service)
check('V77 strategy is explicit','V77-CRM-AUTOMATION-5' in service)
check('V77 summary window bounded 7..180','bound(requestedDays, 7, 180)' in service)
check('V77 preview limit is bounded','PREVIEW_LIMIT = 20' in service)
check('V77 recipient hard limit exists','MAX_RECIPIENTS_LIMIT = 5000' in service)
check('V77 frequency cap is 2 per 7 days','FREQUENCY_CAP_7D = 2' in service and 'promotion_7d' in service)
check('V77 cooldown is 72 hours','COOLDOWN_HOURS = 72' in service and 'ChronoUnit.HOURS' in service)

for token in ['WELCOME_FIRST_BOOKING','ENGAGED_CROSS_SELL','VIP_REWARD','AT_RISK_WINBACK','LAPSED_REACTIVATION']:
    check('V77 lifecycle playbook '+token,token in service)
check('Welcome playbook requires no confirmed booking and young account','c.lifetimeBookings() == 0' in service and 'accountAge <= 30' in service)
check('Engaged playbook uses recent confirmed booking','ENGAGED_CROSS_SELL' in service and 'recency <= 30' in service)
check('VIP playbook uses tier booking or realized value',all(x in service for x in ['"GOLD", "DIAMOND"','c.lifetimeBookings() >= 4','new BigDecimal("1000000")']))
check('At-risk playbook is 31..90 days','recency >= 31 && recency <= 90' in service)
check('Lapsed playbook is over 90 days','recency > 90' in service)

# Real operational data + payment correctness
for token in ['app_user','booking b','payment p','notification_preference','user_notification','voucher']:
    check('V77 reuses operational source '+token,token in service)
check('V77 customer base uses purchaser user','b.purchaser_user_id customer_id' in service)
check('V77 lifecycle bookings require CONFIRMED',"b.status='CONFIRMED'" in service and 'b.confirmed_at is not null' in service)
check('V77 realized revenue uses SUCCESS payment only',"p.status='SUCCESS'" in service and 'p.paid_at is not null' in service)
check('V77 payment retry revenue is deduped by booking','successful_payment_per_booking' in service and 'max(p.amount) amount' in service)
check('V77 reads existing promotion history',"where n.category='PROMOTION'" in service and 'max(n.created_at) last_promotion_at' in service)

# Contactability and suppression
check('V77 promotion opt-out suppression','if (!c.promotionEnabled()) return "PROMOTION_OPT_OUT"' in service)
check('V77 no-channel suppression','NO_ENABLED_CHANNEL' in service and '!c.inAppEnabled() && !c.emailEnabled() && !c.browserEnabled()' in service)
check('V77 frequency suppression','FREQUENCY_CAP_7D' in service and 'c.promotionNotifications7d() >= FREQUENCY_CAP_7D' in service)
check('V77 cooldown suppression','COOLDOWN_72H' in service and 'c.lastPromotionAt().isAfter(Instant.now().minus(COOLDOWN_HOURS, ChronoUnit.HOURS))' in service)
check('V77 contactable audience is suppression-free','filter(c -> suppressionReason(c) == null)' in service)
for token in ['PROMOTION_OPT_OUT_RESPECTED','CONTACTABILITY_CHANNEL_REQUIRED','FREQUENCY_CAP_2_PER_7D','PROMOTION_COOLDOWN_72H']:
    check('V77 safety policy '+token,token in service)

# Preview / execute safety
check('V77 Preview-before-execute policy explicit','PREVIEW_BEFORE_EXECUTE' in service)
check('V77 blast-radius policy explicit','MAX_RECIPIENTS_BLAST_RADIUS_GUARD' in service)
check('V77 execute requires confirmed true','executing && !Boolean.TRUE.equals(request.confirmed())' in service)
check('V77 maxRecipients validation is 1..5000','maxRecipients < 1 || maxRecipients > MAX_RECIPIENTS_LIMIT' in service)
check('V77 preview reports executable state','boolean executable = contactable > 0 && contactable <= spec.maxRecipients()' in service)
check('V77 execute blocks audience above maxRecipients','contactable.size() > spec.maxRecipients()' in service and 'Blast-radius guard' in service)
check('V77 execute blocks zero contactable audience','contactable.isEmpty()' in service)

# Voucher / delivery idempotency
check('V77 voucher is owner scoped','voucher.setOwnerUserId(userId)' in service)
check('V77 voucher is one use','voucher.setUsageLimit(1)' in service)
check('V77 voucher code has V77 namespace','return "C77-" + campaignCode' in service)
check('V77 validates reused voucher owner','userId.equals(voucher.getOwnerUserId())' in service)
check('V77 validates reused voucher config','configMatches' in service and 'sameMoney(spec.maxDiscount(), voucher.getMaxDiscount())' in service)
check('V77 notification type is versioned','"PROMOTION_V77"' in service)
check('V77 notification dedupe key is campaign plus user','"CRM77:" + spec.campaignCode() + ":" + customer.userId()' in service)
check('V77 uses createOnce delivery','notifications.createOnce' in service)
check('V77 idempotent delivery policy explicit','IDEMPOTENT_CAMPAIGN_DELIVERY' in service)

# Outcome evidence
check('V77 outcome reads only PROMOTION_V77',"notification_type='PROMOTION_V77'" in service)
check('V77 outcome measures only readable in-app messages','in_app_visible=true and read_at is not null' in service and 'readRate' in service)
check('V77 assisted booking uses same user prior CRM message','n.user_id=b.purchaser_user_id' in service and 'n.created_at<=b.confirmed_at' in service)
check('V77 assisted booking uses seven-day window',"b.confirmed_at-interval '7 days'" in service)
check('V77 assisted revenue uses deduped SUCCESS payments','assisted_booking' in service and 'successful_payment_per_booking' in service and 'join successful_payment_per_booking sp' in service)
check('V77 correlation disclaimer policy','CRM_ASSISTED_BOOKING_IS_CORRELATION_NOT_CAUSATION' in service)

# Privacy
check('V77 preview DTO exposes masked identity only','String maskedEmail' in dtos and 'String email' not in dtos and 'String fullName' not in dtos)
check('V77 masks email before DTO','maskEmail(c.email())' in service and 'rs.getString("full_name")' not in service)
check('V77 privacy policy explicit','NO_RAW_PERSONAL_DATA_IN_ADMIN_CRM_UI' in service)

# DTO/controller/security
for token in ['CrmPlaybookV77','CrmSuppressionMetricV77','CrmOutcomeV77','CrmAutomationSummaryV77','CrmAutomationRequestV77','CrmAudienceMemberV77','CrmAutomationPreviewV77','CrmAutomationExecutionV77']:
    check('V77 DTO '+token,('record '+token) in dtos)
check('V77 controller namespace','@RequestMapping("/api/admin/crm-automation")' in controller)
check('V77 summary GET','@GetMapping("/summary")' in controller and '@RequestParam(defaultValue = "30")' in controller)
check('V77 preview POST','@PostMapping("/preview")' in controller)
check('V77 execute POST','@PostMapping("/execute")' in controller)
check('V77 Admin API protected by global ADMIN rule','requestMatchers("/api/admin/**").hasRole("ADMIN")' in security)
check('V77 execute is step-up protected','path.equals("/api/admin/crm-automation/execute")' in stepup)

# Frontend types/UI
for token in ['CrmPlaybookCodeV77','CrmPlaybookV77','CrmSuppressionMetricV77','CrmOutcomeV77','CrmAutomationSummaryV77','CrmAutomationRequestV77','CrmAudienceMemberV77','CrmAutomationPreviewV77','CrmAutomationExecutionV77']:
    check('V77 frontend type '+token,('type '+token) in types)
check('V77 Admin page root and branding','crm-automation-v77' in page and ('V77 · CRM AUTOMATION 5.0' in page or 'V77 · TỰ ĐỘNG HÓA CRM 5.0' in page))
check('V77 Admin page requires ADMIN','me.role!=="ADMIN"' in page)
check('V77 Admin page reads summary endpoint','/admin/crm-automation/summary?days=' in page)
check('V77 Admin page supports 7 30 90 180 windows','[7,30,90,180]' in page)
for token in ['crm-summary-v77','crm-policy-v77','crm-outcomes-v77','crm-suppressions-v77','crm-playbooks-v77','crm-composer-v77','crm-preview-result-v77','crm-execution-result-v77','crm-error-v77']:
    check('V77 UI panel '+token,token in page)
check('V77 UI exposes preview before execute','crm-preview-v77' in page and 'crm-execute-v77' in page and 'Hãy chạy Preview trước khi Execute' in page)
check('V77 UI exposes maxRecipients guard','crm-max-recipients-v77' in page and 'maxRecipients' in page and 'blast-radius' in page)
check('V77 UI explains correlation not causation', ('CORRELATION ONLY' in page and 'không phải causal attribution' in page) or ('tín hiệu tương quan' in page and 'không phải quy kết nhân quả' in page))
check('V77 UI links legacy V64 and V76','/admin/marketing' in page and '/admin/recommendation' in page)
check('V77 dashboard tile exists after V76','admin-crm-automation-v77' in admin and admin.index('admin-recommendation-v76')<admin.index('admin-crm-automation-v77'))
labels=['Recommendation V63','CRM & Marketing V64','Observability V65','Seat Operations V66','Payment Resilience V67','Security & Identity V68','Backup & DR V69','Privacy Governance V70','Key Governance V71','Supply Chain V72','Actions Runtime V73','Reliability V74','Analytics & BI V75','Recommendation V76','CRM Automation V77']
check('Admin versioned tiles ascend through V77',all(admin.index(a)<admin.index(b) for a,b in zip(labels,labels[1:])))
check('Header links CRM Automation V77','/admin/crm-automation' in header and 'CRM Automation V77' in header)
check('V77 build guard keeps V64 marketing audience contract privacy-safe','a.fullName' not in legacy_marketing_page and 'a.customerRef' in legacy_marketing_page and 'a.maskedEmail' in legacy_marketing_page)
check('V77 build guard predeclares Next dev generated types','.next/dev/types/**/*.ts' in tsconfig)

# E2E/lifecycle wiring
check('V77 E2E logs in real admin env','E2E_ADMIN_EMAIL' in e2e and 'E2E_ADMIN_PASSWORD' in e2e)
check('V77 E2E verifies dashboard tile','admin-crm-automation-v77' in e2e)
check('V77 E2E verifies version order through 77','sort((a,b)=>a-b)' in e2e and 'toBe(77)' in e2e and 'toContain(76)' in e2e)
check('V77 E2E verifies strategy','V77-CRM-AUTOMATION-5' in e2e)
for token in ['REAL_OPERATIONAL_DATA_ONLY','PROMOTION_OPT_OUT_RESPECTED','FREQUENCY_CAP_2_PER_7D','PROMOTION_COOLDOWN_72H','MAX_RECIPIENTS_BLAST_RADIUS_GUARD','CRM_ASSISTED_BOOKING_IS_CORRELATION_NOT_CAUSATION']:
    check('V77 E2E policy '+token,token in e2e)
check('V77 E2E exercises non-mutating preview','crm-preview-v77' in e2e and 'crm-preview-result-v77' in e2e and 'crm-execute-v77' not in e2e)
check('V76 E2E is forward-compatible with V77','toBeGreaterThanOrEqual(76)' in v76e2e)
check('V76 verifier accepts later source regression','V76 or later' in v76verify and 'V26-V(?:7[6-9]|[89][0-9]) source regression' in v76verify)
check('CI source regression names V77','V26-V77 source regression' in ci)
check('CI runs V77 verifier','verify_v77_crm_automation_5.py' in ci)
check('Release preflight runs V77 verifier','verify_v77_crm_automation_5.py' in release)
check('Release example V77 stable','such as v77.0.0' in release)
check('Makefile exposes V77 verify diagnose release',all(x in make for x in ['verify-v77:','diagnose-v77:','release-v77:','v77.0.0']))
check('Diagnose V77 chains V64 V76 V77',all(x in diag for x in ['verify_v64_crm_marketing_automation.py','verify_v76_recommendation_5.py','verify_v77_crm_automation_5.py']))
check('Diagnose V77 keeps real-data gates','verify_realistic_data_57.py' in diag and 'verify_seed_demo_57.py' in diag)

# Schema/data/README
check('V77 is no-schema release',not any((ROOT/'backend/src/main/resources/db/migration').glob('V77__*.sql')))
check('V77 adds no synthetic seed content','PROMOTION_V77' not in seed and 'V77-CRM-AUTOMATION-5' not in seed)
check('README title V77',re.search(r'^# CineBooking Pro V77(?:\.0\.[0-9]+)?$',readme,re.M) is not None)
check('README current release V77',re.search(r'Current release:\*\* V77(?:\.0\.[0-9]+)? - CRM Automation 5\.0',readme) is not None)
check('README history has V77 after V76','| **V76** |' in readme and '| **V77** |' in readme and readme.index('| **V76** |')<readme.index('| **V77** |'))
check('README detailed V77 section','## V77 - CRM Automation 5.0' in readme)
for token in ['V77-CRM-AUTOMATION-5','FREQUENCY_CAP_2_PER_7D','PROMOTION_COOLDOWN_72H','MAX_RECIPIENTS_BLAST_RADIUS_GUARD','CRM_ASSISTED_BOOKING_IS_CORRELATION_NOT_CAUSATION','New V77 tables: 0','Stable only: v77.0.']:
    check('README documents '+token,token in readme)
check('README keeps Flyway V72 / 67 tables','Flyway latest: V72' in readme and 'Public tables: 67' in readme)
check('README real-data policy extends through V77','V52/V65/V66/V67/V68/V69/V70/V71/V72/V73/V74/V75/V76/V77' in readme and '**không tạo phim/khách/booking/payment giả**' in readme)
check('README retains Windows project command root',r'D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui' in readme)
check('README documents V77 frontend build compatibility fix','V77 frontend build compatibility fix' in readme and 'TS2339' in readme and '.next/dev/types/**/*.ts' in readme)

passed=sum(ok for _,ok in checks)
print(f"\nV77 verification: {passed}/{len(checks)} checks passed")
if passed!=len(checks):
    print('\nFailed checks:')
    for name,ok in checks:
        if not ok: print(' - '+name)
    sys.exit(1)
