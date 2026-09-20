from pathlib import Path
import re, sys

ROOT = Path(__file__).resolve().parents[1]
checks=[]

def text(rel):
    p=ROOT/rel
    return p.read_text(encoding='utf-8') if p.exists() else ''

def ok(cond,label):
    cond=bool(cond); checks.append(cond); print(f"[ {'OK' if cond else 'FAIL'} ] {label}")

provider=text('frontend/components/LanguageProvider.tsx')
helper=text('frontend/lib/usePresentationLanguage.ts')
sw=text('frontend/public/sw.js')
support=text('frontend/app/support/page.tsx')
marketing=text('frontend/app/admin/marketing/page.tsx')
runtime=text('frontend/e2e/runtime-guards.ts')
analytics=text('frontend/e2e/analytics-forecasting-v51.spec.ts')
discovery=text('frontend/e2e/discovery-calendar.spec.ts')
blackout=text('frontend/e2e/maintenance-blackout.spec.ts')
maintenance=text('frontend/e2e/maintenance-reliability.spec.ts')
seat=text('frontend/e2e/seat-map-ux.spec.ts')
ops=text('frontend/e2e/operations-control-center-v58.spec.ts')
obs=text('frontend/e2e/observability-reliability-v65.spec.ts')
pay67=text('frontend/e2e/payment-resilience-reconciliation-v67.spec.ts')
pwa=text('frontend/e2e/pwa-mobile-v52.spec.ts')
v74=text('frontend/e2e/reliability-resilience-v74.spec.ts')
v71=text('frontend/e2e/secrets-key-governance-v71.spec.ts')
v72=text('frontend/e2e/software-supply-chain-v72.spec.ts')
staff=text('frontend/e2e/staff-operations.spec.ts')
smart=text('frontend/e2e/showtime-smart-planner-v49.spec.ts')
release=text('scripts/release.ps1')
ci=text('.github/workflows/ci.yml')
diag=text('tools/diagnose-v77.ps1')
make=text('Makefile')
readme=text('README.md')

ok((('useSyncExternalStore<Language>' in provider) or ('useState<Language>("vi")' in provider)) and 'browserLanguageSnapshot' in provider, 'LanguageProvider owns the single narrow language source')
ok('useSyncExternalStore' not in helper and 'useLanguage' in helper, 'Presentation helper no longer duplicates the browser language store')
ok('window.localStorage.getItem(STORAGE_KEY)' in provider and 'document.documentElement.lang' in provider, 'Persisted language and document lang remain authoritative browser inputs')
ok('window.addEventListener("storage"' in provider and 'window.addEventListener("pageshow"' in provider and 'addEventListener(CHANGE_EVENT' in provider, 'Language store reacts to click/cross-tab/full-navigation signals')

m_sw=re.search(r'const VERSION = "v77-0-(\d+)"', sw)
v78_sw = any(x in sw for x in ['const VERSION = "v78-0-0";','const VERSION = "v78-0-1";','const VERSION = "v78-0-2";','const VERSION = "v78-0-3";','const VERSION = "v78-0-4";','const VERSION = "v78-0-5";','const VERSION = "v78-0-6";','const VERSION = "v78-0-7";','const VERSION = "v78-0-8";','const VERSION = "v78-0-9";','const VERSION = "v78-0-10";','const VERSION = "v78-0-11";','const VERSION = "v78-0-12";','const VERSION = "v78-0-13";','const VERSION = "v78-0-14";','const VERSION = "v78-0-15";','const VERSION = "v78-0-16";','const VERSION = "v78-0-17";','const VERSION = "v78-0-18";','const VERSION = "v78-0-19";','const VERSION = "v78-0-20";'])
ok((bool(m_sw) and int(m_sw.group(1)) >= 20) or v78_sw, 'Service Worker cache generation is V77.0.20 or newer')
ok(all(x in sw for x in ['"/login"','"/register"','"/payment"','"/forgot-password"','"/reset-password"']), 'Auth and payment navigations are network-only')
ok('await self.skipWaiting()' in sw and 'self.clients.claim()' in sw, 'New critical navigation policy activates without waiting for a manual SW update')
ok('if (url.pathname.startsWith("/api/")) return;' in sw, 'API responses remain outside the Service Worker cache')

