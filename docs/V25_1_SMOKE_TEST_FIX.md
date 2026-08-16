# CineBooking V25.1 - PowerShell smoke-test compatibility fix

V25.1 does not change backend, frontend, or database schema. Flyway remains at V25.

## Fixed issue

Windows PowerShell variable names are case-insensitive. The V25 smoke test used `$Home`, which collides with the built-in/read-only `$HOME` variable on Windows PowerShell and caused:

`Cannot overwrite variable HOME because it is read-only or constant.`

The script now uses `$HomeRecommendations` instead.

## Upgrade

Copy `tools/test-v25.ps1` over the existing file. No Docker rebuild is required.

Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\test-v25.ps1
```
