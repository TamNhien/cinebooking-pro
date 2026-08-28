package com.cinebooking.observability;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.connection.RedisConnection;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.lang.management.ManagementFactory;
import java.net.InetAddress;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import static com.cinebooking.observability.ObservabilityDtos.*;

@Service
public class ObservabilityService {
    public static final String STRATEGY_VERSION = "V65-OBSERVABILITY-RELIABILITY-4";

    private final RequestObservabilityService requests;
    private final JdbcTemplate jdbc;
    private final StringRedisTemplate redis;
    private final double availabilityTarget;
    private final double maxErrorRatePercent;
    private final long p95LatencyTargetMs;
    private final String instanceId;

    public ObservabilityService(
            RequestObservabilityService requests,
            JdbcTemplate jdbc,
            StringRedisTemplate redis,
            @Value("${app.observability.slo.availability-target-percent:99.9}") double availabilityTarget,
            @Value("${app.observability.slo.max-error-rate-percent:1.0}") double maxErrorRatePercent,
            @Value("${app.observability.slo.p95-latency-target-ms:750}") long p95LatencyTargetMs,
            @Value("${HOSTNAME:}") String hostname
    ) {
        this.requests = requests;
        this.jdbc = jdbc;
        this.redis = redis;
        this.availabilityTarget = clamp(availabilityTarget, 90.0, 100.0);
        this.maxErrorRatePercent = clamp(maxErrorRatePercent, 0.0, 20.0);
        this.p95LatencyTargetMs = Math.max(50, Math.min(p95LatencyTargetMs, 30_000));
        this.instanceId = hostname == null || hostname.isBlank() ? localHostname() : hostname;
    }

    public ObservabilitySummary summary() {
        RequestObservabilityService.WindowSnapshot window = requests.snapshot();
        List<DependencyStatus> dependencies = List.of(databaseStatus(), redisStatus());
        List<SloStatus> slos = sloStatus(window);
        String overall = overallStatus(dependencies, slos);

        Runtime runtime = java.lang.Runtime.getRuntime();
        RuntimeStatus runtimeStatus = new RuntimeStatus(
                Math.max(0, ManagementFactory.getRuntimeMXBean().getUptime() / 1000L),
                runtime.totalMemory() - runtime.freeMemory(),
                runtime.maxMemory(),
                runtime.availableProcessors(),
                ManagementFactory.getThreadMXBean().getThreadCount(),
                requests.activeRequests()
        );

        return new ObservabilitySummary(
                STRATEGY_VERSION,
                instanceId,
                Instant.now(),
                requests.windowMinutes(),
                window.total(),
                window.serverErrors(),
                window.availabilityPercent(),
                window.errorRatePercent(),
                window.p95LatencyMs(),
                overall,
                runtimeStatus,
                slos,
                dependencies,
                requests.recent(20),
                "/actuator/prometheus",
                TraceAndMetricsFilter.TRACE_HEADER,
                "docker compose --profile observability up -d prometheus grafana · Grafana http://localhost:3001"
        );
    }

    private List<SloStatus> sloStatus(RequestObservabilityService.WindowSnapshot window) {
        List<SloStatus> result = new ArrayList<>();
        boolean noData = window.total() == 0;
        result.add(new SloStatus(
                "availability", "Availability", noData ? "NO_DATA" : (window.availabilityPercent() >= availabilityTarget ? "PASS" : "FAIL"),
                window.availabilityPercent(), availabilityTarget, "%", ">=", window.total()));
        result.add(new SloStatus(
                "error_rate", "5xx error rate", noData ? "NO_DATA" : (window.errorRatePercent() <= maxErrorRatePercent ? "PASS" : "FAIL"),
                window.errorRatePercent(), maxErrorRatePercent, "%", "<=", window.total()));
        result.add(new SloStatus(
                "p95_latency", "API P95 latency", noData ? "NO_DATA" : (window.p95LatencyMs() <= p95LatencyTargetMs ? "PASS" : "FAIL"),
                window.p95LatencyMs(), p95LatencyTargetMs, "ms", "<=", window.total()));
        return result;
    }

    private DependencyStatus databaseStatus() {
        long started = System.nanoTime();
        try {
            Integer value = jdbc.queryForObject("select 1", Integer.class);
            return new DependencyStatus("PostgreSQL", value != null && value == 1 ? "PASS" : "FAIL", elapsedMs(started), "SELECT 1");
        } catch (Exception ex) {
            return new DependencyStatus("PostgreSQL", "FAIL", elapsedMs(started), safeFailure(ex));
        }
    }

    private DependencyStatus redisStatus() {
        long started = System.nanoTime();
        try (RedisConnection connection = redis.getConnectionFactory().getConnection()) {
            String pong = connection.ping();
            return new DependencyStatus("Redis", "PONG".equalsIgnoreCase(pong) ? "PASS" : "FAIL", elapsedMs(started), pong == null ? "PING no response" : "PING " + pong);
        } catch (Exception ex) {
            return new DependencyStatus("Redis", "FAIL", elapsedMs(started), safeFailure(ex));
        }
    }

    private String overallStatus(List<DependencyStatus> dependencies, List<SloStatus> slos) {
        if (dependencies.stream().anyMatch(d -> "FAIL".equals(d.status()))) return "FAIL";
        if (slos.stream().anyMatch(s -> "FAIL".equals(s.status()))) return "WARN";
        if (slos.stream().allMatch(s -> "NO_DATA".equals(s.status()))) return "NO_DATA";
        return "PASS";
    }

    private String safeFailure(Exception ex) {
        String simple = ex.getClass().getSimpleName();
        return simple == null || simple.isBlank() ? "Dependency check failed" : simple;
    }

    private long elapsedMs(long started) {
        return Math.max(0, (System.nanoTime() - started) / 1_000_000L);
    }

    private static double clamp(double value, double min, double max) {
        return Math.max(min, Math.min(max, value));
    }

    private String localHostname() {
        try { return InetAddress.getLocalHost().getHostName(); }
        catch (Exception ignored) { return "local-replica"; }
    }
}
