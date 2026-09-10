package com.cinebooking.reliability;

import com.cinebooking.audit.AuditLogRepository;
import com.cinebooking.domain.AuditLog;
import com.cinebooking.domain.StaffIncident;
import com.cinebooking.dr.DisasterRecoveryDtos.DisasterRecoverySummary;
import com.cinebooking.dr.DisasterRecoveryService;
import com.cinebooking.observability.ObservabilityDtos.ObservabilitySummary;
import com.cinebooking.observability.ObservabilityService;
import com.cinebooking.observability.RequestObservabilityService;
import com.cinebooking.staffops.StaffIncidentRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

import static com.cinebooking.reliability.ReliabilityDtos.*;

@Service
public class ReliabilityService {
    public static final String STRATEGY_VERSION = "V74-RELIABILITY-RESILIENCE-5";
    private static final List<String> EVIDENCE_POLICY = List.of(
            "NO_SYNTHETIC_INCIDENTS",
            "RUNTIME_5XX_IS_EPHEMERAL",
            "STAFF_INCIDENTS_AND_AUDIT_ARE_DURABLE",
            "FAILOVER_EXERCISE_IS_OPT_IN",
            "NO_DATABASE_VOLUME_DELETION"
    );

    private final RequestObservabilityService requests;
    private final ObservabilityService observability;
    private final DisasterRecoveryService disasterRecovery;
    private final StaffIncidentRepository staffIncidents;
    private final AuditLogRepository auditLogs;
    private final double availabilityTargetPercent;
    private final int fastWindowMinutes;
    private final int slowWindowMinutes;
    private final double fastBurnThreshold;
    private final double slowBurnThreshold;
    private final int incidentLookbackHours;

    public ReliabilityService(
            RequestObservabilityService requests,
            ObservabilityService observability,
            DisasterRecoveryService disasterRecovery,
            StaffIncidentRepository staffIncidents,
            AuditLogRepository auditLogs,
            @Value("${app.reliability.availability-target-percent:99.9}") double availabilityTargetPercent,
            @Value("${app.reliability.fast-window-minutes:5}") int fastWindowMinutes,
            @Value("${app.reliability.slow-window-minutes:60}") int slowWindowMinutes,
            @Value("${app.reliability.fast-burn-threshold:14.4}") double fastBurnThreshold,
            @Value("${app.reliability.slow-burn-threshold:6.0}") double slowBurnThreshold,
            @Value("${app.reliability.incident-lookback-hours:24}") int incidentLookbackHours
    ) {
        this.requests = requests;
        this.observability = observability;
        this.disasterRecovery = disasterRecovery;
        this.staffIncidents = staffIncidents;
        this.auditLogs = auditLogs;
        this.availabilityTargetPercent = clamp(availabilityTargetPercent, 90.0, 99.999);
        this.fastWindowMinutes = bound(fastWindowMinutes, 1, 30);
        this.slowWindowMinutes = Math.max(this.fastWindowMinutes, bound(slowWindowMinutes, 5, 120));
        this.fastBurnThreshold = clamp(fastBurnThreshold, 1.0, 1000.0);
        this.slowBurnThreshold = clamp(slowBurnThreshold, 1.0, 1000.0);
        this.incidentLookbackHours = bound(incidentLookbackHours, 1, 168);
    }

    public ReliabilitySummary summary() {
        double errorBudgetPercent = round3(Math.max(0.001, 100.0 - availabilityTargetPercent));
        BurnRateWindow fast = burnWindow("FAST", fastWindowMinutes, fastBurnThreshold, errorBudgetPercent);
        BurnRateWindow slow = burnWindow("SLOW", slowWindowMinutes, slowBurnThreshold, errorBudgetPercent);
        ObservabilitySummary obs = observability.summary();
        DisasterRecoverySummary dr = disasterRecovery.summary();
        long open = staffIncidents.countByStatus("OPEN");
        long criticalOpen = staffIncidents.countByStatusAndSeverity("OPEN", "CRITICAL");
        boolean dependencyFailure = obs.dependencies().stream().anyMatch(d -> "FAIL".equals(d.status()));
        boolean multiWindow = exceeds(fast) && exceeds(slow);
        String alertSeverity = multiWindow ? "CRITICAL" : (exceeds(fast) || exceeds(slow) ? "HIGH" : "NONE");
        String posture = posture(fast, slow, dependencyFailure, criticalOpen, dr.readiness());
        return new ReliabilitySummary(
                STRATEGY_VERSION,
                Instant.now(),
                posture,
                availabilityTargetPercent,
                errorBudgetPercent,
                fast,
                slow,
                multiWindow,
                alertSeverity,
                open,
                criticalOpen,
                dependencyFailure ? "DEGRADED" : "HEALTHY",
                dr.readiness(),
                true,
                EVIDENCE_POLICY
        );
    }

