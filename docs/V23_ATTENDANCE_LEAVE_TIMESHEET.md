# CineBooking Pro V23 - Attendance V2, Leave & Timesheet

V23 extends staff operations with attendance quality metrics, leave workflows and monthly timesheets.

## Main changes

- `staff_attendance` now stores `late_minutes`, `early_leave_minutes`, `worked_minutes` and `punctuality_status`.
- Default grace windows are 5 minutes for late arrival and 5 minutes for early leave.
- Staff can create/cancel leave requests at `/staff/schedule`.
- Manager/Admin can review leave requests at `/admin/attendance`.
- Approved leave prevents new shifts from being created for the employee on those dates.
- A leave request cannot be approved while the employee still has a `SCHEDULED` shift in the requested period; the manager must cancel/reschedule the shift first.
- Monthly timesheet reports show scheduled/completed/absent shifts, scheduled/worked minutes, late/early minutes and approved leave days.
- Manager scope is restricted to their assigned cinema and STAFF accounts; Admin can view all cinemas and STAFF/MANAGER accounts.
- Leave decisions generate notifications using the V22 notification center.

## Migration

`V23__attendance_leave_timesheet.sql`

No existing booking/payment/inventory records are modified.

## Local configuration

```env
ATTENDANCE_LATE_GRACE_MINUTES=5
ATTENDANCE_EARLY_LEAVE_GRACE_MINUTES=5
```

## Upgrade

```powershell
docker compose up -d --build --force-recreate backend-1 backend-2 frontend nginx
```

Do not use `docker compose down -v` when preserving the existing database.

## Verification

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v23.ps1
powershell -ExecutionPolicy Bypass -File .\tools\test-v23.ps1
```
