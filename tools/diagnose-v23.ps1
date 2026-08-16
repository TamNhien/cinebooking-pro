$ErrorActionPreference = "Stop"
Write-Host "=== CineBooking V23 attendance / leave / timesheet diagnostics ===" -ForegroundColor Cyan

Write-Host "`n=== Docker services ===" -ForegroundColor Cyan
docker compose ps

Write-Host "`n=== Flyway V23 ===" -ForegroundColor Cyan
docker compose exec postgres psql -U cinebooking -d cinebooking -c "SELECT version,description,success FROM flyway_schema_history WHERE version='23';"

Write-Host "`n=== Attendance metric columns ===" -ForegroundColor Cyan
docker compose exec postgres psql -U cinebooking -d cinebooking -c "SELECT column_name,data_type,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='staff_attendance' AND column_name IN ('late_minutes','early_leave_minutes','worked_minutes','punctuality_status') ORDER BY column_name;"

Write-Host "`n=== Leave request table ===" -ForegroundColor Cyan
docker compose exec postgres psql -U cinebooking -d cinebooking -c "SELECT column_name,data_type,is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='staff_leave_request' ORDER BY ordinal_position;"

Write-Host "`n=== Broken attendance metric invariants (expected 0 rows) ===" -ForegroundColor Cyan
docker compose exec postgres psql -U cinebooking -d cinebooking -c "SELECT id,late_minutes,early_leave_minutes,worked_minutes,punctuality_status FROM staff_attendance WHERE late_minutes<0 OR early_leave_minutes<0 OR worked_minutes<0 OR punctuality_status NOT IN ('ON_TIME','LATE','EARLY','LATE_EARLY');"

Write-Host "`n=== Overlapping active leave requests (expected 0 rows for the same employee/date pair) ===" -ForegroundColor Cyan
docker compose exec postgres psql -U cinebooking -d cinebooking -c "SELECT a.staff_user_id,a.id first_request,b.id second_request,a.from_date,a.to_date,b.from_date,b.to_date FROM staff_leave_request a JOIN staff_leave_request b ON a.staff_user_id=b.staff_user_id AND a.id<b.id AND a.status IN ('PENDING','APPROVED') AND b.status IN ('PENDING','APPROVED') AND a.from_date<=b.to_date AND a.to_date>=b.from_date;"

Write-Host "`n=== Approved leave with scheduled shifts (expected 0 rows) ===" -ForegroundColor Cyan
docker compose exec postgres psql -U cinebooking -d cinebooking -c "SELECT l.id leave_id,s.id shift_id,l.staff_user_id,s.shift_date FROM staff_leave_request l JOIN staff_shift s ON s.staff_user_id=l.staff_user_id AND s.shift_date BETWEEN l.from_date AND l.to_date WHERE l.status='APPROVED' AND s.status='SCHEDULED';"

Write-Host "`nExpected: V23 success=t and all invariant/conflict queries return 0 rows." -ForegroundColor Yellow
Write-Host "Admin UI: http://localhost/admin/attendance" -ForegroundColor Yellow
Write-Host "Staff UI: http://localhost/staff/schedule" -ForegroundColor Yellow
