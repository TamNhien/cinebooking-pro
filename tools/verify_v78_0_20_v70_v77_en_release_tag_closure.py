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

seat = text("frontend/app/admin/seat-operations/page.tsx")
pay = text("frontend/app/admin/payment-resilience/page.tsx")
privacy = text("frontend/app/admin/privacy-governance/page.tsx")
keygov = text("frontend/app/admin/key-governance/page.tsx")
supply = text("frontend/app/admin/supply-chain/page.tsx")
reliability = text("frontend/app/admin/reliability/page.tsx")
analytics_bi = text("frontend/app/admin/analytics-bi/page.tsx")
recommendation = text("frontend/app/admin/recommendation/page.tsx")
crm = text("frontend/app/admin/crm-automation/page.tsx")
vouchers = text("frontend/app/admin/vouchers/page.tsx")
staff = text("frontend/app/admin/staff/page.tsx")
helper = text("frontend/lib/controlled-business-presentation.ts")
sw = text("frontend/public/sw.js")
v78page = text("frontend/app/admin/ux-accessibility-pwa/page.tsx")
release = text("scripts/release.ps1")
ci = text(".github/workflows/ci.yml")
diag = text("tools/diagnose-v78.ps1")
make = text("Makefile")
readme = text("README.md")
base_v78 = text("tools/verify_v78_ux_accessibility_pwa_5.py")

# V66 lifecycle rendering and nowrap regression.
ok('t("Lifecycle gần đây","Recent lifecycle")' in seat and 'Auto-refresh every 5 seconds' in seat,
   "Seat Operations owns recent-lifecycle dynamic copy in VI/EN")
ok('min-w-28 whitespace-nowrap p-3' in seat and 'inline-flex whitespace-nowrap' in seat,
   "Recent lifecycle status cells and pills cannot break machine-state words")
ok('localizedLabel(x.state,language)' in seat and 'localizedLabel(x.lastEvent,language)' in seat,
   "Seat lifecycle state/event labels use the active presentation language")

# V67 payment-resilience dynamic copy.
ok('RECEIVED / ORPHANED / RECOVERY PENDING / DEAD LETTER' in pay and 'Maximum attempts' in pay,
   "Payment Resilience recovery queue summary is explicitly English-owned")
ok('Gateway reconciliation:' in pay and 'Webhook recovery:' in pay,
   "Payment Resilience batch feedback is language-owned")
ok('Recovery policy:' in pay and 'localizedLabel(x.deliveryState,language)' in pay,
   "Payment Resilience recovery policy and delivery states are language-owned")

# V70 privacy casing/status.
ok('t("Xuất dữ liệu","Data export")' in privacy and 't("Xóa dữ liệu","Delete data")' in privacy and 't("Chỉnh sửa dữ liệu","Correct data")' in privacy,
   "V70 request-type dropdown uses consistent Title Case EN labels")
ok('t("Quá hạn","Overdue")' in privacy and 'localizedLabel(r.status,language)' in privacy,
   "V70 request queue localizes overdue/status presentation")

# V71 key-governance dynamic policy.
ok('Status indicates only configured/not configured; the API never returns credential values.' in keygov and 'Warning window:' in keygov,
   "V71 rotation-policy dynamic explanation has explicit EN copy")
ok('localizedLabel(p.rotationStatus,language)' in keygov and 'localizedLabel(p.ownerTeam,language)' in keygov,
   "V71 controlled status/owner values render through EN labels")

# V72 supply-chain dynamic policy/scanner.
ok('Evidence freshness:' in supply and 'CI/release remains the authoritative reference.' in supply,
   "V72 evidence-policy interpolated copy has explicit EN ownership")
ok('language==="en"&&scanner==="Trình quét CI"?"CI scanner":scanner' in supply and 'language==="en"&&s.scanner==="Trình quét CI"?"CI scanner":s.scanner' in supply,
   "V72 controlled CI scanner value is presented in English without rewriting arbitrary scanner data")
ok('localizedLabel(s.decision,language)' in supply,
   "V72 scan decisions use language-aware controlled labels")

# V74 reliability burn/timeline presentation.
ok('t("phút","min")' in reliability and 't("ngưỡng","threshold")' in reliability,
   "V74 burn-window units and threshold labels are bilingual")
ok('reliabilityIncidentPresentation(x.title,x.detail,language)' in reliability and 'Support past SLA' in helper,
   "V74 known incident/audit templates have bounded EN presentation")
ok('min-w-28 whitespace-nowrap' in reliability and 'localizedLabel(x.status,language)' in reliability,
   "V74 source/severity/status columns resist word-breaking and localize state labels")

# V75 BI headers while preserving business names.
ok('t("Phim","Movie")' in analytics_bi and 't("Doanh thu/suất","Revenue/showtime")' in analytics_bi,
   "V75 Movie Performance headers are explicitly bilingual")
ok('x.movieTitle' in analytics_bi and 'x.cinemaName' in analytics_bi,
   "V75 movie/cinema business names remain source-owned")

# V76 recommendation dynamic cards/evidence.
ok('t("Có thể gợi ý","Recommendable")' in recommendation and 't("Phim có thể gợi ý","Recommendable movies")' in recommendation,
   "V76 summary/coverage dynamic labels are explicitly bilingual")
ok('t("CỬA SỔ HỖ TRỢ 7 NGÀY","7-DAY SUPPORT WINDOW")' in recommendation and 'Realized SUCCESS revenue' in recommendation,
   "V76 supported-booking evidence surface is English-owned")
ok('Table headers={[t("Phim","Movie")' in recommendation,
   "V76 Top movie interactions uses Movie in EN while titles stay business data")

# V77 CRM result and execution surfaces.
ok('Only PROMOTION_V77 is measured in the' in crm and 'CORRELATION ONLY' in crm,
   "V77 observed CRM result explanation is explicitly EN")
