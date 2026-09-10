from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
checks = []

def text(rel):
    p = ROOT / rel
    return p.read_text(encoding='utf-8') if p.exists() else ''

def check(name, cond):
    ok = bool(cond)
    checks.append((name, ok))
    print(('[ OK ]' if ok else '[ FAIL ]') + ' ' + name)

service = text('backend/src/main/java/com/cinebooking/analytics/AnalyticsForecastingService.java')
dtos = text('backend/src/main/java/com/cinebooking/analytics/AnalyticsDtos.java')
controller = text('backend/src/main/java/com/cinebooking/analytics/AdminAnalyticsController.java')
ui = text('frontend/app/admin/analytics/page.tsx')
types = text('frontend/lib/types.ts')
e2e = text('frontend/e2e/analytics-forecasting-v51.spec.ts')
ci = text('.github/workflows/ci.yml')
release = text('scripts/release.ps1')
make = text('Makefile')
diag = text('tools/diagnose-v75.ps1')
readme = text('README.md')

check('V75.0.1 strategy explicit', 'V75.0.1-COST-COVERAGE-DRILLDOWN-1' in service and 'V75.0.1-COST-COVERAGE-DRILLDOWN-1' in ui and 'V75.0.1-COST-COVERAGE-DRILLDOWN-1' in readme)
check('V75.0.1 remains no-schema', not any((ROOT/'backend/src/main/resources/db/migration').glob('V75_0_1__*.sql')) and not any((ROOT/'backend/src/main/resources/db/migration').glob('V76__*.sql')))
check('Missing cost item DTO exists', 'record MissingCostBasisItem' in dtos)
check('Missing cost coverage DTO exists', 'record MissingCostCoverage' in dtos)
for token in ['cinemaId','cinemaName','productId','productName','missingUnits','affectedRevenue','lastConfirmedAt','actionable']:
    check('Missing cost item field '+token, token in dtos)
for token in ['strategyVersion','windowDays','windowStart','windowEnd','missingUnits','affectedRevenue','affectedProductBranches','items']:
    check('Missing cost coverage field '+token, token in dtos)
