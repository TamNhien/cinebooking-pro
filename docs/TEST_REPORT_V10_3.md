# CineBooking V10.3 smoke-test hotfix

## Root cause fixed

Windows PowerShell 5.1 may keep a JSON array returned by `Invoke-RestMethod` as one `Object[]` value. The V10.2 smoke test wrapped the cinema response with `@(...)` and then selected index 0. On PowerShell 5.1 this could still leave `$Cinema` as the entire cinema array.

The log signature is:

```text
PASS: Cinema available: Cinema A Cinema B Cinema C
POST /api/admin/staff -> 500
```

In that case `cinemaId` was serialized as an array of UUIDs instead of one UUID. Spring could not deserialize the request DTO and the generic exception handler returned HTTP 500. The application service itself was not failing to create a valid staff account.

## V10.3 changes

- Enumerate the admin cinema response with `Select-Object -First 1`.
- Validate that `cinemaId` is one scalar UUID before POSTing staff data.
- Use the validated scalar ID for create/update/cleanup requests.
- Count API arrays with `Measure-Object` for Windows PowerShell 5.1 compatibility.
- Remove the `sh -lc` regex command from diagnostics; `printenv` is called directly, avoiding Windows/Docker quoting issues.
- Scripts remain ASCII-only so Windows PowerShell 5.1 does not hit UTF-8/BOM parser issues.

No database migration and no backend/frontend rebuild are required for this hotfix.
