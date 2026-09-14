from pathlib import Path
import re,sys
ROOT=Path(__file__).resolve().parents[1]; checks=[]
def text(rel):
 p=ROOT/rel; return p.read_text(encoding='utf-8') if p.exists() else ''
def ok(c,l):
 c=bool(c); checks.append(c); print(f"[ {'OK' if c else 'FAIL'} ] {l}")
ops=text('frontend/app/admin/operations-control/page.tsx'); marketing=text('frontend/app/admin/marketing/page.tsx'); helper=text('frontend/lib/usePresentationLanguage.ts'); provider=text('frontend/components/LanguageProvider.tsx'); v59=text('frontend/e2e/realtime-operations-v59-language.spec.ts'); v64=text('frontend/e2e/crm-marketing-automation-v64.spec.ts'); release=text('scripts/release.ps1'); ci=text('.github/workflows/ci.yml'); diag=text('tools/diagnose-v77.ps1'); make=text('Makefile'); readme=text('README.md')
ok('data-testid={`operations-domain-${domain.domain.toLowerCase()}-v59`}' in ops,'V59 domain cards expose stable per-domain testids')
ok('data-testid={`operations-domain-name-${domain.domain.toLowerCase()}-v59`}' in ops,'V59 exposes one dedicated domain-name element per card')
card=re.search(r'data-testid=\{`operations-domain-\$\{domain\.domain\.toLowerCase\(\)\}-v59`\}.*?</a>\)\}',ops,re.S)
ok(card is not None and card.group(0).count('domainCopy(domain.domain,language)')==1,'V59 renders localized domain name only once per card')
ok('severityLabel(item.effectiveSeverity,language)' in ops and all(x in ops for x in ['NGHIÊM TRỌNG','CAO','TRUNG BÌNH','THẤP']),'V59 localizes alert severity')
ok('historyDetail(item.detail,language)' in ops and '{item.detail}' not in ops,'V59 history does not render raw audit detail')
ok('Số lượng' in ops and 'Count' in ops and 'actorLabel(item.actorEmail,language)' in ops,'V59 localizes history count and system actor')
ok('toHaveCount(1)' in v59 and 'operations-domain-name-' in v59,'V59 E2E rejects duplicate domain names')
ok(r'\b(HIGH|MEDIUM|LOW|CRITICAL)\b' in v59 and 'operations-history-detail-v59' in v59,'V59 E2E rejects mixed severity/history language')
ok(all(x in v59 for x in ['Thanh toán','Đặt vé','Thiết bị','Nhân sự','Hỗ trợ','Kho','Sự cố','Payments','Bookings','Equipment','Staff','Support','Inventory','Incidents']),'V59 E2E covers all seven domains VI/EN')
ok('SEGMENT_CODES' in marketing and all(x in marketing for x in ['ALL_ELIGIBLE','NEW_30D','ENGAGED_30D','VIP','AT_RISK_31_90D','LAPSED_90D_PLUS','PROSPECT_NO_BOOKING']),'V64 selector owns stable seven-code options')
ok('SEGMENT_FALLBACK_LABELS' in marketing and 'live?.customers??0' in marketing and 'toHaveCount(7)' in v64,'V64 selector remains populated while overview converges')
ok((('window.localStorage.getItem(STORAGE_KEY)' in helper and 'document.documentElement.lang' in helper and 'window.addEventListener("pageshow"' in helper) or ('window.localStorage.getItem(STORAGE_KEY)' in provider and 'document.documentElement.lang' in provider and 'window.addEventListener("pageshow"' in provider)),'Presentation layer restores language on full navigation')
ok((('window.addEventListener("language-changed"' in helper) or ('addEventListener(CHANGE_EVENT' in provider)) and 'const { language, setLanguage } = useLanguage();' in helper,'Presentation helper remains synchronized with provider language store')
ok('localStorage.getItem(STORAGE_KEY)' in provider and 'window.localStorage.setItem(STORAGE_KEY, next)' in provider,'Original LanguageProvider persistence contract remains intact')
m=list((ROOT/'backend/src/main/resources/db/migration').glob('V*.sql')); latest=max(int(re.match(r'V(\d+)',x.name).group(1)) for x in m if re.match(r'V(\d+)',x.name)); ok(latest==72 and not list((ROOT/'backend/src/main/resources/db/migration').glob('V77*.sql')),'V77.0.16 remains no-schema on Flyway V72')
v='verify_v77_0_16_v59_language_surface_hotfix.py'; ok(v in release and v in ci and v in diag,'Release/CI/diagnostics run V77.0.16 verifier')
ok('verify-v77-0-16' in make and 'release-v77-0-16' in make,'Makefile exposes V77.0.16 targets')
ok('V77.0.16' in readme and 'một tên miền nghiệp vụ' in readme,'README documents V77.0.16 fixes')
passed=sum(checks); print(f"\nV77.0.16 V59 language-surface hotfix verification: {passed}/{len(checks)} checks passed"); sys.exit(0 if passed==len(checks) else 1)
