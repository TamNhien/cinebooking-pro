from pathlib import Path
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
checks = []


def check(name, ok):
    ok = bool(ok)
    checks.append((name, ok))
    print(("PASS" if ok else "FAIL") + f": {name}")


def text(rel):
    p = ROOT / rel
    return p.read_text(encoding="utf-8") if p.exists() else ""

pkg_text = text("frontend/package.json")
pkg = json.loads(pkg_text) if pkg_text else {}
config = text("frontend/playwright.config.ts")
spec = text("frontend/e2e/booking-flow.spec.ts")
script = text("tools/e2e-v29.2.sh")
rc = text(".github/workflows/release-candidate.yml")
ci = text(".github/workflows/ci.yml")
diag = text("tools/diagnose-v29.ps1")
makefile = text("Makefile")

playwright_version = str(pkg.get("devDependencies", {}).get("@playwright/test", ""))
check(
    "Playwright dependency is pinned to the validated 1.60 patch line",
    re.fullmatch(r"1\.60\.\d+(?:-[0-9A-Za-z.-]+)?", playwright_version) is not None,
)
check("frontend exposes E2E npm script", pkg.get("scripts", {}).get("e2e") == "playwright test")
check("Playwright config exists", bool(config))
check("Playwright uses disposable V29 base URL", "PLAYWRIGHT_BASE_URL" in config and "127.0.0.1:18080" in config)
check("Playwright runs Chromium deterministically", 'name: "chromium"' in config and "workers: 1" in config)
check("Playwright retains failure evidence", 'trace: "retain-on-failure"' in config and 'screenshot: "only-on-failure"' in config and 'video: "retain-on-failure"' in config)

gitignore = text(".gitignore")
check("Playwright evidence is Git-ignored", "frontend/playwright-report/" in gitignore and "frontend/test-results/" in gitignore)

check("E2E browser journey exists", bool(spec) and "register -> login -> seat -> mock payment -> QR -> staff gate check-in" in spec)
check("E2E registers a unique customer", "gia.huy+${stamp}@example.com" in spec and "Nguyễn Gia Huy" in spec and 'getByRole("button", { name: "Đăng ký" })' in spec)
check("E2E performs explicit customer login", 'page.goto("/login")' in spec and 'getByRole("button", { name: "Đăng nhập" })' in spec)
check("E2E uses seeded Quick Booking movie", "Hành Trình Sao Hỏa" in spec and 'getByLabel("1. Phim")' in spec)
check("E2E selects and holds an available seat", 'title*="AVAILABLE"' in spec and "Giữ ghế 5 phút" in spec)
check("E2E completes mock payment", "Giả lập thành công" in spec and "CONFIRMED" in spec)
check("E2E verifies ticket QR", "QR URL vé CineBooking" in spec and "/api/tickets/${id}" in spec)
check("E2E checks in QR through staff gate UI", "/staff/check-in" in spec and "Kiểm tra & xác nhận check-in" in spec and "Check-in vé thành công." in spec)
check("E2E admin credentials come from test environment", "E2E_ADMIN_EMAIL" in spec and "E2E_ADMIN_PASSWORD" in spec)

check("E2E shell uses strict mode", script.startswith("#!/usr/bin/env bash") and "set -Eeuo pipefail" in script)
check("E2E shell isolates Compose project", "cinebooking_v292_e2e_" in script and "COMPOSE_PROJECT_NAME" in script)
check("E2E shell uses non-default host ports", 'HTTP_PORT="${HTTP_PORT:-18080}"' in script and 'POSTGRES_PORT="${POSTGRES_PORT:-15433}"' in script)
check("E2E shell uses disposable test database", "cinebooking_v292_e2e" in script)
check("E2E cleanup removes only disposable volumes", "docker compose down --remove-orphans --volumes" in script and "docker compose down -v" not in script)
check("E2E shell can reuse RC images", "E2E_SKIP_BUILD" in script and "docker compose up -d --no-build" in script)
check("E2E shell exports browser base URL and admin test credentials", "PLAYWRIGHT_BASE_URL" in script and "E2E_ADMIN_EMAIL" in script and "E2E_ADMIN_PASSWORD" in script)

check("RC workflow installs Playwright Chromium with OS deps", "npx playwright install --with-deps chromium" in rc)
check("RC workflow runs V29.2 browser journey", "bash tools/e2e-v29.2.sh" in rc and 'E2E_SKIP_BUILD: "true"' in rc)
check("RC workflow uploads Playwright evidence", "playwright-report" in rc and "frontend/test-results/" in rc and "actions/upload-artifact@v7" in rc)
check("RC workflow remains manual-only and read-only", "workflow_dispatch:" in rc and "\n  push:" not in rc and re.search(r"permissions:\s*\n\s+contents:\s*read", rc) is not None)
check("RC workflow still does not publish or deploy", "push: true" not in rc and "packages: write" not in rc and "docker/login-action" not in rc and "ghcr.io" not in rc)

check("main CI runs V29.1 and V29.2 verifiers as separate steps", "run: python3 tools/verify_v29_1_checkout_compat.py" in ci and "run: python3 tools/verify_v29_2_playwright_e2e.py" in ci)
check("V29 diagnostics include V29.2 verifier", "verify_v29_2_playwright_e2e.py" in diag)
check("Makefile exposes V29.2 verifier and preserves reset safety", "verify-v29.2:" in makefile and "destructive volume reset is disabled" in makefile and "@exit 1" in makefile)

failed = [name for name, ok in checks if not ok]
print(f"\n{len(checks)-len(failed)}/{len(checks)} checks passed")
if failed:
    print("Failed checks:")
    for name in failed:
        print(f" - {name}")
    sys.exit(1)
