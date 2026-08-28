from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]
checks=[]

def text(rel):
    p=ROOT/rel
    return p.read_text(encoding='utf-8') if p.exists() else ''

def check(name, cond):
    ok=bool(cond); checks.append((name,ok)); print(f"[ {'OK' if ok else 'FAIL'} ] {name}")

service=text('backend/src/main/java/com/cinebooking/marketing/MarketingAutomationService.java')
dtos=text('backend/src/main/java/com/cinebooking/marketing/MarketingAutomationDtos.java')
controller=text('backend/src/main/java/com/cinebooking/marketing/AdminMarketingAutomationController.java')
notification=text('backend/src/main/java/com/cinebooking/notification/NotificationService.java')
voucher_repo=text('backend/src/main/java/com/cinebooking/commerce/VoucherRepository.java')
voucher=text('backend/src/main/java/com/cinebooking/domain/Voucher.java')
security=text('backend/src/main/java/com/cinebooking/config/SecurityConfig.java')
ui=text('frontend/app/admin/marketing/page.tsx')
admin=text('frontend/app/admin/page.tsx')
types=text('frontend/lib/types.ts')
e2e=text('frontend/e2e/crm-marketing-automation-v64.spec.ts')
ci=text('.github/workflows/ci.yml')
rc=text('.github/workflows/release-candidate.yml')
release=text('.github/workflows/release.yml')
make=text('Makefile')
diagnose=text('tools/diagnose-v64.ps1')
readme=text('README.md')
v63verify=text('tools/verify_v63_recommendation_4.py')
seed57=text('tools/seed-demo-57-tables-10-rows.sql')

# Backend package / API
check('V64 marketing DTO package exists', bool(dtos))
check('V64 marketing service exists', bool(service))
check('V64 admin marketing controller exists', bool(controller))
check('V64 strategy version is explicit', 'V64-CRM-AUTOMATION-4' in service)
check('Controller is under /api/admin/marketing', '@RequestMapping("/api/admin/marketing")' in controller)
check('Segment endpoint exists', '@GetMapping("/segments")' in controller)
check('Campaign preview endpoint exists', '@PostMapping("/campaigns/preview")' in controller)
check('Campaign launch endpoint exists', '@PostMapping("/campaigns/launch")' in controller)
check('Campaign launch is transactional', '@Transactional\n    public CampaignLaunchResult launch' in service)
check('V64 relies on global ADMIN /api/admin guard', '.requestMatchers("/api/admin/**").hasRole("ADMIN")' in security)

# DTO contract
for token,label in [
    ('MarketingSegment','segment DTO'),('AudienceMember','audience DTO'),('MarketingOverview','overview DTO'),
    ('CampaignRequest','campaign request DTO'),('CampaignPreview','preview DTO'),('CampaignLaunchResult','launch result DTO')]:
    check(f'V64 exposes {label}', f'record {token}' in dtos)
check('Segment exposes recommended action and default discount', 'String recommendedAction' in dtos and 'int defaultDiscountPercent' in dtos)
check('Audience uses maskedEmail not raw email', 'String maskedEmail' in dtos and 'String email' not in re.search(r'public record AudienceMember\((.*?)\n    \) \{\}',dtos,re.S).group(1))
check('Audience exposes real value fields', all(x in dtos for x in ['LocalDate lastBookingDate','long recencyDays','long lifetimeBookings','BigDecimal lifetimeRevenue']))
check('Campaign request exposes voucher controls', all(x in dtos for x in ['String discountType','BigDecimal discountValue','BigDecimal minOrderAmount','BigDecimal maxDiscount','int validityDays']))
check('Campaign request has explicit confirmed guard', 'Boolean confirmed' in dtos)
check('Launch result exposes created/reused counters', 'long vouchersCreated' in dtos and 'long vouchersReused' in dtos)
check('Launch result exposes notification counters', 'long notificationsCreated' in dtos and 'long notificationsSkipped' in dtos)

# Real-data audience source
check('Audience reads app_user', 'from app_user u' in service)
check('Audience reads confirmed bookings', "b.status='CONFIRMED'" in service)
check('Audience requires confirmed_at', 'b.confirmed_at is not null' in service)
check('Audience reads successful payments only', "p.status='SUCCESS'" in service)
check('Audience requires paid_at', 'p.paid_at is not null' in service)
check('Audience excludes non-USER roles', "u.role='USER'" in service)
check('Audience excludes disabled accounts', 'u.account_enabled=true' in service)
check('Audience aggregates booking history by customer', 'group by b.purchaser_user_id' in service)
check('Audience aggregates realized payment revenue by customer', 'coalesce(sum(p.amount),0) lifetime_revenue' in service)
check('Audience uses Vietnam business timezone', 'Asia/Ho_Chi_Minh' in service)
check('No random synthetic customer generator is present', all(x not in service for x in ['Math.random','Random(','Faker','fakeCustomer','synthetic']))

