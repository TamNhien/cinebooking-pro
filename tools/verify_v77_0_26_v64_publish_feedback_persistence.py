from pathlib import Path
import re, sys

ROOT=Path(__file__).resolve().parents[1]
checks=[]

def text(rel):
    p=ROOT/rel
    return p.read_text(encoding='utf-8') if p.exists() else ''

def ok(cond,label):
    cond=bool(cond); checks.append(cond); print(f"[ {'OK' if cond else 'FAIL'} ] {label}")

page=text('frontend/app/admin/marketing/page.tsx')
e2e=text('frontend/e2e/crm-marketing-automation-v64.spec.ts')
release=text('scripts/release.ps1')
ci=text('.github/workflows/ci.yml')
diag=text('tools/diagnose-v77.ps1')
make=text('Makefile')
readme=text('README.md')

ok('const publishedMessage=`${t("Đã phát hành","Published")}' in page,
   'V64 captures the authoritative publish-success message before overview refresh')
ok('setResult(data);' in page,
   'V64 keeps the successful launch result visible as the primary publish outcome')
ok('try{await load();}catch{' in page,
   'V64 still refreshes the real overview after publish but isolates refresh failure from launch success')
refresh_pos=page.find('try{await load();}catch{')
success_kind_pos=page.find('setFeedbackKind("success");', refresh_pos)
success_msg_pos=page.find('setMsg(publishedMessage);', refresh_pos)
ok(refresh_pos>=0 and success_kind_pos>refresh_pos and success_msg_pos>success_kind_pos,
   'Publish feedback is recommitted after the post-launch overview refresh')
ok('Preserve the successful launch result; focus/online can retry overview refresh later.' in page,
   'Post-launch refresh failure is explicitly best-effort and leaves launch success authoritative')
ok(not re.search(r'setMsg\(`\$\{t\("Đã phát hành","Published"\).*?\);\s*await load\(\);', page, re.S),
   'Old ordering that let load() wipe the publish-success feedback is absent')
ok('campaign-launch-result-v64' in e2e and 'campaign-feedback-v64' in e2e and '/Đã phát hành|Published/' in e2e,
   'V64 Browser E2E still requires both launch result and visible success feedback')
ok('campaign-preview-v64' in e2e and 'campaign-step-up-link-v64' in e2e,
   'V68 step-up and preview contracts remain covered by targeted E2E')
ok('verify_v77_0_24_hydration_bundle_v64_startup_reliability.py' in release and 'verify_v77_0_25_zero_warning_language_provider_cleanup.py' in release,
   'V77.0.24 runtime and V77.0.25 zero-warning verifiers remain in the release matrix')

migrations=list((ROOT/'backend/src/main/resources/db/migration').glob('V*.sql'))
latest=max(int(re.match(r'V(\d+)',x.name).group(1)) for x in migrations if re.match(r'V(\d+)',x.name))
ok(latest==72 and not list((ROOT/'backend/src/main/resources/db/migration').glob('V77*.sql')),
   'V77.0.26 remains no-schema on Flyway V72')

name='verify_v77_0_26_v64_publish_feedback_persistence.py'
ok(name in release and name in ci and name in diag,
   'Release/CI/diagnostics run the V77.0.26 verifier')
ok('verify-v77-0-26' in make and 'release-v77-0-26' in make,
   'Makefile exposes V77.0.26 verify/release targets')
ok('V77.0.26' in readme and 'post-launch' in readme.lower() and 'Đã phát hành/Published' in readme,
   'README documents the exact V77.0.26 post-publish feedback regression and fix')
m_current=re.search(r'Current release:\*\* V77\.0\.(\d+)', readme)
m_target=re.search(r'V77 stable target:\*\* `v77\.0\.(\d+)`', readme)
ok((bool(m_current) and bool(m_target) and int(m_current.group(1)) >= 26 and int(m_target.group(1)) >= 26) or (any(x in readme for x in ['Current release:** V78.0.0','Current release:** V78.0.1','Current release:** V78.0.2']) and any(x in readme for x in ['V78 stable target:** `v78.0.0`','V78 stable target:** `v78.0.1`','V78 stable target:** `v78.0.2`'])),
   'README current release and stable target are V77.0.26 or newer')

passed=sum(checks)
print(f"\nV77.0.26 V64 publish-feedback persistence verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed==len(checks) else 1)
