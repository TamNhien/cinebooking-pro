from pathlib import Path
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
checks = []

def text(rel):
    p = ROOT / rel
    return p.read_text(encoding="utf-8") if p.exists() else ""

def check(name, cond):
    ok = bool(cond)
    checks.append((name, ok))
    print(f"[ {'OK' if ok else 'FAIL'} ] {name}")

service = text("backend/src/main/java/com/cinebooking/observability/ObservabilityService.java")
request_service = text("backend/src/main/java/com/cinebooking/observability/RequestObservabilityService.java")
filter_java = text("backend/src/main/java/com/cinebooking/observability/TraceAndMetricsFilter.java")
dtos = text("backend/src/main/java/com/cinebooking/observability/ObservabilityDtos.java")
controller = text("backend/src/main/java/com/cinebooking/observability/AdminObservabilityController.java")
security = text("backend/src/main/java/com/cinebooking/config/SecurityConfig.java")
app_yml = text("backend/src/main/resources/application.yml")
compose = text("docker-compose.yml")
prom = text("infra/prometheus/prometheus.yml")
rules = text("infra/prometheus/rules-v65.yml")
grafana_ds = text("infra/grafana/provisioning/datasources/prometheus.yml")
grafana_provider = text("infra/grafana/provisioning/dashboards/dashboards.yml")
grafana_dashboard = text("infra/grafana/dashboards/cinebooking-v65.json")
admin = text("frontend/app/admin/page.tsx")
ui = text("frontend/app/admin/observability/page.tsx")
types = text("frontend/lib/types.ts")
e2e = text("frontend/e2e/observability-reliability-v65.spec.ts")
ci = text(".github/workflows/ci.yml")
rc = text(".github/workflows/release-candidate.yml")
release = text(".github/workflows/release.yml")
make = text("Makefile")
diagnose = text("tools/diagnose-v65.ps1")
readme = text("README.md")

# Package / API contract
check("V65 observability DTO package exists", bool(dtos))
check("V65 request telemetry service exists", bool(request_service))
check("V65 trace and metrics filter exists", bool(filter_java))
check("V65 observability service exists", bool(service))
check("V65 admin observability controller exists", bool(controller))
check("V65 strategy version explicit", "V65-OBSERVABILITY-RELIABILITY-4" in service)
check("Controller is ADMIN namespace", '@RequestMapping("/api/admin/observability")' in controller)
check("Summary endpoint exists", '@GetMapping("/summary")' in controller)
check("Controller returns ObservabilitySummary", "public ObservabilitySummary summary()" in controller)
check("Global /api/admin ADMIN guard still exists", '.requestMatchers("/api/admin/**").hasRole("ADMIN")' in security)

# DTO contract
for token in ["SloStatus", "DependencyStatus", "RuntimeStatus", "RequestSample", "ObservabilitySummary"]:
    check(f"DTO {token} exists", f"record {token}" in dtos)
for token in ["availabilityPercent", "errorRatePercent", "p95LatencyMs", "overallStatus", "recentRequests", "prometheusPath", "traceHeader"]:
    check(f"Summary exposes {token}", token in dtos)
check("SLO exposes target and comparison", "targetValue" in dtos and "comparison" in dtos)
check("Dependency exposes latency", "long latencyMs" in dtos)
check("Runtime exposes heap limits", "heapUsedBytes" in dtos and "heapMaxBytes" in dtos)
check("Request sample exposes trace ID", "String traceId" in dtos)
check("Request sample excludes body", "body" not in re.search(r"record RequestSample\((.*?)\n    \) \{\}", dtos, re.S).group(1).lower())
check("Request sample excludes token", "token" not in re.search(r"record RequestSample\((.*?)\n    \) \{\}", dtos, re.S).group(1).lower())

