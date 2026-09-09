package com.cinebooking.keygovernance;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class KeyGovernanceDtos {
    private KeyGovernanceDtos(){}

    public record SecretRotationPolicy(
            UUID id,
            String policyKey,
            String secretName,
            String secretClass,
            String ownerTeam,
            int rotationDays,
            boolean enabled,
            boolean autoRotationEnabled,
            String requiredWhen,
            String note,
            boolean configured,
            Instant lastRotatedAt,
            Instant nextRotationDueAt,
            String rotationStatus){}

    public record SecretRotationEvent(
            UUID id,
            String eventKey,
            String policyKey,
            String eventType,
            String actorEmail,
            String providerRef,
            String keyFingerprint,
            String note,
            Instant occurredAt,
            Instant recordedAt){}

    public record KeyGovernanceSummary(
            String strategyVersion,
            Instant generatedAt,
            int warningDays,
            boolean autoRotationExecutionEnabled,
            boolean dryRunOnly,
            long enabledPolicyCount,
            long configuredSecretCount,
            long noEvidenceCount,
            long dueSoonCount,
            long overdueCount,
            String posture,
            List<String> storagePolicy,
            SecretRotationEvent latestEvent){}

    public record RecordSecretRotationEventRequest(
            String policyKey,
            String eventType,
            String providerRef,
            String keyFingerprint,
            String note,
            Instant occurredAt){}
}
