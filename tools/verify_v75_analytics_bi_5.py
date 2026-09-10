from pathlib import Path
import re
import sys

ROOT=Path(__file__).resolve().parents[1]
checks=[]

def text(rel):
    p=ROOT/rel
    return p.read_text(encoding='utf-8') if p.exists() else ''

def check(name,ok):
    ok=bool(ok); checks.append((name,ok)); print(('[ OK ]' if ok else '[ FAIL ]')+' '+name)

service=text('backend/src/main/java/com/cinebooking/analyticsbi/AnalyticsBiService.java')
dtos=text('backend/src/main/java/com/cinebooking/analyticsbi/AnalyticsBiDtos.java')
controller=text('backend/src/main/java/com/cinebooking/analyticsbi/AdminAnalyticsBiController.java')
ui=text('frontend/app/admin/analytics-bi/page.tsx')
types=text('frontend/lib/types.ts')
admin=text('frontend/app/admin/page.tsx')
header=text('frontend/components/Header.tsx')
e2e=text('frontend/e2e/analytics-bi-v75.spec.ts')
diag=text('tools/diagnose-v75.ps1')
ci=text('.github/workflows/ci.yml')
release=text('scripts/release.ps1')
make=text('Makefile')
readme=text('README.md')
v74=text('tools/verify_v74_reliability_resilience_5.py')
itest=text('backend/src/test/java/com/cinebooking/integration/CineBookingIntegrationIT.java')
seed=text('tools/seed-demo-57-tables.ps1')+text('tools/seed-demo-57-tables.sql')

for rel in [
    'backend/src/main/java/com/cinebooking/analyticsbi/AnalyticsBiDtos.java',
    'backend/src/main/java/com/cinebooking/analyticsbi/AnalyticsBiService.java',
    'backend/src/main/java/com/cinebooking/analyticsbi/AdminAnalyticsBiController.java',
    'frontend/app/admin/analytics-bi/page.tsx',
    'frontend/e2e/analytics-bi-v75.spec.ts',
    'tools/diagnose-v75.ps1']:
    check(f'V75 file exists: {rel}',(ROOT/rel).exists())

check('V75 strategy explicit','V75-ANALYTICS-BI-5' in service and 'V75-ANALYTICS-BI-5' in ui and 'V75-ANALYTICS-BI-5' in readme)
check('V75 adds no Flyway migration',not any((ROOT/'backend/src/main/resources/db/migration').glob('V75__*.sql')))
check('Integration remains Flyway >=72','isGreaterThanOrEqualTo(72)' in itest)
check('Integration remains at least 67 public tables','publicTables).isGreaterThanOrEqualTo(67)' in itest)

for token in ['FunnelStage','BookingFunnel','CohortRow','CustomerLtvRow','PaymentConversionRow','MovieEfficiencyRow','CinemaEfficiencyRow','AnalyticsBiSummary']:
    check('V75 DTO '+token,('record '+token) in dtos)
for token in ['strategyVersion','generatedAt','windowDays','windowStart','windowEnd','funnel','cohorts','topCustomersByRealizedLtv','paymentConversion','movieEfficiency','cinemaEfficiency','evidencePolicy']:
    check('V75 summary field '+token,token in dtos)

check('V75 service is Spring service','@Service' in service)
check('V75 service uses JdbcTemplate','JdbcTemplate' in service)
check('V75 window minimum 30 days','bound(requestedDays, 30, 365)' in service)
check('V75 window maximum 365 days','bound(requestedDays, 30, 365)' in service)
check('V75 uses Vietnam business timezone','Asia/Ho_Chi_Minh' in service)
check('V75 real-data-only policy','REAL_OPERATIONAL_DATA_ONLY' in service)
check('V75 successful-payment policy','REALIZED_SUCCESS_PAYMENTS_ONLY' in service)
check('V75 no synthetic funnel policy','NO_SYNTHETIC_FUNNEL_EVENTS' in service)
check('V75 LTV raw-email privacy policy','NO_RAW_CUSTOMER_EMAIL_IN_LTV_TABLE' in service)
check('V75 cohort maturity policy','COHORT_30D_MATURITY_EXPLICIT' in service)
check('V75 past-showtime efficiency policy','PAST_SHOWTIMES_ONLY_FOR_EFFICIENCY' in service)