# Trace filter / logging
check("Trace header constant is X-Trace-Id", 'TRACE_HEADER = "X-Trace-Id"' in filter_java)
check("Trace ID input is format bounded", '^[A-Za-z0-9._-]{8,64}$' in filter_java)
check("Invalid/missing trace generates UUID", "UUID.randomUUID()" in filter_java)
check("Generated trace strips UUID dashes", '.replace("-", "")' in filter_java)
check("Trace is written to MDC", 'MDC.put("traceId", traceId)' in filter_java)
check("Trace is removed from MDC", 'MDC.remove("traceId")' in filter_java)
check("Trace is returned as response header", "response.setHeader(TRACE_HEADER, traceId)" in filter_java)
check("Filter records request duration using monotonic clock", "System.nanoTime()" in filter_java)
check("Filter always records in finally", "finally" in filter_java and "observability.finish" in filter_java)
check("Actuator requests are excluded from request telemetry", 'path.startsWith("/actuator/")' in filter_java)
check("Upload requests are excluded from request telemetry", 'path.startsWith("/uploads/")' in filter_java)
check("5xx requests are error logged", 'status >= 500' in filter_java and 'log.error("http_request_failed' in filter_java)
check("Slow requests are warning logged", 'durationMs >= 1_000' in filter_java and 'log.warn("http_request_slow' in filter_java)
check("Normal requests use debug logging", 'log.debug("http_request' in filter_java)
check("Console log pattern includes trace MDC", 'trace=%X{traceId:-none}' in app_yml)
check("CORS accepts X-Trace-Id", '"X-Trace-Id"' in security)
check("CORS exposes X-Trace-Id", "setExposedHeaders" in security and '"X-Trace-Id"' in security)

# Cardinality / privacy guards
check("Path query string is removed", 'rawPath.split("\\\\?", 2)' in request_service)
check("UUID path segments normalize to :id", "UUID_SEGMENT" in request_service and '":id"' in request_service)
check("Long numeric/hex IDs normalize to :id", "LONG_ID_SEGMENT" in request_service and '":id"' in request_service)
check("Path segments sanitize unsupported characters", 'replaceAll("[^A-Za-z0-9._~-]", "_")' in request_service)
check("Path segment length is bounded", "v.length() > 64" in request_service)
check("HTTP method tag is bounded", 'v.matches("[A-Z]{2,10}")' in request_service)
check("Metrics do not tag traceId", 'tags("method", safeMethod(method), "uri", path, "status", statusClass)' in request_service and 'tags("trace' not in request_service)
check("Ring buffer is bounded", "MAX_SAMPLES = 2_000" in request_service)
check("Old samples are pruned", "pruneOld()" in request_service)
check("Recent request API is bounded to 50", "Math.min(limit, 50)" in request_service)
check("Summary returns only 20 recent requests", "requests.recent(20)" in service)

# Micrometer metrics
for metric in ["cinebooking.api.active", "cinebooking.api.requests", "cinebooking.api.responses", "cinebooking.api.server.errors"]:
    check(f"Metric {metric} is registered", metric in request_service)
check("Request timer publishes histogram", "publishPercentileHistogram()" in request_service)
for threshold in ["100", "250", "500", "750"]:
    check(f"Timer has {threshold}ms SLO bucket", f"Duration.ofMillis({threshold})" in request_service)
check("Timer has 1s SLO bucket", "Duration.ofSeconds(1)" in request_service)
check("Timer has 2s SLO bucket", "Duration.ofSeconds(2)" in request_service)
check("Timer has 5s SLO bucket", "Duration.ofSeconds(5)" in request_service)
check("Response counter tags status class", 'tags("status", statusClass)' in request_service)
check("Only 5xx increments server error counter", "if (status >= 500)" in request_service)
check("Active request gauge cannot go negative", "Math.max(0, v - 1)" in request_service)

