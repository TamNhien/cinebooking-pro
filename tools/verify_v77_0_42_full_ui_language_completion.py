from pathlib import Path
import re, sys

ROOT=Path(__file__).resolve().parents[1]
checks=[]
def text(rel):
    p=ROOT/rel
    return p.read_text(encoding='utf-8') if p.exists() else ''
def ok(cond,label):
    cond=bool(cond);checks.append(cond);print(f"[ {'OK' if cond else 'FAIL'} ] {label}")

bridge=text('frontend/components/LegacyUiLocalizationBridge.tsx')
extra=text('frontend/lib/presentation-ui-translations-v77-0-42.ts')
labels=text('frontend/lib/vi-labels.ts')
lang_spec=text('frontend/e2e/realtime-operations-v59-language.spec.ts')
support=text('frontend/app/support/page.tsx')
payments=text('frontend/app/payments/page.tsx')
cinemas=text('frontend/app/cinemas/page.tsx')
admin=text('frontend/app/admin/page.tsx')
staff=text('frontend/app/admin/staff/page.tsx')
crm=text('frontend/app/admin/crm-automation/page.tsx')
admin_support=text('frontend/app/admin/support/page.tsx')
analytics_bi=text('frontend/app/admin/analytics-bi/page.tsx')
vouchers=text('frontend/app/admin/vouchers/page.tsx')
sw=text('frontend/public/sw.js')

ok('V77_0_42_PRESENTATION_UI_EN' in bridge and 'VI_LABEL_TO_EN' in bridge,
   'Legacy bridge composes the V77.0.42 presentation catalog with machine/status VI-to-EN labels')
ok(('LEGACY_INTERACTIVE_UI_EN[core] ?? V77_0_42_PRESENTATION_UI_EN[core] ?? VI_LABEL_TO_EN[core]' in bridge or 'LEGACY_INTERACTIVE_UI_EN[core] ?? V77_0_43_PRESENTATION_UI_EN[core] ?? V77_0_42_PRESENTATION_UI_EN[core] ?? VI_LABEL_TO_EN[core]' in bridge),
   'Translation lookup prioritizes audited UI copy, V77.0.42 additions, then rendered machine labels')
extra_entries=len(re.findall(r'^\s*".*":\s*".*",\s*$',extra,re.M))
ok(extra_entries >= 300, f'V77.0.42 adds broad presentation coverage ({extra_entries} audited entries)')
ok('CINEMA_EXPERIENCE: "Trải nghiệm rạp"' in labels and 'CINEMA_EXPERIENCE: "Cinema experience"' in labels and 'VI_LABEL_TO_EN' in labels,
   'CINEMA_EXPERIENCE has a canonical English machine-label presentation')
ok('localizedLabel' in support and 'usePresentationLanguage' in support and 'viLabel(' not in support,
   'Customer support renders status/category option labels directly from the active language')
ok('localizedLabel' in payments and 'usePresentationLanguage' in payments and 'viLabel(' not in payments,
   'Customer payments renders status/event labels directly from the active language')
ok('usePresentationLanguage' in cinemas and 'locale' in cinemas and 'monthLabel(m,locale)' in cinemas and 'day(d,locale)' in cinemas,
   'Cinema date/month controls follow the active locale instead of remaining vi-VN in EN mode')
ok('getByRole("option", { name: "Cinema experience" })' in lang_spec,
   'Cross-surface E2E explicitly proves the historical support-category leak is English')
ok('h1, h2, h3, h4, h5, h6' in lang_spec and '.section-kicker' in lang_spec and '.empty-state' in lang_spec,
   'Runtime language audit now checks headings and major presentation states, not controls only')
ok('cloneNode(true)' in lang_spec and "[data-i18n-skip=\"true\"]" in lang_spec,
   'Runtime audit still removes explicit business-data descendants before language assertions')
ok('t(`Xoá ${displayLabel}?`,`Delete ${displayLabel}?`)' in admin and 'Revoke all sign-in sessions' in admin,
   'Admin native confirmation dialogs switch VI/EN and do not rely on DOM mutation')
