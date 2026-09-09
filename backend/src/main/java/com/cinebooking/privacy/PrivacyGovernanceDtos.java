package com.cinebooking.privacy;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class PrivacyGovernanceDtos {
    private PrivacyGovernanceDtos(){}

    public record RetentionPolicy(
            UUID id,
            String policyKey,
            String dataClass,
            String tableName,
            int retentionDays,
            String retentionAction,
            boolean enabled,
            boolean destructiveExecutionEnabled,
            String note,
            Instant updatedAt){}

    public record PrivacyRequest(
            UUID id,
            String requestKey,
            UUID subjectUserId,
            String subjectEmail,
            String subjectName,
            String requestType,
            String status,
            String requestedByEmail,
            String reviewedByEmail,
            String reason,
            String reviewNote,
            Instant dueAt,
            Instant createdAt,
            Instant reviewedAt,
            Instant completedAt,
            boolean overdue){}

    public record SubjectInventoryItem(String dataDomain, String source, long recordCount, String handling){}

    public record SubjectInventory(
            UUID userId,
            String email,
            String fullName,
            Instant generatedAt,
            long totalRelatedRecords,
            List<SubjectInventoryItem> items,
            boolean destructiveActionPerformed){}

    public record PrivacyGovernanceSummary(
            String strategyVersion,
            Instant generatedAt,
            int requestSlaHours,
            boolean retentionExecutionEnabled,
            boolean dryRunOnly,
            long policyCount,
            long enabledPolicyCount,
            long openRequestCount,
            long approvedRequestCount,
            long overdueRequestCount,
            PrivacyRequest latestRequest,
            String policyStatement){}

    public record CreatePrivacyRequest(String subjectEmail, String requestType, String reason){}
    public record ReviewPrivacyRequest(String decision, String reviewNote){}
}