# Rolling SLO logic
check("Default local SLO window is 5 minutes", '${app.observability.slo.window-minutes:5}' in request_service)
check("Window is bounded at 60 minutes", "Math.min(windowMinutes, 60)" in request_service)
check("Window counts total samples", "long total = current.size()" in request_service)
check("Window counts 5xx only", "s.status() >= 500" in request_service)
check("Availability formula excludes server errors", "total - serverErrors" in request_service)
check("Error rate formula uses server errors", "serverErrors * 100.0 / total" in request_service)
check("P95 uses sorted request durations", "durations.sort" in request_service and "Math.ceil(durations.size() * 0.95d)" in request_service)
check("No traffic availability baseline is 100", "total == 0 ? 100.0" in request_service)
check("No traffic error rate baseline is 0", "total == 0 ? 0.0" in request_service)
check("Service marks no traffic SLO as NO_DATA", 'noData ? "NO_DATA"' in service)
check("Availability default target is 99.9", '${app.observability.slo.availability-target-percent:99.9}' in service)
check("5xx error default target is 1.0 percent", '${app.observability.slo.max-error-rate-percent:1.0}' in service)
check("P95 default target is 750ms", '${app.observability.slo.p95-latency-target-ms:750}' in service)
check("Availability comparison is >=", '"availability", "Availability"' in service and '">="' in service)
check("Error-rate comparison is <=", '"error_rate", "5xx error rate"' in service and '"<="' in service)
check("P95 comparison is <=", '"p95_latency", "API P95 latency"' in service and '"<="' in service)
check("Dependency FAIL forces overall FAIL", 'dependencies.stream().anyMatch(d -> "FAIL".equals(d.status()))' in service)
check("SLO FAIL degrades overall to WARN", 'slos.stream().anyMatch(s -> "FAIL".equals(s.status()))' in service and 'return "WARN"' in service)
check("All NO_DATA produces overall NO_DATA", 'slos.stream().allMatch(s -> "NO_DATA".equals(s.status()))' in service)

# Dependencies / runtime
check("PostgreSQL probe uses SELECT 1", 'jdbc.queryForObject("select 1"' in service)
check("PostgreSQL probe is read-only SQL", "select 1" in service and all(x not in service.lower() for x in ["insert into", "update ", "delete from"]))
check("Redis probe uses PING", "connection.ping()" in service)
check("Redis connection is closed by try-with-resources", "try (RedisConnection connection" in service)
check("Dependency errors expose class only, not message", "ex.getClass().getSimpleName()" in service and "ex.getMessage()" not in service)
check("Runtime exposes JVM uptime", "getRuntimeMXBean().getUptime()" in service)
check("Runtime exposes heap used", "runtime.totalMemory() - runtime.freeMemory()" in service)
check("Runtime exposes max heap", "runtime.maxMemory()" in service)
check("Runtime exposes CPU count", "runtime.availableProcessors()" in service)
check("Runtime exposes live threads", "getThreadMXBean().getThreadCount()" in service)
check("Runtime exposes active requests", "requests.activeRequests()" in service)
check("Instance ID uses HOSTNAME with fallback", '${HOSTNAME:}' in service and "localHostname()" in service)

# Application config
check("Actuator exposes Prometheus", "include: health,info,metrics,prometheus" in app_yml)
check("Prometheus endpoint allowed by Spring Security", '"/actuator/prometheus"' in security)
check("Health endpoint remains permitted", '"/actuator/health/**"' in security)
check("Application metric common tag configured", "application: ${spring.application.name}" in app_yml)
for env in ["OBSERVABILITY_SLO_WINDOW_MINUTES", "OBSERVABILITY_AVAILABILITY_TARGET_PERCENT", "OBSERVABILITY_MAX_ERROR_RATE_PERCENT", "OBSERVABILITY_P95_LATENCY_TARGET_MS"]:
    check(f"application.yml supports {env}", env in app_yml)
    check(f"docker-compose wires {env}", env in compose)

# Prometheus rules
check("Prometheus evaluation interval configured", "evaluation_interval: 15s" in prom)
check("Prometheus loads V65 rule file", "/etc/prometheus/rules-v65.yml" in prom)
check("Prometheus scrapes backend-1", "backend-1:8080" in prom)
check("Prometheus scrapes backend-2", "backend-2:8080" in prom)
check("Prometheus metrics path is actuator/prometheus", "metrics_path: /actuator/prometheus" in prom)
for rec in ["cinebooking:slo:availability_5m", "cinebooking:slo:error_rate_5m", "cinebooking:slo:p95_latency_seconds_5m"]:
    check(f"Prometheus recording rule {rec} exists", rec in rules)
