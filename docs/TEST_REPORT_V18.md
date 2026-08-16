# V18 Test Report

## Static checks performed in the build workspace

- TypeScript/TSX syntax parsed using the TypeScript compiler API: 51 source files, 0 syntax diagnostics.
- Internal Java source/import review performed for the V18 pricing package and modified booking/seat services.
- `javac` parser pass on changed Java files found no syntax-pattern errors; external Spring/JPA dependencies are unavailable in this workspace, so a complete Maven compile cannot run here.
- V18 migration was reviewed for PostgreSQL-compatible DDL, foreign keys, checks, indexes, and inactive seed examples.

## Included project tests

`PricingServiceTimeWindowTest` covers:

- standard intraday time window
- end boundary exclusion
- cross-midnight window such as 20:00 -> 02:00

`tools/test-v18.ps1` performs an API-level smoke test on the user's running Docker project:

1. Admin login.
2. Read pricing rules.
3. Choose an existing showtime and usable seat.
4. Get baseline price preview.
5. Create a temporary targeted +1,234 VND rule.
6. Confirm preview increases by exactly 1,234 VND.
7. Delete the temporary rule.
8. Confirm preview returns to baseline.

## Final machine verification

Run on Windows after upgrade:

```powershell
docker compose up -d --build --force-recreate backend-1 backend-2 frontend nginx
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v18.ps1
powershell -ExecutionPolicy Bypass -File .\tools\test-v18.ps1
```

Expected Flyway row:

```text
18 | dynamic pricing | t
```