# Segments
segments=['ALL_ELIGIBLE','NEW_30D','ENGAGED_30D','VIP','AT_RISK_31_90D','LAPSED_90D_PLUS','PROSPECT_NO_BOOKING']
for seg in segments:
    check(f'V64 defines {seg} segment', seg in service)
check('Segment set has exactly seven codes', 'private static final Set<String> SEGMENTS = Set.of(' in service and all(seg in service for seg in segments))
check('NEW_30D is based on account age', 'case "NEW_30D" -> accountAge <= 30' in service)
check('ENGAGED_30D is based on recent confirmed booking', 'case "ENGAGED_30D" -> c.lastBookingDate() != null && recency <= 30' in service)
check('VIP considers GOLD and DIAMOND tiers', 'Set.of("GOLD", "DIAMOND")' in service)
check('VIP considers booking frequency', 'c.lifetimeBookings() >= 4' in service)
check('VIP considers realized revenue', 'new BigDecimal("1000000")' in service)
check('AT_RISK uses 31-90 day recency', 'recency >= 31 && recency <= 90' in service)
check('LAPSED uses greater than 90 day recency', 'recency > 90' in service)
check('PROSPECT requires zero confirmed bookings', 'c.lifetimeBookings() == 0' in service)
check('Overview returns current counts per segment', 'customers.stream().filter(c -> matches(code, c)).count()' in service)

# Campaign validation and preview safety
check('Campaign code format is bounded 3-12', '^[A-Z0-9_-]{3,12}$' in service)
check('Unknown segment is rejected', '!SEGMENTS.contains(segmentCode)' in service)
check('Campaign title length is validated', 'title.length() < 3 || title.length() > 120' in service)
check('Campaign message length is validated', 'message.length() < 3 || message.length() > 500' in service)
check('Discount type is PERCENT or FIXED only', 'Set.of("PERCENT", "FIXED")' in service)
check('Discount must be positive', 'discountValue.compareTo(BigDecimal.ZERO) <= 0' in service)
check('Percent discount is capped at 100', 'discountValue.compareTo(new BigDecimal("100")) > 0' in service)
check('Minimum order cannot be negative', 'minOrder.compareTo(BigDecimal.ZERO) < 0' in service)
check('Max discount cannot be negative', 'maxDiscount.compareTo(BigDecimal.ZERO) < 0' in service)
check('Voucher validity is bounded 1 to 90 days', 'validityDays < 1 || validityDays > 90' in service)
check('Launch requires confirmed=true', 'launching && !Boolean.TRUE.equals(request.confirmed())' in service)
check('Preview calls validation without launch confirmation', 'CampaignSpec spec = validate(request, false)' in service)
check('Preview returns only bounded first 20 audience rows', 'private static final int PREVIEW_LIMIT = 20' in service and '.limit(PREVIEW_LIMIT)' in service)
check('Preview does not save vouchers', 'public CampaignPreview preview' in service and service.find('public CampaignPreview preview') < service.find('@Transactional\n    public CampaignLaunchResult launch'))
check('Preview documents owner-scoped voucher policy', 'owner_user_id' in service and 'không xuất hiện trong danh sách voucher công khai' in service)
check('Preview documents preference-aware delivery', 'opt-out promotion' in service)

# Voucher automation / idempotency
check('Voucher code is deterministic from campaign and user', 'return "M64-" + campaignCode + "-" + compactId' in service)
check('Launch looks up voucher before create', 'vouchers.findByCodeIgnoreCase(voucherCode)' in service)
check('Launch creates voucher only when missing', 'if (voucher == null)' in service and 'createVoucher(spec, customer.userId(), voucherCode, now)' in service)
check('Existing voucher is counted as reused', 'reused++' in service)
check('Voucher owner_user_id is customer id', 'voucher.setOwnerUserId(userId)' in service)
check('Voucher is one-use', 'voucher.setUsageLimit(1)' in service)
check('Voucher starts immediately', 'voucher.setStartsAt(now)' in service)
check('Voucher expiry uses requested validity days', 'now.plus(spec.validityDays(), ChronoUnit.DAYS)' in service)
check('Voucher remains active', 'voucher.setActive(true)' in service)
check('Voucher used count starts at zero', 'voucher.setUsedCount(0)' in service)
check('Voucher repository supports case-insensitive idempotency lookup', 'findByCodeIgnoreCase' in voucher_repo)
check('Voucher domain already supports owner scoping', '@Column(name="owner_user_id")' in voucher)
check('Existing campaign voucher owner must match', 'userId.equals(voucher.getOwnerUserId())' in service)
check('Existing campaign voucher discount config must match', 'configMatches' in service and 'sameMoney(spec.maxDiscount(), voucher.getMaxDiscount())' in service)
check('Changed config under same campaign code returns conflict', 'HttpStatus.CONFLICT' in service and 'hãy dùng campaignCode mới' in service)