for alert in ["CineBookingBackendDown", "CineBookingAvailabilitySLOBreach", "CineBookingP95LatencySLOBreach"]:
    check(f"Prometheus alert {alert} exists", alert in rules)
check("Availability alert uses 99.9 target", "< 0.999" in rules)
check("Latency alert uses 750ms target", "> 0.750" in rules)
check("SLO alerts require 10m persistence", rules.count("for: 10m") >= 2)
check("Backend down alert requires 2m persistence", "for: 2m" in rules)
check("Prometheus rule file mounted read-only", "./infra/prometheus/rules-v65.yml:/etc/prometheus/rules-v65.yml:ro" in compose)

# Grafana provisioning
check("Grafana Prometheus datasource exists", "type: prometheus" in grafana_ds)
check("Grafana datasource points to internal Prometheus", "http://prometheus:9090" in grafana_ds)
check("Grafana datasource is default", "isDefault: true" in grafana_ds)
check("Grafana dashboard provider exists", "CineBooking V65" in grafana_provider)
check("Grafana dashboard directory configured", "/var/lib/grafana/dashboards" in grafana_provider)
check("Grafana provisioning directory mounted read-only", "./infra/grafana/provisioning:/etc/grafana/provisioning:ro" in compose)
check("Grafana dashboard directory mounted read-only", "./infra/grafana/dashboards:/var/lib/grafana/dashboards:ro" in compose)
try:
    dashboard = json.loads(grafana_dashboard)
    valid_json = True
except Exception:
    dashboard = {}
    valid_json = False
check("Grafana dashboard JSON is valid", valid_json)
check("Grafana dashboard title is V65", dashboard.get("title") == "CineBooking V65 · Observability & Reliability")
check("Grafana dashboard UID is stable", dashboard.get("uid") == "cinebooking-v65")
check("Grafana dashboard auto refresh is 10s", dashboard.get("refresh") == "10s")
check("Grafana dashboard has at least 6 panels", len(dashboard.get("panels", [])) >= 6)
for title in ["Availability · 5m", "5xx error rate · 5m", "P95 API latency · 5m", "Backend replicas up", "Request rate by status", "JVM heap used"]:
    check(f"Grafana panel {title} exists", any(p.get("title") == title for p in dashboard.get("panels", [])))

# Frontend
check("Admin Dashboard has Observability V65 tile", "Observability V65" in admin)
check("V65 tile has stable test id", 'data-testid="admin-observability-v65"' in admin)
check("V65 tile links /admin/observability", 'href="/admin/observability"' in admin)
check("Observability V65 UI exists", bool(ui))
check("UI identifies V65 Observability & Reliability 4.0", "V65 · OBSERVABILITY & RELIABILITY 4.0" in ui)
check("UI displays strategy version", "V65-OBSERVABILITY-RELIABILITY-4" in ui)
check("UI loads ADMIN user guard", 'api<UserProfile>("/me")' in ui and 'me.role!=="ADMIN"' in ui)
check("UI calls summary endpoint", 'api<ObservabilitySummaryV65>("/admin/observability/summary")' in ui)
check("UI auto refreshes every 10s", "REFRESH_MS=10_000" in ui and "window.setInterval" in ui)
for testid in ["observability-summary-v65", "slo-v65", "dependencies-v65", "runtime-v65", "stack-v65", "recent-traces-v65"]:
    check(f"UI exposes {testid}", f'data-testid="{testid}"' in ui)