    public List<ReliabilityIncident> incidents(int requestedLimit) {
        int limit = bound(requestedLimit, 1, 100);
        Instant cutoff = Instant.now().minus(Duration.ofHours(incidentLookbackHours));
        List<ReliabilityIncident> out = new ArrayList<>();

        for (StaffIncident incident : staffIncidents.findTop100ByOrderByCreatedAtDesc()) {
            if (incident.getCreatedAt() == null || incident.getCreatedAt().isBefore(cutoff)) continue;
            out.add(new ReliabilityIncident(
                    incident.getId().toString(),
                    "STAFF_INCIDENT",
                    safeSeverity(incident.getSeverity()),
                    incident.getStatus(),
                    incident.getTitle(),
                    truncate(incident.getDescription(), 280),
                    incident.getCreatedAt(),
                    "/staff/operations",
                    "staff_incident:" + incident.getId()
            ));
        }

        for (AuditLog log : auditLogs.findTop200ByOrderByCreatedAtDesc()) {
            if (log.getCreatedAt() == null || log.getCreatedAt().isBefore(cutoff)) continue;
            if ("STAFF_INCIDENT".equals(log.getEntityType()) || !isReliabilityAudit(log.getAction())) continue;
            out.add(new ReliabilityIncident(
                    log.getId().toString(),
                    "AUDIT_LOG",
                    auditSeverity(log.getAction()),
                    "RECORDED",
                    log.getAction(),
                    truncate(log.getDetails(), 280),
                    log.getCreatedAt(),
                    auditHref(log.getAction()),
                    "audit_log:" + log.getId()
            ));
        }

        requests.recent(50).stream()
                .filter(sample -> sample.status() >= 500)
                .filter(sample -> !sample.at().isBefore(cutoff))
                .forEach(sample -> out.add(new ReliabilityIncident(
                        sample.traceId() == null || sample.traceId().isBlank() ? sample.at().toString() : sample.traceId(),
                        "RUNTIME_5XX",
                        sample.status() >= 503 ? "CRITICAL" : "HIGH",
                        "EPHEMERAL",
                        sample.method() + " " + sample.path() + " -> " + sample.status(),
                        "Replica-local request sample · " + sample.durationMs() + " ms",
                        sample.at(),
                        "/admin/observability",
                        sample.traceId() == null || sample.traceId().isBlank() ? "runtime:untraced" : "trace:" + sample.traceId()
                )));

        return out.stream()
                .sorted(Comparator.comparing(ReliabilityIncident::occurredAt).reversed())
                .limit(limit)
                .toList();
    }

    public List<RunbookStep> runbook() {
        return List.of(
                new RunbookStep(1, "DETECT", "Phát hiện", "Xác nhận burn-rate, dependency và incident đang mở.", "Mở /admin/reliability", "Read-only"),
                new RunbookStep(2, "TRIAGE", "Khoanh vùng", "Dùng trace, SLO và dependency probes để xác định replica/domain lỗi.", "Mở /admin/observability", "Read-only"),
                new RunbookStep(3, "STABILIZE", "Ổn định", "Kiểm tra cả hai backend replica và hạ tầng trước khi failover.", "docker compose -f docker-compose.yml -f docker-compose.https.yml ps", "Không xóa volume"),
                new RunbookStep(4, "FAILOVER", "Failover có kiểm soát", "Dừng đúng một backend replica, xác nhận nginx vẫn phục vụ request, sau đó khôi phục replica.", "powershell -ExecutionPolicy Bypass -File .\\tools\\failover-drill-v74.ps1 -Execute", "Bắt buộc -Execute; luôn restart target trong finally"),
                new RunbookStep(5, "RECOVER", "Khôi phục dữ liệu", "Nếu sự cố liên quan dữ liệu, dùng restore drill trên database tạm trước khi quyết định recovery.", "powershell -ExecutionPolicy Bypass -File .\\tools\\dr-restore-drill-v69.ps1 -BackupFile <backup.dump>", "Không restore đè live DB"),
                new RunbookStep(6, "VERIFY", "Xác minh", "Chạy regression, lint và browser journey sau khi hệ thống ổn định.", "python -X utf8 .\\tools\\verify_v74_reliability_resilience_5.py", "Không bỏ qua gate"),
                new RunbookStep(7, "CLOSE", "Đóng sự cố", "Đối chiếu incident timeline, audit evidence và DR evidence trước khi kết thúc.", "Mở /admin/reliability và /admin/audit", "Giữ bằng chứng, không chỉnh sửa lịch sử")
        );
    }