# Notification preference / dedupe
check('Launch reuses NotificationService', 'NotificationService notifications' in service)
check('Launch uses PROMOTION_V64 type', '"PROMOTION_V64"' in service)
check('Launch uses createOnce for dedupe', 'notifications.createOnce(' in service)
check('Notification dedupe key includes campaign and user', '"MKT64:" + spec.campaignCode() + ":" + customer.userId()' in service)
check('Notification links customer to profile', '"/profile"' in service)
check('Notification service maps PROMOTION types to promotion category', 't.startsWith("PROMOTION")' in notification and 'return "PROMOTION"' in notification)
check('Notification service honors promotionEnabled', 'case "PROMOTION"->Boolean.TRUE.equals(p.getPromotionEnabled())' in notification)
check('Notification service dedupes with insertOnce', 'repo.insertOnce' in notification)
check('V64 counts skipped notifications', 'if (delivered) notified++; else skipped++;' in service)

# Frontend
check('V64 admin marketing page exists', bool(ui))
check('V64 page branding is explicit', 'V64 · CRM & MARKETING AUTOMATION 4.0' in ui)
check('V64 page exposes segment to campaign to voucher flow', 'Segment → Campaign → Voucher' in ui)
check('V64 admin dashboard tile exists', 'admin-marketing-v64' in admin and 'CRM & Marketing V64' in admin)
check('V64 admin dashboard tile links /admin/marketing', 'href="/admin/marketing"' in admin)
check('V64 frontend loads segment API', '"/admin/marketing/segments"' in ui)
check('V64 frontend calls preview API', '"/admin/marketing/campaigns/preview"' in ui)
check('V64 frontend calls launch API', '"/admin/marketing/campaigns/launch"' in ui)
check('V64 frontend requires preview before launch', 'Hãy chạy Preview trước khi phát hành chiến dịch' in ui)
check('V64 frontend invalidates preview when campaign fields change', 'setPreview(null)' in ui)
check('V64 frontend asks for confirmation before launch', 'confirm(`Phát hành chiến dịch' in ui)
check('V64 frontend sends confirmed true only on launch', 'payload(true)' in ui and 'payload(false)' in ui)
check('V64 frontend displays masked audience email', 'a.maskedEmail' in ui)
check('V64 frontend displays realized lifetime revenue', 'currency(a.lifetimeRevenue)' in ui)
check('V64 frontend displays launch counters', all(x in ui for x in ['vouchersCreated','vouchersReused','notificationsCreated','notificationsSkipped']))
check('V64 frontend types expose all seven segment codes', all(seg in types for seg in segments))
check('V64 frontend types expose preview and launch contracts', 'MarketingCampaignPreviewV64' in types and 'MarketingCampaignLaunchV64' in types)

# Browser journey
check('V64 Playwright journey exists', bool(e2e))
check('V64 E2E logs in as admin', 'loginAdmin' in e2e and 'admin-v29@cine.local' in e2e)
check('V64 E2E verifies dashboard tile', 'admin-marketing-v64' in e2e)
check('V64 E2E verifies V64 strategy', 'V64-CRM-AUTOMATION-4' in e2e)
check('V64 E2E verifies representative segments', all(x in e2e for x in ['VIP giá trị cao','Có nguy cơ rời bỏ','Đã đăng ký, chưa mua']))
check('V64 E2E previews without launching', 'campaign-preview-v64' in e2e and 'campaign-launch-v64' in e2e and '.click();\n\n  const preview' in e2e)
check('V64 E2E verifies owner scoped voucher policy', 'Voucher cá nhân owner_user_id' in e2e)
check('V64 E2E verifies promotion opt-out copy', 'opt-out promotion' in e2e)
check('Playwright suite now has at least 32 journeys', sum(1 for _ in (ROOT/'frontend/e2e').glob('*.spec.ts')) >= 32)

