# V29 Release Candidate & Staging Readiness

V29 starts after the V28.8 CI pipeline is green end-to-end. Its purpose is to make a release candidate reproducible and smoke-testable without turning the repository into an automatic production deployment system.

## What V29 adds

- Versioned backend/frontend Docker image tags via `APP_VERSION`.
- OCI traceability labels for release version and Git revision.
- Configurable nginx host port (`HTTP_PORT`, default remains `80`).
- `tools/smoke-v29.sh` to build and start a disposable full Compose stack.
- Smoke probes through the real nginx route for the frontend and `/api/movies`.
- JSON response validation and the existing `X-Content-Type-Options: nosniff` security-header check.
- `.github/workflows/release-candidate.yml`, a manual-only RC workflow.
- A small release-candidate manifest artifact containing version, revision, and local image IDs.

## Safety model

The RC workflow intentionally has only `contents: read`. It does **not** log in to a container registry, does **not** push images, does **not** use deployment credentials, and does **not** deploy to production.

The smoke stack uses a unique `COMPOSE_PROJECT_NAME`, port `18080` for nginx, and port `15433` for PostgreSQL. Cleanup removes volumes only inside that disposable project. Never replace the normal upgrade procedure with `docker compose down -v`.

No real `.env`, database dump, SMTP password, payment secret, or production credential belongs in Git.

## Normal CI

`CineBooking CI` remains the required baseline and now also runs `tools/verify_v29_release_candidate.py`. V29 does not weaken any V26-V28 gate.

## Release Candidate workflow

After normal CI is green:

1. Open **Actions → CineBooking Release Candidate**.
2. Choose **Run workflow** on `main`.
3. Enter a label such as `v29-rc1`.
4. The workflow builds versioned backend/frontend images locally on the runner.
5. It starts PostgreSQL, Redis, both backend replicas, frontend, and nginx.
6. It verifies the frontend and public movies API through nginx.
7. It uploads `release-candidate-manifest.json`.

A successful RC workflow means the candidate can build and boot as a full stack in a clean GitHub runner. It does not mean production was deployed.

## Local diagnostics

Static/safe diagnostics:

```powershell
python .\tools\verify_v29_release_candidate.py
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v29.ps1
```

The full smoke script needs Bash, Docker Compose, and ports 18080/15433 available:

```bash
APP_VERSION=v29-local VCS_REF=local bash tools/smoke-v29.sh
```

On a Windows machine without Bash, use the GitHub Release Candidate workflow instead of installing tooling solely for this test.