# Funnel
check('Funnel starts from booking.created_at',"booking where created_at>=?" in service)
check('Funnel confirmation uses confirmed_at',"confirmed_at is not null" in service)
check('Payment-attempt stage uses distinct booking','count(distinct p.booking_id)' in service)
check('Payment-attempt stage is nested in confirmed bookings',"b.created_at>=? and b.confirmed_at is not null" in service)
check('Paid stage uses SUCCESS only',"p.status='SUCCESS'" in service)
check('Check-in stage reads durable check-in log','ticket_checkin_log' in service)
check('Check-in stage requires confirmed booking',"t.booking_id) from ticket_checkin_log" in service and "b.confirmed_at is not null" in service)
check('Check-in stage requires successful payment',"exists (select 1 from payment p where p.booking_id=b.id and p.status='SUCCESS')" in service)
for code in ['BOOKING_ATTEMPT','CONFIRMED','PAYMENT_ATTEMPT','PAID','CHECKED_IN']:
    check('Funnel stage '+code,f'"{code}"' in service)
check('Funnel conversion from previous is calculated','conversionFromPreviousPercent' in dtos and 'percent(count, previous)' in service)
check('Funnel conversion from start is calculated','conversionFromStartPercent' in dtos and 'percent(count, startCount)' in service)
check('Zero denominator conversion is safe','if (denominator <= 0) return 0.0' in service)

# Cohort
check('Cohorts use USER identities',"u.role='USER'" in service)
check('Cohorts group registration month',"date_trunc('month'" in service and 'cohort_month' in service)
check('Cohorts use 30-day activation window',"u.created_at+interval '30 day'" in service)
check('Activated requires at least one confirmed booking','confirmed_30d>=1' in service)
check('Repeat 30d requires at least two confirmed bookings','confirmed_30d>=2' in service)
check('Cohort horizon bounded 3-12 months','Math.max(3, Math.min(12' in service)
check('Cohort maturity explicitly derived','plusMonths(1).plusDays(30)' in service)
check('Cohort DTO exposes maturity','matured30d' in dtos)
check('Cohort returns activation rate','activationRatePercent' in dtos)
check('Cohort returns repeat rate','repeat30dRatePercent' in dtos)

# LTV / privacy
check('LTV uses USER only',"where u.role='USER'" in service)
check('LTV uses successful payment CTE',"where p.status='SUCCESS' group by p.booking_id" in service)
check('LTV dedupes retries per booking','max(p.amount) amount' in service)
check('LTV captures first paid timestamp','min(pb.paid_at) first_paid_at' in service)
check('LTV captures last paid timestamp','max(pb.paid_at) last_paid_at' in service)
check('LTV computes realized revenue','realized_revenue' in service)
check('LTV computes AOV','divide(revenue, paidBookings)' in service)
check('LTV is bounded to top 20','limit 20' in service)
check('LTV exposes privacy-safe customer ref','customerRef' in dtos and 'USER-' in service)
check('LTV masks email in service','maskEmail' in service and '"***@"' in service)
check('LTV DTO does not expose raw email field','String email' not in dtos)

# Payment conversion
check('Payment conversion groups provider','group by p.provider' in service)
check('Payment conversion counts attempts','count(*) attempts' in service)
check('Payment conversion counts success',"filter(where p.status='SUCCESS')" in service)
check('Payment conversion counts failed',"filter(where p.status='FAILED')" in service)
check('Payment conversion counts other states',"status not in ('SUCCESS','FAILED')" in service)
check('Payment conversion sums successful amount',"sum(p.amount) filter(where p.status='SUCCESS')" in service)
check('Payment conversion returns success rate','successRatePercent' in dtos and 'percent(success, attempts)' in service)
check('Payment conversion window uses created_at','from payment p where p.created_at>=?' in service)

# Movie/cinema efficiency
check('Efficiency uses past showtime window','st.start_time>=? and st.start_time<?' in service)
check('Efficiency uses seat capacity','from seat s where s.auditorium_id=st.auditorium_id' in service)
check('Efficiency uses active booking seats','bs.released_at is null' in service)
check('Efficiency requires confirmed booking seats','b.confirmed_at is not null' in service)
check('Efficiency payment revenue is SUCCESS only',"payment p where p.status='SUCCESS'" in service)
check('Efficiency dedupes successful retry amount','max(p.amount) amount' in service)
check('Movie efficiency joins movie catalog','join movie m on m.id=ss.movie_id' in service)
check('Cinema efficiency joins auditorium/cinema','join auditorium a on a.id=ss.auditorium_id join cinema c on c.id=a.cinema_id' in service)
check('Movie efficiency top 20 bounded','movie_title' in service and 'limit 20' in service)
check('Efficiency occupancy is computed','percent(tickets, capacity)' in service)
check('Efficiency revenue per show computed','divide(revenue, shows)' in service)
check('Efficiency revenue per offered seat computed','divide(revenue, capacity)' in service)