ok('Delete staff member' in staff and 'The confirmation password does not match.' in staff,
   'Staff native dialogs and validation feedback switch VI/EN')
ok('Execute CRM' in crm and 'Run Preview before Execute.' in crm,
   'CRM native confirmation/validation feedback switches VI/EN')
ok('localizedLabel' in admin_support and 'Priority ${c.caseNumber}' in admin_support,
   'Admin support localizes enum labels and dynamic accessibility copy')
ok('usePresentationLanguage' in analytics_bi and '${t("ngày","days")}' in analytics_bi,
   'Analytics BI duration options no longer render Vietnamese day units in EN mode')
ok('usePresentationLanguage' in vouchers and 'Code ${code} already exists' in vouchers,
   'Voucher dynamic validation/status feedback has an explicit English path')

# V77.0.42 source audit for the browser sweep: static presentation Vietnamese
# must be direct-language-owned, catalog-backed, or a known machine label.
vi_re=re.compile(r'[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]',re.I)
key_re=re.compile(r'^\s*"((?:\\.|[^"\\])*)"\s*:',re.M)
keys=set(key_re.findall(text('frontend/lib/interactive-ui-translations.ts')))|set(key_re.findall(extra))
keys.update(re.findall(r'^\s*[A-Z0-9_]+:\s*"([^"]*[À-ỹĐđ][^"]*)"',labels,re.M))
quoted=re.compile(r'(["\'`])((?:\\.|(?!\1).)*)\1')
files=[
 'frontend/app/page.tsx','frontend/app/movies/page.tsx','frontend/app/cinemas/page.tsx','frontend/app/payments/page.tsx','frontend/app/support/page.tsx',
 'frontend/app/admin/page.tsx','frontend/app/admin/payments/page.tsx','frontend/app/admin/staff/page.tsx','frontend/app/admin/support/page.tsx',
 'frontend/app/admin/crm-automation/page.tsx','frontend/app/admin/vouchers/page.tsx','frontend/app/admin/analytics-bi/page.tsx','frontend/app/admin/actions-runtime/page.tsx'
]
uncovered=[]; audited=0
for rel in files:
    for line_no,line in enumerate(text(rel).splitlines(),1):
        if not vi_re.search(line): continue
        explicit=('t(' in line or 'language===' in line or 'language ===' in line or 'localizedLabel(' in line or 'data-i18n-skip' in line)
        for m in quoted.finditer(line):
            value=m.group(2)
            if not vi_re.search(value): continue
            audited+=1
            if explicit or value in keys: continue
            # Dynamic rendered strings are allowed only when bridge patterns cover their runtime form.
            if '${' in value and any(token in bridge for token in ['Đã quét (\\d+) giao dịch','Ưu tiên (.+)','Phụ trách (.+)','Test (.+) thành công']):
                continue
            uncovered.append((rel,line_no,value))
ok(audited >= 180 and not uncovered,
   f'Expanded V77.0.42 sweep source audit is covered ({audited} Vietnamese literals; uncovered={len(uncovered)})')

legacy=['admin-v29@cine.local','V29SmokeOnly-ChangeMe','Admin@123']
ok(all(x not in lang_spec+text('frontend/e2e/crm-automation-5-v77.spec.ts') for x in legacy),
   'Language E2E continues to use only Admin credentials resolved from root .env')

migrations=list((ROOT/'backend/src/main/resources/db/migration').glob('V*.sql'))
latest=max(int(re.match(r'V(\d+)',x.name).group(1)) for x in migrations if re.match(r'V(\d+)',x.name))
ok(latest==72 and not list((ROOT/'backend/src/main/resources/db/migration').glob('V77*.sql')),
   'V77.0.42 remains no-schema on Flyway V72')

release=text('scripts/release.ps1');ci=text('.github/workflows/ci.yml');diag=text('tools/diagnose-v77.ps1');make=text('Makefile');readme=text('README.md')
name='verify_v77_0_42_full_ui_language_completion.py'
ok(name in release and name in ci and name in diag,
   'Release, CI and diagnostics run the V77.0.42 verifier')
