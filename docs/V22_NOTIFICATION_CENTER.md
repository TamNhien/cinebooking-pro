# CineBooking Pro V22 - Notification Center V2

V22 turns the existing in-app notification list into a configurable notification center.

## Channels

- **In-app**: bell counter + `/notifications`.
- **Email**: uses the existing Spring Mail / SMTP configuration. Email is sent only after the surrounding business transaction commits.
- **Browser notification**: uses the browser Notification API while CineBooking is open. It intentionally does **not** claim background Web Push; VAPID/service-worker push can be added later without changing the preference model.
  Browsers normally require a secure context (HTTPS; `localhost` is the usual development exception), so an HTTP LAN URL such as `http://192.168.x.x` may not be allowed to request notification permission.

Email is opt-in by default (`email_enabled=false`) so upgrading does not unexpectedly send mail to existing users.

## Categories

Users can enable/disable:

- booking/payment
- showtime reminders
- refunds
- staff shifts
- promotions

Disabling a category stops new notifications of that category on every channel.

## Staff shift notifications

V22 notifies staff when a shift is assigned, edited or cancelled. A scheduler also sends a reminder before a scheduled shift (30 minutes by default).

Because CineBooking runs two backend instances, scheduled reminders use a database `dedupe_key` with a partial unique index. Both instances may scan the same shift, but PostgreSQL allows only one reminder row to be inserted.

Configuration:

```env
STAFF_SHIFT_REMINDER_MINUTES=30
STAFF_SHIFT_SCAN_MS=60000
```

## Database

Flyway migration: `V22__notification_center_v2.sql`.

New table:

- `notification_preference`

New `user_notification` fields:

- `category`
- `in_app_visible`
- `email_status`
- `email_sent_at`
- `delivery_error`
- `dedupe_key`

## API

```text
GET    /api/notifications
GET    /api/notifications/summary
GET    /api/notifications/preferences
PUT    /api/notifications/preferences
GET    /api/notifications/browser-feed?after=<ISO-8601>
POST   /api/notifications/test
POST   /api/notifications/{id}/read
POST   /api/notifications/read-all
DELETE /api/notifications/{id}
```

## Upgrade / verification

```powershell
docker compose up -d --build --force-recreate backend-1 backend-2 frontend nginx
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v22.ps1
powershell -ExecutionPolicy Bypass -File .\tools\test-v22.ps1
```

Do not remove the PostgreSQL volume. The V22 smoke test disables email during its temporary test, restores the original preferences, deletes the test notification and logs out its temporary auth session.
