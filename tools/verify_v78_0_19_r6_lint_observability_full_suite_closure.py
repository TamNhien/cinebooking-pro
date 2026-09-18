from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
checks: list[bool] = []

def text(rel: str) -> str:
    path = ROOT / rel
    return path.read_text(encoding="utf-8") if path.exists() else ""

def ok(condition, label: str) -> None:
    passed = bool(condition)
    checks.append(passed)
    print(f"[ {'OK' if passed else 'FAIL'} ] {label}")

booking = text("frontend/app/booking/[showtimeId]/page.tsx")
service = text("backend/src/main/java/com/cinebooking/observability/ObservabilityService.java")
e2e = text("frontend/e2e/observability-reliability-v65.spec.ts")
release = text("scripts/release.ps1")
ci = text(".github/workflows/ci.yml")
diag = text("tools/diagnose-v78.ps1")
make = text("Makefile")
readme = text("README.md")
v65 = text("tools/verify_v65_observability_reliability.py")
r5 = text("tools/verify_v78_0_19_r5_full_en_presentation_inventory_closure.py")
v77_09 = text("tools/verify_v77_0_9_vietnamese_ui_maintenance_completion.py")
v77_12 = text("tools/verify_v77_0_12_typescript_localization_contract_hygiene.py")
v77_14 = text("tools/verify_v77_0_14_navigation_language_dropdown_localization.py")
v77_40 = text("tools/verify_v77_0_40_runtime_language_boundary_fix.py")
v31_2 = text("tools/verify_v31_2_rc_determinism.py")
v77_55 = text("tools/verify_v77_0_55_v31_2_confirmed_status_contract_compatibility.py")
v77_56 = text("tools/verify_v77_0_56_v48_inventory_bootstrap_read_resilience.py")

# Exact lint blocker reported by Windows R5.
ok('import { localizedLabel } from "@/lib/vi-labels";' in booking and 'localizedLabel, viLabel' not in booking,
   "Booking page removes the stale viLabel import that broke zero-warning lint")
ok('viLabel(' not in booking,
   "Booking page no longer references viLabel")

# Runtime V65 dependency probes must return within a bounded request budget.
ok('DEPENDENCY_PROBE_TIMEOUT_MS = 2_000L' in service,
   "Observability dependency probe timeout is explicit and bounded")
ok('Executors.newVirtualThreadPerTaskExecutor()' in service,
   "Observability dependency probes use cancellable virtual threads")
ok('dependencyProbeExecutor.submit(this::databaseStatus)' in service and 'dependencyProbeExecutor.submit(this::redisStatus)' in service,
   "PostgreSQL and Redis probes are isolated from the request thread")
ok('probe.get(DEPENDENCY_PROBE_TIMEOUT_MS, TimeUnit.MILLISECONDS)' in service,
   "Observability waits on each dependency probe with a hard timeout")
ok('catch (TimeoutException ex)' in service and 'probe.cancel(true)' in service and '"ProbeTimeout"' in service,
   "Timed-out dependency probes fail closed instead of leaving the UI LOADING")
ok('@PreDestroy' in service and 'dependencyProbeExecutor.shutdownNow()' in service,
   "Observability probe executor is shut down with the application")
ok('jdbc.queryForObject("select 1"' in service and 'connection.ping()' in service,
   "R6 preserves the original read-only PostgreSQL SELECT 1 and Redis PING probes")

# Browser full-suite race: warm the real ADMIN API contract before asserting UI readiness.
ok('AUTH_STORAGE_KEY="cinebooking_auth_v3"' in e2e and 'adminAuth(context:BrowserContext,page:Page)' in e2e,
   "V65 E2E resolves the real ADMIN bearer token")
ok('context.request.get(endpoint' in e2e and '/api/admin/observability/summary' in e2e,
   "V65 E2E preflights the real observability summary API")
ok('strategyVersion==="V65-OBSERVABILITY-RELIABILITY-4"' in e2e,
   "V65 E2E waits for the expected strategy payload, not only HTTP success")
ok('timeout:10_000' in e2e and 'timeout:60_000' in e2e,
   "V65 E2E precondition has bounded request and overall deadlines")
ok('data-runtime-state","READY"' in e2e and 'timeout:45_000' in e2e,
   "Original V65 UI READY assertion remains intact")