# Controller / API
check('V75 controller is REST','@RestController' in controller)
check('V75 API namespace','@RequestMapping("/api/admin/analytics-bi")' in controller)
check('V75 summary GET','@GetMapping("/summary")' in controller)
check('V75 default window 90','@RequestParam(defaultValue = "90")' in controller)
check('V75 controller exposes no mutation','@PostMapping' not in controller and '@PutMapping' not in controller and '@DeleteMapping' not in controller and '@PatchMapping' not in controller)

# Frontend contracts
for token in ['AnalyticsBiFunnelStageV75','AnalyticsBiFunnelV75','AnalyticsBiCohortRowV75','AnalyticsBiCustomerLtvV75','AnalyticsBiPaymentConversionV75','AnalyticsBiMovieEfficiencyV75','AnalyticsBiCinemaEfficiencyV75','AnalyticsBiSummaryV75']:
    check('Frontend type '+token,('type '+token) in types)
check('Admin Dashboard V75 tile','admin-analytics-bi-v75' in admin and 'Analytics & BI V75' in admin and '/admin/analytics-bi' in admin)
labels=['Command Center V53','Performance V54','Retention V55','Customer Value V56','Realtime Operations V59','Payment Production V60','Fraud & Risk V61','Dynamic Pricing V62','Recommendation V63','CRM & Marketing V64','Observability V65','Seat Operations V66','Payment Resilience V67','Security & Identity V68','Backup & DR V69','Privacy Governance V70','Key Governance V71','Supply Chain V72','Actions Runtime V73','Reliability V74','Analytics & BI V75']
check('Admin Dashboard versioned tiles ascend through V75',all(admin.index(a)<admin.index(b) for a,b in zip(labels,labels[1:])))
check('Header links V75 BI page','/admin/analytics-bi' in header and 'Analytics & BI V75' in header)
check('V75 UI root test id','analytics-bi-v75' in ui)
check('V75 UI summary test id','analytics-bi-summary-v75' in ui)
check('V75 UI evidence panel','analytics-bi-policy-v75' in ui)
check('V75 UI funnel panel','booking-funnel-v75' in ui)
check('V75 UI cohort panel','cohort-retention-v75' in ui)
check('V75 UI LTV panel','ltv-v75' in ui)
check('V75 UI payment panel','payment-conversion-v75' in ui)
check('V75 UI movie efficiency panel','movie-efficiency-v75' in ui)
check('V75 UI cinema efficiency panel','cinema-efficiency-v75' in ui)
check('V75 UI error test id','analytics-bi-error-v75' in ui)
check('V75 UI supports 30 90 180 365 windows','[30,90,180,365]' in ui)
check('V75 UI requires ADMIN','me.role!=="ADMIN"' in ui)
check('V75 UI reads only summary endpoint','/admin/analytics-bi/summary?days=' in ui and 'method:"POST"' not in ui and 'method:"PUT"' not in ui and 'method:"DELETE"' not in ui and 'method:"PATCH"' not in ui)
check('V75 UI links V51 analytics','/admin/analytics' in ui and 'Analytics V51' in ui)
check('V75 UI explains no fake pageviews','không có durable page-view/visitor event' in ui)
check('V75 UI explains masked LTV email','email được mask' in ui)
check('V75 UI marks partial cohorts','PARTIAL' in ui and 'MATURED' in ui)

