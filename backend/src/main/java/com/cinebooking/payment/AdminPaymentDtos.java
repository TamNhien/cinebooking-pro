package com.cinebooking.payment;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import com.cinebooking.payment.PaymentDtos.ProviderAvailability;
import com.cinebooking.payment.PaymentDtos.PaymentEventItem;

public final class AdminPaymentDtos {
    private AdminPaymentDtos(){}
    public record PaymentAdminView(UUID id,UUID bookingId,UUID payerUserId,String provider,String status,BigDecimal amount,String providerOrderId,String providerTransactionId,String responseCode,String message,Instant createdAt,Instant updatedAt,Instant expiresAt,Instant paidAt,Instant failedAt,Instant cancelledAt,Instant lastWebhookAt,int attemptNo,UUID retryOfPaymentId,Instant lastReconciledAt,Instant nextReconcileAt,int reconciliationFailures,String lastReconcileMessage){}
    public record WebhookAdminView(UUID id,String provider,String eventKey,UUID paymentId,String payloadHash,boolean signatureValid,String resultCode,String responseCode,String responseMessage,Instant receivedAt,Instant processedAt){}
    public record GatewayReadiness(String provider,String displayName,boolean configured,String mode,boolean productionReady,List<String> blockers,List<String> warnings,String checkoutHost,String queryHost,String returnHost,String ipnHost){}
    public record ProductionReadiness(boolean guardEnabled,boolean allRemoteProductionReady,Instant evaluatedAt,List<GatewayReadiness> gateways){}
    public record PaymentOpsDashboard(long total,long pending,long success,long failed,long expired,long cancelled,long review,long refunded,long invalidWebhooks,long webhookEvents,long dueReconcile,ProductionReadiness readiness,List<ProviderAvailability> providers,List<PaymentAdminView> payments,List<WebhookAdminView> webhooks){}
    public record ReconciliationResult(UUID paymentId,String provider,String localStatus,String providerStatus,String providerTransactionId,String message,boolean changed,boolean success,String trigger){}
    public record BatchReconciliationResult(int scanned,int succeeded,int failed,List<ReconciliationResult> results){}
    public record PaymentTimelineAdmin(UUID paymentId,List<PaymentEventItem> events){}
}
