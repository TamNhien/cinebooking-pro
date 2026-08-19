package com.cinebooking.payment;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class AdminPaymentDtos {
    private AdminPaymentDtos(){}
    public record PaymentAdminView(UUID id,UUID bookingId,UUID payerUserId,String provider,String status,BigDecimal amount,String providerOrderId,String providerTransactionId,String responseCode,String message,Instant createdAt,Instant updatedAt,Instant expiresAt,Instant paidAt,Instant failedAt,Instant lastWebhookAt){}
    public record WebhookAdminView(UUID id,String provider,String eventKey,UUID paymentId,String payloadHash,boolean signatureValid,String resultCode,String responseCode,String responseMessage,Instant receivedAt,Instant processedAt){}
    public record PaymentOpsDashboard(long total,long pending,long success,long failed,long expired,long review,long refunded,long invalidWebhooks,long webhookEvents,List<PaymentAdminView> payments,List<WebhookAdminView> webhooks){}
    public record ReconciliationResult(UUID paymentId,String provider,String localStatus,String providerStatus,String providerTransactionId,String message,boolean changed){}
}
