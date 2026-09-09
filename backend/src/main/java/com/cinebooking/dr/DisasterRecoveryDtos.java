package com.cinebooking.dr;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class DisasterRecoveryDtos {
    private DisasterRecoveryDtos(){}

    public record BackupEvidence(
            UUID id,
            String backupKey,
            String storageName,
            String checksumSha256,
            long sizeBytes,
            int latestFlywayVersion,
            int publicTableCount,
            String sourceCommit,
            String strategyVersion,
            Instant createdAt,
            Instant verifiedAt,
            Instant retentionUntil,
            Instant recordedAt){}

    public record RestoreDrillEvidence(
            UUID id,
            String drillKey,
            UUID backupId,
            String status,
            Instant startedAt,
            Instant completedAt,
            Double restoreDurationSeconds,
            Long rpoSeconds,
            Integer restoredFlywayVersion,
            Integer restoredPublicTableCount,
            boolean checksumVerified,
            boolean criticalCatalogVerified,
            String message,
            Instant recordedAt){}

    public record DisasterRecoverySummary(
            String strategyVersion,
            Instant evaluatedAt,
            String readiness,
            long rpoTargetMinutes,
            long rtoTargetMinutes,
            long backupRetentionDays,
            long drillMaxAgeHours,
            long verifiedBackupCount,
            long successfulDrillCount,
            Long latestBackupAgeMinutes,
            Long latestDrillAgeHours,
            boolean backupFresh,
            boolean drillFresh,
            boolean rtoMet,
            boolean immutableEvidence,
            BackupEvidence latestBackup,
            RestoreDrillEvidence latestSuccessfulDrill,
            List<String> criticalCatalog){}
}
