# CineBooking V26.2 - PWA Manifest Runtime Fix

## Problem

On Windows PowerShell diagnostics, `/manifest.webmanifest` returned HTTP 200 with the expected content type, but the diagnostic observed an empty `display` property.

## Fix

- Replaced the Next.js metadata manifest route (`app/manifest.ts`) with a deterministic static file at `public/manifest.webmanifest`.
- Kept the root layout link pointing to `/manifest.webmanifest`.
- Added cache-busting query parameters and `no-cache, no-store` request headers to V26 diagnostics.
- Added response normalization for both `string` and `byte[]` content before JSON parsing, improving Windows PowerShell compatibility.
- Improved diagnostic errors to show the response body when `display` is missing.
- Updated the V26 smoke test and source verification to use the static manifest.

## Deployment

Rebuild the frontend without BuildKit cache once after applying this patch:

```powershell
docker compose build --no-cache frontend
docker compose up -d --force-recreate frontend nginx
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v26.ps1
powershell -ExecutionPolicy Bypass -File .\tools\test-v26.ps1
python .\tools\verify_v26_2_manifest.py
```
