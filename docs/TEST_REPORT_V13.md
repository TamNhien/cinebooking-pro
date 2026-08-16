# V13 test report

Static checks performed in the generation environment:

- TypeScript/TSX parse scan across frontend: no TS1xxx syntax/parser diagnostics.
- Internal Java import scan: no new missing CineBooking top-level class imports in V13 files.
- Brace-balance checks for all changed Java files: balanced.
- Migration file uses PostgreSQL `CREATE INDEX IF NOT EXISTS` only.
- Full ZIP integrity is checked before delivery.

Environment limitation: Maven is not installed in the generation container and no Docker daemon is available there, so the final Spring Boot/Next.js Docker build must be run on the user's Windows Docker Desktop environment. `tools/test-v13.ps1` is included for post-build API smoke testing.
