from pathlib import Path
import re, sys

ROOT=Path(__file__).resolve().parents[1]
checks=[]
def text(rel):
    p=ROOT/rel
    return p.read_text(encoding='utf-8') if p.exists() else ''
def ok(cond,label):
    cond=bool(cond); checks.append(cond); print(f"[ {'OK' if cond else 'FAIL'} ] {label}")

booking=text('frontend/app/booking/[showtimeId]/page.tsx')
crm=text('frontend/app/admin/crm-automation/page.tsx')
lang_spec=text('frontend/e2e/realtime-operations-v59-language.spec.ts')
v66_spec=text('frontend/e2e/booking-consistency-seat-locking-v66.spec.ts')
sw=text('frontend/public/sw.js')
readme=text('README.md')
release=text('scripts/release.ps1'); ci=text('.github/workflows/ci.yml'); diag=text('tools/diagnose-v77.ps1'); make=text('Makefile')

ok('data-testid="seat-hold-authority-v66"' in booking and '{held&&<div data-testid="seat-hold-authority-v66"' not in booking,
   'V66 durable-hold authority marker is no longer gated by held=true')
ok('map?.holdAuthority||"POSTGRESQL_WITH_REDIS_MIRROR"' in booking,
   'Booking authority marker preserves the durable PostgreSQL/Redis authority contract')
ok('cross-server duplicate-seat protection' in booking and 'chống đặt trùng ghế trên nhiều máy chủ' in booking,
   'V66 authority marker presentation copy follows EN/VI')
ok('getByTestId("seat-hold-authority-v66")' in v66_spec and 'POSTGRESQL_WITH_REDIS_MIRROR' in v66_spec,
   'V66 browser regression still asserts the authority marker and exact authority')

ok('summary?.playbooks.map(p=>{const copy=playbookCopy(p,language);return <button' in crm,
   'CRM playbook cards resolve language-owned playbook copy before rendering')
ok('{copy.label}' in crm,
   'CRM playbook card label no longer renders the raw backend label')
ok('{copy.definition}' in crm,
   'CRM playbook card definition no longer renders the raw backend definition')
ok('{copy.action}' in crm,
   'CRM playbook recommendation no longer renders the raw backend recommendation')
ok('Tiny label={t("Đủ điều kiện","Eligible")}' in crm,
   'CRM Eligible metric follows the active presentation language')
ok('Tiny label={t("Sẵn sàng","Ready")}' in crm,
   'CRM Ready metric follows the active presentation language')
ok('Tiny label={t("Bị chặn","Blocked")}' in crm,
   'CRM Blocked metric follows the active presentation language')
ok('{t("Gợi ý","Suggestion")}: {copy.action}' in crm,
   'CRM suggestion prefix follows the active presentation language')
ok('{t("Discount mặc định","Default discount")}: {p.defaultDiscountPercent}%' in crm,
   'CRM default-discount label follows the active presentation language')

ok('getByText("Activate first booking", { exact: true })' in lang_spec,
   'Language E2E directly proves the first CRM playbook label is English')
ok('getByText("VIP appreciation", { exact: true })' in lang_spec,
   'Language E2E directly proves the VIP playbook label is English')
ok('Suggestion: Small, short-lived offer to activate the first booking.' in lang_spec,
   'Language E2E directly proves backend-derived CRM recommendation copy is English')
ok('Default discount: 10%' in lang_spec,
   'Language E2E directly proves the CRM discount prefix is English')
ok('process.env.E2E_ADMIN_EMAIL' in lang_spec and 'process.env.E2E_ADMIN_PASSWORD' in lang_spec and 'admin@' not in lang_spec,
   'Touched language E2E continues to use only Admin credentials resolved from root .env')

ok(any(x in sw for x in ['const VERSION = "v77-0-44";','const VERSION = "v77-0-45";','const VERSION = "v77-0-46";','const VERSION = "v77-0-47";','const VERSION = "v77-0-48";','const VERSION = "v77-0-49";','const VERSION = "v77-0-50";','const VERSION = "v77-0-52";']),
   'Service Worker cache generation is V77.0.44 or forward-compatible V77.0.45')
migrations=list((ROOT/'backend/src/main/resources/db/migration').glob('V*.sql'))
latest=max(int(re.match(r'V(\d+)',x.name).group(1)) for x in migrations if re.match(r'V(\d+)',x.name))
ok(latest==72 and not list((ROOT/'backend/src/main/resources/db/migration').glob('V77*.sql')),
   'V77.0.44 remains no-schema on Flyway V72')
name='verify_v77_0_44_crm_payload_v66_authority_fix.py'
ok(name in release and name in ci and name in diag and 'verify-v77-0-44' in make and 'release-v77-0-44' in make,
   'Release, CI, diagnostics and Makefile include the V77.0.44 gate')
ok(any(x in readme for x in ['Current release:** V77.0.44','Current release:** V77.0.45','Current release:** V77.0.46','Current release:** V77.0.47','Current release:** V77.0.48','Current release:** V77.0.49','Current release:** V77.0.50','Current release:** V77.0.52']) and any(x in readme for x in ['`v77.0.44`','`v77.0.45`','`v77.0.46`','`v77.0.47`','`v77.0.48`','`v77.0.49`','`v77.0.50`','`v77.0.52`']) and 'V77.0.44 - CRM Payload Localization + V66 Authority Visibility Fix' in readme and [p.name for p in ROOT.glob('*.md')]==['README.md'],
   'README retains V77.0.44 history under the V77.0.45-or-newer stable target')

passed=sum(checks)
print(f"\nV77.0.44 CRM payload/V66 authority verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed==len(checks) else 1)
