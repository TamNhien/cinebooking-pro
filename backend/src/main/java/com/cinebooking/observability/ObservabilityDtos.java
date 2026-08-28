package com.cinebooking.observability;

import java.time.Instant;
import java.util.List;

public final class ObservabilityDtos {
    private ObservabilityDtos() {}

    public record SloStatus(
            String code,
            String label,
            String status,
            double currentValue,
            double targetValue,
            String unit,
            String comparison,
            long sampleCount
    ) {}

    public record DependencyStatus(
            String name,
            String status,
            long latencyMs,
            String detail
    ) {}

    public record RuntimeStatus(
            long uptimeSeconds,
            long heapUsedBytes,
            long heapMaxBytes,
            int availableProcessors,
            int liveThreads,
            int activeRequests
    ) {}

    public record RequestSample(
            Instant at,
            String method,
            String path,
            int status,
            long durationMs,
            String traceId
    ) {}

    public record ObservabilitySummary(
            String strategyVersion,
            String instanceId,
            Instant generatedAt,
            int windowMinutes,
            long requestsInWindow,
            long serverErrorsInWindow,
            double availabilityPercent,
            double errorRatePercent,
            long p95LatencyMs,
            String overallStatus,
            RuntimeStatus runtime,
            List<SloStatus> slos,
            List<DependencyStatus> dependencies,
            List<RequestSample> recentRequests,
            String prometheusPath,
            String traceHeader,
            String grafanaHint
    ) {}
}
