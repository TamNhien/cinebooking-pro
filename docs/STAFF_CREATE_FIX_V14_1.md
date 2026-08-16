# CineBooking Pro V14.1 - Staff account creation fix

## Problem
`app_user.email` is UNIQUE. If Admin enters an email already used by a customer account, V14 rejects staff creation with HTTP 409. The UI did not explain the next action clearly enough.

## V14.1 behavior
- `/api/admin/staff/email-status?email=...` checks whether an email already exists.
- New email: Admin creates a new STAFF/MANAGER account with a new password.
- Existing USER account: Admin can explicitly convert the existing account to STAFF/MANAGER.
- Existing deleted staff: Admin can restore the staff profile.
- Existing active staff: creation is blocked and Admin is told to edit the existing staff account.
- ADMIN accounts cannot be converted to staff.
- Promotion/restoration preserves the existing password hash, booking history, loyalty data and audit history.
- Admin can set a new password later from Edit Staff.

No Flyway migration is required. Database version remains V14.
