package com.cinebooking.payment;

import com.cinebooking.domain.PaymentStatus;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

import static com.cinebooking.payment.PaymentResilienceDtos.*;

@Service
public class PaymentResilienceService {
    public static final String STRATEGY_VERSION="V67-PAYMENT-RESILIENCE-5";
    private final PaymentRepository payments;
    private final PaymentWebhookEventRepository webhooks;
    private final PaymentWebhookRecoveryService recovery;
    private final boolean autoReconcileEnabled;
    private final boolean webhookRecoveryEnabled;
    private final long reconcileScanMs;
    private final long reconcileMinAgeSeconds;
    private final int reconcileMaxBatch;
    private final long reconcileMaxBackoffSeconds;
    private final int webhookRecoveryMaxAttempts;

    public PaymentResilienceService(PaymentRepository payments,
                                    PaymentWebhookEventRepository webhooks,
                                    PaymentWebhookRecoveryService recovery,
                                    @Value("${app.payment.reconcile.auto-enabled:true}") boolean autoReconcileEnabled,
                                    @Value("${app.payment.webhook-recovery.enabled:true}") boolean webhookRecoveryEnabled,
                                    @Value("${app.payment.reconcile.scan-ms:60000}") long reconcileScanMs,
                                    @Value("${app.payment.reconcile.min-age-seconds:45}") long reconcileMinAgeSeconds,
                                    @Value("${app.payment.reconcile.max-batch:20}") int reconcileMaxBatch,
                                    @Value("${app.payment.reconcile.max-backoff-seconds:900}") long reconcileMaxBackoffSeconds,
                                    @Value("${app.payment.webhook-recovery.max-attempts:5}") int webhookRecoveryMaxAttempts){
        this.payments=payments;this.webhooks=webhooks;this.recovery=recovery;this.autoReconcileEnabled=autoReconcileEnabled;this.webhookRecoveryEnabled=webhookRecoveryEnabled;
        this.reconcileScanMs=reconcileScanMs;this.reconcileMinAgeSeconds=reconcileMinAgeSeconds;this.reconcileMaxBatch=reconcileMaxBatch;this.reconcileMaxBackoffSeconds=reconcileMaxBackoffSeconds;this.webhookRecoveryMaxAttempts=webhookRecoveryMaxAttempts;
    }

    public PaymentResilienceSummary summary(){
        long remotePendingOrReview=payments.countByStatusInAndProviderIn(List.of(PaymentStatus.PENDING,PaymentStatus.REVIEW),List.of("VNPAY","VNPAY_QR","MOMO","MOMO_QR"));
        return new PaymentResilienceSummary(
                STRATEGY_VERSION, Instant.now(),autoReconcileEnabled,webhookRecoveryEnabled,reconcileScanMs,reconcileMinAgeSeconds,reconcileMaxBatch,reconcileMaxBackoffSeconds,webhookRecoveryMaxAttempts,
                payments.countByNextReconcileAtIsNotNullAndNextReconcileAtLessThanEqual(Instant.now()),remotePendingOrReview,
                webhooks.countByDeliveryState("ORPHANED"),webhooks.countByDeliveryState("RECOVERY_PENDING"),webhooks.countByDeliveryState("DEAD_LETTER"),webhooks.countByDeliveryState("RECOVERED"),
                payments.countByRefundState("REQUESTED"),payments.countByRefundState("EVIDENCE_REQUIRED"),payments.countByRefundState("SETTLED"),payments.countByRefundState("FAILED"),recovery.queue());
    }
}