# E2E
check('V75 E2E logs in real admin env','E2E_ADMIN_EMAIL' in e2e and 'E2E_ADMIN_PASSWORD' in e2e)
check('V75 E2E verifies tile','admin-analytics-bi-v75' in e2e)
check('V75 E2E verifies ascending versions through V75 or later','sort((a,b)=>a-b)' in e2e and 'toContain(75)' in e2e and 'toBeGreaterThanOrEqual(75)' in e2e)
check('V75 E2E verifies V74 before V75','toContain(74)' in e2e)
check('V75 E2E verifies strategy','V75-ANALYTICS-BI-5' in e2e)
check('V75 E2E verifies real data policy','REAL_OPERATIONAL_DATA_ONLY' in e2e)
check('V75 E2E verifies no synthetic funnel','NO_SYNTHETIC_FUNNEL_EVENTS' in e2e)
check('V75 E2E verifies funnel','booking-funnel-v75' in e2e and 'BOOKING_ATTEMPT' in e2e and 'PAID' in e2e)
check('V75 E2E verifies cohort','cohort-retention-v75' in e2e)
check('V75 E2E verifies LTV','ltv-v75' in e2e)
check('V75 E2E verifies payment conversion','payment-conversion-v75' in e2e)
check('V75 E2E verifies movie/cinema efficiency','movie-efficiency-v75' in e2e and 'cinema-efficiency-v75' in e2e)
check('V75 E2E rejects error banner','analytics-bi-error-v75' in e2e and 'toHaveCount(0)' in e2e)

# Lifecycle wiring
check('CI source regression names V75 or later',re.search(r'V26-V(?:7[5-9]|[89][0-9]) source regression',ci) is not None)
check('CI runs V75 verifier','verify_v75_analytics_bi_5.py' in ci)
check('V74 verifier forward-compatible with V75','V74 or later' in v74 and 'V26-V(?:7[4-9]|[89][0-9]) source regression' in v74)
check('Makefile verify-v75','verify-v75:' in make and 'verify_v75_analytics_bi_5.py' in make)
check('Makefile diagnose-v75','diagnose-v75:' in make and 'diagnose-v75.ps1' in make)
check('Makefile release-v75','release-v75:' in make and 'v75.0.0' in make)
check('Diagnose V75 chains V51/V55/V56/V74/V75',all(x in diag for x in ['verify_v51_analytics_forecasting_3.py','verify_v55_customer_retention.py','verify_v56_customer_value_rfm.py','verify_v74_reliability_resilience_5.py','verify_v75_analytics_bi_5.py']))
check('Diagnose V75 runs real data gates','verify_realistic_data_57.py' in diag and 'verify_seed_demo_57.py' in diag)
check('Release preflight runs V75 verifier','verify_v75_analytics_bi_5.py' in release)
check('Release example remains stable semantic version','stable tag such as v' in release and '.0.0' in release)
check('Release remains stable-only','Pre-release tags are disabled' in release and '-rc.' not in release)

# README/current release
check('README title is V75 or later',re.search(r'^# CineBooking Pro V(?:7[5-9]|[89][0-9])$',readme,re.M) is not None)
check('README retains V75 release identity','V75 - Analytics & BI 5.0' in readme)
check('README V75 history after V74','| **V74** |' in readme and '| **V75** |' in readme and readme.index('| **V74** |')<readme.index('| **V75** |'))
check('README detailed V75 section','## V75 - Analytics & BI 5.0' in readme)
check('README documents funnel','Booking → Payment → Check-in funnel' in readme)
check('README documents cohort','30-day repeat' in readme)
check('README documents realized LTV','Realized customer LTV' in readme)
check('README documents payment conversion','Payment conversion' in readme)
check('README documents movie/cinema efficiency','Hiệu suất phim/rạp' in readme)
check('README documents no pageview fabrication','không tạo page-view/visitor giả' in readme)
check('README documents masked customer email','masked email' in readme.lower())
check('README documents no-schema V75','New V75 tables: 0' in readme and 'Flyway latest: V72' in readme and 'Public tables: 67' in readme)
check('README stable V75','Stable only: v75.0.0' in readme)
check('README real-data policy through V75','V52/V65/V66/V67/V68/V69/V70/V71/V72/V73/V74/V75' in readme and '**không tạo phim/khách/booking/payment giả**' in readme)
check('V75 adds no synthetic seed content','V75-ANALYTICS-BI' not in seed and 'analytics_bi_v75' not in seed.lower())

passed=sum(ok for _,ok in checks)
print(f'\nV75 verification: {passed}/{len(checks)} checks passed')
if passed!=len(checks):
    print('\nFailed checks:')
    for name,ok in checks:
        if not ok: print(' - '+name)
    sys.exit(1)
