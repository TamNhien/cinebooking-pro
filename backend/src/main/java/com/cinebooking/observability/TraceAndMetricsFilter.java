package com.cinebooking.observability;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;
import java.util.regex.Pattern;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 20)
public class TraceAndMetricsFilter extends OncePerRequestFilter {
    public static final String TRACE_HEADER = "X-Trace-Id";
    private static final Pattern SAFE_TRACE = Pattern.compile("^[A-Za-z0-9._-]{8,64}$");
    private static final Logger log = LoggerFactory.getLogger(TraceAndMetricsFilter.class);

    private final RequestObservabilityService observability;

    public TraceAndMetricsFilter(RequestObservabilityService observability) {
        this.observability = observability;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return path.startsWith("/actuator/") || path.startsWith("/uploads/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String traceId = traceId(request.getHeader(TRACE_HEADER));
        long started = System.nanoTime();
        observability.begin();
        MDC.put("traceId", traceId);
        response.setHeader(TRACE_HEADER, traceId);
        try {
            filterChain.doFilter(request, response);
        } finally {
            long durationMs = Math.max(0, (System.nanoTime() - started) / 1_000_000L);
            int status = response.getStatus();
            observability.finish(request.getMethod(), request.getRequestURI(), status, durationMs, traceId);
            if (status >= 500) {
                log.error("http_request_failed method={} path={} status={} durationMs={}", request.getMethod(), RequestObservabilityService.normalizePath(request.getRequestURI()), status, durationMs);
            } else if (durationMs >= 1_000) {
                log.warn("http_request_slow method={} path={} status={} durationMs={}", request.getMethod(), RequestObservabilityService.normalizePath(request.getRequestURI()), status, durationMs);
            } else {
                log.debug("http_request method={} path={} status={} durationMs={}", request.getMethod(), RequestObservabilityService.normalizePath(request.getRequestURI()), status, durationMs);
            }
            MDC.remove("traceId");
        }
    }

    private String traceId(String incoming) {
        if (incoming != null && SAFE_TRACE.matcher(incoming).matches()) return incoming;
        return UUID.randomUUID().toString().replace("-", "");
    }
}