ok('for(const item of prev)if(!byId.has(item.id))byId.set(item.id,item)' in support, 'Support initial load cannot overwrite a newly created optimistic case')
ok('disabled={busy||!overview}' in marketing and 'campaign-preview-v64' in marketing, 'V64 Preview waits for the real marketing overview to be ready')
ok('ensureSurface' in runtime and 'page.reload' in runtime and 'This never retries business writes' in runtime, 'E2E hard-navigation guard retries only read/navigation surfaces once')

for spec in ['booking-flow.spec.ts','financial-ledger.spec.ts','payment-operations-v47.spec.ts','refund-automation.spec.ts','ticket-transfer.spec.ts','loyalty-membership.spec.ts','customer-support.spec.ts']:
    body=text('frontend/e2e/'+spec)
    ok('runtime-guards' in body, f'{spec} uses the hard-navigation surface guard')

ok('await expect(saveButton).toBeEnabled();' in analytics, 'V51 reload durability waits for cost-basis mutation completion')
ok('marsHref' in discovery and 'Xem chi tiết Hành Trình Sao Hỏa' in discovery and 'MARS_ID' not in discovery, 'Discovery resolves the real seeded movie ID instead of hard-coding a stale UUID')
ok('planningMovie.selectOption({ index: 1 })' in blackout and 'Hành Trình Sao Hỏa' not in blackout, 'Maintenance blackout tests the feature against a real active movie without a stale title dependency')
ok('maintenance-asset-card' in maintenance and 'maintenance-asset-row' not in maintenance, 'Maintenance E2E follows the visible responsive card at default desktop width')
ok('data-seat-code' in seat and 'getByRole("button", { name: `Ghế ${code}` })' not in seat, 'Seat contention asserts machine-readable seat identity/status')

ok('/Ảnh chụp thời gian thực|Live snapshot/' in ops and 'operations-domain-name-' in ops, 'V58/V59 E2E accepts localized live copy and stable domain presentation testids')
ok('/Mã truy vết|Trace ID/' in obs, 'V65 E2E accepts localized trace-column copy')
ok('không được phát lại như nguồn sự thật' in pay67, 'V67 E2E follows current Vietnamese recovery-policy wording')
ok('/Push OFF|Đẩy TẮT/' in pwa, 'V52 E2E follows the current push-state presentation')
ok('HIỆN ĐẠI HÓA MÔI TRƯỜNG CHẠY GITHUB ACTIONS' in v74 and 'Tiêu hao nhanh|Fast burn' in v74, 'V74 E2E follows current localized V73/V74 surfaces')
ok('KHÔNG_LƯU_GIÁ_TRỊ_BÍ_MẬT_TRONG_CSDL' in v71, 'V71 E2E follows the localized no-secret-storage policy')
ok('bản phát hành|release' in v72, 'V72 E2E follows localized release-gate wording')
ok('/Đang mở|OPEN/' in staff and '/Đã xử lý|RESOLVED/' in staff, 'V43 E2E accepts presentation-localized incident states')
ok(('const run = page.getByTestId("smart-planning-run").first();' in smart or 'getByTestId("smart-planning-run").filter({hasText:selectedMovie}).first()' in smart) and 'getByText(/SMART/)' not in smart, 'V49 E2E verifies persisted planning provenance instead of incidental copy')

migrations=list((ROOT/'backend/src/main/resources/db/migration').glob('V*.sql'))
latest=max(int(re.match(r'V(\d+)',x.name).group(1)) for x in migrations if re.match(r'V(\d+)',x.name))
ok(latest==72 and not list((ROOT/'backend/src/main/resources/db/migration').glob('V77*.sql')), 'V77.0.20 remains no-schema on Flyway V72')

verifier='verify_v77_0_20_full_e2e_runtime_stabilization.py'
ok(verifier in release and verifier in ci and verifier in diag, 'Release/CI/diagnostics run the V77.0.20 verifier')
ok('verify-v77-0-20' in make and 'release-v77-0-20' in make, 'Makefile exposes V77.0.20 verify/release targets')
ok('V77.0.20' in readme and '24 failed' in readme and 'Service Worker' in readme, 'README documents the V77.0.20 full-suite stabilization')

passed=sum(checks)
print(f"\nV77.0.20 full E2E runtime stabilization verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed==len(checks) else 1)
