# Test Report - V26.1 JWT Security Patch

## Automated checks executed

- `python3 tools/verify_v26_1_security.py` -> 11/11 PASS.
- `bash tools/verify-v26-source.sh` -> 14/14 PASS.
- `docker-compose.yml` parsed successfully as YAML.
- Runtime configuration scan confirms the insecure JWT fallback was removed from Docker Compose and Spring configuration.

## Environment limitation

The patch workspace used for this verification does not provide Docker, Maven, or PowerShell, so full container startup and the Windows PowerShell smoke tests were not executed here. The project should be validated on the target Windows machine with Docker Desktop using the commands below.

## Target-machine verification

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\init-env.ps1
docker compose up -d --build --force-recreate backend-1 backend-2 frontend nginx
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v26.ps1
powershell -ExecutionPolicy Bypass -File .\tools\test-v26.ps1
python .\tools\verify_v26_1_security.py
```

If `.env` already exists, do not overwrite it blindly. Replace only `JWT_SECRET` when you intentionally want to rotate the signing key.
