# V28 - CI/CD, automated integration tests and Testcontainers

V28 turns the V27.2 codebase into a CI-gated project. The goal is to catch backend, frontend, database migration, Redis, PWA and Docker regressions before code is merged or deployed.

## What V28 adds

- `.github/workflows/ci.yml`
- `.github/dependabot.yml`
- Testcontainers 2.0.5 for PostgreSQL 18.4 and Redis 8.8
- Maven Failsafe integration-test phase and the `ci-integration` profile
- `CineBookingIntegrationIT`
- automatic Flyway migration validation
- real Redis read/write validation
- register -> login -> JWT -> protected `/api/me` integration flow
- backend unit-test reports
- backend Testcontainers reports
- backend JAR artifact
- frontend standalone artifact
- Docker Compose validation
- backend and frontend Docker build validation
- V26-V28 source-regression gate
- Dependabot for Maven, npm, GitHub Actions and both Dockerfiles

## CI pipeline

The required flow is:

1. Backend unit tests
2. Backend Testcontainers integration tests
3. Frontend advisory lint + mandatory production build
4. V26-V28 source regression
5. Docker Compose configuration validation
6. Backend + frontend image build validation

`docker-build` depends on the other gates, so an image build is not considered successful until the tests, production frontend build and source checks have passed. The existing frontend lint step is advisory in V28 because the legacy source predates a lint-clean baseline; after those findings are cleaned up it can be changed to a blocking gate.

## Testcontainers integration test

`backend/src/test/java/com/cinebooking/integration/CineBookingIntegrationIT.java` starts isolated containers for:

- `postgres:18.4-alpine`
- `redis:8.8-alpine`

Spring Boot service connections point the application context at those temporary services. The integration suite validates:

- Flyway reaches migration V25
- the restored schema contains the expected public tables
- Redis can write/read/delete a real key
- user registration works
- login works and reaches the Redis-backed rate limiter
- a JWT is issued
- the JWT can access protected `/api/me`

The containers are ephemeral and are removed by Testcontainers after the test process.

## Maven commands

Unit tests only:

```bash
cd backend
mvn -B -ntp test
```

Full integration suite with Docker/Testcontainers:

```bash
cd backend
mvn -B -ntp verify -Pci-integration
```

Integration tests are skipped during ordinary Maven builds unless `ci-integration` is enabled. This prevents a normal local `mvn test` from unexpectedly requiring Docker.

## GitHub repository setup

After the first successful workflow run, configure branch protection/rulesets for `main` and require these checks before merge:

- `Backend unit tests`
- `Backend Testcontainers integration`
- `Frontend lint and build` (the production build is blocking; legacy lint is advisory in V28)
- `V26-V28 source regression`
- `Docker Compose validation`
- `Docker image build validation`

Also require pull requests and block force-pushes to `main` if that matches the team's workflow.

## Secrets

The CI test JWT secret is intentionally a test-only value inside the workflow/test configuration. It is not a production secret and must never be copied into production.

The V26.1 production rule remains unchanged: real deployments must provide `JWT_SECRET` through `.env` or the deployment secret store.

## Database safety

V28 does not replace V27.2 database backup/restore safety. Before a manual production restore, continue using:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\backup-db.ps1
powershell -ExecutionPolicy Bypass -File .\tools\verify-db-backup.ps1 -BackupFile ".\backups\<file>.dump"
powershell -ExecutionPolicy Bypass -File .\tools\restore-db.ps1 -BackupFile ".\backups\<file>.dump" -ConfirmRestore
```

Do not use `docker compose down -v` for normal updates.

## Notes about frontend dependency installation

The V27.2 source did not include a committed `package-lock.json`, so V28 CI keeps `npm install` rather than changing to `npm ci`. A future hardening step can generate and commit the lockfile, then switch both CI and the frontend Dockerfile to `npm ci` for fully reproducible dependency resolution.

## Deployment scope

V28 provides continuous integration and delivery-ready build artifacts. It intentionally does not push images to a registry or deploy to a server because no deployment target/registry was specified. Add that final CD stage only after choosing the target (for example a VPS, Kubernetes cluster, or cloud container service) and configuring repository/environment secrets.
