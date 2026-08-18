from pathlib import Path
import re, sys, json, yaml, xml.etree.ElementTree as ET

checks=[]
def ok(name, cond, detail=''):
    checks.append((name, bool(cond), detail))

mig=Path('backend/src/main/resources/db/migration/V10__staff_shifts_attendance.sql').read_text()
ok('migration creates staff_shift', 'CREATE TABLE staff_shift' in mig)
ok('migration creates staff_attendance', 'CREATE TABLE staff_attendance' in mig)
ok('one active attendance DB guard', 'uq_staff_active_attendance' in mig and 'WHERE check_out_at IS NULL' in mig)
ok('shift unique start guard', 'uq_staff_shift_start' in mig)

sec=Path('backend/src/main/java/com/cinebooking/config/SecurityConfig.java').read_text()
idx_shift=sec.find('/api/admin/shifts/**'); idx_admin=sec.find('/api/admin/**')
ok('MANAGER/ADMIN shift endpoint security', idx_shift>=0 and 'hasAnyRole("MANAGER","ADMIN")' in sec[idx_shift:idx_shift+120])
ok('shift matcher precedes generic ADMIN matcher', idx_shift>=0 and idx_admin>=0 and idx_shift<idx_admin)

checkin=Path('backend/src/main/java/com/cinebooking/operations/CheckInService.java').read_text()
ok('ticket check-in enforces staff gate policy', 'gate.requireCanScan(staffEmail,c.getId())' in checkin)
ok('gate check occurs before booking mutation', checkin.find('gate.requireCanScan') < checkin.find('b.setCheckedInAt'))

gate=Path('backend/src/main/java/com/cinebooking/staffops/StaffGatePolicyService.java').read_text()
ok('gate requires active attendance', 'findFirstByStaffUserIdAndCheckOutAtIsNullOrderByCheckInAtDesc' in gate)
ok('gate requires same cinema', 'Objects.equals(a.getCinemaId(),ticketCinemaId)' in gate)
ok('ADMIN emergency override exists', 'u.getRole()==Role.ADMIN)return' in gate)

shift=Path('backend/src/main/java/com/cinebooking/staffops/StaffShiftService.java').read_text()
ok('shift overlap validation exists', 'ensureNoOverlap' in shift and 'StaffShiftTime.overlaps' in shift)
ok('MANAGER restricted to same cinema', 'Bạn chỉ được xếp ca cho nhân viên cùng rạp' in shift)
ok('manager only schedules STAFF', 'Quản lý chỉ được xếp ca cho tài khoản STAFF' in shift)

att=Path('backend/src/main/java/com/cinebooking/staffops/StaffAttendanceService.java').read_text()
ok('attendance start requires assigned shift', 'Ca làm này không được phân cho bạn' in att)
ok('attendance blocks old-cinema shift after transfer', 'Bạn đã được chuyển rạp; ca cũ không còn hợp lệ' in att)
ok('attendance writes audit start/end', 'SHIFT_CHECK_IN' in att and 'SHIFT_CHECK_OUT' in att)

for p in ['frontend/app/admin/shifts/page.tsx','frontend/app/staff/schedule/page.tsx','frontend/app/staff/check-in/page.tsx']:
    ok(f'frontend route exists: {p}', Path(p).exists())

compose=yaml.safe_load(Path('docker-compose.yml').read_text())
env=compose['services']['backend-1']['environment']
for k in ['STAFF_TIME_ZONE','ATTENDANCE_START_EARLY_MINUTES','ATTENDANCE_START_LATE_MINUTES','STAFF_SCAN_GRACE_MINUTES']:
    ok(f'compose passes {k}', k in env)

try: json.loads(Path('frontend/package.json').read_text()); ok('package.json parses',True)
except Exception as e: ok('package.json parses',False,str(e))
try: yaml.safe_load(Path('backend/src/main/resources/application.yml').read_text()); ok('application.yml parses',True)
except Exception as e: ok('application.yml parses',False,str(e))
try: ET.parse('backend/pom.xml'); ok('pom.xml parses',True)
except Exception as e: ok('pom.xml parses',False,str(e))

fails=[x for x in checks if not x[1]]
for name,passed,detail in checks:
    print(('PASS' if passed else 'FAIL')+': '+name+((' - '+detail) if detail else ''))
print(f'\nSUMMARY: {len(checks)-len(fails)}/{len(checks)} checks passed')
sys.exit(1 if fails else 0)
