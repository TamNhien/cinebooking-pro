# CineBooking V20.1 runtime diagnostics

V20.1 does not add a Flyway migration. It adds server-side logging for unexpected exceptions and improves `tools/test-v20.ps1` so an HTTP 500 from Analytics prints the recent backend exception block automatically.

Build only the backend containers after applying this patch:

```powershell
docker compose up -d --build --force-recreate backend-1 backend-2 nginx
```

Then run:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\test-v20.ps1
```

If Analytics still returns 500, copy the exception block printed after `Recent backend exception lines:`.
