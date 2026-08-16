# CineBooking Pro V20 - Test Report

## Checks completed in the source-generation environment

- Analytics Java DTO/controller/service compile against local Spring/JDBC stubs: PASS.
- Frontend TypeScript/TSX/JS/JSX syntax parse: 55 files, 0 parse diagnostics.
- V20 Flyway migration present and limited to read-optimized indexes.
- V20 read-only diagnostics and smoke-test scripts added.
- No production data is modified by `test-v20.ps1`.

## Checks that must run on the Windows/Docker environment

```powershell
docker compose up -d --build --force-recreate backend-1 backend-2 frontend nginx
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v20.ps1
powershell -ExecutionPolicy Bypass -File .\tools\test-v20.ps1
```

Expected Flyway entry:

```text
20 | analytics v2 indexes | t
```

Expected smoke-test result:

```text
ALL V20 ANALYTICS V2 SMOKE TESTS PASSED
```
