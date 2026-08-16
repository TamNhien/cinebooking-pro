# CineBooking Pro V11 - Test Report

## Automated checks completed in the build workspace

1. `StaffShiftRules` compiled with Java 21 and the existing standalone rule test passed **9/9** cases.
2. The actual V11 `TicketTokenService.java` was compiled with minimal framework stubs and executed against:
   - signed raw V10 payload verification;
   - V11 absolute URL `?ticket=` verification;
   - tampered signature rejection.
   Result: **PASS**.
3. `tools/verify_v11.py` passed **20/20** structural/security checks, including the partial unique index, QR URL generation, history logging, return-to flow and LAN helper.
4. All **49** TypeScript/TSX files were parsed by TypeScript 5.8 with `--noResolve`; there were **no TS1xxx syntax diagnostics**. Missing package/type diagnostics are expected because `node_modules` is not present in this workspace.
5. Changed Java sources were parsed by `javac`; no Java parser errors such as `';' expected`, `illegal start`, `reached end of file`, or unclosed declarations were found. Full Spring compilation was not possible without Maven dependencies.

## Environment limitations

- Maven CLI is not installed in the artifact workspace.
- `npm install` was attempted but dependency download timed out, so a full `next build` could not be repeated here.
- No Docker daemon is available in this workspace, so the Flyway V11 migration and the full HTTP flow must be run once on the user's Windows Docker environment.

## Windows end-to-end verification

After upgrade:

```powershell
docker compose up -d --build --force-recreate backend-1 backend-2 frontend nginx
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v11.ps1
powershell -ExecutionPolicy Bypass -File .\tools\test-v11.ps1
```

Expected Flyway final row:

`11 | mobile qr checkin and shift fix | t`

The V11 smoke test includes the regression that caused the screenshot error: create a shift, cancel it, then recreate the **same staff/date/start time**. The recreate must succeed.
