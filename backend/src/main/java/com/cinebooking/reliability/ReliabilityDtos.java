package com.cinebooking.reliability;

import java.time.Instant;
import java.util.List;

public final class ReliabilityDtos {
    private ReliabilityDtos() {}

    public record BurnRateWindow(
            String code,
            int windowMinutes,
            long requests,
            long serverErrors,
            double availabilityPercent,
            double errorRatePercent,
            double allowedErrorPercent,
            double burnRate,
            double alertThreshold,
            boolean sampleBufferTruncated,
            String status
    ) {}

    public record ReliabilityIncident(
            String id,
            String source,
            String severity,
            String status,
            String title,
            String detail,
            Instant occurredAt,
            String href,
            String evidenceRef
    ) {}

    public record RunbookStep(
            int order,
            String code,
            String title,
            String objective,
            String command,
            String safety
    ) {}

    public record ReliabilitySummary(
            String strategyVersion,
            Instant generatedAt,
            String posture,
            double availabilityTargetPercent,
            double errorBudgetPercent,
            BurnRateWindow fastWindow,
            BurnRateWindow slowWindow,
            boolean multiWindowBurnAlert,
            String burnAlertSeverity,
            long openIncidents,
            long criticalOpenIncidents,
            String dependencyStatus,
            String disasterRecoveryReadiness,
            boolean failoverAutomationRequiresExplicitExecute,
            List<String> evidencePolicy
    ) {}
}
