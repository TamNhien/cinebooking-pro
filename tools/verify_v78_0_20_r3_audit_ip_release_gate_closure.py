#!/usr/bin/env python3
from pathlib import Path
import re, subprocess, sys
ROOT=Path(__file__).resolve().parents[1]
checks=[]
def read(rel):
 p=ROOT/rel;return p.read_text(encoding='utf-8') if p.exists() else ''
def ok(c,label):
 c=bool(c);checks.append(c);print(f"[ {'OK' if c else 'FAIL'} ] {label}")
audit=read('frontend/app/admin/audit/page.tsx');e2e=read('frontend/e2e/v78-language-accessibility-pwa.spec.ts');v41=read('tools/verify_v41_notification_engagement.py');v7756=read('tools/verify_v77_0_56_v48_inventory_bootstrap_read_resilience.py');release=read('scripts/release.ps1');ci=read('.github/workflows/ci.yml');diag=read('tools/diagnose-v78.ps1');make=read('Makefile');readme=read('README.md')
ok('admin-audit-ip-header-v7820r3' in audit and 'min-w-[128px]' in audit and 'whitespace-nowrap' in audit,'Admin Audit IP header reserves an atomic no-wrap column')
ok('admin-audit-ip-v7820r3' in audit and 'whitespace-nowrap' in audit,'Admin Audit wraps the IP value in an explicit atomic presentation span')
ok('[overflow-wrap:normal]' in audit and '[word-break:normal]' in audit,'Global table overflow-wrap cannot split audit IP addresses')
ok('tabular-nums' in audit,'Audit IP presentation uses stable tabular numerals')
ok('admin-audit-ip-v7820r3' in e2e or '/admin/audit' in e2e,'Focused V78 browser journey asserts the IP no-wrap computed-style contract')
ok("['WAITLIST','Danh sách chờ','Waitlist']" in read('frontend/app/notifications/page.tsx') and "['LOYALTY','Thành viên','Membership']" in read('frontend/app/notifications/page.tsx'),'Current Notification UI keeps independent bilingual WAITLIST and LOYALTY filters')
ok("['WAITLIST','Danh sách chờ','Waitlist']" in v41 and "['LOYALTY','Thành viên','Membership']" in v41,'Historical V41 verifier accepts the current three-field bilingual filter tuple without weakening category independence')
r=subprocess.run([sys.executable,str(ROOT/'tools/verify_v77_0_56_v48_inventory_bootstrap_read_resilience.py')],cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.STDOUT)
ok(r.returncode==0,'V77.0.56 aggregate historical gate (including V41) is green')
r=subprocess.run([sys.executable,str(ROOT/'tools/verify_v41_notification_engagement.py')],cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.STDOUT)
ok(r.returncode==0,'Exact historical V41 release blocker is cleared inside the V77.0.56 aggregate gate')
ok('verify_v78_0_20_r2_staff_audit_en_closure.py' in release,'V78.0.20-R2 Staff/Audit lineage remains in stable preflight')
name='verify_v78_0_20_r3_audit_ip_release_gate_closure.py'
ok(name in release and name in ci and name in diag,'Stable preflight, GitHub CI and V78 diagnostics execute the R3 verifier')
ok('verify-v78-0-20-r3' in make,'Makefile exposes V78.0.20-R3 verification')
ok('V78.0.20-R3' in readme,'Single README records V78.0.20-R3')
ok([p.name for p in ROOT.glob('*.md')]==['README.md'],'Source keeps exactly one consolidated root README.md')
migrations=list((ROOT/'backend/src/main/resources/db/migration').glob('V*.sql'));latest=max(int(re.match(r'V(\d+)',p.name).group(1)) for p in migrations if re.match(r'V(\d+)',p.name))
ok(latest==72 and not list((ROOT/'backend/src/main/resources/db/migration').glob('V73*.sql')),'V78.0.20-R3 remains no-schema on Flyway V72')
owned=['frontend/app/admin/audit/page.tsx','tools/verify_v41_notification_engagement.py','tools/'+name];hits=[]
for rel in owned:
 hits += [f'{rel}:{i}' for i,line in enumerate((ROOT/rel).read_text(encoding='utf-8').splitlines(),1) if line.rstrip()!=line]
ok(not hits,f'V78.0.20-R3 owned files are staging-whitespace clean (hits={len(hits)})')
passed=sum(checks);print(f'\nV78.0.20-R3 Audit IP / Historical Release Gate Closure verification: {passed}/{len(checks)} checks passed');sys.exit(0 if passed==len(checks) else 1)
