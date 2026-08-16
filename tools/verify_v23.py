from pathlib import Path
root=Path(__file__).resolve().parents[1]
checks={
 'migration': (root/'backend/src/main/resources/db/migration/V23__attendance_leave_timesheet.sql','CREATE TABLE IF NOT EXISTS staff_leave_request'),
 'attendance metrics': (root/'backend/src/main/java/com/cinebooking/domain/StaffAttendance.java','punctualityStatus'),
 'leave entity': (root/'backend/src/main/java/com/cinebooking/domain/StaffLeaveRequest.java','class StaffLeaveRequest'),
 'leave overlap rule': (root/'backend/src/main/java/com/cinebooking/staffops/StaffLeaveRequestRepository.java','approvedOverlap'),
 'leave workflow': (root/'backend/src/main/java/com/cinebooking/staffops/StaffLeaveService.java','LEAVE_REQUEST_'),
 'approval shift conflict': (root/'backend/src/main/java/com/cinebooking/staffops/StaffLeaveService.java','ca SCHEDULED trong kỳ nghỉ'),
 'shift blocked on approved leave': (root/'backend/src/main/java/com/cinebooking/staffops/StaffShiftService.java','nghỉ phép APPROVED'),
 'late metric': (root/'backend/src/main/java/com/cinebooking/staffops/StaffAttendanceService.java','attendance-late-grace-minutes'),
 'early leave metric': (root/'backend/src/main/java/com/cinebooking/staffops/StaffAttendanceService.java','attendance-early-leave-grace-minutes'),
 'timesheet service': (root/'backend/src/main/java/com/cinebooking/staffops/StaffTimesheetService.java','TimesheetReport'),
 'manager attendance security': (root/'backend/src/main/java/com/cinebooking/config/SecurityConfig.java','/api/admin/attendance/**'),
 'staff leave API': (root/'backend/src/main/java/com/cinebooking/staffops/StaffAttendanceController.java','/leaves'),
 'admin attendance API': (root/'backend/src/main/java/com/cinebooking/staffops/AdminAttendanceController.java','/timesheet'),
 'staff UI': (root/'frontend/app/staff/schedule/page.tsx','Gửi đơn nghỉ'),
 'admin UI': (root/'frontend/app/admin/attendance/page.tsx','Bảng công & nghỉ phép'),
 'menu link': (root/'frontend/components/Header.tsx','/admin/attendance'),
 'diagnostics': (root/'tools/diagnose-v23.ps1','Approved leave with scheduled shifts'),
 'smoke test': (root/'tools/test-v23.ps1','ALL V23 ATTENDANCE V2 SMOKE TESTS PASSED'),
}
failed=[]
for name,(path,needle) in checks.items():
    ok=path.exists() and needle in path.read_text(encoding='utf-8')
    print(('PASS' if ok else 'FAIL')+': '+name)
    if not ok: failed.append(name)
print(f'{len(checks)-len(failed)}/{len(checks)} checks passed')
raise SystemExit(1 if failed else 0)