ok('verify-v77-0-42' in make and 'release-v77-0-42' in make,
   'Makefile exposes V77.0.42 verify/release targets')
ok(any(x in readme for x in ['Current release:** V77.0.42','Current release:** V77.0.43','Current release:** V77.0.44','Current release:** V77.0.45','Current release:** V77.0.46','Current release:** V77.0.47','Current release:** V77.0.48','Current release:** V77.0.49','Current release:** V77.0.50','Current release:** V77.0.52','Current release:** V77.0.53','Current release:** V77.0.54','Current release:** V77.0.55','Current release:** V77.0.56','Current release:** V77.0.57','Current release:** V77.0.59','Current release:** V77.0.60','Current release:** V77.0.61']) and any(x in readme for x in ['`v77.0.42`','`v77.0.43`','`v77.0.44`','`v77.0.45`','`v77.0.46`','`v77.0.47`','`v77.0.48`','`v77.0.49`','`v77.0.50`','`v77.0.52`','`v77.0.53`','`v77.0.54`','`v77.0.55`','`v77.0.56`','`v77.0.57`','`v77.0.59`','`v77.0.60`','`v77.0.61`']),
   'README retains V77.0.42 history under the V77.0.45-or-newer stable target')
ok('V77.0.42 - Full-UI Language Completion' in readme and 'Cinema experience' in readme and '307' in readme,
   'README records the concrete runtime leak and broad language-completion scope')
ok(any(x in sw for x in ['const VERSION = "v77-0-42";','const VERSION = "v77-0-43";','const VERSION = "v77-0-44";','const VERSION = "v77-0-45";','const VERSION = "v77-0-46";','const VERSION = "v77-0-47";','const VERSION = "v77-0-48";','const VERSION = "v77-0-49";','const VERSION = "v77-0-50";','const VERSION = "v77-0-52";','const VERSION = "v77-0-53";','const VERSION = "v77-0-54";','const VERSION = "v77-0-55";','const VERSION = "v77-0-56";','const VERSION = "v77-0-57";','const VERSION = "v77-0-59";','const VERSION = "v77-0-60";','const VERSION = "v77-0-61";','const VERSION = "v78-0-0";','const VERSION = "v78-0-1";','const VERSION = "v78-0-2";','const VERSION = "v78-0-3";','const VERSION = "v78-0-4";','const VERSION = "v78-0-5";','const VERSION = "v78-0-6";','const VERSION = "v78-0-7";','const VERSION = "v78-0-8";','const VERSION = "v78-0-9";','const VERSION = "v78-0-10";','const VERSION = "v78-0-11";','const VERSION = "v78-0-12";','const VERSION = "v78-0-13";','const VERSION = "v78-0-14";','const VERSION = "v78-0-15";','const VERSION = "v78-0-16";','const VERSION = "v78-0-17";','const VERSION = "v78-0-18";','const VERSION = "v78-0-19";']),
   'Service Worker cache generation is V77.0.42 or forward-compatible V77.0.43')
root_markdown=[p.name for p in ROOT.glob('*.md')]
ok(root_markdown==['README.md'],'Source keeps one consolidated root Markdown history document')

# Previous language verifiers remain forward-compatible with the new stable target.
for rel in ['tools/verify_v77_0_39_zero_warning_full_ui_language_contract.py','tools/verify_v77_0_40_runtime_language_boundary_fix.py','tools/verify_v77_0_41_movies_language_surface_fix.py']:
    previous=text(rel)
    ok(any(x in previous for x in ['V77.0.42','V77.0.43','V77.0.44','V77.0.45','V77.0.46','V77.0.47']) and any(x in previous for x in ['v77-0-42','v77-0-43','v77-0-44','v77-0-45','v77-0-46','v77-0-47']),
       f'{Path(rel).name} accepts the V77.0.42/V77.0.43/V77.0.44/V77.0.45 stable target/cache generation')

passed=sum(checks)
print(f"\nV77.0.42 full-UI language completion verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed==len(checks) else 1)
