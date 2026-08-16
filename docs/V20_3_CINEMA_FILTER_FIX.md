# CineBooking Pro V20.3 - Cinema Analytics Filter Fix

## Root cause
On Windows PowerShell 5.1, `Invoke-RestMethod` can preserve a JSON array as one `Object[]` value. The V20.2 smoke test wrapped `/api/cinemas` directly in `@(...)`, then selected the first item from the wrapper rather than from the cinema array. Accessing `.id` therefore produced multiple UUIDs, which were interpolated into a single `cinemaId` query parameter. Spring correctly failed to parse that oversized string as one UUID.

## Fixes
- `tools/test-v20.ps1` now forces enumeration before selecting/counting JSON-array responses.
- The selected cinema ID is validated with `Guid.TryParse` before it is sent.
- The filter request URL-encodes the scalar cinema UUID.
- `MethodArgumentTypeMismatchException` is now returned as HTTP 400 instead of being logged as an internal HTTP 500 error.
- No database migration is required. Flyway stays at V20.

## Re-test
```powershell
docker compose up -d --build --force-recreate backend-1 backend-2 nginx
powershell -ExecutionPolicy Bypass -File .\tools\test-v20.ps1
```
