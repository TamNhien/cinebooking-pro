# CineBooking Pro V26 - PWA & Offline Tickets

V26 turns the Next.js frontend into a stronger installable PWA without caching authenticated API responses.

## Highlights

- Install prompt on supported Chromium browsers and iOS home-screen guidance.
- Proper 192x192, 512x512 and maskable PNG icons.
- Versioned service-worker caches and an explicit update flow.
- Offline fallback page.
- IndexedDB offline ticket vault. The user explicitly chooses **Lưu vé offline**.
- Saved QR tickets remain readable without network connectivity.
- Existing saved tickets are refreshed automatically when their online ticket page is opened again.
- API routes are never cached by the service worker; JWT/profile/payment responses are not written to Cache Storage.
- Mobile staff image input now uses `capture="environment"` to open the rear camera when supported.

## Security model

The offline ticket contains a valid signed check-in QR, so it is sensitive. It is stored only in browser IndexedDB on the local device after explicit user action. The UI warns users to save tickets only on personal devices and to delete them after the movie.

The customer can display a saved QR while offline, but the STAFF check-in device still needs connectivity to the CineBooking backend to validate and atomically consume the ticket.

## Database

V26 has no schema migration. Flyway remains at V25.

## Upgrade

Rebuild the frontend and nginx:

```powershell
docker compose up -d --build --force-recreate frontend nginx
```

Backend rebuild is not required for V26.

Then run:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v26.ps1
powershell -ExecutionPolicy Bypass -File .\tools\test-v26.ps1
```
