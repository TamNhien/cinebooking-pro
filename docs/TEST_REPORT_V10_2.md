# CineBooking V10.2 smoke-test fix

This patch replaces the V10.1 PowerShell scripts with ASCII-only scripts compatible with Windows PowerShell 5.1.

## Why V10.1 failed

The V10.1 script was UTF-8 without BOM and contained Vietnamese text plus a PowerShell here-string. Windows PowerShell 5.1 can interpret UTF-8-without-BOM files using the current ANSI code page. The resulting mojibake can make parsing unreliable. The user log showed a ParserError around the here-string block before any API test ran.

## V10.2 changes

- `tools/test-v10.ps1` is ASCII-only.
- Removed the here-string error block.
- Keeps the Admin password interactive and hidden by default.
- Detects HTTP 401 and HTTP 429 login responses.
- Tests public API, Admin login, staff creation/update, current shift creation, overlap rejection, staff login, attendance start/end, and gate lock/open/lock flow.
- Synthetic STAFF account is disabled at the end unless `-KeepTestData` is supplied.
- `tools/diagnose-v10.ps1` is also ASCII-only to avoid mojibake on Windows PowerShell 5.1.

## Run

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v10.ps1
powershell -ExecutionPolicy Bypass -File .\tools\test-v10.ps1
```

Enter the current Admin password when prompted. Do not place the current password in source control.
