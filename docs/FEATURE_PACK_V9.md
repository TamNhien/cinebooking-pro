# CineBooking Pro V9 - Staff Account Management

V9 adds a dedicated employee-account module for cinema operations.

## Admin route

- `/admin/staff`

## Capabilities

- Create STAFF or MANAGER accounts.
- Edit employee code, name, email, phone, role, assigned cinema, job title and hire date.
- Employee states: `ACTIVE`, `ON_LEAVE`, `INACTIVE`.
- Enable/disable login without deleting the account.
- Set a strong password when creating an employee.
- Optionally reset an employee password while editing.
- Search employees by code, name, email, phone, cinema or job title.
- Filter by employment status.
- Existing STAFF/MANAGER users are backfilled into `staff_profile` by Flyway V9.
- Admin audit log records `STAFF_CREATE` and `STAFF_UPDATE`.

## Security

Employee passwords continue to use the project's `ModernPasswordEncoder` (Argon2id for new hashes with backward-compatible BCrypt verification).
A disabled employee account cannot log in and an existing JWT is rejected by the JWT filter.

## Database migration

`V9__staff_accounts.sql` adds:

- `app_user.account_enabled`
- `staff_profile`

`staff_profile` contains:

- `user_id`
- `employee_code`
- `cinema_id`
- `job_title`
- `employment_status`
- `hire_date`
- timestamps

## Upgrade

Do not remove the PostgreSQL volume.

```powershell
docker compose up -d --build --force-recreate backend-1 backend-2 frontend nginx
```

Verify migration:

```powershell
docker compose exec postgres psql -U cinebooking -d cinebooking -c "SELECT version,description,success FROM flyway_schema_history ORDER BY installed_rank;"
```

Expected final migration:

`9 | staff accounts | t`
