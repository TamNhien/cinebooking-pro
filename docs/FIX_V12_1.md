# CineBooking Pro V12.1 - Backend compile fix

## Fixed
`StaffGatePolicyService` imported `Cinema` from the wrong package:

- Wrong: `com.cinebooking.movie.Cinema`
- Correct entity: `com.cinebooking.domain.Cinema`

This caused Maven/Docker build failure with:

`cannot find symbol: class Cinema; location: package com.cinebooking.movie`

## Verification performed
- All explicit `com.cinebooking.*` imports were checked against source types.
- No unresolved internal project import remains.
- A Java syntax-only diagnostic pass found no syntax diagnostics; dependency-related errors are expected outside Maven because Jakarta/Spring dependencies are not installed in the verification runtime.

## Upgrade
Copy the patch over the current V12/V11.2 project and rebuild:

```powershell
docker compose up -d --build --force-recreate backend-1 backend-2 frontend nginx
```

Do not run `docker compose down -v`.