ok('CONFIRMED ≤7 days after CRM' in crm and 'Deduplicated SUCCESS payments' in crm,
   "V77 observed booking/revenue evidence copy is EN")
ok('t("XEM TRƯỚC","PREVIEW")' in crm and 't("SẴN SÀNG","READY")' in crm and 't("BỊ CHẶN","BLOCKED")' in crm,
   "V77 preview states use consistent bilingual presentation")
ok('EXECUTED · IDEMPOTENT' in crm and 'Skipped notifications:' in crm,
   "V77 execution result dynamic copy is explicitly EN")

# Edit surfaces preserve raw values until actual administrator edit.
ok('voucherDisplayName(form.name,language)' in vouchers and 'New member promotion' in vouchers,
   "Voucher edit form presents known seed names in EN")
ok('staffJobTitleDisplay(form.jobTitle,language)' in staff and 'Ticket-checking staff' in staff,
   "Staff edit form presents controlled job titles in EN")
ok('^Giảm\\s+' in helper and '₫ off' in helper,
   "Controlled fixed-amount voucher names have bounded EN rendering")

# Full-source audit was tightened to accept fewer legacy dynamic templates when direct language ownership replaces them.
ok('50 <= len(dynamic_templates) <= 90' in base_v78,
   "Base V78 dynamic-template audit accepts direct-language ownership without weakening the upper bound")

# Version/release metadata: v78.0.19 is immutable, v78.0.20 is the next target.
ok('const VERSION = "v78-0-20";' in sw, "Service Worker generation is v78-0-20")
ok('>V78.0.20</span>' in v78page, "Visible V78 Admin surface reports V78.0.20")
ok('Current release:** V78.0.20' in readme and 'V78 stable target:** `v78.0.20`' in readme,
   "README declares V78.0.20 as the next stable target")
ok('`v78.0.19` is immutable and already exists' in readme,
   "README explicitly preserves immutable v78.0.19 instead of retagging it")

# Lifecycle wiring.
name = 'verify_v78_0_20_v70_v77_en_release_tag_closure.py'
ok(name in release and name in ci and name in diag,
   "Stable preflight, GitHub CI and V78 diagnostics execute V78.0.20 verifier")
ok('verify-v78-0-20' in make and 'release-v78-0-20' in make and 'release.ps1 v78.0.20' in make,
   "Makefile exposes V78.0.20 verify/release lifecycle")
ok('## V78.0.20 - V70-V77 EN / Lifecycle Presentation Closure' in readme,
   "README records V78.0.20 in the single consolidated changelog")
ok([p.name for p in ROOT.glob('*.md')] == ['README.md'], "Source keeps exactly one consolidated root README.md")

# Schema contract.
migrations = list((ROOT / 'backend/src/main/resources/db/migration').glob('V*.sql'))
latest = max(int(re.match(r'V(\d+)', p.name).group(1)) for p in migrations if re.match(r'V(\d+)', p.name))
ok(latest == 72 and not list((ROOT / 'backend/src/main/resources/db/migration').glob('V78*.sql')),
   "V78.0.20 remains no-schema on Flyway V72")

# Staging whitespace for files owned by this closure.
changed = [
    'frontend/app/admin/analytics-bi/page.tsx', 'frontend/app/admin/crm-automation/page.tsx',
    'frontend/app/admin/key-governance/page.tsx', 'frontend/app/admin/payment-resilience/page.tsx',
    'frontend/app/admin/privacy-governance/page.tsx', 'frontend/app/admin/recommendation/page.tsx',
    'frontend/app/admin/reliability/page.tsx', 'frontend/app/admin/seat-operations/page.tsx',
    'frontend/app/admin/staff/page.tsx', 'frontend/app/admin/supply-chain/page.tsx',
    'frontend/app/admin/vouchers/page.tsx', 'frontend/lib/controlled-business-presentation.ts',
    'frontend/public/sw.js', 'frontend/app/admin/ux-accessibility-pwa/page.tsx',
    'tools/verify_v78_ux_accessibility_pwa_5.py', 'tools/'+name,
    'scripts/release.ps1', '.github/workflows/ci.yml', 'tools/diagnose-v78.ps1', 'Makefile', 'README.md',
]
hygiene=[]
for rel in changed:
    p=ROOT/rel
    if not p.exists(): hygiene.append(rel+':missing'); continue
    raw=p.read_bytes(); lines=p.read_text(encoding='utf-8').splitlines()
    if any(line.endswith(' ') or line.endswith('\t') for line in lines): hygiene.append(rel+':trailing')
    if not raw.endswith(b'\n') or raw.endswith(b'\n\n'): hygiene.append(rel+':eof')
ok(not hygiene, f"V78.0.20 owned files are staging-whitespace clean (hits={len(hygiene)})")

# Key regression lineage.
for rel, expected, label in [
    ('tools/verify_v78_0_19_r7_dynamic_en_presentation_closure.py','37/37 checks passed','R7 Dynamic EN closure remains green'),
    ('tools/verify_v78_0_19_r6_lint_observability_full_suite_closure.py','28/28 checks passed','R6 lint/observability closure remains green'),
    ('tools/verify_v78_ux_accessibility_pwa_5.py','27/27 checks passed','Base V78 full-source language/accessibility gate remains green'),
]:
    proc=subprocess.run([sys.executable,'-X','utf8',str(ROOT/rel)],cwd=ROOT,text=True,encoding='utf-8',errors='replace',capture_output=True)
    ok(proc.returncode==0 and expected in proc.stdout,label)

passed=sum(checks)
print(f"\nV78.0.20 V70-V77 EN / Release Tag Closure verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed==len(checks) else 1)
