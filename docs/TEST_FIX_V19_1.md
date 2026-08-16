# CineBooking Pro V19.1 - PowerShell smoke test fix

`test-v19.ps1` used `$Pid` as a local variable for the concession product id. Windows PowerShell variable names are case-insensitive, so `$Pid` collides with the built-in read-only `$PID` variable containing the current PowerShell process id.

V19.1 renames that variable to `$ProductId` everywhere in the V19 inventory smoke test.

No backend, frontend, database schema, or Flyway migration changes are included in this patch. Rebuilding Docker images is not required.

Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\test-v19.ps1
```

Expected final line:

```text
ALL V19 INVENTORY SMOKE TESTS PASSED
```
