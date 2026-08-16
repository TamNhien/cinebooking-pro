# CineBooking V12.2 - Voucher UX + V12 smoke test fix

## Fixes

1. `tools/test-v12.ps1` no longer wraps the cinema response in `@(...)` on Windows PowerShell 5.1. The test now selects exactly one cinema and validates that `cinemaId` is a scalar UUID before creating a STAFF account.
2. Admin voucher UI detects duplicate codes locally before calling the API. Existing seed codes such as `WELCOME10` and `CINE20K` are shown as existing codes and the create button is disabled until a unique code is used. Admin can jump directly into edit mode for the existing code.
3. Malformed JSON/type errors now return HTTP 400 instead of being masked as HTTP 500 by the generic exception handler.

No database migration is required. Flyway remains at V12.