check('Missing-cost endpoint exists', '@GetMapping("/missing-cost-basis")' in controller)
check('Missing-cost endpoint accepts days', '@RequestParam(defaultValue = "30") int days' in controller)
check('Missing-cost endpoint accepts cinema filter', '@RequestParam(required = false) UUID cinemaId' in controller)
check('Missing-cost endpoint calls service', 'forecastingService.missingCostBasis(days, cinemaId)' in controller)
check('Missing-cost query uses sold concession rows', 'from booking_concession bc join booking b on b.id=bc.booking_id' in service)
check('Missing-cost query is confirmed-booking only', "where b.status='CONFIRMED'" in service)
check('Missing-cost query uses analytics time window', 'b.confirmed_at>=? and b.confirmed_at<?' in service)
check('Missing-cost query filters unknown cost only', 'and cb.unit_cost is null' in service)
check('Missing-cost query is branch-aware', 'cb.cinema_id=a.cinema_id and cb.product_id=bc.product_id' in service)
check('Missing-cost query supports cinema filter', 'and a.cinema_id=?' in service)
check('Missing-cost query sums missing units', 'sum(bc.quantity)' in service and 'missing_units' in service)
check('Missing-cost query sums affected revenue', 'sum(bc.subtotal)' in service and 'affected_revenue' in service)
check('Missing-cost query captures latest affected booking', 'max(b.confirmed_at) last_confirmed_at' in service)
check('Deleted historical concession stays visible', 'coalesce(max(p.name),max(bc.product_name)) product_name' in service)
check('Deleted historical product is non-actionable', 'productId != null' in service and 'boolean actionable' in dtos)
check('Missing-cost response computes exact unit total', 'mapToLong(MissingCostBasisItem::missingUnits).sum()' in service)
check('Missing-cost response computes affected revenue total', 'map(MissingCostBasisItem::affectedRevenue)' in service and 'reduce(BigDecimal.ZERO, BigDecimal::add)' in service)
check('Missing-cost response does not invent cost', 'suggestedUnitCost' not in service and 'estimatedCost' not in service and 'coalesce(cb.unit_cost,0)' not in service.replace(' ',''))
check('Frontend missing-cost item type exists', 'AnalyticsMissingCostBasisItemV75Patch' in types)
check('Frontend missing-cost summary type exists', 'AnalyticsMissingCostCoverageV75Patch' in types)
check('Unknown cost KPI is clickable only when incomplete', 'data-testid="missing-cost-drilldown-toggle"' in ui and 'data.margin.costCoverageRate<100' in ui)
check('Unknown KPI states exact missing units', 'data.margin.concessionUnits-data.margin.costedUnits' in ui and 'đơn vị còn thiếu' in ui)
check('Drill-down panel exists', 'data-testid="missing-cost-drilldown-v75-patch"' in ui)
check('Drill-down explains no estimation', 'Không ước lượng và không tự điền giá vốn' in ui)
check('Drill-down shows affected revenue', 'Doanh thu bị ảnh hưởng' in ui and 'missingCost.affectedRevenue' in ui)
check('Drill-down shows branch and product rows', 'item.cinemaName' in ui and 'item.productName' in ui)
check('Drill-down shows exact missing units by row', 'item.missingUnits' in ui and 'đơn vị' in ui)
check('Drill-down shows last affected sale', 'item.lastConfirmedAt' in ui)
check('Drill-down has inline cost input', 'data-testid="missing-cost-input-v75-patch"' in ui)
check('Drill-down has immediate update action', 'data-testid="missing-cost-save-v75-patch"' in ui and 'Cập nhật ngay' in ui)
check('Inline update reuses authenticated cost-basis API', '"/admin/analytics/cost-basis"' in ui and 'method:"PUT"' in ui)
check('Inline update validates nonnegative cost', 'Nhập giá vốn không âm trước khi cập nhật' in ui)
check('Historical deleted product is not blindly writable', 'không còn productId' in ui and 'Không thể cập nhật trực tiếp' in ui)
check('Saving drill-down refreshes margin', 'Promise.all([refreshAnalytics(),loadMissingCost()])' in ui)
check('Saving branch cost refreshes margin too', 'await refreshAnalytics();' in ui)
check('Drill-down is bounded to selected analytics window', '/admin/analytics/missing-cost-basis?' in ui and 'days:String(days)' in ui)
check('V51 E2E queries missing-cost endpoint', '/api/admin/analytics/missing-cost-basis?days=30&cinemaId=' in e2e)
check('V51 E2E authenticates direct missing-cost request with bearer token', 'cinebooking_auth_v3' in e2e and 'Authorization:`Bearer ${auth.accessToken}`' in e2e)
check('V51 E2E verifies patch strategy', 'V75.0.1-COST-COVERAGE-DRILLDOWN-1' in e2e)
check('V51 E2E conditionally opens drill-down', 'missing-cost-drilldown-toggle' in e2e and 'missing-cost-drilldown-v75-patch' in e2e)
check('CI runs cost coverage patch verifier', 'verify_v75_cost_coverage_drilldown.py' in ci)
check('Release preflight runs cost coverage patch verifier', 'verify_v75_cost_coverage_drilldown.py' in release)
check('Diagnose V75 runs cost coverage patch verifier', 'verify_v75_cost_coverage_drilldown.py' in diag)
check('Makefile exposes patch verifier', 'verify-v75-cost:' in make and 'verify_v75_cost_coverage_drilldown.py' in make)
check('Makefile exposes patch release', 'release-v75-patch:' in make and 'v75.0.1' in make)
check('README documents V75.0.1 patch', '## V75.0.1 - Cost Coverage Drill-down' in readme)
check('README documents exact missing items', 'thiếu cost' in readme and 'affected revenue' in readme.lower())
check('README documents immediate update', 'Cập nhật ngay' in readme)
check('README preserves V76 roadmap slot', 'V76' in readme and 'Recommendation 5.0' in readme)
check('README patch release tag', 'v75.0.1' in readme)

passed = sum(ok for _, ok in checks)
print(f'\nV75.0.1 cost coverage verification: {passed}/{len(checks)} checks passed')
if passed != len(checks):
    print('\nFailed checks:')
    for name, ok in checks:
        if not ok:
            print(' - ' + name)
    sys.exit(1)