# Historical source contracts remain present.
ok('PostgreSQL probe uses SELECT 1' in v65 and 'Redis probe uses PING' in v65,
   "Historical V65 verifier still checks the original dependency semantics")
ok('V48 Inventory E2E provisions two deterministic branch prerequisites' in r5,
   "R5 deterministic Inventory closure remains in the verifier lineage")
ok('localizedLabel(b.status,language)' in v77_09 and 'localizedLabel(x.status,language)' in v77_09,
   "Historical V77.0.9 gate accepts modern booking/waitlist localizedLabel rendering")
ok('language-aware label renderer' in v77_12 and 'localizedLabel(s.seatType,language)' in v77_12,
   "Historical V77.0.12 gate accepts the current language-aware seat tooltip")
ok('requiredBranches=[' in v77_14 and 'name:"CineHub Bình Thạnh"' in v77_14,
   "Historical V77.0.14 gate accepts deterministic V48 branch provisioning")
ok("'en?' in line" in v77_40,
   "Historical V77.0.40 static language audit recognizes local EN boolean ownership")
ok('Booking status: ${localizedLabel(b.status,"en")}' in v31_2 and 'Booking status: ${localizedLabel(b.status,"en")}' in v77_55,
   "Historical V31.2/V77.0.55 gates accept bilingual accessible booking status")
ok("inventory.count('withTransientReadRetry(') >= 4" in v77_56 and 'branchSnapshot()' in v77_56,
   "Historical V77.0.56 gate accepts sustained-read Inventory and real-API branch bootstrap")

# R6 lifecycle / documentation / schema.
name = "verify_v78_0_19_r6_lint_observability_full_suite_closure.py"
ok(name in release and name in ci and name in diag,
   "Stable preflight, GitHub CI and V78 diagnostics execute the R6 verifier")
ok('verify-v78-0-19-r6' in make and 'release-v78-0-19-r6' in make,
   "Makefile exposes the R6 verify/release lifecycle")
ok('V78.0.19-R6' in readme and 'Lint / Observability Full-Suite Closure' in readme,
   "README records R6 in the single consolidated history")
ok([path.name for path in ROOT.glob("*.md")] == ["README.md"],
   "Source keeps exactly one consolidated root README.md")
migrations = list((ROOT / "backend/src/main/resources/db/migration").glob("V*.sql"))
latest = max(int(re.match(r"V(\d+)", path.name).group(1)) for path in migrations if re.match(r"V(\d+)", path.name))
ok(latest == 72 and not list((ROOT / "backend/src/main/resources/db/migration").glob("V78*.sql")),
   "R6 remains no-schema on Flyway V72")

# Changed files must be staging-whitespace clean.
changed = [
    "frontend/app/booking/[showtimeId]/page.tsx",
    "backend/src/main/java/com/cinebooking/observability/ObservabilityService.java",
    "frontend/e2e/observability-reliability-v65.spec.ts",
    "tools/verify_v78_0_19_r6_lint_observability_full_suite_closure.py",
    "tools/verify_v77_0_9_vietnamese_ui_maintenance_completion.py",
    "tools/verify_v77_0_12_typescript_localization_contract_hygiene.py",
    "tools/verify_v77_0_14_navigation_language_dropdown_localization.py",
    "tools/verify_v77_0_40_runtime_language_boundary_fix.py",
    "tools/verify_v31_2_rc_determinism.py",
    "tools/verify_v77_0_55_v31_2_confirmed_status_contract_compatibility.py",
    "tools/verify_v77_0_56_v48_inventory_bootstrap_read_resilience.py",
    "scripts/release.ps1", ".github/workflows/ci.yml", "tools/diagnose-v78.ps1", "Makefile", "README.md",
]
hygiene: list[str] = []
for rel in changed:
    path = ROOT / rel
    if not path.exists():
        hygiene.append(rel + ":missing")
        continue
    lines = path.read_text(encoding="utf-8").splitlines()
    if any(line.endswith(" ") or line.endswith("\t") for line in lines):
        hygiene.append(rel + ":trailing")
    raw = path.read_bytes()
    if not raw.endswith(b"\n") or raw.endswith(b"\n\n"):
        hygiene.append(rel + ":eof")
ok(not hygiene, f"R6 changed files are staging-whitespace clean (hits={len(hygiene)})")

passed = sum(checks)
print(f"\nV78.0.19-R6 Lint / Observability Full-Suite Closure verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed == len(checks) else 1)
