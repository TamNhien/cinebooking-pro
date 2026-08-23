package com.cinebooking.payment;

import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class PaymentDtos {
    private PaymentDtos() {}
    public record StartPaymentRequest(@NotBlank String provider) {}
    public record RetryPaymentRequest(@NotBlank String provider) {}
    public record PaymentStartResponse(UUID paymentId, UUID bookingId, String provider, String paymentUrl, String qrData, String deeplink, Instant expiresAt, boolean replayed, int attemptNo, UUID retryOfPaymentId) {}
    public record PaymentCheckoutResponse(UUID paymentId, UUID bookingId, String provider, String status, BigDecimal amount, String paymentUrl, String qrData, String deeplink, String providerOrderId, String providerTransactionId, String providerResponseCode, String providerMessage, Instant createdAt, Instant updatedAt, Instant expiresAt, Instant paidAt, Instant failedAt, Instant cancelledAt, int attemptNo, UUID retryOfPaymentId, Instant lastReconciledAt, Instant nextReconcileAt, int reconciliationFailures, String lastReconcileMessage) {}
    public record PaymentResultResponse(UUID paymentId, UUID bookingId, String provider, String status, String bookingStatus) {}
    public record PaymentReturnResponse(boolean signatureValid, String provider, UUID paymentId, UUID bookingId, String paymentStatus, String bookingStatus, String providerCode, String message) {}
    public record PaymentHistoryItem(UUID paymentId, UUID bookingId, UUID payerUserId, String movieTitle, String provider, String status, BigDecimal amount, BigDecimal refundedAmount, String refundReference, String providerOrderId, String providerTransactionId, String providerResponseCode, String providerMessage, Instant createdAt, Instant updatedAt, Instant expiresAt, Instant paidAt, Instant failedAt, Instant cancelledAt, Instant refundedAt, int attemptNo, UUID retryOfPaymentId, Instant lastReconciledAt, Instant nextReconcileAt, int reconciliationFailures) {}
    public record ProviderAvailability(String provider,String displayName,boolean enabled,boolean configured,boolean mock,String mode,List<String> capabilities,String reason) {}
    public record PaymentEventItem(UUID id,UUID paymentId,String eventType,String actorType,String actorRef,String fromStatus,String toStatus,String code,String message,String detailsJson,Instant createdAt) {}
}
