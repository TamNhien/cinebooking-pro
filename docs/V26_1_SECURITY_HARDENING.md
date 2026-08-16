# V26.1 - JWT secret hardening

V26.1 is a configuration/security patch. It does not add a Flyway migration and does not require deleting Docker volumes.

## Changes

- Docker Compose now requires `JWT_SECRET` instead of silently falling back to the example value.
- Spring Boot also requires `JWT_SECRET` when the backend is started outside Compose.
- `JwtService` rejects blank secrets, the documented example secret, and secrets shorter than 32 UTF-8 bytes.
- `tools/init-env.ps1` creates `.env` from `.env.example` and generates 32 cryptographically random bytes for `JWT_SECRET`, Base64 encoded.
- `tools/verify_v26_1_security.py` provides source-level security regression checks.
- `tools/diagnose-v26.ps1` requests PWA resources with no-cache headers and reports the actual manifest `display` value when it is stale/incorrect.

## Upgrade on Windows

If `.env` does not exist:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\init-env.ps1
```

If `.env` already exists, keep it and replace only `JWT_SECRET` with a strong random value. Changing the secret invalidates previously issued access tokens and signed ticket QR payloads that depend on the same key, so perform the rotation intentionally.

Rebuild the two backend containers after changing the secret:

```powershell
docker compose up -d --build --force-recreate backend-1 backend-2
```

For the PWA manifest diagnostic issue, rebuild frontend/nginx too:

```powershell
docker compose up -d --build --force-recreate frontend nginx
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v26.ps1
```

Run source checks:

```powershell
python .\tools\verify_v26_1_security.py
```

No `docker compose down -v` is needed or recommended for this patch.
