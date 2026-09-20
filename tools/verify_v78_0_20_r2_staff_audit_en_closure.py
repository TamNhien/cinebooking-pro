#!/usr/bin/env python3
from pathlib import Path
import re, subprocess, sys
ROOT=Path(__file__).resolve().parents[1]
checks=[]
def read(rel):
 p=ROOT/rel
 return p.read_text(encoding='utf-8') if p.exists() else ''
def ok(c,label):
 c=bool(c);checks.append(c);print(f"[ {'OK' if c else 'FAIL'} ] {label}")
controlled=read('frontend/lib/controlled-business-presentation.ts')
staff=read('frontend/app/admin/staff/page.tsx')
audit=read('frontend/app/admin/audit/page.tsx')
e2e=read('frontend/e2e/v78-language-accessibility-pwa.spec.ts')
release=read('scripts/release.ps1');ci=read('.github/workflows/ci.yml');diag=read('tools/diagnose-v78.ps1');make=read('Makefile');readme=read('README.md')
ok('"Nhân viên rạp": "Cinema staff"' in controlled,'Legacy V9 staff title Nhân viên rạp has controlled EN presentation')
ok('staffJobTitleDisplay(s.jobTitle,language)' in staff,'Admin Staff cards render job titles through the controlled language helper')
ok('staff-job-title-r7' in e2e and 'Giám sát ca|Nhân viên|Kỹ thuật viên|Quản lý rạp' in e2e,'Focused V78 browser journey keeps the broad staff-title EN leak assertion')
for vi in ['Đăng nhập thành công','Đăng xuất phiên','Đăng ký tài khoản','Sai email hoặc mật khẩu','Tài khoản đã bị vô hiệu hoá','Admin mở QR vé']:
 ok(vi in controlled,f'Audit auth/system detail is bounded EN: {vi}')
ok('auditoriumPrefixInAudit' in controlled and 'Room ${no}' in controlled,'Ticket-check audit details localize the controlled Phòng prefix without translating movie/cinema names')
ok('incidentCreate' in controlled and 'staffIncidentPresentation' in controlled,'STAFF_INCIDENT_CREATE audit details localize known system incident titles')
ok('Đã kiểm tra mã vé, hướng dẫn khách quét lại và xác nhận vào rạp thành công' in controlled,'STAFF_INCIDENT_RESOLVE audit note has bounded EN presentation')
ok('Khách cần hỗ trợ tại cổng soát vé' in controlled,'Ticket-gate incident title is localized inside audit details')
ok('AUDIT_DETAIL_EXACT_EN' in controlled,'Additional known audit session/staff-account dynamic templates are EN-owned')
ok('whitespace-nowrap' in audit and 'x.action' in audit,'Audit action machine tokens have a dedicated no-wrap contract')
ok('min-w-[190px]' in audit,'Audit action column reserves enough width for atomic machine-state labels')
ok('[overflow-wrap:normal]' in audit or 'whitespace-nowrap' in audit,'Global table centering cannot re-enable wrapping inside audit machine tokens')
ok('audit-details-v7820r1' in e2e or '/admin/audit' in e2e,'Focused V78 browser journey asserts reported Audit EN leaks')
ok('staff' in e2e.lower() and 'audit' in e2e.lower(),'Focused V78 browser journey asserts staff-incident audit EN leaks')
name='verify_v78_0_20_r2_staff_audit_en_closure.py'
ok(name in release and name in ci and name in diag,'Stable preflight, GitHub CI and V78 diagnostics execute the R2 verifier')
ok('verify-v78-0-20-r2' in make,'Makefile exposes V78.0.20-R2 verification')
ok('V78.0.20-R2' in readme,'Single README records V78.0.20-R2')
ok([p.name for p in ROOT.glob('*.md')]==['README.md'],'Source keeps exactly one consolidated root README.md')
migrations=list((ROOT/'backend/src/main/resources/db/migration').glob('V*.sql'))
latest=max(int(re.match(r'V(\d+)',p.name).group(1)) for p in migrations if re.match(r'V(\d+)',p.name))
ok(latest==72 and not list((ROOT/'backend/src/main/resources/db/migration').glob('V73*.sql')),'V78.0.20-R2 remains no-schema on Flyway V72')
owned=['frontend/lib/controlled-business-presentation.ts','frontend/app/admin/audit/page.tsx','tools/'+name]
hits=[]
for rel in owned:
 data=(ROOT/rel).read_text(encoding='utf-8').splitlines()
 hits.extend(f'{rel}:{i}' for i,line in enumerate(data,1) if line.rstrip()!=line)
ok(not hits,f'V78.0.20-R2 owned files are staging-whitespace clean (hits={len(hits)})')
for label,gate in [('R1','verify_v78_0_20_r1_runtime_en_closure.py'),('V78.0.20','verify_v78_0_20_v70_v77_en_release_tag_closure.py')]:
 r=subprocess.run([sys.executable,str(ROOT/'tools'/gate)],cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.STDOUT)
 ok(r.returncode==0,f'{label} runtime/lineage remains green through R2')
passed=sum(checks);print(f'\nV78.0.20-R2 Staff/Audit EN Runtime Closure verification: {passed}/{len(checks)} checks passed');sys.exit(0 if passed==len(checks) else 1)
