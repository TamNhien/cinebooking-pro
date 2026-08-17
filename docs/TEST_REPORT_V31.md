# V31 Test Report

## Source regression

| Gate | Result |
|---|---|
| V26.1 | 12/12 PASS |
| V26.2 | 13/13 PASS |
| V26.3 | 9/9 PASS |
| V27 | 35/35 PASS |
| V27.1 | 12/12 PASS |
| V27.2 | 14/14 PASS |
| V28 | 53/53 PASS |
| V28.3 | 8/8 PASS |
| V28.7 | 8/8 PASS |
| V28.8 | 8/8 PASS |
| V29 | 29/29 PASS |
| V29.1 | 6/6 PASS |
| V29.2 | 31/31 PASS |
| V29.3 | 28/28 PASS |
| V30 | 35/35 PASS |
| V30.1 | 10/10 PASS |
| V30.2 | 8/8 PASS |
| V31 | 38/38 PASS |

**Total source checks: 357/357 PASS.**

## Additional checks

- `bash -n tools/smoke-v29.sh`: PASS
- `bash -n tools/e2e-v29.2.sh`: PASS
- YAML parse: CI, Release Candidate, Dependabot, Docker Compose: PASS
- `backend/pom.xml` XML parse: PASS
- TypeScript/TSX syntax transpile for V31 changed files: PASS
- `javac` compile of dependency-free `IcsCalendarBuilder`: PASS
- Runtime assertion of generated ICS timestamps/escaping/CRLF: PASS
- V29 demo migration compared byte-for-byte with V30.2 baseline: PASS

## Runtime limitation in the packaging environment

The packaging environment does not provide Docker or Maven/JDK 25, and the attempted npm dependency installation timed out. Therefore full Spring Boot/Testcontainers, Next production build/lint, and Chromium E2E are intentionally left to the repository CI/Release Candidate workflows, which already contain those gates. No claim is made that those runtime gates passed in this packaging environment.