    private BurnRateWindow burnWindow(String code, int minutes, double threshold, double errorBudgetPercent) {
        RequestObservabilityService.WindowSnapshot snapshot = requests.snapshot(minutes);
        double burnRate = snapshot.total() == 0 ? 0.0 : round3(snapshot.errorRatePercent() / errorBudgetPercent);
        String status = snapshot.total() == 0 ? "NO_DATA"
                : snapshot.sampleBufferTruncated() ? "PARTIAL"
                : burnRate >= threshold ? "ALERT"
                : burnRate >= threshold / 2.0 ? "WATCH"
                : "HEALTHY";
        return new BurnRateWindow(
                code,
                minutes,
                snapshot.total(),
                snapshot.serverErrors(),
                snapshot.availabilityPercent(),
                snapshot.errorRatePercent(),
                errorBudgetPercent,
                burnRate,
                threshold,
                snapshot.sampleBufferTruncated(),
                status
        );
    }

    private boolean exceeds(BurnRateWindow window) {
        return window.requests() > 0 && window.burnRate() >= window.alertThreshold();
    }

    private String posture(BurnRateWindow fast, BurnRateWindow slow, boolean dependencyFailure, long criticalOpen, String drReadiness) {
        if (dependencyFailure || criticalOpen > 0 || (exceeds(fast) && exceeds(slow))) return "ACTION_REQUIRED";
        if (exceeds(fast) || exceeds(slow) || fast.sampleBufferTruncated() || slow.sampleBufferTruncated() || "DEGRADED".equals(drReadiness)) return "WATCH";
        if (fast.requests() == 0 && slow.requests() == 0) return "NO_DATA";
        if ("NO_DATA".equals(drReadiness)) return "WATCH";
        return "HEALTHY";
    }

    private boolean isReliabilityAudit(String action) {
        if (action == null) return false;
        String value = action.toUpperCase(Locale.ROOT);
        return value.startsWith("OPS_ALERT_")
                || value.startsWith("PAYMENT_RECONCILE")
                || value.startsWith("PAYMENT_RECOVERY")
                || value.startsWith("SYSTEM_RECOVERY")
                || value.startsWith("SECURITY_")
                || value.contains("FAILOVER")
                || value.contains("INCIDENT");
    }

    private String auditSeverity(String action) {
        String value = action == null ? "" : action.toUpperCase(Locale.ROOT);
        if (value.contains("CRITICAL") || value.contains("FAILOVER") || value.contains("RECOVERY_FAILED")) return "CRITICAL";
        if (value.contains("FAIL") || value.contains("ERROR") || value.contains("INCIDENT")) return "HIGH";
        return "MEDIUM";
    }

    private String auditHref(String action) {
        String value = action == null ? "" : action.toUpperCase(Locale.ROOT);
        if (value.startsWith("PAYMENT_")) return "/admin/payment-resilience";
        if (value.startsWith("SECURITY_")) return "/admin/security";
        return "/admin/operations-control";
    }

    private String safeSeverity(String value) {
        if (value == null) return "MEDIUM";
        String normalized = value.toUpperCase(Locale.ROOT);
        return List.of("LOW", "MEDIUM", "HIGH", "CRITICAL").contains(normalized) ? normalized : "MEDIUM";
    }

    private String truncate(String value, int max) {
        if (value == null || value.isBlank()) return "-";
        String clean = value.replaceAll("[\\r\\n\\t]+", " ").trim();
        return clean.length() <= max ? clean : clean.substring(0, max - 1) + "…";
    }

    private static int bound(int value, int min, int max) { return Math.max(min, Math.min(max, value)); }
    private static double clamp(double value, double min, double max) { return Math.max(min, Math.min(max, value)); }
    private static double round3(double value) { return Math.round(value * 1000.0) / 1000.0; }
}