# Data / schema policy
check('V64 adds no Flyway migration', len(list((ROOT/'backend/src/main/resources/db/migration').glob('V64__*.sql'))) == 0)
check('V64 adds no marketing entity/table class', not (ROOT/'backend/src/main/java/com/cinebooking/domain/MarketingCampaign.java').exists())
check('V64 adds no synthetic seed SQL', not any((ROOT/'tools').glob('*v64*seed*.sql')))
check('Existing 57-table seed remains available', bool(seed57))
check('README says V64 uses no synthetic customer activity', 'không seed hành vi giả' in readme)
check('README says realized revenue uses SUCCESS payments', 'payment `SUCCESS`' in readme)
check('README keeps Flyway V52 / 57 public tables', 'Flyway latest: V52; 57 public tables' in readme)
check('README keeps UTF-8 end to end', 'UTF-8 end-to-end' in readme and 'server_encoding=UTF8' in readme)
check('README keeps real eight-movie policy', '8 phim V29' in readme)

# Release / regression wiring
ci_match=re.search(r'V26-V(\d+) source regression',ci)
check('CI source regression extends through V64', bool(ci_match) and int(ci_match.group(1))>=64)
check('CI runs V64 verifier', 'python3 tools/verify_v64_crm_marketing_automation.py' in ci)
rc_default=re.search(r'default: "v(\d+)\.0\.0-rc\.1"',rc)
check('RC defaults to V64 or later', bool(rc_default) and int(rc_default.group(1))>=64)
check('RC compose namespace is V64 or later', bool(re.search(r'cinebooking_v(6[4-9]|[7-9][0-9])_rc_',rc)))
check('RC runs V64 source gate', 'Verify V64 source gate' in rc and 'verify_v64_crm_marketing_automation.py' in rc)
check('RC browser label includes V64', '+ V63 + V64)' in rc)
stable_default=re.search(r'default: "(\d+)\.0\.0"',release)
check('Stable defaults to V64 or later', bool(stable_default) and int(stable_default.group(1))>=64)
check('Stable compose namespace is V64 or later', bool(re.search(r'cinebooking_v(6[4-9]|[7-9][0-9])_release_',release)))
check('Stable runs V64 source gate', 'Verify V64 source gate' in release and 'verify_v64_crm_marketing_automation.py' in release)
check('Makefile exposes verify-v64 and diagnose-v64', all(x in make for x in ['verify-v64:','diagnose-v64:','verify_v64_crm_marketing_automation.py','diagnose-v64.ps1']))
check('Makefile reuses 57-table data gates for V64', all(x in make for x in ['verify-seed-demo-v64:','verify-reference-v64:','verify-realistic-data-v64:']))
check('Diagnose V64 chains V60 V61 V62 V63 V64 and data gates', all(x in diagnose for x in ['verify_v60_payment_production_4.py','verify_v61_fraud_risk_intelligence.py','verify_v62_dynamic_pricing_4.py','verify_v63_recommendation_4.py','verify_v64_crm_marketing_automation.py','verify_realistic_data_57.py','verify_seed_demo_57.py']))
check('V63 verifier is forward-compatible with later releases', 'README current release is V63 or later' in v63verify)

# README / version order
current_match=re.search(r'# CineBooking Pro V(\d+)',readme)
check('README current release is V64', bool(current_match) and int(current_match.group(1))==64 and 'Current release:** V64 - CRM & Marketing Automation 4.0' in readme)
check('README version history has V64 after V63', readme.find('| **V63**') < readme.find('| **V64**'))
check('README detailed V64 section is after V63', readme.find('## V63 - Recommendation 4.0') < readme.find('## V64 - CRM & Marketing Automation 4.0'))
check('README documents all V64 APIs', all(x in readme for x in ['/api/admin/marketing/segments','/api/admin/marketing/campaigns/preview','/api/admin/marketing/campaigns/launch']))
check('README documents idempotent campaign codes', 'idempotency key' in readme and 'M64-WINBACK-XXXXXXXXXXXX' in readme)
check('README documents promotion opt-out', 'promotionEnabled=false' in readme)
check('README documents V64 admin tile', '📣 CRM & Marketing V64' in readme)
check('README documents V64 release tags', 'v64.0.0-rc.1' in readme and 'v64.0.0' in readme)
check('README retains Windows project command root', r'D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui' in readme)

passed=sum(ok for _,ok in checks)
print(f"\nV64 verification: {passed}/{len(checks)} checks passed")
if passed!=len(checks):
    print('Failed checks:')
    for name,ok in checks:
        if not ok: print(' - '+name)
    raise SystemExit(1)
