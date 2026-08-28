package com.cinebooking.observability;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ConcurrentLinkedDeque;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.regex.Pattern;

@Service
public class RequestObservabilityService {
    private static final int MAX_SAMPLES = 2_000;
    private static final Pattern UUID_SEGMENT = Pattern.compile("(?i)^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$");
    private static final Pattern LONG_ID_SEGMENT = Pattern.compile("^[A-Za-z0-9._~-]{24,}$");

    private final MeterRegistry registry;
    private final ConcurrentLinkedDeque<ObservabilityDtos.RequestSample> samples = new ConcurrentLinkedDeque<>();
    private final AtomicInteger activeRequests = new AtomicInteger();
    private final int windowMinutes;

    public RequestObservabilityService(
            MeterRegistry registry,
            @Value("${app.observability.slo.window-minutes:5}") int windowMinutes
    ) {
        this.registry = registry;
        this.windowMinutes = Math.max(1, Math.min(windowMinutes, 60));
        Gauge.builder("cinebooking.api.active", activeRequests, AtomicInteger::doubleValue)
                .description("Active HTTP requests handled by this CineBooking replica")
                .register(registry);
    }

    public void begin() {
        activeRequests.incrementAndGet();
    }

    public void finish(String method, String rawPath, int status, long durationMs, String traceId) {
        activeRequests.updateAndGet(v -> Math.max(0, v - 1));
        String path = normalizePath(rawPath);
        String statusClass = Math.max(1, status / 100) + "xx";

        Timer.builder("cinebooking.api.requests")
                .description("CineBooking API request duration")
                .tags("method", safeMethod(method), "uri", path, "status", statusClass)
                .publishPercentileHistogram()
                .serviceLevelObjectives(
                        Duration.ofMillis(100), Duration.ofMillis(250), Duration.ofMillis(500),
                        Duration.ofMillis(750), Duration.ofSeconds(1), Duration.ofSeconds(2), Duration.ofSeconds(5))
                .register(registry)
                .record(Math.max(0, durationMs), TimeUnit.MILLISECONDS);

        Counter.builder("cinebooking.api.responses")
                .description("CineBooking API response count")
                .tags("status", statusClass)
                .register(registry)
                .increment();

        if (status >= 500) {
            Counter.builder("cinebooking.api.server.errors")
                    .description("CineBooking API 5xx response count")
                    .register(registry)
                    .increment();
        }

        samples.addFirst(new ObservabilityDtos.RequestSample(
                Instant.now(), safeMethod(method), path, status, Math.max(0, durationMs), traceId));
        while (samples.size() > MAX_SAMPLES) samples.pollLast();
        pruneOld();
    }

    public WindowSnapshot snapshot() {
        pruneOld();
        Instant cutoff = Instant.now().minus(Duration.ofMinutes(windowMinutes));
        List<ObservabilityDtos.RequestSample> current = samples.stream()
                .filter(s -> !s.at().isBefore(cutoff))
                .toList();
        long total = current.size();
        long serverErrors = current.stream().filter(s -> s.status() >= 500).count();
        double availability = total == 0 ? 100.0 : ((double) (total - serverErrors) * 100.0 / total);
        double errorRate = total == 0 ? 0.0 : ((double) serverErrors * 100.0 / total);
        long p95 = percentile95(current);
        return new WindowSnapshot(total, serverErrors, round3(availability), round3(errorRate), p95);
    }

    public List<ObservabilityDtos.RequestSample> recent(int limit) {
        int bounded = Math.max(1, Math.min(limit, 50));
        return samples.stream().limit(bounded).toList();
    }

    public int activeRequests() {
        return activeRequests.get();
    }

    public int windowMinutes() {
        return windowMinutes;
    }

    private void pruneOld() {
        Instant cutoff = Instant.now().minus(Duration.ofMinutes(Math.max(windowMinutes * 3L, 30L)));
        while (true) {
            ObservabilityDtos.RequestSample last = samples.peekLast();
            if (last == null || !last.at().isBefore(cutoff)) break;
            samples.pollLast();
        }
    }

    private long percentile95(List<ObservabilityDtos.RequestSample> current) {
        if (current.isEmpty()) return 0;
        List<Long> durations = new ArrayList<>(current.stream().map(ObservabilityDtos.RequestSample::durationMs).toList());
        durations.sort(Comparator.naturalOrder());
        int index = (int) Math.ceil(durations.size() * 0.95d) - 1;
        return durations.get(Math.max(0, Math.min(index, durations.size() - 1)));
    }

    static String normalizePath(String rawPath) {
        if (rawPath == null || rawPath.isBlank()) return "/";
        String noQuery = rawPath.split("\\?", 2)[0];
        String[] parts = noQuery.split("/");
        StringBuilder out = new StringBuilder();
        for (String part : parts) {
            if (part.isBlank()) continue;
            out.append('/');
            out.append(UUID_SEGMENT.matcher(part).matches() || LONG_ID_SEGMENT.matcher(part).matches() ? ":id" : sanitizeSegment(part));
        }
        return out.isEmpty() ? "/" : out.toString();
    }

    private static String sanitizeSegment(String value) {
        String v = value.replaceAll("[^A-Za-z0-9._~-]", "_");
        return v.length() > 64 ? v.substring(0, 64) : v;
    }

    private String safeMethod(String method) {
        if (method == null) return "UNKNOWN";
        String v = method.toUpperCase(Locale.ROOT);
        return v.matches("[A-Z]{2,10}") ? v : "OTHER";
    }

    private double round3(double value) {
        return Math.round(value * 1000.0) / 1000.0;
    }

    public record WindowSnapshot(
            long total,
            long serverErrors,
            double availabilityPercent,
            double errorRatePercent,
            long p95LatencyMs
    ) {}
}
