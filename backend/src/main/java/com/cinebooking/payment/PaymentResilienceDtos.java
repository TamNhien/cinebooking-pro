package com.cinebooking.payment;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class PaymentResilienceDtos {
    private PaymentResilienceDtos(){}

    public record WebhookRecoveryItem(
            UUID id,
            String provider,
            String eventKey,
            UUID paymentId,
            boolean signatureValid,
            String deliveryState,
            int recoveryAttempts,
            String recoveryMessage,
            Instant receivedAt,
            Instant processedAt,
            Instant lastRecoveryAt,
            Instant recoveredAt){}

    public record PaymentResilienceSummary(
            String strategyVersion,
            Instant evaluatedAt,
            boolean autoReconcileEnabled,
            boolean webhookRecoveryEnabled,
            long reconcileScanMs,
            long reconcileMinAgeSeconds,
            int reconcileMaxBatch,
            long reconcileMaxBackoffSeconds,
            int webhookRecoveryMaxAttempts,
            long dueReconcile,
            long remotePendingOrReview,
            long webhookOrphaned,
            long webhookRecoveryPending,
            long webhookDeadLetter,
            long webhookRecovered,
            long refundRequested,
            long refundEvidenceRequired,
            long refundSettled,
            long refundFailed,
            List<WebhookRecoveryItem> recoveryQueue){}

    public record WebhookRecoveryResult(
            UUID webhookId,
            UUID paymentId,
            String provider,
            String deliveryState,
            int recoveryAttempts,
            boolean linked,
            boolean recovered,
            String message,
            AdminPaymentDtos.ReconciliationResult reconciliation){}

    public record WebhookRecoveryBatchResult(
            int scanned,
            int recovered,
            int pending,
            int deadLetter,
            List<WebhookRecoveryResult> results){}
}
