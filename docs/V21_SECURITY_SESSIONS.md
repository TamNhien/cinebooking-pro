# CineBooking Pro V21 - Security & Session Management

V21 replaces long-lived standalone JWT login with revocable server-side sessions.

## Flow

1. Login/register creates `auth_session` and sends an HttpOnly `cinebooking_refresh` cookie.
2. Access JWT is short-lived (default 30 minutes) and contains `sid` + `jti`.
3. Every authenticated request verifies the JWT and confirms that `sid` is still active.
4. `/api/auth/refresh` rotates the opaque refresh token and issues a new access JWT.
5. Logout/session revocation is immediate because the JWT filter rejects revoked `sid` values.
6. Password reset revokes every session. Password change keeps the current session and revokes other devices.
7. Admin password reset or disabling/deleting a staff account revokes its active sessions.

## UI

`/profile` now shows active devices, current session, IP/last activity, session expiry, recent login events, single-device revoke, and “sign out other devices”.

## Browser hardening

Nginx adds `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, a strict referrer policy, and a restrictive Permissions-Policy while keeping camera access for the same origin.

## Local vs production cookies

Local HTTP uses `REFRESH_COOKIE_SECURE=false`. For production HTTPS set `REFRESH_COOKIE_SECURE=true`.

## Upgrade

Flyway migration: `V21__security_sessions.sql`.
Existing V20 access tokens intentionally become invalid because they do not contain a V21 `sid`; users must log in again once after upgrading.
