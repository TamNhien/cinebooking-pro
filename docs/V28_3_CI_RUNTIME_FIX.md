# V28.3 CI Runtime Fix

V28.3 fixes two failures first observed on the real GitHub Actions runner after V28.2 was pushed.

## 1. Backend unit-test compile failure

`CineBookingIntegrationIT` uses Spring Boot 4's `org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc` annotation. The project now explicitly adds the focused `spring-boot-starter-webmvc-test` dependency in test scope so the annotation and MockMvc MVC-test auto-configuration are available during Maven `testCompile`.

The integration test remains excluded from Surefire execution, but Maven compiles test sources before Surefire selects which tests to run, so its test-only dependencies must still be resolvable in the unit-test job.

## 2. V26.2 manifest regression failure

The runtime had the static `frontend/public/manifest.webmanifest`, but an old `frontend/app/manifest.ts` also remained in the Git working tree. V26.2 intentionally moved the manifest to the static public file to avoid the earlier runtime/PowerShell parsing problem.

V28.3 removes the stale dynamic route. Because ZIP extraction cannot delete an existing file, run:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\apply-v28.3.ps1
```

The apply script removes only `frontend/app/manifest.ts` after confirming the static manifest exists.

## Validation

Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v28.ps1
```

Then stage deletions and modifications with `git add -A`, commit, and push.