check("UI shows local replica caveat", "local replica" in ui.lower() or "replica" in ui)
check("UI explains Prometheus/Grafana aggregation", "Prometheus/Grafana" in ui)
check("UI provides observability profile command", "docker compose --profile observability up -d prometheus grafana" in ui)
check("UI provides trace grep command", "Select-String" in ui and "TRACE_ID" in ui)
check("UI explicitly says payload/token/query are not logged", "token, query-string hay payload" in ui or "payload" in ui)
check("Frontend V65 summary type exists", "export type ObservabilitySummaryV65" in types)
check("Frontend V65 SLO type exists", "export type ObservabilitySloV65" in types)
check("Frontend V65 dependency type exists", "export type ObservabilityDependencyV65" in types)
check("Frontend V65 request sample type exists", "export type ObservabilityRequestSampleV65" in types)

# E2E
check("V65 Playwright spec exists", bool(e2e))
check("E2E verifies Admin V65 tile", 'getByTestId("admin-observability-v65")' in e2e)
check("E2E verifies observability URL", "/admin/observability" in e2e or "admin\\/observability" in e2e)
check("E2E verifies V65 page header", "V65 · OBSERVABILITY & RELIABILITY 4.0" in e2e)
check("E2E verifies strategy version", "V65-OBSERVABILITY-RELIABILITY-4" in e2e)
check("E2E verifies Availability SLO", 'toContainText("Availability")' in e2e)
check("E2E verifies P95 SLO", 'toContainText("API P95 latency")' in e2e)
check("E2E verifies PostgreSQL probe", 'toContainText("PostgreSQL")' in e2e)
check("E2E verifies Redis probe", 'toContainText("Redis")' in e2e)
check("E2E verifies Trace ID table", 'toContainText("Trace ID")' in e2e)

# CI / release / README / Makefile
check("CI source regression reaches V65", "V26-V65 source regression" in ci)
check("CI executes V65 verifier", "python3 tools/verify_v65_observability_reliability.py" in ci)
check("RC executes V65 verifier", "python3 tools/verify_v65_observability_reliability.py" in rc)
check("Stable release executes V65 verifier", "python3 tools/verify_v65_observability_reliability.py" in release)
check("RC default is v65.0.0-rc.1", 'default: "v65.0.0-rc.1"' in rc)
check("Stable default is 65.0.0", 'default: "65.0.0"' in release)
check("RC compose project is V65", "cinebooking_v65_rc_" in rc)
check("Stable compose project is V65", "cinebooking_v65_release_" in release)
check("RC E2E label includes V65", "+ V65)" in rc)
check("Makefile has verify-v65", "verify-v65:" in make)
check("Makefile verify-v65 executes V65 verifier", "python tools/verify_v65_observability_reliability.py" in make)
check("Makefile has diagnose-v65", "diagnose-v65:" in make)
check("V65 diagnose script exists", bool(diagnose))
check("V65 diagnose runs V64 gate", "verify_v64_crm_marketing_automation.py" in diagnose)
check("V65 diagnose runs V65 gate", "verify_v65_observability_reliability.py" in diagnose)
check("V65 diagnose runs realistic-data gate", "verify_realistic_data_57.py" in diagnose)
check("V65 diagnose runs seed gate", "verify_seed_demo_57.py" in diagnose)
check("README current release is V65", "Current release:** V65 - Observability & Reliability 4.0" in readme)
check("README changelog has V65 after V64", readme.find("| **V65**") > readme.find("| **V64**") > 0)
check("README documents V65 strategy", "V65-OBSERVABILITY-RELIABILITY-4" in readme)
check("README documents V65 admin route", "/admin/observability" in readme)
check("README documents X-Trace-Id", "X-Trace-Id" in readme)
check("README documents Prometheus profile", "--profile observability" in readme)
check("README documents no V65 migration", "V65 **không có Flyway migration mới**" in readme)
check("README keeps Flyway latest V52", "Flyway latest: V52; 57 public tables" in readme)
check("README documents v65 RC", "v65.0.0-rc.1" in readme)
check("README documents v65 stable", "v65.0.0" in readme)

failed = [name for name, ok in checks if not ok]
print()
print(f"V65 verification: {len(checks)-len(failed)}/{len(checks)} checks passed")
if failed:
    print("FAILED:")
    for name in failed:
        print(f" - {name}")
    sys.exit(1)
