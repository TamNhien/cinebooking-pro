from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
failures = []
checks = 0


def check(name: str, condition: bool):
    global checks
    checks += 1
    if condition:
        print(f"PASS: {name}")
    else:
        print(f"FAIL: {name}")
        failures.append(name)


def text(path: str) -> str:
    p = ROOT / path
    return p.read_text(encoding="utf-8") if p.exists() else ""

workflow = text(".github/workflows/release-candidate.yml")
ci = text(".github/workflows/ci.yml")
compose = text("docker-compose.yml")
backend_docker = text("backend/Dockerfile")
frontend_docker = text("frontend/Dockerfile")
smoke = text("tools/smoke-v29.sh")
makefile = text("Makefile")
diag = text("tools/diagnose-v29.ps1")

check("release-candidate workflow exists", bool(workflow))
check("release-candidate workflow is manual-only", "workflow_dispatch:" in workflow and "\n  push:" not in workflow and "\n  pull_request:" not in workflow)
check("release workflow keeps contents read-only", re.search(r"permissions:\s*\n\s+contents:\s*read", workflow) is not None)
check("release workflow does not grant package write", "packages: write" not in workflow)
check("release workflow does not publish container images", "push: true" not in workflow and "docker/login-action" not in workflow and "ghcr.io" not in workflow)
check("release workflow does not deploy infrastructure", not any(token in workflow.lower() for token in ["kubectl ", "helm ", "scp ", "ssh ", "production deploy"]))
check("release workflow runs V29 full-stack smoke", "bash tools/smoke-v29.sh" in workflow)
check("release workflow uploads RC manifest", "release-candidate-manifest.json" in workflow and "actions/upload-artifact@v7" in workflow)
check("RC manifest explicitly records unpublished and undeployed state", '"published": False' in workflow and '"deployed": False' in workflow)

check("smoke script is strict-mode bash", smoke.startswith("#!/usr/bin/env bash") and "set -Eeuo pipefail" in smoke)
check("smoke stack uses isolated Compose project", "COMPOSE_PROJECT_NAME" in smoke and "cinebooking_v29_smoke_" in smoke)
check("smoke stack uses non-default HTTP port", 'HTTP_PORT="${HTTP_PORT:-18080}"' in smoke)
check("smoke stack uses non-default PostgreSQL port", 'POSTGRES_PORT="${POSTGRES_PORT:-15433}"' in smoke)
check("smoke cleanup never uses forbidden down -v shorthand", "docker compose down -v" not in smoke)
check("smoke cleanup removes only disposable project volumes", "docker compose down --remove-orphans --volumes" in smoke)
check("smoke probes frontend through nginx", 'wait_http "http://127.0.0.1:${HTTP_PORT}/"' in smoke)
check("smoke probes public API through nginx", 'wait_http "http://127.0.0.1:${HTTP_PORT}/api/movies"' in smoke)
check("smoke validates JSON API payload", "json.loads" in smoke and "/api/movies did not return a JSON array" in smoke)
check("smoke validates nginx security header", "X-Content-Type-Options" in smoke and "nosniff" in smoke)
check("smoke validates OCI image labels", "org.opencontainers.image.version" in smoke and "org.opencontainers.image.revision" in smoke)

check("backend image carries OCI version and revision labels", "org.opencontainers.image.version" in backend_docker and "org.opencontainers.image.revision" in backend_docker)
check("frontend image carries OCI version and revision labels", "org.opencontainers.image.version" in frontend_docker and "org.opencontainers.image.revision" in frontend_docker)
check("Compose tags backend images by APP_VERSION", "image: cinebooking/backend:${APP_VERSION:-dev}" in compose)
check("Compose tags frontend image by APP_VERSION", "image: cinebooking/frontend:${APP_VERSION:-dev}" in compose)
check("Compose forwards APP_VERSION and VCS_REF build args", compose.count("APP_VERSION: ${APP_VERSION:-dev}") >= 3 and compose.count("VCS_REF: ${VCS_REF:-local}") >= 3)
check("nginx host port remains configurable with safe default", '"${HTTP_PORT:-80}:80"' in compose)
check("main CI protects V29 source structure", "python3 tools/verify_v29_release_candidate.py" in ci)
check("V29 diagnostic chains V28.8 diagnostics", "diagnose-v28.ps1" in diag and "verify_v29_release_candidate.py" in diag)
check("Makefile exposes V29 diagnostics without changing reset safety", "diagnose-v29:" in makefile and "verify-v29:" in makefile and "destructive volume reset is disabled" in makefile and "@exit 1" in makefile)

print(f"\n{checks - len(failures)}/{checks} checks passed")
if failures:
    print("Failed checks:")
    for item in failures:
        print(f" - {item}")
    sys.exit(1)
