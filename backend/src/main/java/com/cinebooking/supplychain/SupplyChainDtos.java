package com.cinebooking.supplychain;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class SupplyChainDtos {
    private SupplyChainDtos(){}

    public record SoftwareArtifactEvidence(
            UUID id,
            String artifactKey,
            String artifactType,
            String versionLabel,
            String sha256,
            String sourceCommit,
            String buildRef,
            String sbomRef,
            String actorEmail,
            String note,
            Instant artifactCreatedAt,
            Instant recordedAt){}

    public record SoftwareSupplyChainScan(
            UUID id,
            String scanKey,
            String artifactKey,
            String artifactType,
            String scanner,
            String scannerVersion,
            String reportFingerprint,
            int criticalCount,
            int highCount,
            int mediumCount,
            int lowCount,
            String decision,
            String actorEmail,
            String note,
            Instant scannedAt,
            Instant recordedAt){}

    public record SupplyChainSummary(
            String strategyVersion,
            Instant generatedAt,
            int evidenceMaxAgeHours,
            int maxCritical,
            int maxHigh,
            boolean releaseGateEnforcementEnabled,
            boolean advisoryOnly,
            long artifactCount,
            long scanCount,
            long failedScanCount,
            long warningScanCount,
            boolean latestEvidenceFresh,
            String posture,
            List<String> evidencePolicy,
            SoftwareArtifactEvidence latestArtifact,
            SoftwareSupplyChainScan latestScan){}

    public record RecordArtifactEvidenceRequest(
            String artifactType,
            String versionLabel,
            String sha256,
            String sourceCommit,
            String buildRef,
            String sbomRef,
            String note,
            Instant artifactCreatedAt){}

    public record RecordSupplyChainScanRequest(
            UUID artifactId,
            String scanner,
            String scannerVersion,
            String reportFingerprint,
            int criticalCount,
            int highCount,
            int mediumCount,
            int lowCount,
            String note,
            Instant scannedAt){}
}
